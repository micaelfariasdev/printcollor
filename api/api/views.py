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

        context = {
            'orcamento': orcamento,
            'itens': orcamento.itens.all(),
            'valor_extenso': valor_extenso,
            'logo_url': request.build_absolute_uri('/static/img/logo_yasprint.png')
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
        if self.action in ['destroy', 'update', 'partial_update']:
            return [(IsAdminUserCustom | IsFinanceiro)()]
        return [(IsAdminUserCustom | IsVendedor)()]

    @action(detail=True, methods=['get'])
    def gerar_pdf(self, request, pk=None):
        dtf = self.get_object()

        def processar_imagem(campo_arquivo, sufixo):
            # 1. Verifica se o campo tem arquivo e se ele existe no HD
            if not campo_arquivo or not hasattr(campo_arquivo, 'path'):
                return None
            
            if not os.path.exists(campo_arquivo.path):
                return None

            try:
                original_path = campo_arquivo.path
                with Image.open(original_path) as img:
                    largura, altura = img.size
                    # Se estiver em pé, rotaciona para deitar
                    if altura > largura:
                        img = img.rotate(90, expand=True)
                        temp_name = f'temp_{dtf.id}_{sufixo}.png'
                        temp_path = os.path.join(settings.MEDIA_ROOT, temp_name)
                        img.save(temp_path)
                        # Garante as barras corretas para o motor de PDF
                        return 'file://' + temp_path.replace('\\', '/')
                    
                    return 'file://' + original_path.replace('\\', '/')
            except Exception as e:
                # Se a imagem estiver corrompida, não trava o PDF
                print(f"Erro ao processar imagem {sufixo}: {e}")
                return None

        # Processa as duas imagens com segurança
        layout_final = processar_imagem(dtf.layout_arquivo, 'layout')
        comprovante_final = processar_imagem(dtf.comprovante_pagamento, 'comprovante')

        context = {
            'dtf': dtf,
            'layout_path': layout_final,
            'comprovante_path': comprovante_final
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
