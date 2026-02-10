from django.conf import settings
from PIL import Image  # Pip install Pillow
import os
from django.contrib.auth.hashers import check_password
from num2words import num2words
from django.utils import timezone
from django.db.models import Count, Sum
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Empresa, Cliente, Produto, Orcamento, DTFVendor, Usuario, PedidoFabrica
from .permissions import IsAdminUserCustom, IsVendedor, IsFinanceiro, IsMaquina
from .serializers import (
    EmpresaSerializer, ClienteSerializer,
    ProdutoSerializer, OrcamentoSerializer, DTFVendorSerializer, UsuarioSerializer,
    UserMeSerializer, PedidoFabricaSerializer
)
from .tools.utils import gerar_pdf_from_html

import base64
from io import BytesIO


def processar_imagem_base64(campo_arquivo):
    if not campo_arquivo or not os.path.exists(campo_arquivo.path):
        return None

    try:
        with Image.open(campo_arquivo.path) as img:
            largura, altura = img.size
            # Lógica: Se estiver em pé, deita
            if altura > largura:
                img = img.rotate(90, expand=True)

            # Converte a imagem para Base64 em memória
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            return f"data:image/png;base64,{img_str}"
    except Exception as e:
        print(f"Erro Base64: {e}")
        return None


class UserViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer


class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer

    def get_permissions(self):
        # Use as classes sem instanciar (sem os parênteses)
        return [(IsAdminUserCustom | IsFinanceiro)()]


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
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['get'])
    def gerar_pdf(self, request, pk=None):
        orcamento = self.get_object()
        # Adicionando o valor por extenso
        valor_extenso = num2words(
            orcamento.valor_total, lang='pt_BR', to='currency')
        logo_path = os.path.join(
            settings.BASE_DIR, 'static', 'logo-yasprint.png')
        context = {
            'orcamento': orcamento,
            'itens': orcamento.itens.all(),
            'valor_extenso': valor_extenso,
            'logo_url': f'file://{logo_path}'
        }

        tid = orcamento.empresa.template_id

        template_nome = f'pdfs/{tid}.html'
        return gerar_pdf_from_html(template_nome, context, f'orcamento_{orcamento.id}.pdf')


class DTFVendorViewSet(viewsets.ModelViewSet):
    queryset = DTFVendor.objects.all().order_by('-data_criacao')
    serializer_class = DTFVendorSerializer

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['foi_impresso', 'esta_pago', 'foi_entregue']
    search_fields = ['cliente__nome', 'layout_arquivo']

    def get_permissions(self):
        # Ação de Deletar: Apenas Admin e Vendedor (Máquina fica de fora)
        if self.action == 'destroy':
            return [(IsAdminUserCustom | IsVendedor)()]

        # Ação de Editar (update/partial_update): Admin, Vendedor e Máquina podem
        if self.action in ['update', 'partial_update']:
            return [(IsAdminUserCustom | IsVendedor | IsMaquina)()]

        # Ação de Criar (create): Apenas Admin e Vendedor (Máquina não cria)
        if self.action == 'create':
            return [(IsAdminUserCustom | IsVendedor)()]

        # Outras ações (list, retrieve, gerar_pdf): Todos os cargos autorizados podem ver
        return [(IsAdminUserCustom | IsVendedor | IsMaquina)()]

    @action(detail=True, methods=['get'])
    def gerar_pdf(self, request, pk=None):
        dtf = self.get_object()

        def obter_dados_imagem(campo_arquivo):
            if not campo_arquivo or not hasattr(campo_arquivo, 'path') or not os.path.exists(campo_arquivo.path):
                return None, False

            try:
                path = campo_arquivo.path
                with Image.open(path) as img:
                    largura, altura = img.size
                    # Apenas detecta se precisa girar (altura > largura)
                    precisa_girar = altura > largura
                return 'file://' + path.replace('\\', '/'), precisa_girar
            except Exception:
                return None, False

        layout_url, girar_layout = obter_dados_imagem(dtf.layout_arquivo)
        comp_url, girar_comp = obter_dados_imagem(dtf.comprovante_pagamento)

        context = {
            'dtf': dtf,
            'layout_path': layout_url,
            'rotate_layout': girar_layout,
            'comprovante_path': comp_url,
            'rotate_comprovante': girar_comp,
        }

        return gerar_pdf_from_html('pdfs/dtf_pedido.html', context, f'pedido_{dtf.id}.pdf')


class UserMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserMeSerializer(
            request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")

        if not check_password(current_password, user.password):
            return Response({"error": "Senha atual incorreta"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"message": "Senha alterada com sucesso"}, status=status.HTTP_200_OK)


class PedidoFabricaViewSet(viewsets.ModelViewSet):
    queryset = PedidoFabrica.objects.all().order_by('-data_criacao')
    serializer_class = PedidoFabricaSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def gerar_pdf(self, request, pk=None):
        pedido = self.get_object()
        # Adicionando o valor por extenso

        logo_path = os.path.join(
            settings.BASE_DIR, 'static', 'logo-printcollor.png')
        ordem_tamanhos = ["pp", "p", "m", "g", "gg", "xgg", "xxgg"]
        ordem_bl = ["bl pp", "bl p", "bl m",
                    "bl g", "bl gg", "bl xgg", "bl xxgg"]

        detalhes = {k.lower(): v for k, v in pedido.detalhes_tamanho.items()}

        grade_adulto = [
            {"tamanho": t, "qtd": detalhes[t]}
            for t in ordem_tamanhos
            if detalhes.get(t, 0) > 0
        ]

        grade_bl = [
            {"tamanho": t, "qtd": detalhes[t]}
            for t in ordem_bl
            if detalhes.get(t, 0) > 0
        ]

        grade_inf = [
            {"tamanho": t, "qtd": q}
            for t, q in detalhes.items()
            if q > 0 and ("a" in t or "anos" in t)
        ]

        grade_outros = [
            {"tamanho": t, "qtd": q}
            for t, q in detalhes.items()
            if q > 0
            and t not in ordem_tamanhos
            and t not in ordem_bl
            and not ("a" in t or "anos" in t)
        ]

        print(grade_adulto, grade_bl, grade_outros)

        context = {
            'pedido': pedido,
            'logo_url': f'file://{logo_path}',
            'layout_url': f'file://{pedido.layout.path}' if pedido.layout else None,
            'total': pedido.total_itens(),
            'grade_adulto': grade_adulto,
            'grade_bl': grade_bl,
            'grade_inf': grade_inf,
            'grade_outros': grade_outros,
            'now': timezone.now(),
        }

        return gerar_pdf_from_html('pdfs/pedido.html', context, f'pedido_{pedido.id}.pdf')
