from django.contrib import admin
from .models import Empresa, Cliente, Produto, Orcamento, ItemOrcamento, Usuario, Recibo, DTFVendor, PedidoFabrica


class ItemOrcamentoInline(admin.TabularInline):
    model = ItemOrcamento
    extra = 1


@admin.register(Orcamento)
class OrcamentoAdmin(admin.ModelAdmin):
    list_display = ('id', 'empresa', 'cliente', 'data_criacao', 'valor_total')
    inlines = [ItemOrcamentoInline]


@admin.register(Recibo)
class ReciboAdmin(admin.ModelAdmin):
    list_display = ('id', 'nome_cliente', 'nome_empresa', 'valor', 'forma_pagamento', 'data_recebimento')
    search_fields = ('nome_cliente', 'nome_empresa', 'referente_a')
    list_filter = ('forma_pagamento', 'data_recebimento')


admin.site.register(Empresa)
admin.site.register(Cliente)
admin.site.register(Produto)
admin.site.register(Usuario)
admin.site.register(DTFVendor)
admin.site.register(PedidoFabrica)
