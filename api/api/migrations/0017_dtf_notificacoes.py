from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('api', '0016_remove_integracao_whatsapp')]

    operations = [
        migrations.CreateModel(name='DTFNotificacaoConfig', fields=[
            ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('ativo', models.BooleanField(default=False)), ('service_url', models.URLField(default='http://whatsapp-dtf-notifier:3100')),
            ('service_token', models.CharField(blank=True, default='', max_length=128)), ('status_conexao', models.CharField(default='desconectado', max_length=20)),
            ('numero_conectado', models.CharField(blank=True, default='', max_length=30)), ('atualizado_em', models.DateTimeField(auto_now=True)),
        ]),
        migrations.CreateModel(name='DTFNotificacao', fields=[
            ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('evento', models.CharField(choices=[('criado', 'Pedido criado'), ('pedido_feito', 'Pedido feito'), ('pago', 'Pagamento confirmado'), ('impresso', 'Impresso'), ('finalizado', 'Finalizado'), ('manual', 'Reenvio manual')], max_length=20)),
            ('telefone', models.CharField(max_length=20)), ('conteudo', models.TextField(blank=True, default='')),
            ('status', models.CharField(choices=[('pendente', 'Pendente'), ('enviado', 'Enviado'), ('falhou', 'Falhou'), ('cancelado', 'Cancelado')], default='pendente', max_length=12)),
            ('erro', models.TextField(blank=True, default='')), ('tentativas', models.PositiveSmallIntegerField(default=0)),
            ('criado_em', models.DateTimeField(auto_now_add=True)), ('enviado_em', models.DateTimeField(blank=True, null=True)),
            ('dtf', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='notificacoes', to='api.dtfvendor')),
        ]),
    ]
