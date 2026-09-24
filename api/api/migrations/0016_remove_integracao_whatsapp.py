from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [('api', '0015_dtf_fluxo_e_estampa_sem_metragem')]

    operations = [
        migrations.DeleteModel(name='WhatsAppMessage'),
        migrations.DeleteModel(name='WhatsAppInstance'),
        migrations.RemoveField(model_name='cliente', name='jid'),
    ]
