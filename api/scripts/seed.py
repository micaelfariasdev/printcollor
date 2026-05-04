import os, sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')

import django
django.setup()

from api.models import (
    Usuario, Empresa, Cliente, Produto, Orcamento,
    PedidoFabrica, DTFVendor, SolicitacaoOrcamento,
    WhatsAppInstance, WhatsAppMessage
)
from datetime import datetime, timedelta
import random

print('=== SEED ===')

# 1. Empresas
e1, _ = Empresa.objects.get_or_create(nome='PrintCollor Centro', defaults={'cnpj': '12.345.678/0001-90', 'template_id': 1})
e2, _ = Empresa.objects.get_or_create(nome='PrintCollor Norte', defaults={'cnpj': '98.765.432/0001-10', 'template_id': 2})
print(f'Empresas: {Empresa.objects.count()}')

# 2. Usuarios adicionais
if not Usuario.objects.filter(username='vendedor1').exists():
    u = Usuario.objects.create_user('vendedor1', 'vendas@printcollor.com', 'vendas123')
    u.nivel_acesso = 'vendas'
    u.save()
if not Usuario.objects.filter(username='financeiro1').exists():
    u = Usuario.objects.create_user('financeiro1', 'fin@printcollor.com', 'fin123')
    u.nivel_acesso = 'financeiro'
    u.save()
print(f'Usuarios: {Usuario.objects.count()}')

# 3. Clientes
clientes_data = [
    ('Joao Silva', '11988881111', 'joao@email.com'),
    ('Maria Santos', '11988882222', 'maria@email.com'),
    ('Pedro Costa', '11988883333', 'pedro@email.com'),
]
for nome, tel, email in clientes_data:
    Cliente.objects.get_or_create(nome=nome, defaults={'telefone': tel, 'email': email, 'empresa': e1})
print(f'Clientes: {Cliente.objects.count()}')

# 4. Produtos
produtos_data = [
    ('Adesivo Vinil', 'Folha', 5.00, 150),
    ('DTF A4', 'Unidade', 8.50, 500),
    ('DTF A3', 'Unidade', 15.00, 300),
]
for nome, unidade, preco, estoque in produtos_data:
    Produto.objects.get_or_create(nome=nome, defaults={'unidade': unidade, 'preco': preco, 'estoque': estoque})
print(f'Produtos: {Produto.objects.count()}')

# 5. Orcamentos
vendedor = Usuario.objects.filter(nivel_acesso='vendas').first()
clientes = list(Cliente.objects.all())
if vendedor and clientes:
    for i in range(5):
        c = clientes[i % len(clientes)]
        Orcamento.objects.get_or_create(cliente=c, defaults={'vendedor': vendedor, 'status': 'pendente', 'total': (i+1)*150})
print(f'Orcamentos: {Orcamento.objects.count()}')

# 6. Pedidos
if clientes:
    for i in range(6):
        c = clientes[i % len(clientes)]
        PedidoFabrica.objects.get_or_create(cliente=c, defaults={'produto': 'DTF', 'quantidade': (i+1)*50, 'valor_total': (i+1)*200, 'status': 'pendente'})
print(f'Pedidos: {PedidoFabrica.objects.count()}')

# 7. DTF
if clientes:
    for i in range(4):
        c = clientes[i % len(clientes)]
        DTFVendor.objects.get_or_create(cliente=c, defaults={'quantidade': (i+1)*10, 'tamanho': 'A4', 'valor': (i+1)*80, 'status': 'pendente'})
print(f'DTF: {DTFVendor.objects.count()}')

# 8. Solicitacoes
if clientes:
    for i in range(3):
        c = clientes[i % len(clientes)]
        SolicitacaoOrcamento.objects.get_or_create(cliente=c, defaults={'descricao': f'Solicitacao {i+1}', 'status': 'pendente'})
print(f'Solicitacoes: {SolicitacaoOrcamento.objects.count()}')

# 9. WhatsApp
inst1, _ = WhatsAppInstance.objects.get_or_create(nome='Suporte', defaults={'instance_id': 'inst_suporte', 'numero': '5511999990001', 'status': 'connected', 'ativo': True})
inst2, _ = WhatsAppInstance.objects.get_or_create(nome='Vendas', defaults={'instance_id': 'inst_vendas', 'numero': '5511999990002', 'status': 'connected', 'ativo': True})
print(f'WhatsApp Instancias: {WhatsAppInstance.objects.count()}')

contatos = [('5511988881111', 'Joao'), ('5511988882222', 'Maria'), ('5511988883333', 'Pedro')]
msgs = ['Ola, orcamento?', 'Qual prazo?', 'Quanto fica?', 'Obrigado!']
base_time = datetime.now() - timedelta(days=2)

for inst in [inst1, inst2]:
    for num, nome in contatos:
        for j in range(4):
            msg_id = f'msg_{inst.id}_{num}_{j}'
            if not WhatsAppMessage.objects.filter(message_id=msg_id).exists():
                WhatsAppMessage.objects.create(
                    instance=inst, message_id=msg_id,
                    from_number=num if j%2==0 else inst.numero,
                    to_number=inst.numero if j%2==0 else num,
                    body=msgs[j%4], from_me=(j%2==0),
                    timestamp=base_time + timedelta(hours=j*2),
                    contato_nome=nome, lida=True
                )
print(f'WhatsApp Mensagens: {WhatsAppMessage.objects.count()}')

print('\n=== SEED CONCLUIDO ===')
