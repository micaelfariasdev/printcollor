from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmpresaViewSet, PedidoFabricaViewSet, ClienteViewSet, ProdutoViewSet, OrcamentoViewSet, DTFVendorViewSet, UserViewSet, UserMeView, DashboardStatsView, ChangePasswordView
from .evolution_views import WhatsAppInstanceViewSet
from .webhook_views import WhatsAppWebhookView, WhatsAppWebhookConfigureView

router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'produtos', ProdutoViewSet)
router.register(r'orcamentos', OrcamentoViewSet)
router.register(r'dtf', DTFVendorViewSet)
router.register(r'usuarios', UserViewSet)
router.register(r'pedidos', PedidoFabricaViewSet)
router.register(r'whatsapp-instances', WhatsAppInstanceViewSet, basename='whatsapp-instances')

urlpatterns = [
    path('', include(router.urls)),
    path('me/', UserMeView.as_view(), name='user-me'),
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    # WhatsApp - rotas manuais para actions do ViewSet
    path('whatsapp-instances/<int:pk>/qrcode/', WhatsAppInstanceViewSet.as_view({'get': 'qrcode'}), name='whatsapp-qrcode'),
    path('whatsapp-instances/<int:pk>/status/', WhatsAppInstanceViewSet.as_view({'get': 'status'}), name='whatsapp-status'),
    path('whatsapp-instances/<int:pk>/enviar-mensagem/', WhatsAppInstanceViewSet.as_view({'post': 'enviar_mensagem'}), name='whatsapp-enviar'),
    path('whatsapp-instances/<int:pk>/mensagens/', WhatsAppInstanceViewSet.as_view({'post': 'mensagens'}), name='whatsapp-mensagens'),
    path('whatsapp-instances/<int:pk>/deletar/', WhatsAppInstanceViewSet.as_view({'delete': 'deletar'}), name='whatsapp-deletar'),
    path('whatsapp-instances/<int:pk>/media/', WhatsAppInstanceViewSet.as_view({'get': 'media'}), name='whatsapp-media'),
    path('whatsapp/unificado/', WhatsAppInstanceViewSet.as_view({'get': 'unificado'}), name='whatsapp-unificado'),
    path('webhook/evolution/', WhatsAppWebhookView.as_view(), name='webhook-evolution'),
    path('whatsapp/webhook/', WhatsAppWebhookView.as_view(), name='webhook-evolution-alt'),
    path('webhook/configure/', WhatsAppWebhookConfigureView.as_view(), name='webhook-configure'),
    path('whatsapp/webhook/configure/', WhatsAppWebhookConfigureView.as_view(), name='webhook-configure-alt'),
]
