from django.urls import re_path
from api import consumers

websocket_urlpatterns = [
    re_path(r'ws/whatsapp/(?P<instance_name>\w+)/$', consumers.WhatsAppConsumer.as_asgi()),
]
