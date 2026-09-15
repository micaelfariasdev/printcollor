from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('api', '0002_configuracaoloja_mp_access_token_encrypted_and_more')]

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
