from django.core.management.base import BaseCommand
from api.models import DTFVendor


class Command(BaseCommand):
    help = 'Sincroniza o campo status de todos os DTFVendor com base nos flags esta_pago, foi_impresso e foi_entregue'

    def handle(self, *args, **options):
        dtfs = DTFVendor.objects.all()
        atualizados = 0
        for dtf in dtfs:
            old_status = dtf.status
            dtf.atualizar_status()
            if dtf.status != old_status:
                dtf.save(update_fields=['status'])
                atualizados += 1
        self.stdout.write(self.style.SUCCESS(f'OK. {atualizados} de {dtfs.count()} DTFs atualizados.'))