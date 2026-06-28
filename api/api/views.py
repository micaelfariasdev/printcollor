from datetime import timedelta, datetime
from django.conf import settings
from PIL import Image  # Pip install Pillow
import os, json
from django.contrib.auth.hashers import check_password
from num2words import num2words
from django.utils import timezone
from django.db.models import Count, Sum
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from decimal import Decimal
from .models import Empresa, Cliente, Produto, Orcamento, ItemOrcamento, DTFVendor, Usuario, PedidoFabrica, DTFConfig, ConfiguracaoLoja
from .permissions import IsAdminUserCustom, IsVendedor, IsFinanceiro, IsMaquina
from .serializers import (
    EmpresaSerializer, ClienteSerializer,
    ProdutoSerializer, OrcamentoSerializer, DTFVendorSerializer, UsuarioSerializer,
    UserMeSerializer, PedidoFabricaSerializer, DTFConfigSerializer, ConfiguracaoLojaSerializer
)
from .tools.utils import gerar_pdf_from_html
from .services.backup_service import BackupService

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
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'nome', 'email']
    ordering_fields = ['id', 'username', 'nome', 'email']
    ordering = ['-id']


class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'cnpj', 'email']
    ordering_fields = ['id', 'nome', 'cnpj', 'email']
    ordering = ['-id']

    def get_permissions(self):
        # Use as classes sem instanciar (sem os parênteses)
        return [(IsAdminUserCustom | IsFinanceiro)()]


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'cpf', 'cnpj', 'telefone', 'email']
    ordering_fields = ['id', 'nome', 'cpf', 'cnpj', 'telefone', 'email']
    ordering = ['-id']


class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'categoria']
    ordering_fields = ['id', 'nome', 'categoria']
    ordering = ['-id']


class OrcamentoViewSet(viewsets.ModelViewSet):
    # O prefetch_related evita o problema de performance "N+1" nas consultas
    queryset = Orcamento.objects.all().prefetch_related(
        'itens__produto', 'cliente', 'empresa')
    serializer_class = OrcamentoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['cliente__nome', 'empresa__nome', 'itens__produto__nome']
    ordering_fields = ['id', 'data_criacao']
    ordering = ['-data_criacao']

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
        name = f'{orcamento.empresa.nome}-{orcamento.cliente.nome}-{orcamento.id}'

        template_nome = f'pdfs/{tid}.html'
        return gerar_pdf_from_html(template_nome, context, f'{name}.pdf')


class DTFVendorViewSet(viewsets.ModelViewSet):
    queryset = DTFVendor.objects.all().order_by('-data_criacao')
    serializer_class = DTFVendorSerializer

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['cliente', 'foi_impresso', 'esta_pago', 'foi_entregue', 'status']
    search_fields = ['cliente__nome', 'layout_arquivo']
    ordering_fields = ['id', 'data_criacao']
    ordering = ['-data_criacao']

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

        name = f'dtf-{dtf.cliente.nome}-{dtf.id}'

        return gerar_pdf_from_html('pdfs/dtf_pedido.html', context, f'{name}.pdf')


