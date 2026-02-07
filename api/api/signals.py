from django.db.models.signals import pre_save
from django.dispatch import receiver
import os
from .models import DTFVendor, PedidoFabrica

@receiver(pre_save, sender=DTFVendor)
def auto_delete_file_on_change(sender, instance, **kwargs):
    if not instance.pk:
        return False

    try:
        old_obj = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return False

    # Verifica o Layout
    old_file = old_obj.layout_arquivo
    new_file = instance.layout_arquivo
    if old_file and old_file != new_file:
        if os.path.isfile(old_file.path):
            os.remove(old_file.path)

    # Verifica o Comprovante
    old_comp = old_obj.comprovante_pagamento
    new_comp = instance.comprovante_pagamento
    if old_comp and old_comp != new_comp:
        if os.path.isfile(old_comp.path):
            os.remove(old_comp.path)

@receiver(pre_save, sender=PedidoFabrica)
def auto_delete_layout_on_change(sender, instance, **kwargs):
    if not instance.pk:
        return False

    try:
        old_obj = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return False

    old_layout = old_obj.layout
    new_layout = instance.layout
    
    if old_layout and old_layout != new_layout:
        if os.path.isfile(old_layout.path):
            os.remove(old_layout.path)