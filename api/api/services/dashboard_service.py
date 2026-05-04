from django.db.models import Count, Sum, Q, F
from django.utils import timezone
from api.models import Orcamento, PedidoFabrica, DTFVendor


class DashboardService:
    """Serviço para agregações do dashboard usando queries no banco"""

    @staticmethod
    def get_stats():
        """Retorna estatísticas agregadas do dashboard"""
        now = timezone.now()
        mes_atual = now.month
        ano_atual = now.year

        # Orçamentos do mês
        orcamentos_mes = Orcamento.objects.filter(
            data_criacao__month=mes_atual,
            data_criacao__year=ano_atual
        )
        total_orcamentos_mes = orcamentos_mes.count()
        valor_orcamentos_mes = orcamentos_mes.aggregate(
            total=Sum('valor_total')
        )['total'] or 0

        # Pedidos de fábrica
        pedidos_total = PedidoFabrica.objects.count()
        pedidos_pendentes = PedidoFabrica.objects.filter(status='pendente').count()
        pedidos_producao = PedidoFabrica.objects.filter(status='em_producao').count()
        pedidos_finalizados = PedidoFabrica.objects.filter(status='finalizado').count()

        # DTF Vendors
        dtf_total = DTFVendor.objects.count()
        dtf_pagos = DTFVendor.objects.filter(esta_pago=True).count()
        dtf_pendentes = dtf_total - dtf_pagos

        # Solicitações

        return {
            'orcamentos': {
                'total_mes': total_orcamentos_mes,
                'valor_total_mes': float(valor_orcamentos_mes),
            },
            'pedidos': {
                'total': pedidos_total,
                'pendentes': pedidos_pendentes,
                'em_producao': pedidos_producao,
                'finalizados': pedidos_finalizados,
            },
            'dtf': {
                'total': dtf_total,
                'pagos': dtf_pagos,
                'pendentes': dtf_pendentes,
            },
        }
