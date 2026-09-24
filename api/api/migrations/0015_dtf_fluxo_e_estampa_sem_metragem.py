from django.db import migrations, models


def migrar_status_antigo(apps, schema_editor):
    DTFVendor = apps.get_model('api', 'DTFVendor')
    DTFVendor.objects.filter(status__in=['aprovado', 'em_producao']).update(
        status='pedido_feito'
    )
    DTFVendor.objects.filter(tipo_produto='estampa').update(tamanho_cm=None)


class Migration(migrations.Migration):
    dependencies = [('api', '0014_dtfvendor_preco_historico')]

    operations = [
        migrations.AlterField(
            model_name='dtfvendor',
            name='status',
            field=models.CharField(
                choices=[
                    ('orcamento', 'Orçamento'),
                    ('pedido_feito', 'Pedido feito'),
                    ('impresso', 'Impresso'),
                    ('finalizado', 'Finalizado'),
                ],
                default='orcamento',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='dtfvendor',
            name='tamanho_cm',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Metragem em centímetros lineares. Não se aplica a estampas por unidade.',
                max_digits=10,
                null=True,
            ),
        ),
        migrations.RunPython(migrar_status_antigo, migrations.RunPython.noop),
    ]
