import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from api.models import WhatsAppInstance


def sincronizar_instance_id():
    instancias = WhatsAppInstance.objects.all()

    for inst in instancias:
        novo_id = inst.nome

        if inst.instance_id != novo_id:
            inst.instance_id = novo_id
            inst.save(update_fields=["instance_id"])
            print(f"✔ Atualizado: {inst.nome} -> {novo_id}")
        else:
            print(f"⚠ Já ok: {inst.nome}")


if __name__ == "__main__":
    sincronizar_instance_id()