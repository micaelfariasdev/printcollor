from django.utils import timezone
from django.db import models
from django.contrib.auth.models import AbstractUser
from decimal import Decimal
import os
import random
import string


def gerar_codigo(tamanho=6):
    # Define o conjunto de caracteres: ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
    caracteres = string.ascii_uppercase + string.digits
    codigo = ''.join(random.choices(caracteres, k=tamanho))
    return codigo


def path_layout_dtf(instance, filename):
    ext = filename.split('.')[-1]
    nome = f"layout_dtf_{instance.id if instance.id else gerar_codigo()}.{ext}"
    return os.path.join('dtf/layouts/', nome)


def path_layout(instance, filename):
    ext = filename.split('.')[-1]
    nome = f"layout_pedido_{instance.id if instance.id else gerar_codigo()}.{ext}"
    return os.path.join('pedidos/layouts/', nome)


def path_comprovante_dtf(instance, filename):
    ext = filename.split('.')[-1]
    nome = f"comprovante_dtf_{instance.id if instance.id else gerar_codigo()}.{ext}"
    return os.path.join('dtf/comprovantes/', nome)


class Usuario(AbstractUser):
    NIVEIS = (
        ('vendedor', 'Vendedor'),
        ('financeiro', 'Financeiro'),
        ('maquina', 'Máquina'),
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
    cnpj = models.CharField(max_length=18, null=True, blank=True)
    endereco = models.CharField(max_length=255, null=True, blank=True)
    telefone = models.CharField(max_length=15, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)

    def __str__(self):
        return self.nome


class Cliente(models.Model):
    nome = models.CharField(max_length=100)
    cpf = models.CharField(max_length=14, unique=False, null=True, blank=True)
    cnpj = models.CharField(max_length=18, unique=False, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    telefone = models.CharField(max_length=15, null=True, blank=True)
    numero = models.CharField(max_length=20, null=True, blank=True)  # Apenas números (ex: 5511999999999)
    jid = models.CharField(max_length=53, null=True, blank=True, unique=True)  # JID completo do WhatsApp (ex: 5511999999999@s.whatsapp.net)

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
    agencia = models.CharField(max_length=255, null=True, blank=True)
    campanha = models.CharField(max_length=255, null=True, blank=True)
    data_print = models.DateTimeField(null=True, blank=True)

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
    TIPOS_PRODUTO = (
        ('dtf_textil', 'DTF Têxtil'),
        ('dtf_uv', 'DTF UV'),
        ('sublimacao', 'Sublimação'),
    )
    UNIDADES = (
        ('ml', 'Metro Linear'),
        ('m2', 'Metro Quadrado'),
    )

    STATUS_IMPRESSAO = (
        ('pendente', 'Pendente'),
        ('impresso', 'Impresso'),
    )

    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    layout_arquivo = models.FileField(upload_to=path_layout_dtf)
    tamanho_cm = models.DecimalField(
        max_digits=10, decimal_places=2, help_text="Tamanho em centímetros lineares")
    tipo_produto = models.CharField(
        max_length=20, choices=TIPOS_PRODUTO, default='dtf_textil')
    unidade = models.CharField(max_length=2, choices=UNIDADES, default='ml')

    data_criacao = models.DateTimeField(auto_now_add=True)
    data_entrega = models.DateTimeField(null=True, blank=True)

    foi_impresso = models.CharField(
        max_length=15, choices=STATUS_IMPRESSAO, default='pendente')
    esta_pago = models.BooleanField(default=False)
    foi_entregue = models.BooleanField(default=False)

    comprovante_pagamento = models.ImageField(
        upload_to=path_comprovante_dtf, null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.tipo_produto in ('dtf_textil', 'dtf_uv'):
            self.unidade = 'ml'
        else:
            self.unidade = 'm2'
        super().save(*args, **kwargs)

    def valor_total(self):
        from django.conf import settings
        from .models import DTFConfig
        try:
            config = DTFConfig.objects.get(tipo_produto=self.tipo_produto)
            preco_por_metro = config.valor_metro
            preco_minimo = config.preco_minimo
        except DTFConfig.DoesNotExist:
            preco_por_metro = Decimal('35.00')
            preco_minimo = Decimal('20.00')

        if self.unidade == 'm2':
            # Sublimação: tamanho_cm é tratado como cm², converter para m²
            area_m2 = self.tamanho_cm / Decimal('10000')
            tot = area_m2 * preco_por_metro
        else:
            # DTF Têxtil/UV: tamanho_cm / 100 = metros lineares
            tot = (self.tamanho_cm / Decimal('100')) * preco_por_metro

        if tot < preco_minimo:
            return preco_minimo

        return tot

    def __str__(self):
        tipo = dict(self.TIPOS_PRODUTO).get(self.tipo_produto, '')
        return f"{self.cliente.nome} - {self.tamanho_cm}cm ({self.get_foi_impresso_display()}) [{tipo}]"


class DTFConfig(models.Model):
    TIPOS_PRODUTO = (
        ('dtf_textil', 'DTF Têxtil'),
        ('dtf_uv', 'DTF UV'),
        ('sublimacao', 'Sublimação'),
    )

    tipo_produto = models.CharField(max_length=20, choices=TIPOS_PRODUTO, unique=True)
    valor_metro = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('35.00'))
    preco_minimo = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('20.00'))

    class Meta:
        verbose_name = 'Configuração DTF'
        verbose_name_plural = 'Configurações DTF'

    def __str__(self):
        return f"{self.get_tipo_produto_display()}: R$ {self.valor_metro}/m"


class PedidoFabrica(models.Model):
    STATUS_PEDIDO = (
        ('pendente', 'Pendente'),
        ('em_producao', 'Em Produção'),
        ('finalizado', 'Finalizado'),
    )

    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    nome_descricao = models.CharField(max_length=255)
    descricao = models.CharField(max_length=255)
    material = models.CharField(max_length=100)
    aplicacao_arte = models.CharField(max_length=100)
    detalhes_tamanho = models.JSONField(
        default=dict, help_text="Grade de tamanhos ou quantidade única")
    layout = models.FileField(upload_to=path_layout, null=False, blank=False)
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_entrega = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_PEDIDO, default='pendente')

    def total_itens(self):
        return sum(self.detalhes_tamanho.values())

    def __str__(self):
        return f"{self.cliente.nome} - {self.descricao} ({self.get_status_display()})"


