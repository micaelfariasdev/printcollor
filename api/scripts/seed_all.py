"""
Script para gerar dados fake para todos os models (dev).
Uso: cd api && venv\\Scripts\\python.exe ..\\scripts\\seed_all.py
"""
import os
import sys
import django
from datetime import datetime, timedelta
import random

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from api.models import (
    Usuario, Empresa, Cliente, Produto, Orcamento,
    PedidoFabrica, SolicitacaoOrcamento, DTFVendor, WhatsAppInstance, WhatsAppMessage
)
from django.contrib.auth import get_user_model

User = get_user_model()

def seed_empresas():
    print('\\n--- Empresas ---')
    dados = [
        {'nome': 'PrintCollor Centro', 'cnpj': '12.345.678/0001-90', 'template_id': 1},
        {'nome': 'PrintCollor Norte', 'cnpj': '98.765.432/0001-10', 'template_id': 2},
    ]
    for d in dados:
        obj, created = Empresa.objects.get_or_create(nome=d['nome'], defaults=d)
        print(f'  {"Criada" if created else "Ja existe"}: {obj.nome}')

def seed_usuarios():
    print('\\n--- Usuarios ---')
    if not Usuario.objects.filter(username='admin').exists():
        Usuario.objects.create_superuser('admin', 'admin@printcollor.com', 'admin123')
        print('  Criado: admin (superuser)')
    else:
        print('  Ja existe: admin')

    users = [
        ('vendedor1', 'vendedor@printcollor.com', 'vendas123', 'vendedor'),
        ('financeiro1', 'fin@printcollor.com', 'fin123', 'financeiro'),
        ('maquina1', 'maquina@printcollor.com', 'maq123', 'maquina'),
    ]
    for u in users:
        if not Usuario.objects.filter(username=u[0]).exists():
            user = Usuario.objects.create_user(u[0], u[1], u[2])
            user.nivel_acesso = u[3]
            user.save()
            print(f'  Criado: {u[0]} ({u[3]})')
        else:
            print(f'  Ja existe: {u[0]}')

def seed_clientes():
    print('\\n--- Clientes ---')
    empresas = list(Empresa.objects.all())
    dados = [
        ('Joao Silva', '11988881111', 'joao@email.com', 1),
        ('Maria Santos', '11988882222', 'maria@email.com', 1),
        ('Pedro Costa', '11988883333', 'pedro@email.com', 2),
        ('Ana Lima', '11988884444', 'ana@email.com', 1),
        ('Carlos Mendes', '11988885555', 'carlos@email.com', 2),
    ]
    for nome, tel, email, emp_idx in dados:
        if not Cliente.objects.filter(telefone=tel).exists():
            c = Cliente.objects.create(
                nome=nome, telefone=tel, email=email,
                empresa=empresas[emp_idx - 1] if empresas else None
            )
            print(f'  Criado: {c.nome}')
        else:
            print(f'  Ja existe: {nome}')

def seed_produtos():
    print('\\n--- Produtos ---')
    dados = [
        ('Adesivo Vinil', 'Folha', 5.00, 150),
        ('DTF A4', 'Unidade', 8.50, 500),
        ('DTF A3', 'Unidade', 15.00, 300),
        ('Etiqueta Branca', 'Rolo', 12.00, 200),
        ('UV Acrilico', 'Unidade', 25.00, 100),
    ]
    for nome, unidade, preco, estoque in dados:
        if not Produto.objects.filter(nome=nome).exists():
            p = Produto.objects.create(nome=nome, unidade=unidade, preco=preco, estoque=estoque)
            print(f'  Criado: {p.nome} (R$ {p.preco})')
        else:
            print(f'  Ja existe: {nome}')

def seed_orcamentos():
    print('\\n--- Orcamentos ---')
    clientes = list(Cliente.objects.all())
    vendedores = list(Usuario.objects.filter(nivel_acesso='vendedor'))
    if not clientes or not vendedores:
        print('  Sem clientes ou vendedores. Pulando...')
        return
    status_list = ['pendente', 'aprovado', 'rejeitado']
    for i in range(8):
        c = random.choice(clientes)
        v = random.choice(vendedores)
        if not Orcamento.objects.filter(cliente=c, id__gt=0).exists():
            o = Orcamento.objects.create(
                cliente=c, vendedor=v,
                status=random.choice(status_list),
                total=round(random.uniform(100, 2000), 2),
                observacoes=f'Orcamento teste #{i+1}'
            )
            print(f'  Criado: Orcamento #{o.id} - {c.nome} (R$ {o.total})')

def seed_dtf():
    print('\\n--- Vendas DTF ---')
    clientes = list(Cliente.objects.all())
    if not clientes:
        print('  Sem clientes. Pulando...')
        return
    for i in range(6):
        c = random.choice(clientes)
        if not DTFVendor.objects.filter(cliente=c).exists():
            d = DTFVendor.objects.create(
                cliente=c,
                quantidade=random.randint(10, 100),
                tamanho=f"{random.choice(['A4', 'A3'])}",
                valor=round(random.uniform(50, 500), 2),
                status=random.choice(['pendente', 'em_producao', 'concluido']),
                data=datetime.now() - timedelta(days=random.randint(0, 30))
            )
            print(f'  Criado: DTF #{d.id} - {c.nome}')

