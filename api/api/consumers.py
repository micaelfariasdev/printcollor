import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer
import logging
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)

class WhatsAppConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_string = self.scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token_list = params.get('token', [])
        token = token_list[0] if token_list else None

        if not token:
            logger.warning("[WS] Conexão rejeitada: sem token")
            await self.close(code=4001)
            return

        try:
            from rest_framework_simplejwt.tokens import AccessToken
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            from django.contrib.auth import get_user_model
            User = get_user_model()
            from asgiref.sync import sync_to_async
            self.user = await sync_to_async(User.objects.get)(id=user_id)
        except Exception as e:
            logger.warning(f"[WS] Conexão rejeitada: token inválido - {e}")
            await self.close(code=4001)
            return

        self.group_name = 'whatsapp_messages'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"[WS] Cliente conectado: {self.channel_name}")

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f"[WS] Cliente desconectado: {self.channel_name}")

    async def receive(self, text_data):
        try:
            from asgiref.sync import sync_to_async
            from django.utils import timezone
            data = json.loads(text_data)
            msg_type = data.get('type', '')
            instance_id = data.get('instance_id')
            numero = data.get('numero')

            if not instance_id or not numero:
                await self.send(text_data=json.dumps({'error': 'instance_id e numero obrigatorios'}))
                return

            from api.models import WhatsAppInstance, WhatsAppMessage
            from api.services.evolution_service import EvolutionService

            if msg_type == 'send_message':
                mensagem = data.get('mensagem', '')
                if not mensagem:
                    await self.send(text_data=json.dumps({'error': 'mensagem vazia'}))
                    return

                result = await sync_to_async(EvolutionService.enviar_mensagem)(instance_id, numero, mensagem)
                instance = await sync_to_async(WhatsAppInstance.objects.get)(instance_id=instance_id)
                msg = await sync_to_async(WhatsAppMessage.objects.create)(
                    instance=instance,
                    message_id=result.get('key', {}).get('id', ''),
                    from_number=instance.numero,
                    to_number=numero,
                    body=mensagem,
                    from_me=True,
                    timestamp=timezone.now(),
                    contato_nome=instance.nome,
                    lida=True,
                )
                # Envia no formato que o front espera
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'whatsapp_message',
                        'message_id': msg.message_id,
                        'body': mensagem,
                        'from_me': True,
                        'instanceId': instance.id,
                        'instance_nome': instance.nome,
                        'jid': numero,
                        'pushName': '',
                        'timestamp': str(msg.timestamp),
                        'messageType': 'text',
                    }
                )

            elif msg_type == 'send_image':
                image_base64 = data.get('image')
                caption = data.get('caption', '')
                if not image_base64:
                    await self.send(text_data=json.dumps({'error': 'imagem vazia'}))
                    return

                result = await sync_to_async(EvolutionService.enviar_imagem)(instance_id, numero, image_base64, caption)
                instance = await sync_to_async(WhatsAppInstance.objects.get)(instance_id=instance_id)
                msg = await sync_to_async(WhatsAppMessage.objects.create)(
                    instance=instance,
                    message_id=result.get('key', {}).get('id', ''),
                    from_number=instance.numero,
                    to_number=numero,
                    body=caption,
                    from_me=True,
                    timestamp=timezone.now(),
                    contato_nome=instance.nome,
                    lida=True,
                    media_type='image',
                    media_url=image_base64,
                )
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'whatsapp_message',
                        'message_id': msg.message_id,
                        'body': caption,
                        'from_me': True,
                        'instanceId': instance.id,
                        'instance_nome': instance.nome,
                        'jid': numero,
                        'pushName': '',
                        'timestamp': str(msg.timestamp),
                        'messageType': 'image',
                        'media_url': f"msg_id:{msg.message_id}" if msg.message_id else image_base64,
                    }
                )

        except Exception as e:
            logger.error(f'[WS] Erro: {e}')
            await self.send(text_data=json.dumps({'error': str(e)}))

    async def whatsapp_message(self, event):
        # Envia direto no formato que o front espera (sem o campo 'type')
        msg_data = {k: v for k, v in event.items() if k != 'type'}
        await self.send(text_data=json.dumps(msg_data))
        logger.info(f"[WS] Mensagem enviada para {self.channel_name}")
