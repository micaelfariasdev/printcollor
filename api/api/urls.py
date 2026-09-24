from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmpresaViewSet, PedidoFabricaViewSet, ClienteViewSet, ProdutoViewSet, OrcamentoViewSet,
    DTFVendorViewSet, UserViewSet, UserMeView, DashboardStatsView, ReportsView,
    ChangePasswordView, BackupExportView, BackupImportView, DTFConfigViewSet,
    ConfiguracaoLojaViewSet, ClientReportView, DTFOrdersReportView, FabricaOrdersReportView,
    KDSPanelView, SyncDTFStatusView, PedidoPublicoView, mp_oauth_callback_view,
)
from .webhook_views import MercadoPagoWebhookView

router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'produtos', ProdutoViewSet)
router.register(r'orcamentos', OrcamentoViewSet)
router.register(r'dtf', DTFVendorViewSet)
router.register(r'usuarios', UserViewSet)
router.register(r'pedidos', PedidoFabricaViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('me/', UserMeView.as_view(), name='user-me'),
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('reports/monthly/', ReportsView.as_view(), name='reports-monthly'),
    path('reports/clients/', ClientReportView.as_view(), name='reports-clients'),
    path('reports/dtf-orders/', DTFOrdersReportView.as_view(), name='reports-dtf-orders'),
    path('kds/', KDSPanelView.as_view(), name='kds-panel'),
    path('sync-status/', SyncDTFStatusView.as_view(), name='dtf-sync-status'),
    path('reports/fabrica-orders/', FabricaOrdersReportView.as_view(), name='reports-fabrica-orders'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    # Backup
    path('backup/exportar/', BackupExportView.as_view(), name='backup-export'),
    path('backup/importar/', BackupImportView.as_view(), name='backup-import'),
    # DTF Config
    path('dtf-config/', DTFConfigViewSet.as_view({'get': 'list', 'post': 'create'}), name='dtf-config-list'),
    path('dtf-config/<int:pk>/', DTFConfigViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='dtf-config-detail'),
    # Configuração da Loja (singleton)
    path('configuracao-loja/', ConfiguracaoLojaViewSet.as_view({'get': 'list'}), name='configuracao-loja-list'),
    path('configuracao-loja/<int:pk>/', ConfiguracaoLojaViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update'}), name='configuracao-loja-detail'),
    path('configuracao-loja/mp-redirect/', ConfiguracaoLojaViewSet.as_view({'get': 'mp_redirect'}), name='mp-redirect'),
    path('configuracao-loja/mp-desconectar/', ConfiguracaoLojaViewSet.as_view({'post': 'mp_desconectar'}), name='mp-desconectar'),
    # Mercado Pago
    path('webhook/mercadopago/', MercadoPagoWebhookView.as_view(), name='mp-webhook'),
    path('integracoes/mercadopago/callback/', mp_oauth_callback_view, name='mp-callback'),
    path('dtf/<int:pk>/mp-pagar/', DTFVendorViewSet.as_view({'post': 'mp_pagar'}), name='dtf-mp-pagar'),
    # Página pública (AllowAny - fora do router)
    path('pedido-publico/<str:codigo_publico>/', PedidoPublicoView.as_view(), name='pedido-publico'),
]
