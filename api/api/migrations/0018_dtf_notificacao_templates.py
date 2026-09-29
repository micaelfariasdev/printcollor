from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('api', '0017_dtf_notificacoes')]
    operations = [migrations.AddField(model_name='dtfnotificacaoconfig', name='templates', field=models.JSONField(blank=True, default=dict))]
