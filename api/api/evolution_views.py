from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from rest_framework import serializers
from .models import WhatsAppInstance, Cliente
from .services.evolution_service import EvolutionService
from datetime import datetime
import logging
import base64

# Serializer definido localmente para evitar erros de importação
class WhatsAppInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppInstance
        fields = ['id', 'nome', 'instance_id', 'numero', 'status', 'cor', 'ativo', 'criado_em', 'atualizado_em']

logger = logging.getLogger(__name__)

def normalize_message(m, instance_nome='', instance_id=0):
    """
    Normaliza uma mensagem da Evolution API (formato aninhado)
    para o formato plano usado no WebSocket e no front-end.
    """
    key = m.get('key', {})
    msg_obj = m.get('message', {})
    from_me = key.get('fromMe', False)
    remote_jid = key.get('remoteJid', '')
    from_number = remote_jid.replace('@s.whatsapp.net', '').replace('@g.us', '').replace('@lid', '')

    # Extrai o corpo da mensagem
    body = ''
    msg_type = 'text'
    media_url = ''

    if msg_obj.get('conversation'):
        body = msg_obj.get('conversation', '')
    elif msg_obj.get('extendedTextMessage'):
        body = msg_obj.get('extendedTextMessage', {}).get('text', '')
    elif msg_obj.get('imageMessage'):
        msg_type = 'image'
        img = msg_obj.get('imageMessage', {})
        # Não salva a URL da Evolution API (expira). Salva o message_id pro front usar o endpoint /media/
        media_url = f"msg_id:{key.get('id')}" if key.get('id') else ''
        body = img.get('caption', '') or 'Imagem'
    elif msg_obj.get('videoMessage'):
        msg_type = 'video'
        vid = msg_obj.get('videoMessage', {})
        media_url = f"msg_id:{key.get('id')}" if key.get('id') else ''
        body = vid.get('caption', '') or 'Vídeo'
    elif msg_obj.get('documentMessage'):
        msg_type = 'document'
        doc = msg_obj.get('documentMessage', {})
        media_url = f"msg_id:{key.get('id')}" if key.get('id') else ''
        body = doc.get('fileName', '') or doc.get('title', '') or 'Documento'
    elif msg_obj.get('audioMessage'):
        msg_type = 'audio'
        media_url = f"msg_id:{key.get('id')}" if key.get('id') else ''
        body = 'Áudio'
    elif msg_obj.get('stickerMessage'):
        msg_type = 'sticker'
        media_url = f"msg_id:{key.get('id')}" if key.get('id') else ''
        body = 'Sticker'
    elif msg_obj.get('contactMessage'):
        msg_type = 'contact'
        body = 'Contato'
    elif msg_obj.get('locationMessage'):
        msg_type = 'location'
        body = 'Localização'

    # Timestamp
    ts = m.get('messageTimestamp', 0)
    if isinstance(ts, (int, float)):
        timestamp = datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
    else:
        timestamp = str(ts) if ts else datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Status de leitura
    read = False
    msg_updates = m.get('MessageUpdate', [])
    if msg_updates:
        read = any(u.get('status') == 'READ' for u in msg_updates)

    return {
        'id': key.get('id', ''),
        'body': body,
        'from_me': from_me,
        'instanceId': instance_id,
        'instance_nome': instance_nome,
        'numero': from_number if not from_me else remote_jid.replace('@s.whatsapp.net', '').replace('@lid', ''),
        'timestamp': timestamp,
        'messageType': msg_type,
        'media_url': media_url,
        'pushName': m.get('pushName', ''),
        'read': read,
        'fileName': body if msg_type == 'document' else '',
    }


class WhatsAppInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppInstance
        fields = ['id', 'nome', 'instance_id', 'numero', 'status', 'cor', 'ativo', 'criado_em']

    def to_internal_value(self, data):
        # Traduz status da Evolution API (inglês) para o formato do modelo (português)
        # antes que a validação de choices ocorra
        if 'status' in data:
            status_map = {
                'connected': 'ativo',
                'disconnected': 'desconectado',
                'connecting': 'conectando',
                'qrcode': 'conectando',
            }
            if not isinstance(data, dict):
                data = dict(data)
            val = data['status']
            data['status'] = status_map.get(val.lower() if isinstance(val, str) else val, val)
        return super().to_internal_value(data)

    def to_representation(self, instance):
        # Traduz status do modelo (português) para a Evolution API (inglês) na saída
        data = super().to_representation(instance)
        status_map = {
            'ativo': 'connected',
            'inativo': 'disconnected',
            'desconectado': 'disconnected',
            'conectando': 'connecting',
        }
        data['status'] = status_map.get(data['status'], data['status'])
        return data


class WhatsAppInstanceViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppInstance.objects.all()
    """ViewSet para gerenciar instâncias WhatsApp via Evolution API"""

    serializer_class = WhatsAppInstanceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action == 'media':
            return []
        return super().get_permissions()
    
    def get_queryset(self):
        return WhatsAppInstance.objects.filter(ativo=True).order_by('-criado_em')

    def create(self, request):
        """Cria uma nova instância na Evolution API e salva no banco"""
        nome = request.data.get('nome')
        if not nome:
            return Response({'error': 'Nome é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Cria na Evolution API
            result = EvolutionService.criar_instancia(nome)

            instance_id = result.get('instance', {}).get('instanceName', nome)
            cor = request.data.get('cor', '#25D366')

            # Salva no banco
            whatsapp = WhatsAppInstance.objects.create(
                nome=nome,
                instance_id=instance_id,
                status='qrcode',
                cor=cor
            )

            # Tenta obter QR Code (pode demorar um pouco pra gerar)
            qr_base64 = ''
            for attempt in range(5):
                try:
                    qr_data = EvolutionService.obter_qr_code(instance_id)
                    qr_base64 = qr_data.get('qr_code', {}).get('base64', '')
                    if qr_base64:
                        whatsapp.qr_code = qr_base64
                        whatsapp.save()
                        break
                except Exception as e:
                    if attempt < 4:
                        import time
                        time.sleep(1)
                    else:
                        logger.warning(f"Não foi possível obter QR Code após 5 tentativas: {e}")

            return Response({
                'id': whatsapp.id,
                'nome': whatsapp.nome,
                'instance_id': whatsapp.instance_id,
                'qr_code': whatsapp.qr_code,
                'status': whatsapp.status
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Erro ao criar instância '{nome}': {e}")
            return Response({'error': f'Erro ao criar instância: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def qrcode(self, request, pk=None):
        """Obtém o QR Code da instância"""
        try:
            instance = self.get_object()
            qr_data = EvolutionService.obter_qr_code(instance.instance_id)
            return Response(qr_data)
        except Exception as e:
            logger.error(f"Erro ao obter QR Code: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Verifica o status da conexão"""
        try:
            instance = self.get_object()
            status_data = EvolutionService.verificar_status(instance.instance_id)
            return Response(status_data)
        except Exception as e:
            logger.error(f"Erro ao verificar status: {e}")
            return Response({'instance': {'state': 'disconnected'}})

    @action(detail=True, methods=['post'])
    def enviar_mensagem(self, request, pk=None):
        """Envia uma mensagem de texto"""
        numero = request.data.get('numero')
        mensagem = request.data.get('mensagem')

        if not numero or not mensagem:
            return Response({'error': 'Número e mensagem são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            instance = self.get_object()
            result = EvolutionService.enviar_mensagem(
                instance.instance_id,
                numero,
                mensagem
            )
            return Response(result)
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['delete'])
    def deletar(self, request, pk=None):
        """Deleta instância na Evolution API (se existir) e remove do banco"""
        try:
            instance = self.get_object()
            instance_id = instance.instance_id
            try:
                EvolutionService.deletar_instancia(instance_id)
            except Exception as e:
                logger.warning(f"Instância '{instance_id}' não encontrada na Evolution API (pode já ter sido removida): {e}")
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Erro ao deletar instância: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def mensagens(self, request, pk=None):
        """Busca mensagens da instância (retorna formato padronizado com mídia convertida p/ base64)"""
        try:
            instance = self.get_object()
            numero = request.data.get('numero')
            limite = int(request.data.get('limite', 50))

            result = EvolutionService.buscar_mensagens(
                instance.instance_id,
                numero=numero,
                limite=limite
            )

            # Extrai records (Evolution API retorna { messages: { records: [...] } })
            raw_msgs = []
            if isinstance(result, dict):
                if 'messages' in result and isinstance(result['messages'], dict):
                    raw_msgs = result['messages'].get('records', [])
                elif 'messages' in result and isinstance(result['messages'], list):
                    raw_msgs = result['messages']
                else:
                    raw_msgs = result.get('records', [])

            # Normaliza para formato plano
            normalized = [
                normalize_message(m, instance_nome=instance.nome, instance_id=instance.id)
                for m in raw_msgs
            ]

            # NÃO baixa mídias aqui - o frontend usa CachedImage com IndexedDB
            # para cachear sob demanda. Isso evita response gigante (900KB+).
            return Response({'messages': {'records': normalized}})
        except Exception as e:
            logger.error(f"Erro ao buscar mensagens: {e}")
            return Response({'messages': []})

    @action(detail=False, methods=['get'])
    def unificado(self, request):
        """Retorna CHATS unificados de todas as instâncias conectadas"""
        try:
            instances = WhatsAppInstance.objects.filter(ativo=True)
            all_chats = []
            seen_jids = set()

            # Busca JIDs que já têm cliente cadastrado
            cliente_jids = set(Cliente.objects.filter(jid__isnull=False).values_list('jid', flat=True))
            # Busca dados dos clientes para mostrar nome salvo
            cliente_por_jid = {c.jid: {'id': c.id, 'nome': c.nome} for c in Cliente.objects.filter(jid__isnull=False)}

            limite = int(request.query_params.get('limite', 50))

            for instance in instances:
                try:
                    chats = EvolutionService.buscar_chats(instance.nome, limite=limite)
                    for chat in chats:
                        # remoteJid vem direto no objeto do /chat/findChats/
                        jid = chat.get('remoteJid') or chat.get('jid', '')
                        if not jid or jid in seen_jids:
                            continue
                        seen_jids.add(jid)

                        # Lógica de extração baseada no seu JSON
                        last_msg = chat.get('lastMessage') or {}
                        last_msg_key = last_msg.get('key') or {}
                        from_me = last_msg_key.get('fromMe', False)

                        # 1. Tenta o pushName do chat (contato)
                        # 2. Se for "Você" ou nulo, e não for do contato, tenta o pushName da mensagem
                        # 3. Fallback final para o remoteJid (número)
                        display_name = chat.get('pushName')

                        if not display_name or display_name == "Você":
                            # Se a última msg não for minha, o pushName da msg é o nome do contato
                            if not from_me and last_msg.get('pushName'):
                                display_name = last_msg.get('pushName')
                            else:
                                display_name = jid.partition('@')[0] if '@' in jid else jid  # Pega só o número antes do @

                        # Extração do conteúdo
                        last_msg_message = last_msg.get('message') or {}
                        text_content = (
                            last_msg_message.get('conversation') or 
                            last_msg_message.get('extendedTextMessage', {}).get('text', '')
                        )

                        all_chats.append({
                            'jid': jid,
                            'name': display_name,
                            'lastMessage': text_content,
                            'lastMessageTimestamp': last_msg.get('messageTimestamp', 0),
                            'instanceName': instance.nome,
                            'instanceCor': instance.cor or '#25D366',
                            'profilePicUrl': chat.get('profilePicUrl', ''),
                            'unreadCount': chat.get('unreadCount', 0),
                            'fromMe': from_me,
                            'has_client': jid in cliente_jids,
                            'cliente_nome': cliente_por_jid.get(jid, {}).get('nome', '') if jid in cliente_jids else '',
                            'cliente_id': cliente_por_jid.get(jid, {}).get('id') if jid in cliente_jids else None,
                        })
                except Exception as e:
                    logger.warning(f"Erro ao buscar chats da instância {instance.nome}: {e}")

            # Ordena por timestamp decrescente
            all_chats.sort(key=lambda x: x.get('lastMessageTimestamp', 0), reverse=True)
            return Response({'chats': all_chats[:limite]})
        except Exception as e:
            logger.error(f"Erro ao buscar chats unificados: {e}")
            return Response({'chats': []})

    @action(detail=True, methods=['get'])
    def media(self, request, pk=None):
        """
        Proxy para baixar mídia da Evolution API autenticada.
        O frontend usa essa rota e cacheia no IndexedDB (useImageCache).
        Query params: message_id (obrigatório)
        """
        message_id = request.query_params.get('message_id')
        if not message_id:
            return Response({'error': 'message_id obrigatório'}, status=400)

        instance = self.get_object()

        try:
            base64_data = EvolutionService.baixar_midia_base64(
                instance.nome,
                message_id,
                timeout=30
            )
            if not base64_data:
                return Response({'error': 'Mídia não encontrada ou vazia'}, status=404)

            # Detecta tipo MIME pelo base64 (header dos primeiros chars)
            mime_type = 'application/octet-stream'
            if base64_data.startswith('/9j'):
                mime_type = 'image/jpeg'
            elif base64_data.startswith('iVBOR'):
                mime_type = 'image/png'
            elif base64_data.startswith('UklGR'):
                mime_type = 'video/webm'
            elif base64_data.startswith('AAAA'):
                mime_type = 'video/mp4'
                
            dataResp = {
                'base64': base64_data,
                'mime_type': mime_type,
                'message_id': message_id,
            }
            return Response(dataResp)
        except Exception as e:
            logger.error(f"[MEDIA] Erro ao baixar mídia {message_id}: {e}")
            return Response({'error': str(e)}, status=500)