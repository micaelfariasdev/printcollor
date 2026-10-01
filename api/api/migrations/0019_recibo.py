from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0018_dtf_notificacao_templates'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Recibo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome_empresa', models.CharField(max_length=100)),
                ('nome_cliente', models.CharField(max_length=100)),
                ('valor', models.DecimalField(decimal_places=2, max_digits=12)),
                ('referente_a', models.CharField(max_length=255)),
                ('forma_pagamento', models.CharField(choices=[('dinheiro', 'Dinheiro'), ('pix', 'PIX'), ('cartao', 'Cartão'), ('transferencia', 'Transferência'), ('outro', 'Outro')], default='pix', max_length=20)),
                ('data_recebimento', models.DateField(default=django.utils.timezone.localdate)),
                ('observacoes', models.TextField(blank=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('cliente', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='recibos', to='api.cliente')),
                ('criado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='recibos_emitidos', to=settings.AUTH_USER_MODEL)),
                ('empresa', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='recibos', to='api.empresa')),
            ],
            options={'ordering': ['-data_recebimento', '-id']},
        ),
    ]
