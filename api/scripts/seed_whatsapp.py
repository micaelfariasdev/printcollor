"""
Script para gerar dados fake de WhatsApp (instancias e mensagens) no SQLite.
Uso: cd api && venv\\Scripts\\python.exe ..\\scripts\\seed_whatsapp.py
"""
import os
import sys
import django
from datetime import datetime, timedelta
import random

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from api.models import WhatsAppInstance, WhatsAppMessage

def criar_instancia(nome, numero, status):
    instance, created = WhatsAppInstance.objects.get_or_create(
        nome=nome,
        defaults={
            'instance_id': f"inst_{nome.lower().replace(' ', '_')}",
            'numero': numero,
            'status': status,
            'ativo': True,
        }
    )
    if created:
        print(f'  OK Instancia criada: {nome} ({numero})')
    else:
        print(f'  - Instancia ja existe: {nome}')
    return instance

def gerar_mensagens(instance):
    # Limpa mensagens antigas desta instancia
    WhatsAppMessage.objects.filter(instance=instance).delete()

    contatos = [
        ('5511988881111', 'Joao Silva'),
        ('5511988882222', 'Maria Santos'),
        ('5511988883333', 'Pedro Costa'),
        ('5511988884444', 'Ana Lima'),
        ('5511988885555', 'Carlos Mendes'),
    ]

    mensagens_exemplo = [
        "Ola, gostaria de um orcamento de adesivos",
        "Qual o prazo de entrega?",
        "Preciso de 1000 unidades de etiquetas",
        "O arquivo esta em PDF, serve?",
        "Quanto fica com acabamento brilho?",
        "Pode fazer em vinil adesivo?",
        "Preciso para dia 15",
        "Sim, o pagamento pode ser no PIX",
        "Obrigado pelo atendimento",
        "Bom dia! Gostaria de saber sobre DTF",
        "Tem pronta entrega?",
        "Posso passar o arquivo via WeTransfer?",
    ]

    total = 0
    base_time = datetime.now() - timedelta(days=3)

    for numero, nome in contatos:
        num_msgs = random.randint(6, 12)
        for j in range(num_msgs):
            from_me = (j % 2 == 0)
            timestamp = base_time + timedelta(
                days=random.randint(0, 2),
                hours=random.randint(8, 18),
                minutes=j * 8
            )
            WhatsAppMessage.objects.create(
                instance=instance,
                message_id=f"msg_{instance.id}_{numero}_{j}_{random.randint(1000,9999)}",
                from_number=numero if not from_me else instance.numero,
                to_number=instance.numero if not from_me else numero,
                body=random.choice(mensagens_exemplo),
                from_me=from_me,
                timestamp=timestamp,
                contato_nome=nome,
                lida=random.choice([True, False]),
            )
            total += 1

    print(f'  OK {total} mensagens criadas para {instance.nome}')

if __name__ == '__main__':
    print('\nGerando dados fake para WhatsApp...\n')

    print('Instancias:')
    inst1 = criar_instancia('Suporte', '5511999990001', 'connected')
    inst2 = criar_instancia('Vendas', '5511999990002', 'connected')
    inst3 = criar_instancia('Financeiro', '5511999990003', 'qrcode')

    print('\nMensagens:')
    for inst in [inst1, inst2, inst3]:
        gerar_mensagens(inst)

    print(f'\nDados criados! Total de instancias: {WhatsAppInstance.objects.count()}')
    print(f'Total de mensagens: {WhatsAppMessage.objects.count()}\n')
