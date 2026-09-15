from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('api', '0001_initial')]

    # Esta migration ja esta aplicada em producao. Declarar o modelo inteiro
    # corrige apenas o estado do Django para as migrations seguintes.
    operations = [
        migrations.CreateModel(
            name='ConfiguracaoLoja',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pix_chave_telefone', models.CharField(blank=True, max_length=20, null=True)),
                ('pix_beneficiario', models.CharField(default='Loja', max_length=25)),
                ('pix_cidade', models.CharField(default='Sao Paulo', max_length=15)),
                ('mp_connected', models.BooleanField(default=False)),
                ('mp_user_id', models.CharField(blank=True, default='', max_length=64)),
                ('mp_access_token_encrypted', models.TextField(blank=True, default='')),
                ('mp_refresh_token_encrypted', models.TextField(blank=True, default='')),
                ('mp_token_expires_em', models.DateTimeField(blank=True, null=True)),
                ('mp_percentual_taxa', models.DecimalField(decimal_places=2, default=Decimal('4.99'), max_digits=5)),
                ('mp_connected_em', models.DateTimeField(blank=True, null=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.AddField(model_name='dtfvendor', name='codigo_publico', field=models.CharField(blank=True, db_index=True, max_length=12, null=True, unique=True)),
        migrations.AddField(model_name='dtfvendor', name='comprovante_mp_data', field=models.JSONField(blank=True, null=True)),
        migrations.AlterField(model_name='dtfvendor', name='status', field=models.CharField(choices=[('orcamento', 'Orcamento'), ('aprovado', 'Aprovado'), ('em_producao', 'Em Producao'), ('impresso', 'Impresso'), ('finalizado', 'Finalizado')], default='orcamento', max_length=20)),
    ]
