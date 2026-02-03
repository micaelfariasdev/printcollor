from num2words import num2words
from django.utils import timezone
from django.db.models import Count, Sum
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Empresa, Cliente, Produto, Orcamento, DTFVendor, Usuario, ItemOrcamento
from .permissions import IsAdminUserCustom, IsVendedor, IsFinanceiro
from .serializers import (
    EmpresaSerializer, ClienteSerializer,
    ProdutoSerializer, OrcamentoSerializer, DTFVendorSerializer, UsuarioSerializer,
    UserMeSerializer
)
from .tools.utils import gerar_pdf_from_html


class UserViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer


class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer


class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer


class OrcamentoViewSet(viewsets.ModelViewSet):
    # O prefetch_related evita o problema de performance "N+1" nas consultas
    queryset = Orcamento.objects.all().prefetch_related(
        'itens__produto', 'cliente', 'empresa')
    serializer_class = OrcamentoSerializer

    def get_permissions(self):
        # Use as classes sem instanciar (sem os parênteses)
        return [(IsAdminUserCustom | IsFinanceiro)()]

    @action(detail=True, methods=['get'])
    def gerar_pdf(self, request, pk=None):
        orcamento = self.get_object()
        # Adicionando o valor por extenso
        valor_extenso = num2words(
            orcamento.valor_total, lang='pt_BR', to='currency')

        context = {
            'orcamento': orcamento,
            'itens': orcamento.itens.all(),
            'valor_extenso': valor_extenso,
            'logo_url': request.build_absolute_uri('/static/img/logo_yasprint.png')
        }
        return gerar_pdf_from_html('pdfs/orcamento_template.html', context, f'orcamento_{orcamento.id}.pdf')


class DTFVendorViewSet(viewsets.ModelViewSet):
    queryset = DTFVendor.objects.all().order_by('-data_criacao')
    serializer_class = DTFVendorSerializer

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['foi_impresso', 'esta_pago', 'foi_entregue']
    search_fields = ['cliente__nome', 'layout_arquivo']

    def get_permissions(self):
        if self.action in ['destroy', 'update', 'partial_update']:
            return [(IsAdminUserCustom | IsFinanceiro)()]
        return [(IsAdminUserCustom | IsVendedor)()]


class UserMeView(APIView):
    # Apenas usuários com Token válido podem acessar
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data)


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        hoje = timezone.now()

        total_orcamentos = Orcamento.objects.filter(
            data_criacao__month=hoje.month,
            data_criacao__year=hoje.year
        ).count()

        query_financeira = DTFVendor.objects.filter(
            data_criacao__month=hoje.month,
            data_criacao__year=hoje.year
        )
        total_vendas_dtf_valor = sum(i.valor_total() for i in query_financeira)

        total_metragem = sum(i.tamanho_cm for i in query_financeira)
        total_vendas_dtf = len(query_financeira)

        return Response({
            'total_orcamento': total_orcamentos,
            'total_dtf_valor': total_vendas_dtf_valor,
            'total_vendas_dtf': total_vendas_dtf,
            'metragem_dtf': total_metragem,
        })
