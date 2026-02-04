from django.utils import timezone
from django.db import models
from django.contrib.auth.models import AbstractUser
from decimal import Decimal


class Usuario(AbstractUser):
    NIVEIS = (
        ('vendedor', 'Vendedor'),
        ('financeiro', 'Financeiro'),
    )
    nivel_acesso = models.CharField(
        max_length=20, choices=NIVEIS, default='vendedor')

    def __str__(self):
        return self.username


class Empresa(models.Model):
    OPCOES_TEMPLATE = [
        (1, 'Empresa 1'),
        (2, 'Empresa 2'),
        (3, 'Empresa 3'),
    ]

    template_id = models.IntegerField(choices=OPCOES_TEMPLATE, default=1)
    nome = models.CharField(max_length=100)
    cnpj = models.CharField(max_length=18, unique=True)
    endereco = models.CharField(max_length=255, null=True, blank=True)
    telefone = models.CharField(max_length=15, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)

    def __str__(self):
        return self.nome


class Cliente(models.Model):
    nome = models.CharField(max_length=100)
    cpf = models.CharField(max_length=14, unique=True, null=True, blank=True)
    cnpj = models.CharField(max_length=18, unique=True, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    telefone = models.CharField(max_length=15, null=True, blank=True)

    def __str__(self):
        return self.nome


class Produto(models.Model):
    nome = models.CharField(max_length=255)
    preco_base = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return self.nome


class Orcamento(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    produtos = models.ManyToManyField(Produto, through='ItemOrcamento')
    data_criacao = models.DateTimeField(auto_now_add=True)

    @property
    def valor_total(self):
        # Usamos 'itens' porque é o related_name que definimos abaixo
        return sum(item.subtotal for item in self.itens.all())


class ItemOrcamento(models.Model):
    orcamento = models.ForeignKey(
        Orcamento, related_name='itens', on_delete=models.CASCADE)

    # Mudamos para SET_NULL para o item NÃO ser deletado
    produto = models.ForeignKey(
        Produto, on_delete=models.SET_NULL, null=True, blank=True)

    # Campo para salvar o nome caso o produto seja deletado no futuro
    produto_nome_no_ato = models.CharField(
        max_length=255, null=True, blank=True)

    descricao = models.CharField(max_length=255, null=True, blank=True)
    quantidade = models.PositiveIntegerField(default=1)
    preco_negociado = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        # Se o produto existir e o nome ainda não foi salvo, congela o nome
        if self.produto and not self.produto_nome_no_ato:
            self.produto_nome_no_ato = self.produto.nome
        super().save(*args, **kwargs)

    @property
    def subtotal(self):
        return self.quantidade * self.preco_negociado

    @property
    def nome_exibicao(self):
        # Prioriza o nome congelado para o histórico não quebrar
        return self.produto_nome_no_ato or (self.produto.nome if self.produto else "Produto Excluído")


class DTFVendor(models.Model):
    STATUS_IMPRESSAO = (
        ('pendente', 'Pendente'),
        ('impresso', 'Impresso'),
    )

    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    layout_arquivo = models.FileField(upload_to='layouts/%Y/%m/%d/')
    tamanho_cm = models.DecimalField(
        max_digits=10, decimal_places=2, help_text="Tamanho em centímetros lineares")

    data_criacao = models.DateTimeField(auto_now_add=True)
    data_entrega = models.DateTimeField(null=True, blank=True)

    foi_impresso = models.CharField(
        max_length=15, choices=STATUS_IMPRESSAO, default='pendente')
    esta_pago = models.BooleanField(default=False)
    foi_entregue = models.BooleanField(default=False)

    comprovante_pagamento = models.ImageField(
        upload_to='comprovantes/%Y/%m/%d/', null=True, blank=True)

    def valor_total(self):
        # Transforme todos os números em Decimal
        preco_por_metro = Decimal('35.00')
        cem = Decimal('100.0')
        tot = (self.tamanho_cm / cem) * preco_por_metro

        if tot < Decimal('20.00'):
            return Decimal('20.00')

        # Agora o cálculo funciona perfeitamente
        return (self.tamanho_cm / cem) * preco_por_metro

    def __str__(self):
        return f"{self.cliente.nome} - {self.tamanho_cm}cm ({self.get_foi_impresso_display()})"