class WhatsAppInstance(models.Model):
    STATUS_CHOICES = (
        ('ativo', 'Ativo'),
        ('inativo', 'Inativo'),
        ('conectando', 'Conectando'),
        ('desconectado', 'Desconectado'),
    )

    nome = models.CharField(max_length=100, unique=True)
    instance_id = models.CharField(max_length=100, unique=True)
    numero = models.CharField(max_length=20, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inativo')
    cor = models.CharField(max_length=7, default='#25D366', help_text="Cor em hexadecimal para o chat!")
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    profile_pic_url = models.URLField(max_length=500, blank=True, default='')
    phone_number = models.CharField(max_length=20, blank=True, default='')
    connection_status = models.CharField(max_length=50, blank=True, default='')

    def __str__(self):
        return f"{self.nome} ({self.numero})"

    class Meta:
        ordering = ['-criado_em']


class WhatsAppMessage(models.Model):
    MSG_TYPES = (
        ('text', 'Texto'),
        ('image', 'Imagem'),
        ('video', 'Vídeo'),
        ('audio', 'Áudio'),
        ('document', 'Documento'),
        ('sticker', 'Sticker'),
        ('contact', 'Contato'),
        ('location', 'Localização'),
    )

    message_id = models.CharField(max_length=255, unique=True)
    instance = models.ForeignKey(
        WhatsAppInstance, related_name='mensagens', on_delete=models.CASCADE)
    from_number = models.CharField(max_length=20)
    to_number = models.CharField(max_length=20)
    body = models.TextField()
    from_me = models.BooleanField(default=False)
    timestamp = models.DateTimeField()
    contato_nome = models.CharField(max_length=100, blank=True, default='')
    lida = models.BooleanField(default=False)
    msg_type = models.CharField(max_length=20, choices=MSG_TYPES, default='text')
    media_url = models.TextField(blank=True, default='')
    reply_to = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.from_number} -> {self.to_number}: {self.body[:50]}"

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['instance', 'from_number']),
            models.Index(fields=['timestamp']),
        ]
