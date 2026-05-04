import os
import sys
import django
from datetime import datetime, timedelta
import random

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from api.models import WhatsAppInstance, Usuario
from django.contrib.auth import get_user_model

User = get_user_model()

def create_fake_instances():
    """Cria instâncias WhatsApp fake"""
    instances_data = [
        {'nome': 'Suporte', 'numero': '5511999990001', 'status': 'connected'},
        {'nome': 'Vendas', 'numero': '5511999990002', 'status': 'connected'},
        {'nome': 'Financeiro', 'numero': '5511999990003', 'status': 'qrcode'},
    ]

    for data in instances_data:
        instance, created = WhatsAppInstance.objects.get_or_create(
            nome=data['nome'],
            defaults={
                'instance_id': f"instance_{data['nome'].lower()}",
                'numero': data['numero'],
                'status': data['status'],
                'ativo': True
            }
        )
        if created:
            print(f'Instância criada: {instance.nome}')
        else:
            print(f'Instância já existe: {instance.nome}')

    return WhatsAppInstance.objects.all()

def create_fake_messages(instances):
    """Cria mensagens fake para as instâncias"""
    from api.models import WhatsAppMessage

    contatos = [
        ('5511988881111', 'João Silva'),
        ('5511988882222', 'Maria Santos'),
        ('5511988883333', 'Pedro Costa'),
        ('5511988884444', 'Ana Lima'),
        ('5511988885555', 'Carlos Mendes'),
    ]

    mensagens_exemplo = [
        "Olá, gostaria de um orçamento de adesivos",
        "Qual o prazo de entrega?",
        "Preciso de 1000 unidades de etiquetas",
        "O arquivo está em PDF, serve?",
        "Quanto fica com acabamento brilho?",
        "Pode fazer em vinil adesivo?",
        "Preciso para dia 15",
        "Sim, o pagamento pode ser no PIX",
        "Obrigado pelo atendimento",
        "Bom dia! Gostaria de saber sobre DTF",
    ]

    for instance in instances:
        # Limpa mensagens antigas desta instância
        WhatsAppMessage.objects.filter(instance=instance).delete()

        for i, (numero, nome_contato) in enumerate(contatos):
            # Cria 5-10 mensagens por contato
            num_msgs = random.randint(5, 10)
            base_time = datetime.now() - timedelta(days=random.randint(0, 7), hours=random.randint(0, 23))

            for j in range(num_msgs):
                timestamp = base_time + timedelta(minutes=j*10)
                from_me = (j % 2 == 0)  # Alterna entre recebido e enviado

                WhatsAppMessage.objects.create(
                    instance=instance,
                    message_id=f"msg_{instance.id}_{numero}_{j}",
                    from_number=numero if not from_me else instance.numero,
                    to_number=instance.numero if not from_me else numero,
                    body=mensagens_exemplo[j % len(mensagens_exemplo)],
                    from_me=from_me,
                    timestamp=timestamp,
                    contato_nome=nome_contato
                )

        print(f'Mensagens criadas para instância: {instance.nome}')

    print('\nDados fake criados com sucesso!')

if __name__ == '__main__':
    print('Criando dados fake para WhatsApp...\n')
    instances = create_fake_instances()
    create_fake_messages(instances)