class ConfiguracaoLojaViewSet(viewsets.ModelViewSet):
    """
    Configurações globais da loja (singleton). Listagem/update sempre em pk=1.
    """
    queryset = ConfiguracaoLoja.objects.all()
    serializer_class = ConfiguracaoLojaSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'put', 'head', 'options']

    def list(self, request, *args, **kwargs):
        obj, _ = ConfiguracaoLoja.objects.get_or_create(pk=1)
        serializer = self.get_serializer(obj)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        obj, _ = ConfiguracaoLoja.objects.get_or_create(pk=1)
        serializer = self.get_serializer(obj)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        obj, _ = ConfiguracaoLoja.objects.get_or_create(pk=1)
        serializer = self.get_serializer(obj, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


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


class KDSPanelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        hoje = timezone.localtime().date()

        hoje_start = timezone.make_aware(
            datetime.combine(hoje, datetime.min.time())
        )
        amanha_start = hoje_start + timedelta(days=1)
        dois_dias_atras = hoje_start - timedelta(days=2)

        # ===========================
        # DTF
        # ===========================

        dtf_hoje = DTFVendor.objects.filter(
            data_criacao__gte=hoje_start,
            data_criacao__lt=amanha_start
        ).select_related("cliente").order_by("data_criacao")

        # Apenas pedidos pagos entram no fluxo do KDS
        dtf_pagos = dtf_hoje.filter(esta_pago=True)

        # Pagou, mas ainda não imprimiu
        dtf_fila = dtf_pagos.filter(
            foi_impresso="pendente",
            foi_entregue=False
        )

        # Já imprimiu, falta entregar
        dtf_prontos = dtf_pagos.filter(
            foi_impresso="impresso",
            foi_entregue=False
        )

        # Entregues
        dtf_entregues = dtf_pagos.filter(
            foi_entregue=True
        )

        # Urgentes = pagos há mais de 2 dias e ainda não entregues
        dtf_urgentes = DTFVendor.objects.filter(
            esta_pago=True,
            foi_entregue=False,
            data_criacao__lt=dois_dias_atras
        ).select_related("cliente").order_by("data_criacao")[:10]

        def serialize_dtf(item):
            if item.foi_entregue:
                status = "Finalizado"
            elif item.foi_impresso == "impresso":
                status = "Pronto"
            elif item.esta_pago:
                status = "Em Produção"
            else:
                status = "Orçamento"
            return {
                "id": item.id,
                "cliente": item.cliente.nome,
                "descricao": f"{item.tamanho_cm} cm",
                "status_display": status,
                "foi_impresso": item.foi_impresso,
                "foi_entregue": item.foi_entregue,
                "esta_pago": item.esta_pago,
                "data_criacao": item.data_criacao.isoformat(),
            }

        def serialize_urgente(obj, tipo):
            return {
                "id": obj.id,
                "tipo": tipo,
                "cliente": obj.cliente.nome if obj.cliente else "",
                "descricao": getattr(obj, "tamanho_cm", ""),
                "foi_impresso": getattr(obj, "foi_impresso", None),
                "foi_entregue": getattr(obj, "foi_entregue", None),
                "data_criacao": obj.data_criacao.isoformat(),
            }

        # ===========================
        # PEDIDO FABRICA
        # ===========================

        pf_total = PedidoFabrica.objects.filter(
            data_criacao__gte=hoje_start,
            data_criacao__lt=amanha_start
        ).count()

        pf_pendente = PedidoFabrica.objects.filter(
            status="pendente",
            data_criacao__gte=hoje_start,
            data_criacao__lt=amanha_start
        ).count()

        pf_em_producao = PedidoFabrica.objects.filter(
            status="em_producao",
            data_criacao__gte=hoje_start,
            data_criacao__lt=amanha_start
        ).count()

        pf_finalizado = PedidoFabrica.objects.filter(
            status="finalizado",
            data_criacao__gte=hoje_start,
            data_criacao__lt=amanha_start
        ).count()

        pf_urgentes = PedidoFabrica.objects.filter(
            status="pendente",
            data_criacao__lt=dois_dias_atras
        ).select_related("cliente").order_by("data_criacao")[:10]

        return Response({
            "dtf": {
                "total": dtf_hoje.count(),

                "pagos": dtf_pagos.count(),

                "fila": dtf_fila.count(),
                "fila_list": [
                    serialize_dtf(i)
                    for i in dtf_fila
                ],

                "prontos_entrega": dtf_prontos.count(),
                "prontos_entrega_list": [
                    serialize_dtf(i)
                    for i in dtf_prontos
                ],

                "entregues": dtf_entregues.count(),

                "urgentes": [
                    serialize_urgente(i, "DTF")
                    for i in dtf_urgentes
                ]
            },

            "pedido_fabrica": {
                "total": pf_total,
                "pendente": pf_pendente,
                "em_producao": pf_em_producao,
                "finalizado": pf_finalizado,

                "urgentes": [
                    serialize_urgente(i, "FABRICA")
                    for i in pf_urgentes
                ]
            }
        })
        
class SyncDTFStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from api.models import DTFVendor
        dtfs = DTFVendor.objects.all()
        atualizados = 0
        for dtf in dtfs:
            old_status = dtf.status
            dtf.atualizar_status()
            if dtf.status != old_status:
                dtf.save(update_fields=['status'])
                atualizados += 1
        return Response({'ok': True, 'total': dtfs.count(), 'atualizados': atualizados})

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


class ReportsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        GET /api/reports/monthly/?year=2026
        Retorna breakdown mensal do ano para DTF, PedidoFabrica e Orçamentos.
        """
        year = int(request.query_params.get('year', timezone.now().year))
        month_param = request.query_params.get('month')

        def mes_range():
            if month_param:
                return [int(month_param)]
            return range(1, 13)

        dtf_monthly = []
        dtf_by_type_monthly = []
        pedido_monthly = []
        revenue_received_monthly = []

        for m in mes_range():
            # --- DTF: agregado geral (sem misturar unidades diferentes) ---
            qs_dtf = DTFVendor.objects.filter(data_criacao__year=year, data_criacao__month=m)
            total_valor = sum(row.valor_total() for row in qs_dtf)
            dtf_monthly.append({
                'mes': m,
                'total_pedidos': qs_dtf.count(),
                'total_revenue': float(total_valor),
            })

            # --- DTF por tipo (com unidades corretas) ---
            for tipo_val, tipo_label in DTFVendor.TIPOS_PRODUTO:
                qs_t = qs_dtf.filter(tipo_produto=tipo_val)
                if not qs_t.exists():
                    continue
                if tipo_val == 'estampa':
                    # Estampa: quantidade de unidades
                    total_un = sum(row.quantidade or 1 for row in qs_t)
                    dtf_by_type_monthly.append({
                        'mes': m,
                        'tipo': tipo_val,
                        'tipo_display': tipo_label,
                        'total_pedidos': qs_t.count(),
                        'total_revenue': float(sum(row.valor_total() for row in qs_t)),
                        'quantidade': round(total_un, 2),
                        'unidade': 'un',
                    })
                elif tipo_val == 'sublimacao':
                    # Sublimação: tamanho_cm = cm² → converter para m²
                    total_cm2 = sum(row.tamanho_cm for row in qs_t)
                    dtf_by_type_monthly.append({
                        'mes': m,
                        'tipo': tipo_val,
                        'tipo_display': tipo_label,
                        'total_pedidos': qs_t.count(),
                        'total_revenue': float(sum(row.valor_total() for row in qs_t)),
                        'quantidade': round(float(total_cm2 / Decimal('10000')), 2),
                        'unidade': 'm²',
                    })
                else:
                    # DTF Têxtil/UV: tamanho_cm = cm lineares → metros
                    total_cm = sum(row.tamanho_cm for row in qs_t)
                    dtf_by_type_monthly.append({
                        'mes': m,
                        'tipo': tipo_val,
                        'tipo_display': tipo_label,
                        'total_pedidos': qs_t.count(),
                        'total_revenue': float(sum(row.valor_total() for row in qs_t)),
                        'quantidade': round(float(total_cm / Decimal('100')), 2),
                        'unidade': 'm',
                    })

            # --- DTF pago (receita recebida) ---
            qs_pago = DTFVendor.objects.filter(data_criacao__year=year, data_criacao__month=m, esta_pago=True)
            total_recebido = sum(row.valor_total() for row in qs_pago)
            revenue_received_monthly.append({
                'mes': m,
                'total_pedidos': qs_pago.count(),
                'total_recebido': float(total_recebido),
            })

            # --- PedidoFabrica ---
            qs_ped = PedidoFabrica.objects.filter(data_criacao__year=year, data_criacao__month=m)
            total_pecas = sum(p.total_itens() for p in qs_ped)
            pedido_monthly.append({
                'mes': m,
                'total_pedidos': qs_ped.count(),
                'total_pecas': total_pecas,
            })

        # --- DTF por tipo (ano todo, para cards da tabela) ---
        base_dtf_ano = DTFVendor.objects.filter(data_criacao__year=year)
        dtf_by_type = []
        for tipo_val, tipo_label in DTFVendor.TIPOS_PRODUTO:
            qs_t = base_dtf_ano.filter(tipo_produto=tipo_val)
            if not qs_t.exists():
                continue
            if tipo_val == 'estampa':
                total_un = sum(row.quantidade or 1 for row in qs_t)
                dtf_by_type.append({
                    'tipo': tipo_val,
                    'tipo_display': tipo_label,
                    'total_pedidos': qs_t.count(),
                    'total_revenue': float(sum(row.valor_total() for row in qs_t)),
                    'quantidade': round(total_un, 2),
                    'unidade': 'un',
                })
            elif tipo_val == 'sublimacao':
                total_cm2 = sum(row.tamanho_cm for row in qs_t)
                dtf_by_type.append({
                    'tipo': tipo_val,
                    'tipo_display': tipo_label,
                    'total_pedidos': qs_t.count(),
                    'total_revenue': float(sum(row.valor_total() for row in qs_t)),
                    'quantidade': round(float(total_cm2 / Decimal('10000')), 2),
                    'unidade': 'm²',
                })
            else:
                total_cm = sum(row.tamanho_cm for row in qs_t)
                dtf_by_type.append({
                    'tipo': tipo_val,
                    'tipo_display': tipo_label,
                    'total_pedidos': qs_t.count(),
                    'total_revenue': float(sum(row.valor_total() for row in qs_t)),
                    'quantidade': round(float(total_cm / Decimal('100')), 2),
                    'unidade': 'm',
                })

        return Response({
            'year': year,
            'dtf_monthly': dtf_monthly,
            'dtf_by_type': dtf_by_type,
            'dtf_by_type_monthly': dtf_by_type_monthly,
            'pedido_monthly': pedido_monthly,
            'revenue_received_monthly': revenue_received_monthly,
        })


class ClientReportView(APIView):
    """
    GET /api/reports/clients/?year=2026&limit=20
    Ranking de clientes por receita DTF no ano.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        limit = int(request.query_params.get('limit', 20))

        clients = Cliente.objects.filter(
            dtfvendor__data_criacao__year=year
        ).distinct().order_by('-dtfvendor__data_criacao')[:limit * 2]

        # ranking manual por receita
        client_revenue = {}
        for d in DTFVendor.objects.filter(data_criacao__year=year).select_related('cliente'):
            cid = d.cliente_id
            if cid not in client_revenue:
                client_revenue[cid] = {'cliente': d.cliente, 'total_revenue': 0, 'total_pedidos': 0}
            client_revenue[cid]['total_revenue'] += d.valor_total()
            client_revenue[cid]['total_pedidos'] += 1

        sorted_clients = sorted(client_revenue.values(), key=lambda x: x['total_revenue'], reverse=True)[:limit]

        result = []
        for item in sorted_clients:
            c = item['cliente']
            dtf_orders = DTFVendor.objects.filter(cliente=c, data_criacao__year=year)
            metros_lineares = sum(
                row.tamanho_cm / Decimal('100')
                for row in dtf_orders.filter(tipo_produto__in=['dtf_textil', 'dtf_uv'])
            )
            metros_quadrados = sum(
                row.tamanho_cm / Decimal('10000')
                for row in dtf_orders.filter(tipo_produto='sublimacao')
            )
            unidades_estampa = sum(
                row.quantidade or 1
                for row in dtf_orders.filter(tipo_produto='estampa')
            )
            result.append({
                'cliente_id': c.id,
                'cliente_nome': c.nome,
                'total_pedidos': item['total_pedidos'],
                'total_revenue': float(item['total_revenue']),
                'metros_lineares': round(float(metros_lineares), 2),
                'metros_quadrados': round(float(metros_quadrados), 2),
                'unidades_estampa': unidades_estampa,
            })

        return Response({'year': year, 'clients': result})


class DTFOrdersReportView(APIView):
    """
    GET /api/reports/dtf-orders/?year=2026&month=6
    Lista todos os pedidos DTF de um mês específico com detalhes completos.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))

        qs = DTFVendor.objects.filter(
            data_criacao__year=year, data_criacao__month=month
        ).select_related('cliente').order_by('-data_criacao')

        orders = []
        for d in qs:
            cliente_nome = d.cliente.nome if d.cliente else '—'
            tipo_display = dict(DTFVendor.TIPOS_PRODUTO).get(d.tipo_produto, d.tipo_produto)
            # Calcular quantidade/unidade conforme tipo
            if d.tipo_produto == 'estampa':
                qtd = d.quantidade or 1
                unidade = 'un'
            elif d.tipo_produto == 'sublimacao':
                qtd = round(float(d.tamanho_cm / Decimal('10000')), 2)
                unidade = 'm²'
            else:
                qtd = round(float(d.tamanho_cm / Decimal('100')), 2)
                unidade = 'm'
            orders.append({
                'id': d.id,
                'cliente_nome': cliente_nome,
                'tipo_produto': d.tipo_produto,
                'tipo_display': tipo_display,
                'quantidade': qtd,
                'unidade': unidade,
                'valor_total': float(d.valor_total()),
                'status': d.status,
                'data_criacao': d.data_criacao.strftime('%d/%m/%Y'),
                'preco_unit_override': d.preco_unit_override,
                'tamanho_cm': d.tamanho_cm,
            })

        return Response({'year': year, 'month': month, 'orders': orders, 'total': len(orders)})


class FabricaOrdersReportView(APIView):
    """
    GET /api/reports/fabrica-orders/?year=2026&month=6
    Lista todos os pedidos fábrica de um mês específico com detalhes completos.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))

        qs = PedidoFabrica.objects.filter(
            data_criacao__year=year, data_criacao__month=month
        ).select_related('cliente').order_by('-data_criacao')

        orders = []
        for p in qs:
            detalhes = p.detalhes_tamanho
            # detalhes_tamanho é um JSONField com formato: {"P": 10, "M": 20, "G": 15} ou similar
            total_pecas = 0
            if isinstance(detalhes, dict):
                total_pecas = sum(int(v) for v in detalhes.values() if str(v).isdigit())
            elif isinstance(detalhes, list):
                total_pecas = sum(int(item.get('quantidade', 0)) for item in detalhes if isinstance(item, dict))

            cliente_nome = p.cliente.nome if p.cliente else '—'
            status_display = p.get_status_display() if hasattr(p, 'get_status_display') else p.status
            orders.append({
                'id': p.id,
                'cliente_nome': cliente_nome,
                'status': p.status,
                'status_display': status_display,
                'total_pecas': total_pecas,
                'valor_total': float(p.total_itens()),
                'data_criacao': p.data_criacao.strftime('%d/%m/%Y') if p.data_criacao else '—',
                'detalhes_tamanho': json.dumps(detalhes) if detalhes else '',
            })

        return Response({'year': year, 'month': month, 'orders': orders, 'total': len(orders)})


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
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['cliente__nome', 'detalhes_tamanho']
    ordering_fields = ['id', 'data_criacao']
    ordering = ['-data_criacao']

    def get_queryset(self):
        qs = super().get_queryset()
        cliente = self.request.query_params.get('cliente')
        if cliente:
            qs = qs.filter(cliente__nome__icontains=cliente)
        return qs

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

        name = f'pedido-{pedido.cliente.nome}-{pedido.id}'

        return gerar_pdf_from_html('pdfs/pedido.html', context, f'{name}.pdf')


class BackupExportView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from django.http import FileResponse
        buffer = BackupService.export_backup()
        response = FileResponse(
            buffer,
            as_attachment=True,
            filename='backup_printcollor.zip'
        )
        return response


class BackupImportView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        from django.contrib.auth.hashers import check_password

        password = request.data.get('password')
        backup_file = request.FILES.get('backup')

        if not password or not backup_file:
            return Response(
                {'error': 'Senha e arquivo de backup são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not check_password(password, request.user.password):
            return Response(
                {'error': 'Senha incorreta.'},
                status=status.HTTP_403_FORBIDDEN
            )

        success, message = BackupService.import_backup(backup_file)
        if success:
            return Response({'message': message})
        return Response(
            {'error': message},
            status=status.HTTP_400_BAD_REQUEST
        )


class DTFConfigViewSet(viewsets.ModelViewSet):
    queryset = DTFConfig.objects.all()
    serializer_class = DTFConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
