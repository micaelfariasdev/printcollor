from PIL import Image
from django.core.files.base import ContentFile
import io
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Empresa, Cliente, Produto, Orcamento, ItemOrcamento, Usuario, DTFVendor


class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = '__all__'


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'


class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = '__all__'


class ItemOrcamentoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.ReadOnlyField(source='produto.nome')
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = ItemOrcamento
        fields = ['id', 'produto', 'produto_nome', 'descricao',
                  'quantidade', 'preco_negociado', 'subtotal']


class OrcamentoSerializer(serializers.ModelSerializer):
    itens = ItemOrcamentoSerializer(many=True)
    valor_total = serializers.ReadOnlyField()
    nome_cliente = serializers.ReadOnlyField(source='cliente.nome')
    nome_empresa = serializers.ReadOnlyField(source='empresa.nome')

    class Meta:
        model = Orcamento
        fields = ['id', 'empresa', 'nome_empresa', 'cliente',
                  'nome_cliente', 'data_criacao', 'itens', 'valor_total']

    def create(self, validated_data):
        itens_data = validated_data.pop('itens')
        orcamento = Orcamento.objects.create(**validated_data)
        for item in itens_data:
            ItemOrcamento.objects.create(orcamento=orcamento, **item)
        return orcamento

    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens', None)
        # Atualiza os campos básicos do orçamento
        instance.empresa = validated_data.get('empresa', instance.empresa)
        instance.cliente = validated_data.get('cliente', instance.cliente)
        instance.save()

        if itens_data is not None:
            # Para simplificar, deletamos os itens antigos e criamos os novos
            instance.itens.all().delete()
            for item in itens_data:
                ItemOrcamento.objects.create(orcamento=instance, **item)

        return instance


class UsuarioSerializer(serializers.ModelSerializer):
    # Mantemos o seu sistema de segurança por código de convite
    codigo_convite = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        # Adicionamos 'first_name' e 'last_name' aos campos
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'email', 'password', 'nivel_acesso',
            'codigo_convite', 'is_staff', 'is_superuser'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            # Opcional para não quebrar cadastros antigos
            'first_name': {'required': False},
            'last_name': {'required': False}
        }

    def validate_codigo_convite(self, value):
        # Sua lógica de código mestre
        CODIGO_MESTRE = "PRINTCOLLOR2026"
        if value != CODIGO_MESTRE:
            raise ValidationError("Código de convite inválido ou expirado.")
        return value

    def create(self, validated_data):
        # Removemos o código antes de salvar
        validated_data.pop('codigo_convite', None)

        # O create_user do Django lida perfeitamente com first_name e last_name
        user = Usuario.objects.create_user(**validated_data)
        return user

    def update(self, instance, validated_data):
        # Removemos o código de convite se ele vier no PATCH
        validated_data.pop('codigo_convite', None)

        # Trata a senha separadamente se ela for alterada
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)

        # Atualiza os outros campos (incluindo nome e sobrenome)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class DTFVendorSerializer(serializers.ModelSerializer):
    valor_total = serializers.ReadOnlyField()
    nome_cliente = serializers.ReadOnlyField(source='cliente.nome')

    class Meta:
        model = DTFVendor
        fields = [
            'id', 'cliente', 'nome_cliente', 'layout_arquivo', 'tamanho_cm',
            'data_criacao', 'foi_impresso', 'esta_pago', 'foi_entregue',
            'comprovante_pagamento', 'valor_total'
        ]

    def validate_layout_arquivo(self, value):
        """Comprime o layout mantendo a qualidade para impressão DTF."""
        if value:
            return self.comprimir_imagem(value, qualidade=85, max_width=2500)
        return value

    def validate_comprovante_pagamento(self, value):
        """Comprime agressivamente o comprovante para economizar espaço."""
        if value:
            # Comprovantes podem ser bem menores e em preto e branco se preferir
            return self.comprimir_imagem(value, qualidade=50, max_width=1200)
        return value

    def comprimir_imagem(self, imagem_input, qualidade=70, max_width=None):
        img = Image.open(imagem_input)

        # Converte RGBA para RGB para permitir salvamento em JPEG (mais leve)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Redimensiona se for uma imagem gigantesca (opcional)
        if max_width and img.width > max_width:
            ratio = max_width / float(img.width)
            new_height = int(float(img.height) * float(ratio))
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

        # Salva a imagem comprimida em memória
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=qualidade, optimize=True)
        buffer.seek(0)

        # Retorna o arquivo pronto para o Django
        return ContentFile(buffer.read(), name=f"{imagem_input.name.split('.')[0]}.jpg")


class UserMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'first_name',
                  'last_name', 'email', 'nivel_acesso', 'is_staff']
        read_only_fields = ['id', 'nivel_acesso', 'is_staff']
