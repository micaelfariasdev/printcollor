from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('api', '0001_initial')]
    operations = [
        migrations.AddField(model_name='configuracaoloja', name='mp_access_token_encrypted', field=models.TextField(blank=True, default='')),
        migrations.AddField(model_name='configuracaoloja', name='mp_connected', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='configuracaoloja', name='mp_connected_em', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='configuracaoloja', name='mp_percentual_taxa', field=models.DecimalField(decimal_places=2, default=Decimal('4.99'), max_digits=5)),
        migrations.AddField(model_name='configuracaoloja', name='mp_refresh_token_encrypted', field=models.TextField(blank=True, default='')),
        migrations.AddField(model_name='configuracaoloja', name='mp_token_expires_em', field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name='configuracaoloja', name='mp_user_id', field=models.CharField(blank=True, default='', max_length=64)),
        migrations.AddField(model_name='dtfvendor', name='codigo_publico', field=models.CharField(blank=True, db_index=True, max_length=12, null=True, unique=True)),
        migrations.AddField(model_name='dtfvendor', name='comprovante_mp_data', field=models.JSONField(blank=True, null=True)),
        migrations.AlterField(model_name='dtfvendor', name='status', field=models.CharField(choices=[('orcamento', 'Orçamento'), ('aprovado', 'Aprovado'), ('em_producao', 'Em Produção'), ('impresso', 'Impresso'), ('finalizado', 'Finalizado')], default='orcamento', max_length=20)),
    ]
