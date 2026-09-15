from django.db import migrations, models


class Migration(migrations.Migration):
    # 0013 existia apenas localmente e nunca foi versionada; 0012 é o último
    # marco comum entre ambientes já publicados.
    dependencies = [('api', '0012_mp_comprovante_data')]

    operations = [
        migrations.AddField(
            model_name='dtfvendor', name='preco_unitario_aplicado',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Preco unitario congelado na criacao do pedido.', max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='dtfvendor', name='preco_minimo_aplicado',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Preco minimo congelado na criacao do pedido.', max_digits=10, null=True),
        ),
    ]
