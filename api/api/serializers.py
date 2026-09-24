from PIL import Image
from django.core.files.base import ContentFile
import io
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.conf import settings
from django.utils.crypto import constant_time_compare
from .models import Empresa, Cliente, Produto, Orcamento, ItemOrcamento, Usuario, DTFVendor, PedidoFabrica, DTFConfig, ConfiguracaoLoja


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
        fields = '__all__'

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
        instance.data_print = validated_data.get('data_print', instance.data_print)
        instance.agencia = validated_data.get('agencia', instance.agencia)
        instance.campanha = validated_data.get('campanha', instance.campanha)
        instance.save()

        if itens_data is not None:
            # Para simplificar, deletamos os itens antigos e criamos os novos
            instance.itens.all().delete()
            for item in itens_data:
                ItemOrcamento.objects.create(orcamento=instance, **item)

        return instance


class UsuarioSerializer(serializers.ModelSerializer):
    # Mantemos o seu sistema de segurança por código de convite
    codigo_convite = serializers.CharField(write_only=True, required=False, allow_blank=False)

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
        convite_configurado = getattr(settings, 'INVITE_CODE', '')
        if not convite_configurado or not constant_time_compare(value, convite_configurado):
            raise ValidationError("Código de convite inválido ou expirado.")
        return value

    def create(self, validated_data):
        # Removemos o código antes de salvar
        request = self.context.get('request')
        is_admin = bool(request and request.user and request.user.is_authenticated and request.user.is_staff)
        codigo_convite = validated_data.pop('codigo_convite', None)
        if not is_admin:
            convite_configurado = getattr(settings, 'INVITE_CODE', '')
            if not codigo_convite or not convite_configurado or not constant_time_compare(codigo_convite, convite_configurado):
                raise ValidationError({'codigo_convite': 'CÃ³digo de convite invÃ¡lido ou expirado.'})
            validated_data['nivel_acesso'] = 'vendedor'
            validated_data['is_staff'] = False
            validated_data['is_superuser'] = False

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
    tipo_produto = serializers.CharField(default='dtf_textil')
    tipo_produto_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    quantidade = serializers.IntegerField(required=False, default=1)
    tamanho_cm = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    preco_unit_override = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    comprovante_mp_data = serializers.SerializerMethodField()

    def validate_layout_arquivo(self, value):
        return DTFConfigSerializer.comprimir_imagem(self, value, qualidade=85, max_width=2500)

    def validate_comprovante_pagamento(self, value):
        return DTFConfigSerializer.comprimir_imagem(self, value, qualidade=50, max_width=1200)

    def validate(self, attrs):
        tamanho = attrs.get('tamanho_cm', getattr(self.instance, 'tamanho_cm', None))
        quantidade = attrs.get('quantidade', getattr(self.instance, 'quantidade', 1))
        tipo = attrs.get('tipo_produto', getattr(self.instance, 'tipo_produto', 'dtf_textil'))
        if tipo == 'estampa':
            if quantidade is None or quantidade < 1:
                raise serializers.ValidationError({'quantidade': 'Informe uma quantidade maior que zero.'})
            attrs['tamanho_cm'] = None
        elif tamanho is None or tamanho <= 0:
            raise serializers.ValidationError({'tamanho_cm': 'Informe uma metragem maior que zero.'})
        return attrs

    def get_fields(self):
        fields = super().get_fields()
        for name in ('codigo_publico', 'comprovante_mp_data', 'valor_total', 'status_display', 'tipo_produto_display'):
            fields[name].read_only = True
        return fields

    class Meta:
        model = DTFVendor
        fields = [
            'id', 'cliente', 'nome_cliente', 'codigo_publico','layout_arquivo', 'tamanho_cm',
            'data_criacao', 'foi_impresso', 'esta_pago', 'foi_entregue',
            'comprovante_pagamento', 'valor_total', 'tipo_produto', 'tipo_produto_display', 'unidade',
            'status', 'status_display', 'quantidade', 'preco_unit_override', 'comprovante_mp_data'
        ]

    def get_tipo_produto_display(self, obj):
        return dict(obj.TIPOS_PRODUTO).get(obj.tipo_produto, 'DTF Têxtil')

    def get_status_display(self, obj):
        return dict(obj.STATUS_ORCAMENTO).get(obj.status, 'Orçamento')

    def get_comprovante_mp_data(self, obj):
        if not obj.esta_pago or not obj.comprovante_mp_data:
            return None
        return obj.comprovante_mp_data


class DTFConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = DTFConfig
        fields = '__all__'

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


