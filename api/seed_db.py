import os
import django
import random
from django.core.files.base import ContentFile
from faker import Faker

# Configuração do ambiente Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from api.models import Empresa, Cliente, Produto, Orcamento, ItemOrcamento, DTFVendor, Usuario

fake = Faker(['pt_BR'])

def popular_banco(n=10):
    print(f"Gerando dados para {n} registros...")

    # 1. Garantir que exista um Usuário (necessário se você for logar)
    if not Usuario.objects.exists():
        Usuario.objects.create_superuser('admin', 'admin@email.com', 'admin123')
        print("- Superusuário 'admin' criado (senha: admin123)")

    # 2. Criar Clientes (Base para tudo)
    clientes = []
    for _ in range(10):
        cli = Cliente.objects.get_or_create(
            cpf=fake.cpf(),
            defaults={
                'nome': fake.name(),
                'email': fake.email(),
                'telefone': fake.cellphone_number()
            }
        )[0]
        clientes.append(cli)

    # 3. Criar Empresas (Para Orçamentos)
    empresas = [Empresa.objects.create(
        nome=fake.company(),
        cnpj=fake.cnpj(),
        email=fake.company_email()
    ) for _ in range(3)]

    # 4. Criar Produtos (Para Orçamentos)
    produtos = [Produto.objects.create(
        nome=fake.word().capitalize() + " " + fake.color_name(),
        preco_base=round(random.uniform(50.0, 200.0), 2)
    ) for _ in range(15)]

    # --- POPULANDO DTFVendor ---
    print("- Populando DTFVendor...")
    for _ in range(n):
        # Criando um arquivo dummy para o layout
        layout_content = ContentFile(b"arquivo_fake_layout", name=f"layout_{fake.word()}.pdf")
        
        dtf = DTFVendor.objects.create(
            cliente=random.choice(clientes),
            layout_arquivo=layout_content,
            tamanho_cm=random.randint(20, 500),
            foi_impresso=random.choice(['pendente', 'impresso']),
            esta_pago=random.choice([True, False]),
            foi_entregue=random.choice([True, False]),
        )
        
        # Se estiver pago, adiciona um comprovante fake
        if dtf.esta_pago:
            dtf.comprovante_pagamento.save(
                f"pix_{dtf.id}.jpg", 
                ContentFile(b"comprovante_fake_bytes")
            )

    # --- POPULANDO Orçamentos ---
    print("- Populando Orçamentos...")
    for _ in range(n):
        orc = Orcamento.objects.create(
            empresa=random.choice(empresas),
            cliente=random.choice(clientes)
        )
        for prod in random.sample(produtos, random.randint(1, 4)):
            ItemOrcamento.objects.create(
                orcamento=orc,
                produto=prod,
                quantidade=random.randint(1, 5),
                preco_negociado=prod.preco_base * random.uniform(0.9, 1.1)
            )

    print("\n✅ Sucesso! Banco de dados populado com:")
    print(f"- {n} Pedidos de DTF")
    print(f"- {n} Orçamentos")

if __name__ == '__main__':
    popular_banco(10)
    