import os
from pathlib import Path
import logging
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from dotenv import load_dotenv # Importe isso

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent

# Carrega o arquivo .env
load_dotenv(os.path.join(BASE_DIR, '.env'))

import mercadopago
import requests
from urllib.parse import urlencode


logger = logging.getLogger(__name__)


class MercadoPagoService:
    """Serviço para integração com Mercado Pago via OAuth Connect"""

    # ------------------------------------------------------------------ #
    #  Criptografia Fernet                                                   #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _fernet():
        from cryptography.fernet import Fernet
        key = os.getenv('MERCADOPAGO_FERNET_KEY', '')
        if not key:
            raise RuntimeError('MERCADOPAGO_FERNET_KEY não está configurado no .env')
        return Fernet(key.encode())

    @staticmethod
    def criptografar_token(token: str) -> str:
        return MercadoPagoService._fernet().encrypt(token.encode()).decode()

    @staticmethod
    def descriptografar_token(cipher: str) -> str:
        return MercadoPagoService._fernet().decrypt(cipher.encode()).decode()

    # ------------------------------------------------------------------ #
    #  Access token (com auto-refresh)                                     #
    # ------------------------------------------------------------------ #

    @staticmethod
    def get_access_token(config):
        """
        Retorna access_token descriptografado.
        Se estiver expirado, faz refresh automaticamente e salva.
        """
        if not config or not config.mp_access_token_encrypted:
            raise RuntimeError('Mercado Pago não está conectado (sem token)')

        # Verifica se já precisa de refresh
        if config.mp_token_expires_em and config.mp_token_expires_em > timezone.now():
            return MercadoPagoService.descriptografar_token(config.mp_access_token_encrypted)

        # Refresh
        refresh_token = MercadoPagoService.descriptografar_token(config.mp_refresh_token_encrypted)
        resp = requests.post(
            'https://api.mercadopago.com/oauth/token',
            data={
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token,
                'client_id': os.getenv('MERCADOPAGO_CLIENT_ID'),
                'client_secret': os.getenv('MERCADOPAGO_CLIENT_SECRET'),
            },
            timeout=15,
        )
        if resp.status_code != 200:
            logger.error(f"MP refresh token falhou: {resp.status_code} {resp.text}")
            raise RuntimeError(f"MP refresh token falhou: {resp.status_code}")

        data = resp.json()
        config.mp_access_token_encrypted = MercadoPagoService.criptografar_token(data['access_token'])
        config.mp_refresh_token_encrypted = MercadoPagoService.criptografar_token(data['refresh_token'])
        expires_in = int(data.get('expires_in', 10800))
        config.mp_token_expires_em = timezone.now() + timedelta(seconds=expires_in)
        config.save(update_fields=[
            'mp_access_token_encrypted',
            'mp_refresh_token_encrypted',
            'mp_token_expires_em',
        ])
        logger.info("MP access_token renovado com sucesso")
        return data['access_token']

    # ------------------------------------------------------------------ #
    #  Preference (checkout pro)                                           #
    # ------------------------------------------------------------------ #

    @staticmethod
    def criar_preferencia(dtf, taxa_percentual: Decimal = None):
        """
        Cria uma Mercado Pago Preference para o DTF.
        Returns dict com: init_point, sandbox_init_point, preference_id
        """
        from api.models import ConfiguracaoLoja

        config = ConfiguracaoLoja.objects.first()
        if not config or not config.mp_connected:
            raise RuntimeError('Mercado Pago não está conectado')

        if taxa_percentual is None:
            taxa_percentual = config.mp_percentual_taxa or Decimal('4.99')

        access_token = MercadoPagoService.get_access_token(config)

        valor_base = dtf.valor_total()
        valor_com_taxa = round(valor_base * (1 + taxa_percentual / 100), 2)

        site_url = os.getenv('FRONTEND_URL', 'https://app.example.com')
        notification_url = f"{site_url}/api/webhook/mercadopago/"

        sdk = mercadopago.SDK(access_token)
        preference = sdk.preference().create({
            'items': [{
                'title': f'DTF - {dtf.cliente.nome}',
                'description': f'{dtf.get_tipo_produto_display()} {dtf.tamanho_cm}{dtf.unidade}',
                'quantity': 1,
                'unit_price': float(valor_com_taxa),
                'currency_id': 'BRL',
            }],
            'external_reference': str(dtf.id),
           "payment_methods": {
        # Apenas cartão
        "excluded_payment_types": [
            {"id": "ticket"},          # boleto
            {"id": "bank_transfer"},   # PIX
            {"id": "atm"},             # lotérica
        ],

        # Sem parcelamento
        "installments": 1,
        "default_installments": 1,
    },

            'notification_url': notification_url,
            'back_urls': {
                'success': f"{site_url}/pedido-publico/{dtf.codigo_publico}/",
                'failure': f"{site_url}/pedido-publico/{dtf.codigo_publico}/",
            },
        })

        if preference.get('status') != 201 and preference.get('status') != 200:
            logger.error(f"MP criar_preferencia falhou: {preference}")
            raise RuntimeError(f"MP preference falhou: {preference}")

        return {
            'init_point': preference['response']['init_point'],
            'sandbox_init_point': preference['response'].get('sandbox_init_point', ''),
            'preference_id': preference['response']['id'],
            'valor_base': float(valor_base),
            'valor_com_taxa': float(valor_com_taxa),
            'taxa_aplicada': float(taxa_percentual),
        }

    # ------------------------------------------------------------------ #
    #  OAuth helpers                                                        #
    # ------------------------------------------------------------------ #

    @staticmethod
    def get_oauth_redirect_url(state: str):
        """Retorna URL de autorização do MP OAuth Connect"""
        client_id = os.getenv('MERCADOPAGO_CLIENT_ID')
        redirect_uri = os.getenv('MERCADOPAGO_REDIRECT_URI')
        if not client_id or not redirect_uri:
            raise RuntimeError('MERCADOPAGO_CLIENT_ID ou MERCADOPAGO_REDIRECT_URI não configurados')
        return 'https://auth.mercadopago.com/authorization?' + urlencode({
            'client_id': client_id,
            'response_type': 'code',
            'platform_id': 'MP',
            'redirect_uri': redirect_uri,
            'state': state,
        })

    @staticmethod
    def trocar_code_por_tokens(code: str):
        """
        Troca authorization code por access/refresh tokens.
        Salva criptografados em ConfiguracaoLoja.
        """
        from api.models import ConfiguracaoLoja

        resp = requests.post(
            'https://api.mercadopago.com/oauth/token',
            data={
                'grant_type': 'authorization_code',
                'client_id': os.getenv('MERCADOPAGO_CLIENT_ID'),
                'client_secret': os.getenv('MERCADOPAGO_CLIENT_SECRET'),
                'code': code,
                'redirect_uri': os.getenv('MERCADOPAGO_REDIRECT_URI'),
            },
            timeout=15,
        )
        if resp.status_code != 200:
            logger.error(f"MP OAuth token exchange falhou: {resp.status_code} {resp.text}")
            raise RuntimeError(f"MP OAuth falhou: {resp.status_code}")

        data = resp.json()
        access_token = data['access_token']
        refresh_token = data['refresh_token']
        expires_in = int(data.get('expires_in', 10800))

        config = ConfiguracaoLoja.objects.first()
        config.mp_access_token_encrypted = MercadoPagoService.criptografar_token(access_token)
        config.mp_refresh_token_encrypted = MercadoPagoService.criptografar_token(refresh_token)
        config.mp_token_expires_em = timezone.now() + timedelta(seconds=expires_in)
        config.mp_connected = True
        config.mp_connected_em = timezone.now()
        # Buscar user_id do MP
        user_resp = requests.get(
            'https://api.mercadopago.com/users/me',
            headers={'Authorization': f"Bearer {access_token}"},
            timeout=10,
        )
        if user_resp.ok:
            config.mp_user_id = str(user_resp.json().get('id', ''))
        config.save(update_fields=[
            'mp_access_token_encrypted',
            'mp_refresh_token_encrypted',
            'mp_token_expires_em',
            'mp_connected',
            'mp_connected_em',
            'mp_user_id',
        ])
        return config

    @staticmethod
    def desconectar(config):
        """Remove credenciais MP da ConfiguracaoLoja"""
        config.mp_connected = False
        config.mp_user_id = ''
        config.mp_access_token_encrypted = ''
        config.mp_refresh_token_encrypted = ''
        config.mp_token_expires_em = None
        config.mp_connected_em = None
        config.save(update_fields=[
            'mp_connected', 'mp_user_id', 'mp_access_token_encrypted',
            'mp_refresh_token_encrypted', 'mp_token_expires_em', 'mp_connected_em',
        ])
