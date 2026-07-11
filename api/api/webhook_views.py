#!/usr/bin/env python3

# Webhook views para receber eventos da Evolution API e Mercado Pago
from django.http import JsonResponse
from django.views import View
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import json
import logging
import mercadopago

# Cache em memória para idempotência do webhook (em produção usar Redis)
_mp_processed_ids = set()

from .models import WhatsAppInstance, WhatsAppMessage, DTFVendor, ConfiguracaoLoja
from .services.evolution_service import EvolutionService
from .services.mercadopago_service import MercadoPagoService
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class MercadoPagoWebhookView(View):
    """
    Webhook chamado pelo Mercado Pago quando um pagamento é aprovado.
    Valida HMAC x-signature, confirma status via SDK e atualiza DTFVendor.
    """

    def post(self, request):
        import hmac as _hmac
        import hashlib as _hashlib
        from django.conf import settings

        try:
            # 1. Extrair x-signature e x-request-id
            x_sig = request.headers.get('x-signature', '')
            x_req = request.headers.get('x-request-id', '')

            # 2. Extrair payment ID do body
            body = json.loads(request.body) if request.body else {}
            # MP pode mandar { "action": "payment.created", "data": { "id": "123" } }
            data_id = body.get('data', {}).get('id', '') or request.POST.get('data_id', '')
            if not data_id:
                # Às vezes MP manda topic em vez de data.id (ex: payment)
                topic = body.get('type', '') or body.get('topic', '')
                action = body.get('action', '')
                logger.info(f"[MP_WEBHOOK] Body sem data.id, topic={topic} action={action}")
                return JsonResponse({'status': 'ignored'}, status=200)

            # 3. Validar HMAC
            secret = getattr(settings, 'MERCADOPAGO_WEBHOOK_SECRET', '')
            if secret:
                mac = _hmac.new(
                    secret.encode(),
                    f"{data_id}{x_req}".encode(),
                    _hashlib.sha256
                ).hexdigest()
                # MP pode mandar no formato "t=timestamp,v1=mac"
                # ou vírgula-separado: "t=timestamp,v1=mac,..."
                hmac_ok = False
                for part in x_sig.split(','):
                    if '=' in part:
                        val = part.split('=', 1)[1]
                        if _hmac.compare_digest(mac, val):
                            hmac_ok = True
                            break
                if not hmac_ok:
                    logger.warning(f"[MP_WEBHOOK] HMAC inválido para payment {data_id}")
                    return JsonResponse({'error': 'forbidden'}, status=403)

            # 4. Idempotência
            if data_id in _mp_processed_ids:
                logger.info(f"[MP_WEBHOOK] Payment {data_id} já processado, ignorando")
                return JsonResponse({'status': 'already_processed'}, status=200)

            # 5. Confirmar payment via SDK (não confiar no body do webhook)
            config = ConfiguracaoLoja.objects.filter(mp_connected=True).first()
            if not config:
                logger.error("[MP_WEBHOOK] Nenhuma config MP conectada")
                return JsonResponse({'error': 'not_configured'}, status=500)

            access_token = MercadoPagoService.get_access_token(config)
            sdk = mercadopago.SDK(access_token)
            payment_resp = sdk.payment().get(data_id)
            payment = payment_resp.get('response', {})

            logger.info(f"[MP_WEBHOOK] Payment {data_id} status={payment.get('status')}")

            # 6. Processar se aprovado
            if payment.get('status') == 'approved':
                dtf_id = payment.get('external_reference', '')
                if dtf_id:
                    try:
                        dtf = DTFVendor.objects.get(id=int(dtf_id))
                        if not dtf.esta_pago:
                            payer = payment.get('payer', {})
                            identification = payer.get('identification', {})
                            dtf.esta_pago = True
                            dtf.comprovante_mp_data = {
                                'payment_id': payment.get('id'),
                                'metodo': payment.get('payment_method_id'),
                                'nome': f"{payer.get('first_name', '')} {payer.get('last_name', '')}".strip(),
                                'email': payer.get('email'),
                                'cpf': identification.get('number'),
                                'ultimos4': (payment.get('card', {}) or {}).get('last_four_digits') or payment.get('last_four_digits', ''),
                                'valor': payment.get('transaction_amount'),
                                'data': payment.get('date_approved') or payment.get('last_modified'),
                            }
                            dtf.save()
                            _mp_processed_ids.add(data_id)
                            # Limitar cache para não crescer infinitamente
                            if len(_mp_processed_ids) > 10000:
                                _mp_processed_ids.clear()
                            logger.info(f"[MP_WEBHOOK] DTF {dtf_id} marcado como pago")

                            # 7. Broadcast via Channels
                            channel_layer = get_channel_layer()
                            async_to_sync(channel_layer.group_send)(
                                'dtf_notifications',
                                {
                                    'type': 'dtf_notification',
                                    'event': 'pago',
                                    'dtf_id': dtf.id,
                                    'codigo_publico': dtf.codigo_publico or '',
                                    'cliente_nome': dtf.cliente.nome,
                                }
                            )
                            logger.info(f"[MP_WEBHOOK] Broadcast WS enviado para DTF {dtf_id}")
                        else:
                            logger.info(f"[MP_WEBHOOK] DTF {dtf_id} já estava pago")
                    except DTFVendor.DoesNotExist:
                        logger.warning(f"[MP_WEBHOOK] DTF id={dtf_id} não encontrado")
                    except Exception as e:
                        logger.error(f"[MP_WEBHOOK] Erro processando DTF {dtf_id}: {e}")
                        return JsonResponse({'error': str(e)}, status=500)

            return JsonResponse({'status': 'ok'}, status=200)

        except json.JSONDecodeError:
            logger.error("[MP_WEBHOOK] Body não é JSON válido")
            return JsonResponse({'error': 'invalid json'}, status=400)
        except Exception as e:
            logger.error(f"[MP_WEBHOOK] Erro interno: {e}")
            return JsonResponse({'error': str(e)}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class WhatsAppWebhookView(View):
    """
    Webhook chamado pela Evolution API quando eventos ocorrem.
    - MESSAGES_SET: nova mensagem recebida
    - MESSAGES_UPSERT: nova mensagem recebida (formato novo)
    - RESPONSE_READY: resposta da instância pronta para enviar mensagens
    """

    def post(self, request):
        try:
            data = json.loads(request.body)
            event = data.get('event')
            instance_name = data.get('instance')
            payload = data.get('data', {})
            logger.info(f"[WEBHOOK] Evento '{event}' da instância '{instance_name}'")

            if not instance_name:
                return JsonResponse({'error': 'instance não informada'}, status=400)

            # Verifica instância
            try:
                instance = WhatsAppInstance.objects.get(nome=instance_name)
            except WhatsAppInstance.DoesNotExist:
                return JsonResponse({'error': f"Instância {instance_name} não encontrada"}, status=404)

            # Normaliza o nome do evento (aceita maiúsculo/minúsculo, _ ou .)
            if event:
                event_normalized = event.lower().replace('.', '_')
            else:
                event_normalized = ''

            # Processa mensagens
            if event_normalized in ['messages_set', 'messages_upsert']:
                print(payload)
                return self._process_message(instance, payload)

            elif event_normalized == 'response_ready':
                # Notifica que a instância está pronta (conectada)
                instance.status = 'connected'
                instance.save()
                logger.info(f"[WEBHOOK] Instância '{instance_name}' conectada!")
                return JsonResponse({'success': True})

            else:
                logger.warning(f"[WEBHOOK] Evento não suportado: {event}")
                return JsonResponse({'warning': f'Evento {event} não suportado'}, status=200)

        except json.JSONDecodeError:
            logger.error("[WEBHOOK] JSON inválido recebido")
            return JsonResponse({'error': 'JSON inválido'}, status=400)
        except Exception as e:
            logger.error(f"[WEBHOOK] Erro interno: {e}")
            return JsonResponse({'error': str(e)}, status=500)

    def _process_message(self, instance, payload):
        """Processa mensagem recebida da Evolution API e envia via WebSocket (sem salvar no banco)"""
        try:
            # Formato real da Evolution API: dados vêm direto no payload
            key = payload.get('key', {})
            message_id = key.get('id')
            push_name = payload.get('pushName', '')

            if not message_id:
                return JsonResponse({'warning': 'Mensagem sem ID, ignorando'}, status=200)

            # Extrai dados da mensagem (pode estar em message ou direto no payload)
            msg_data = payload.get('message', payload)
            message_timestamp = payload.get('messageTimestamp', 0)

            # Extrai texto
            body = ''
            message_type = 'text'
            media_url = ''

            if 'conversation' in msg_data:
                body = msg_data['conversation']
            elif 'extendedTextMessage' in msg_data:
                body = msg_data['extendedTextMessage'].get('text', '')
            elif 'imageMessage' in msg_data:
                body = msg_data['imageMessage'].get('caption', '')
                message_type = 'image'
                media_url = f"msg_id:{message_id}" if message_id else ''
            elif 'videoMessage' in msg_data:
                body = msg_data['videoMessage'].get('caption', '')
                message_type = 'video'
                media_url = f"msg_id:{message_id}" if message_id else ''
            elif 'documentMessage' in msg_data:
                body = msg_data['documentMessage'].get('caption', '')
                message_type = 'document'
                media_url = f"msg_id:{message_id}" if message_id else ''
            elif 'audioMessage' in msg_data:
                body = 'Áudio'
                message_type = 'audio'
                media_url = f"msg_id:{message_id}" if message_id else ''

            # Determina remetente/destinatário
            from_me = key.get('fromMe', False)
            remote_jid = key.get('remoteJid', '')

            # Normaliza remoteJid: se for @lid, tenta usar remoteJidAlt/participantAlt
            remote_jid_alt = key.get('remoteJidAlt', '') or key.get('participantAlt', '')
            if remote_jid.endswith('@lid') and remote_jid_alt:
                remote_jid = remote_jid_alt

            # Para grupos, usa participant se disponível
            if remote_jid.endswith('@g.us'):
                participant = key.get('participant', '')
                participant_alt = key.get('participantAlt', '')
                if participant:
                    if participant.endswith('@lid') and participant_alt:
                        remote_jid = participant_alt
                    else:
                        remote_jid = participant

            # Extrai número limpo (sem @s.whatsapp.net, @lid, etc) para from_number
            from_number = remote_jid.split('@')[0] if remote_jid else ''

            # Envia para o WebSocket em tempo real
            channel_layer = get_channel_layer()
            group_name = 'whatsapp_messages'

            # Envia o JID e pushName para o front fazer match
            message_data = {
                'type': 'whatsapp_message',
                'message_id': message_id,
                'body': body,
                'from_me': from_me,
                'instanceId': instance.id,
                'instance_nome': instance.nome,
                'jid': remote_jid,
                'pushName': push_name,
                'timestamp': str(message_timestamp),
                'messageType': message_type,
            }

            if media_url:
                message_data['media_url'] = media_url

            logger.info(f"[WEBHOOK] Enviando via WS: {message_data}")

            try:
                async_to_sync(channel_layer.group_send)(group_name, message_data)
                logger.info(f"[WEBHOOK] Mensagem enviada via WS com sucesso")
            except Exception as ws_error:
                logger.error(f"[WEBHOOK] Erro ao enviar via WebSocket: {ws_error}")

            return JsonResponse({'success': True})

        except Exception as e:
            logger.error(f"[WEBHOOK] Erro ao processar mensagem: {e}")
            return JsonResponse({'error': str(e)}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class WhatsAppWebhookConfigureView(View):
    """
    Reconfigura o webhook de uma instância da Evolution API.
    GET: busca configuração atual
    POST: { "instance": "nome_da_instancia", "webhook_url": "https://tunnel-url" (opcional) }
    """

    def get(self, request):
        instance_name = request.GET.get('instance')
        if not instance_name:
            return JsonResponse({'error': 'instance não informada'}, status=400)

        try:
            instance = WhatsAppInstance.objects.get(nome=instance_name)
        except WhatsAppInstance.DoesNotExist:
            return JsonResponse({'error': f"Instância {instance_name} não encontrada"}, status=404)

        from .services.evolution_service import EvolutionService
        result = EvolutionService.obter_webhook(instance_name)

        return JsonResponse({'success': True, 'result': result})

    def post(self, request):
        try:
            data = json.loads(request.body)
            instance_name = data.get('instance')
            webhook_url = data.get('webhook_url', '')
            data = {
    "webhook": {
        "enabled": True,
        "url": f"{webhook_url}/api/webhook/evolution/",
        "events": [
            "MESSAGES_UPSERT"
        ]
    }
}

            if not instance_name:
                return JsonResponse({'error': 'instance não informada'}, status=400)

            try:
                instance = WhatsAppInstance.objects.get(nome=instance_name)
            except WhatsAppInstance.DoesNotExist:
                return JsonResponse({'error': f"Instância {instance_name} não encontrada"}, status=404)

            from .services.evolution_service import EvolutionService
            result = EvolutionService.configurar_webhook(instance_name, data)

            logger.info(f"[WEBHOOK_CONFIG] Webhook reconfigurado para '{instance_name}'")
            return JsonResponse({'success': True, 'result': result})

        except Exception as e:
            logger.error(f"[WEBHOOK_CONFIG] Erro: {e}")
            return JsonResponse({'error': str(e)}, status=500)
