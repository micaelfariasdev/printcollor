import requests
from django.conf import settings
from django.utils import timezone

from api.models import DTFNotificacao, DTFNotificacaoConfig


EVENTO_POR_STATUS = {'pedido_feito': 'pedido_feito', 'impresso': 'impresso', 'finalizado': 'finalizado'}


def enviar_evento(dtf, evento):
    """Registra e envia uma notificação DTF; falhas nunca bloqueiam o pedido."""
    telefone = (dtf.cliente.telefone or '').strip()
    if not telefone:
        return None
    config = DTFNotificacaoConfig.objects.first()
    if not config or (not config.ativo and evento != 'manual'):
        return None
    base_url = getattr(settings, 'FRONTEND_URL', '').rstrip('/')
    link = f"\nAcompanhe: {base_url}/pedido-publico/{dtf.codigo_publico}" if base_url and dtf.codigo_publico else ''
    texto = f"Print Collor\nPedido #{dtf.codigo_publico or dtf.id}\nStatus: {dtf.get_status_display()}\nValor: R$ {dtf.valor_total():.2f}{link}"
    registro = DTFNotificacao.objects.create(dtf=dtf, evento=evento, telefone=telefone, conteudo=texto)
    try:
        resposta = requests.post(f'{config.service_url.rstrip("/")}/notifications/send', json={'telefone': telefone, 'texto': texto}, headers={'Authorization': f'Bearer {config.service_token}'}, timeout=12)
        resposta.raise_for_status()
        registro.status, registro.enviado_em = 'enviado', timezone.now()
    except requests.RequestException as exc:
        registro.status, registro.erro = 'falhou', str(exc)
    registro.tentativas = 1
    registro.save(update_fields=['status', 'erro', 'tentativas', 'enviado_em'])
    return registro
