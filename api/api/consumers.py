import json
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer


class DTFConsumer(AsyncWebsocketConsumer):
    """Notifica clientes autenticados sobre alterações nos pedidos DTF."""

    async def connect(self):
        token = parse_qs(self.scope.get('query_string', b'').decode()).get('token', [None])[0]
        if not token:
            await self.close(code=4001)
            return
        try:
            from asgiref.sync import sync_to_async
            from django.contrib.auth import get_user_model
            from rest_framework_simplejwt.tokens import AccessToken
            user_id = AccessToken(token)['user_id']
            await sync_to_async(get_user_model().objects.get)(id=user_id)
        except Exception:
            await self.close(code=4001)
            return

        self.group_name = 'dtf_notifications'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def dtf_status_changed(self, event):
        await self.send(text_data=json.dumps(event['data']))
