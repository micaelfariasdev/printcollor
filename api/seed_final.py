import os, sys
sys.path.append('F:\\printcollor\\api')
os.environ['DJANGO_SETTINGS_MODULE'] = 'project.settings'
import django
django.setup()

from api.models import (Usuario, Empresa, Cliente, Produto, Orcamento,
    PedidoFabrica, DTFVendor, SolicitacaoOrcamento,
    WhatsAppInstance, WhatsAppMessage)
from django.contrib.auth import get_user_model
User = get_user_model()

print('=== SEED ===')

# Empresas
e1, _ = Empresa.objects.get_or_create(nome='PrintCollor Centro', defaults={'cnpj': '12.345.678/0001-90', 'template_id': 1})
e2, _ = Empresa.objects.get_or_create(nome='PrintCollor Norte', defaults={'cnpj': '98.765.432/0001-10', 'template_id': 2})
print('Empresas:', Empresa.objects.count())

# Usuarios
if not User.objects.filter(username='vendedor1').exists():
    u = User.objects.create_user('vendedor1', 'vendas@printcollor.com', 'vendas123')
    u.nivel_acesso = 'vendas'
    u.save()
if not User.objects.filter(username='financeiro1').exists():
    u = User.objects.create_user('financeiro1', 'fin@printcollor.com', 'fin123')
    u.nivel_acesso = 'financeiro'
    u.save()
print('Usuarios:', User.objects.count())

# Clientes
clientes_data = [('Joao Silva', '11988881111', 'joao@email.com'), ('Maria Santos', '11988882222', 'maria@email.com'), ('Pedro Costa', '11988883333', 'pedro@email.com')]
for n, t, e in clientes_data:
    Cliente.objects.get_or_create(nome=n, defaults={'telefone': t, 'email': e, 'empresa': e1})
print('Clientes:', Cliente.objects.count())

# Produtos
produtos_data = [('Adesivo Vinil', 'Folha', 5.00, 150), ('DTF A4', 'Unidade', 8.50, 500), ('DTF A3', 'Unidade', 15.00, 300)]
for n, u, p, es in produtos_data:
    Produto.objects.get_or_create(nome=n, defaults={'unidade': u, 'preco': p, 'estoque': es})
print('Produtos:', Produto.objects.count())

# Orcamentos
v = User.objects.filter(nivel_acesso='vendas').first()
cs = list(Cliente.objects.all())
for i, c in enumerate(cs):
    Orcamento.objects.get_or_create(cliente=c, defaults={'vendedor': v, 'status': 'pendente', 'total': (i+1)*150})
print('Orcamentos:', Orcamento.objects.count())

# Pedidos
for i, c in enumerate(cs):
    PedidoFabrica.objects.get_or_create(cliente=c, defaults={'produto': 'DTF', 'quantidade': (i+1)*50, 'valor_total': (i+1)*200, 'status': 'pendente'})
print('Pedidos:', PedidoFabrica.objects.count())

# DTF
for i, c in enumerate(cs):
    DTFVendor.objects.get_or_create(cliente=c, defaults={'quantidade': (i+1)*10, 'tamanho': 'A4', 'valor': (i+1)*80, 'status': 'pendente'})
print('DTF:', DTFVendor.objects.count())

# Solicitacoes
for i, c in enumerate(cs):
    SolicitacaoOrcamento.objects.get_or_create(cliente=c, defaults={'descricao': 'Solicitacao ' + str(i+1), 'status': 'pendente'})
print('Solicitacoes:', SolicitacaoOrcamento.objects.count())

# WhatsApp
inst1, _ = WhatsAppInstance.objects.get_or_create(nome='Suporte', defaults={'instance_id': 'inst_suporte', 'numero': '5511999990001', 'status': 'connected', 'ativo': True})
inst2, _ = WhatsAppInstance.objects.get_or_create(nome='Vendas', defaults={'instance_id': 'inst_vendas', 'numero': '5511999990002', 'status': 'connected', 'ativo': True})
print('WhatsApp instancias:', WhatsAppInstance.objects.count())

# Mensagens
contatos = [('5511988881111', 'Joao'), ('5511988882222', 'Maria'), ('5511988883333', 'Pedro')]
msgs = ['Ola, orcamento?', 'Qual prazo?', 'Quanto fica?', 'Obrigado!', 'Bom dia!']
from datetime import datetime, timedelta
base = datetime.now() - timedelta(days=2)
for inst in [inst1, inst2]:
    for num, nome in contatos:
        for j in range(4):
            mid = 'msg_' + str(inst.id) + '_' + str(num) + '_' + str(j)
            if not WhatsAppMessage.objects.filter(message_id=mid).exists():
                WhatsAppMessage.objects.create(instance=inst, message_id=mid, from_number=num if j%2==0 else inst.numero, to_number=inst.numero if j%2==0 else num, body=msgs[j%5], from_me=(j%2==0), timestamp=base + timedelta(hours=j*2), contato_nome=nome, lida=True)
    print('Mensagens para', inst.nome, ':', WhatsAppMessage.objects.filter(instance=inst).count())

print('WhatsApp mensagens:', WhatsAppMessage.objects.count())
print('=== SEED CONCLUIDO ===')
