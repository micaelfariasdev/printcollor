"""Webhooks de pagamento."""
import hashlib
import hmac
import json
import logging

import mercadopago
from django.conf import settings
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .models import ConfiguracaoLoja, DTFVendor
from .services.mercadopago_service import MercadoPagoService

logger = logging.getLogger(__name__)
_processed_ids = set()


@method_decorator(csrf_exempt, name='dispatch')
class MercadoPagoWebhookView(View):
    """Confirma pagamentos consultando a API do Mercado Pago."""

    def post(self, request):
        try:
            body = json.loads(request.body or '{}')
            payment_id = str(body.get('data', {}).get('id') or request.POST.get('data_id', ''))
            if not payment_id:
                return JsonResponse({'status': 'ignored'})

            secret = getattr(settings, 'MERCADOPAGO_WEBHOOK_SECRET', '')
            if secret and not self._valid_signature(request, payment_id, secret):
                return JsonResponse({'error': 'forbidden'}, status=403)
            if payment_id in _processed_ids:
                return JsonResponse({'status': 'already_processed'})

            config = ConfiguracaoLoja.objects.filter(mp_connected=True).first()
            if not config:
                return JsonResponse({'error': 'not_configured'}, status=500)
            payment = mercadopago.SDK(MercadoPagoService.get_access_token(config)).payment().get(payment_id).get('response', {})
            if payment.get('status') != 'approved':
                return JsonResponse({'status': 'ok'})

            reference = payment.get('external_reference')
            if reference:
                dtf = DTFVendor.objects.filter(id=reference).first()
                if dtf and not dtf.esta_pago:
                    payer = payment.get('payer', {})
                    dtf.esta_pago = True
                    dtf.comprovante_mp_data = {
                        'payment_id': payment.get('id'), 'metodo': payment.get('payment_method_id'),
                        'nome': f"{payer.get('first_name', '')} {payer.get('last_name', '')}".strip(),
                        'email': payer.get('email'), 'valor': payment.get('transaction_amount'),
                        'data': payment.get('date_approved') or payment.get('last_modified'),
                    }
                    dtf.save()
            _processed_ids.add(payment_id)
            return JsonResponse({'status': 'ok'})
        except (ValueError, json.JSONDecodeError):
            return JsonResponse({'error': 'invalid json'}, status=400)
        except Exception:
            logger.exception('Erro no webhook Mercado Pago')
            return JsonResponse({'error': 'internal error'}, status=500)

    @staticmethod
    def _valid_signature(request, payment_id, secret):
        request_id = request.headers.get('x-request-id', '')
        expected = hmac.new(secret.encode(), f'{payment_id}{request_id}'.encode(), hashlib.sha256).hexdigest()
        return any(hmac.compare_digest(expected, part.split('=', 1)[1]) for part in request.headers.get('x-signature', '').split(',') if '=' in part)