class PedidoFabricaSerializer(serializers.ModelSerializer):
    # Método para facilitar a exibição do total no frontend
    total_pecas = serializers.ReadOnlyField(source='total_itens')
    cliente_nome = serializers.ReadOnlyField(source='cliente.nome')

    class Meta:
        model = PedidoFabrica
        fields = '__all__'

    def validate_detalhes_tamanho(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('A grade deve ser um objeto.')
        for tamanho, quantidade in value.items():
            if not isinstance(tamanho, str) or not isinstance(quantidade, int) or quantidade < 0:
                raise serializers.ValidationError('Use tamanhos em texto e quantidades inteiras nao negativas.')
        return value


def _normalize_pix_text(value: str) -> str:
    """Remove acentos, colapsa espaços e converte para ASCII. Para BR Code."""
    if not value:
        return value
    import unicodedata
    nfkd = unicodedata.normalize('NFKD', value)
    ascii_only = ''.join(c for c in nfkd if not unicodedata.combining(c))
    replacements = {'Ç': 'C', 'Ã': 'A', 'Õ': 'O'}
    for orig, sub in replacements.items():
        ascii_only = ascii_only.replace(orig, sub)
    return ' '.join(ascii_only.split()).upper()


class ConfiguracaoLojaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoLoja
        fields = [
            'id', 'pix_chave_telefone', 'pix_beneficiario', 'pix_cidade',
            'mp_connected', 'mp_user_id', 'mp_percentual_taxa',
            'mp_connected_em', 'atualizado_em',
        ]
        read_only_fields = ['atualizado_em']

    def validate_pix_chave_telefone(self, value):
        """Aceita apenas dígitos, espaços, +, (, ) e -."""
        if not value:
            return value
        allowed = set('0123456789+()- ')
        invalidos = [c for c in value if c not in allowed]
        if invalidos:
            raise serializers.ValidationError(
                f"Caracteres inválidos: {''.join(invalidos)}"
            )
        return value.strip()

    def validate_pix_beneficiario(self, value):
        normalized = _normalize_pix_text(value)
        if len(normalized) > 25:
            raise serializers.ValidationError("Beneficiário deve ter no máximo 25 caracteres.")
        return normalized

    def validate_pix_cidade(self, value):
        normalized = _normalize_pix_text(value)
        if len(normalized) > 15:
            raise serializers.ValidationError("Cidade deve ter no máximo 15 caracteres.")
        return normalized


class PedidoPublicoSerializer(serializers.Serializer):
    """Serializer público para endpoint /pedido-publico/<codigo>/ - whitelist explícita."""

    codigo_publico = serializers.CharField()
    status = serializers.CharField()
    status_display = serializers.SerializerMethodField()
    esta_pago = serializers.BooleanField()
    tipo_produto_display = serializers.SerializerMethodField()
    tamanho_cm = serializers.DecimalField(max_digits=10, decimal_places=2)
    unidade = serializers.CharField()
    quantidade = serializers.IntegerField()
    valor_total = serializers.SerializerMethodField()
    cliente_nome = serializers.SerializerMethodField()
    data_criacao = serializers.DateTimeField(format='%d/%m/%Y %H:%M')
    data_entrega = serializers.DateTimeField(format='%d/%m/%Y', allow_null=True)
    foi_impresso = serializers.CharField()
    foi_entregue = serializers.BooleanField()

    # PIX: campos para o front construir BR Code
    pix = serializers.SerializerMethodField()

    # Cartão: exposto apenas se !esta_pago e loja conectada
    pode_pagar_cartao = serializers.SerializerMethodField()
    valor_cartao = serializers.SerializerMethodField()
    # Comprovante MP (preenchido após pagamento aprovado)
    comprovante_mp_data = serializers.SerializerMethodField()

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_tipo_produto_display(self, obj):
        return obj.get_tipo_produto_display()

    def get_cliente_nome(self, obj):
        return obj.cliente.nome if obj.cliente else ''

    def get_valor_total(self, obj):
        from decimal import Decimal
        valor = obj.valor_total()
        if isinstance(valor, Decimal):
            return float(valor)
        return valor

    def get_pix(self, obj):
        from .models import ConfiguracaoLoja
        config = ConfiguracaoLoja.objects.first()
        if not config or not config.pix_chave_telefone:
            return None
        from decimal import Decimal
        valor = obj.valor_total()
        if isinstance(valor, Decimal):
            valor = float(valor)
        return {
            'chave': config.pix_chave_telefone,
            'beneficiario': config.pix_beneficiario or '',
            'cidade': config.pix_cidade or '',
            'valor': valor,
            'txid': f'DTFPED-{obj.id}',
        }

    def get_pode_pagar_cartao(self, obj):
        from .models import ConfiguracaoLoja
        config = ConfiguracaoLoja.objects.first()
        if not config or not config.mp_connected:
            return False
        return not obj.esta_pago

    def get_valor_cartao(self, obj):
        from decimal import Decimal
        from .models import ConfiguracaoLoja
        config = ConfiguracaoLoja.objects.first()
        if not config or not config.mp_connected:
            return None
        valor_base = obj.valor_total()
        taxa = config.mp_percentual_taxa or Decimal('0')
        if isinstance(valor_base, Decimal):
            valor_base = float(valor_base)
        return round(valor_base * (1 + float(taxa) / 100), 2)

    def get_comprovante_mp_data(self, obj):
        if not obj.esta_pago or not obj.comprovante_mp_data:
            return None
        return obj.comprovante_mp_data
