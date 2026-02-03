from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmpresaViewSet, ClienteViewSet, ProdutoViewSet, OrcamentoViewSet, DTFVendorViewSet, UserViewSet, UserMeView, DashboardStatsView

router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'produtos', ProdutoViewSet)
router.register(r'orcamentos', OrcamentoViewSet)
router.register(r'dtf', DTFVendorViewSet)
router.register(r'usuarios', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('me/', UserMeView.as_view(), name='user-me'),
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
]
