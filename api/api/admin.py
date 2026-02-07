from django.contrib import admin
from .models import Empresa, Cliente, Produto, Orcamento, ItemOrcamento, Usuario, DTFVendor, PedidoFabrica


class ItemOrcamentoInline(admin.TabularInline):
    model = ItemOrcamento
    extra = 1


@admin.register(Orcamento)
class OrcamentoAdmin(admin.ModelAdmin):
    list_display = ('id', 'empresa', 'cliente', 'data_criacao', 'valor_total')
    inlines = [ItemOrcamentoInline]


admin.site.register(Empresa)
admin.site.register(Cliente)
admin.site.register(Produto)
admin.site.register(Usuario)
admin.site.register(DTFVendor)
admin.site.register(PedidoFabrica)