def seed_pedidos():
    print('\\n--- Pedidos Fabrica ---')
    clientes = list(Cliente.objects.all())
    if not clientes:
        print('  Sem clientes. Pulando...')
        return
    status_list = ['pendente', 'em_producao', 'concluido', 'entregue']
    for i in range(10):
        c = random.choice(clientes)
        if not PedidoFabrica.objects.filter(cliente=c).exists():
            p = PedidoFabrica.objects.create(
                cliente=c,
                produto='DTF' if random.choice([True, False]) else 'Adesivo',
                quantidade=random.randint(10, 500),
                valor_total=round(random.uniform(100, 3000), 2),
                status=random.choice(status_list),
                data_pedido=datetime.now() - timedelta(days=random.randint(0, 20))
            )
            print(f'  Criado: Pedido #{p.id} - {c.nome} ({p.status})')

def seed_solicitacoes():
    print('\\n--- Solicitacoes de Orcamento (Site) ---')
    clientes = list(Cliente.objects.all())
    if not clientes:
        print('  Sem clientes. Pulando...')
        return
    for i in range(5):
        c = random.choice(clientes)
        if not SolicitacaoOrcamento.objects.filter(cliente=c).exists():
            s = SolicitacaoOrcamento.objects.create(
                cliente=c,
                descricao=f'Solicitacao de orcamento para {random.choice(["adesivos", "DTF", "UV", "etiquetas"])}',
                status=random.choice(['pendente', 'respondida']),
                data=datetime.now() - timedelta(days=random.randint(0, 15))
            )
            print(f'  Criada: Solicitacao #{s.id} - {c.nome}')

def seed_whatsapp():
    print('\\n--- WhatsApp ---')
    inst1, _ = WhatsAppInstance.objects.get_or_create(
        nome='Suporte',
        defaults={'instance_id': 'inst_suporte', 'numero': '5511999990001', 'status': 'connected', 'ativo': True}
    )
    inst2, _ = WhatsAppInstance.objects.get_or_create(
        nome='Vendas',
        defaults={'instance_id': 'inst_vendas', 'numero': '5511999990002', 'status': 'connected', 'ativo': True}
    )
    print(f'  Instancias: {inst1.nome}, {inst2.nome}')

    contatos = [('5511988881111', 'Joao'), ('5511988882222', 'Maria'), ('5511988883333', 'Pedro')]
    msgs_exemplo = [
        'Ola, gostaria de orcamento', 'Qual o prazo?', 'Preciso de 500 unidades',
        'Arquivo em PDF', 'Quanto fica?', 'Obrigado', 'Bom dia', 'DTF disponivel?'
    ]
    base_time = datetime.now() - timedelta(days=2)

    for inst in [inst1, inst2]:
        for num, nome in contatos:
            for j in range(random.randint(4, 8)):
                WhatsAppMessage.objects.create(
                    instance=inst,
                    message_id=f'msg_{inst.id}_{num}_{j}',
                    from_number=num if j % 2 == 0 else inst.numero,
                    to_number=inst.numero if j % 2 == 0 else num,
                    body=random.choice(msgs_exemplo),
                    from_me=(j % 2 == 0),
                    timestamp=base_time + timedelta(hours=j*2),
                    contato_nome=nome,
                    lida=random.choice([True, False])
                )
        print(f'  Mensagens criadas para {inst.nome}')

if __name__ == '__main__':
    print('=' * 50)
    print('SEED: Gerando dados fake para dev')
    print('=' * 50)

    seed_empresas()
    seed_usuarios()
    seed_clientes()
    seed_produtos()
    seed_orcamentos()
    seed_dtf()
    seed_pedidos()
    seed_solicitacoes()
    seed_whatsapp()

    print('\\n' + '=' * 50)
    print('SEED: Concluido!')
    print(f'  Empresas: {Empresa.objects.count()}')
    print(f'  Usuarios: {Usuario.objects.count()}')
    print(f'  Clientes: {Cliente.objects.count()}')
    print(f'  Produtos: {Produto.objects.count()}')
    print(f'  Orcamentos: {Orcamento.objects.count()}')
    print(f'  DTF: {DTFVendor.objects.count()}')
    print(f'  Pedidos: {PedidoFabrica.objects.count()}')
    print(f'  Solicitacoes: {SolicitacaoOrcamento.objects.count()}')
    print(f'  WhatsApp Instancias: {WhatsAppInstance.objects.count()}')
    print(f'  WhatsApp Mensagens: {WhatsAppMessage.objects.count()}')
    print('=' * 50 + '\\n')
