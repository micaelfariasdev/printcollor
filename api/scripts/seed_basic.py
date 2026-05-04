"""
Seed básico para dev - cria dados fake rapidamente.
Uso: cd api && venv\Scripts\python.exe ../scripts/seed_basic.py
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from api.models import (
    Usuario, Empresa, Cliente, Produto, Orcamento,
    PedidoFabrica, SolicitacaoOrcamento, DTFVendor,
    WhatsAppInstance, WhatsAppMessage
)
from django.contrib.auth import get_user_model

User = get_user_model()

print('\n=== SEED BÁSICO PARA DEV ===\n')

# Empresas
print('Empresas:')
e1, _ = Empresa.objects.get_or_create(nome='PrintCollor Centro', defaults={'cnpj': '12.345.678/0001-90', 'template_id': 1})
e2, _ = Empresa.objects.get_or_create(nome='PrintCollor Norte', defaults={'cnpj': '98.765.432/0001-10', 'template_id': 2})
print(f'  {e1.nome}')
print(f'  {e2.nome}')

# Usuários adicionais
print('\nUsuários:')
if not User.objects.filter(username='vendedor1').exists():
    u = User.objects.create_user('vendedor1', 'vendas@printcollor.com', 'vendas123')
    u.nivel_acesso = 'vendas'
    u.save()
    print('  Criado: vendedor1')
if not User.objects.filter(username='financeiro1').exists():
    u = User.objects.create_user('financeiro1', 'fin@printcollor.com', 'fin123')
    u.nivel_acesso = 'financeiro'
    u.save()
    print('  Criado: financeiro1')

# Clientes
print('\nClientes:')
clientes_data = [
    ('João Silva', '11988881111', 'joao@email.com'),
    ('Maria Santos', '11988882222', 'maria@email.com'),
    ('Pedro Costa', '11988883333', 'pedro@email.com'),
]
for nome, tel, email in clientes_data:
    c, created = Cliente.objects.get_or_create(
        nome=nome,
        defaults={'telefone': tel, 'email': email, 'empresa': e1}
    )
    if created:
        print(f'  Criado: {nome}')

# Produtos
print('\nProdutos:')
produtos_data = [
    ('Adesivo Vinil', 'Folha', 5.00, 150),
    ('DTF A4', 'Unidade', 8.50, 500),
    ('DTF A3', 'Unidade', 15.00, 300),
    ('Etiqueta Branca', 'Rolo', 12.00, 200),
]
for nome, unidade, preco, estoque in produtos_data:
    p, created = Produto.objects.get_or_create(
        nome=nome,
        defaults={'unidade': unidade, 'preco': preco, 'estoque': estoque}
    )
    if created:
        print(f'  Criado: {nome}')

# Orçamentos
print('\nOrçamentos:')
vendedor = User.objects.filter(nivel_acesso='vendas').first()
clientes = Cliente.objects.all()
if vendedor and clientes:
    for i in range(5):
        c = clientes[i % len(clientes)]
        o, created = Orcamento.objects.get_or_create(
            cliente=c,
            defaults={
                'vendedor': vendedor,
                'status': ['pendente', 'aprovado', 'rejeitado'][i % 3],
                'total': (i+1) * 150.00,
                'observacoes': f'Orçamento teste #{i+1}'
            }
        )
        if created:
            print(f'  Criado: Orçamento #{o.id} - {c.nome}')

# Pedidos Fábrica
print('\nPedidos Fábrica:')
if clientes:
    for i in range(6):
        c = clientes[i % len(clientes)]
        p, created = PedidoFabrica.objects.get_or_create(
            cliente=c,
            defaults={
                'produto': 'DTF' if i % 2 == 0 else 'Adesivo',
                'quantidade': (i+1) * 50,
                'valor_total': (i+1) * 200.00,
                'status': ['pendente', 'em_producao', 'concluido'][i % 3],
            }
        )
        if created:
            print(f'  Criado: Pedido #{p.id} - {c.nome}')

# DTF Vendor
print('\nVendas DTF:')
if clientes:
    for i in range(4):
        c = clientes[i % len(clientes)]
        d, created = DTFVendor.objects.get_or_create(
            cliente=c,
            defaults={
                'quantidade': (i+1) * 10,
                'tamanho': 'A4' if i % 2 == 0 else 'A3',
                'valor': (i+1) * 80.00,
                'status': ['pendente', 'em_producao', 'concluido'][i % 3],
            }
        )
        if created:
            print(f'  Criado: DTF #{d.id} - {c.nome}')

# Solicitações de Orçamento
print('\nSolicitações (Site):')
if clientes:
    for i in range(3):
        c = clientes[i % len(clientes)]
        s, created = SolicitacaoOrcamento.objects.get_or_create(
            cliente=c,
            defaults={
                'descricao': f'Solicitação para {"DTF" if i%2==0 else "Adesivos"}',
                'status': ['pendente', 'respondida'][i % 2],
            }
        )
        if created:
            print(f'  Criada: Solicitação #{s.id}')

# WhatsApp
print('\nWhatsApp:')
inst1, _ = WhatsAppInstance.objects.get_or_create(
    nome='Suporte',
    defaults={'instance_id': 'inst_suporte', 'numero': '5511999990001', 'status': 'connected', 'ativo': True}
)
inst2, _ = WhatsAppInstance.objects.get_or_create(
    nome='Vendas',
    defaults={'instance_id': 'inst_vendas', 'numero': '5511999990002', 'status': 'connected', 'ativo': True}
)
print(f'  Instâncias: {inst1.nome}, {inst2.nome}')

contatos = [('5511988881111', 'João'), ('5511988882222', 'Maria'), ('5511988883333', 'Pedro')]
from datetime import datetime, timedelta
base_time = datetime.now() - timedelta(days=2)
msgs_exemplo = ['Olá, orçamento?', 'Qual prazo?', 'Quanto fica?', 'Obrigado!', 'Bom dia!']

for inst in [inst1, inst2]:
    for num, nome in contatos:
        for j in range(4):
            msg_id = f'msg_{inst.id}_{num}_{j}'
            if not WhatsAppMessage.objects.filter(message_id=msg_id).exists():
                WhatsAppMessage.objects.create(
                    instance=inst,
                    message_id=msg_id,
                    from_number=num if j % 2 == 0 else inst.numero,
                    to_number=inst.numero if j % 2 == 0 else num,
                    body=msgs_exemplo[j % len(msgs_exemplo)],
                    from_me=(j % 2 == 0),
                    timestamp=base_time + timedelta(hours=j*2),
                    contato_nome=nome,
                    lida=True
                )
    print(f'  Mensagens criadas para {inst.nome}')

print('\n=== RESUMO ===')
print(f'Empresas: {Empresa.objects.count()}')
print(f'Usuários: {Usuario.objects.count()}')
print(f'Clientes: {Cliente.objects.count()}')
print(f'Produtos: {Produto.objects.count()}')
print(f'Orçamentos: {Orcamento.objects.count()}')
print(f'Pedidos: {PedidoFabrica.objects.count()}')
print(f'DTF: {DTFVendor.objects.count()}')
print(f'Solicitações: {SolicitacaoOrcamento.objects.count()}')
print(f'WhatsApp Instâncias: {WhatsAppInstance.objects.count()}')
print(f'WhatsApp Mensagens: {WhatsAppMessage.objects.count()}')
print('\n=== SEED CONCLUÍDO ===\n')
