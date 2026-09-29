import requests
import binascii
from django.conf import settings
from django.utils import timezone

from api.models import ConfiguracaoLoja, DTFNotificacao, DTFNotificacaoConfig


EVENTO_POR_STATUS = {'pedido_feito': 'pedido_feito', 'impresso': 'impresso', 'finalizado': 'finalizado'}


def _tlv(tag, value):
    value = str(value)
    return f'{tag}{len(value):02d}{value}'


def gerar_pix_copia_cola(config, valor, txid):
    if not config.pix_chave_telefone:
        return ''
    conta = _tlv('00', 'br.gov.bcb.pix') + _tlv('01', config.pix_chave_telefone)
    adicional = _tlv('05', txid[:25])
    payload = ''.join([_tlv('00', '01'), _tlv('26', conta), _tlv('52', '0000'), _tlv('53', '986'), _tlv('54', f'{valor:.2f}'), _tlv('58', 'BR'), _tlv('59', (config.pix_beneficiario or 'PRINT COLLOR')[:25]), _tlv('60', (config.pix_cidade or 'TERESINA')[:15]), _tlv('62', adicional), '6304'])
    return payload + f'{binascii.crc_hqx(payload.encode(), 0xFFFF):04X}'


def enviar_evento(dtf, evento):
    """Registra e envia uma notificação DTF; falhas nunca bloqueiam o pedido."""
    telefone = (dtf.cliente.telefone or '').strip()
    if not telefone:
        return None
    config = DTFNotificacaoConfig.objects.first()
    if not config:
        return None
    base_url = getattr(settings, 'FRONTEND_URL', 'https://printcollor.com.br').rstrip('/')
    link = f"{base_url}/pedido-publico/{dtf.codigo_publico}" if base_url and dtf.codigo_publico else ''
    tamanho = f"{dtf.quantidade or 1} unidades" if dtf.tipo_produto == 'estampa' else f"{dtf.tamanho_cm or ''} {dtf.unidade}"
    padrao = 'Olá, {nome}!\nPedido #{id}\nStatus: {status}\nValor: {valor}\n{link_publico}'
    template = (config.templates or {}).get(evento) or padrao
    loja = ConfiguracaoLoja.objects.first()
    pix = '' if dtf.esta_pago or not loja else gerar_pix_copia_cola(loja, dtf.valor_total(), dtf.codigo_publico or str(dtf.id))
    variaveis = {
        'nome': dtf.cliente.nome, 'valor': f'R$ {dtf.valor_total():.2f}',
        'id': dtf.id, 'codigo': dtf.codigo_publico or '', 'tamanho': tamanho,
        'status': dtf.get_status_display(), 'link_publico': link,
        'pix_copia_cola': pix,
    }
    texto = template
    for nome, valor in variaveis.items():
        texto = texto.replace(f'{{{nome}}}', str(valor))
    if not texto.strip():
        texto = f'Print Collor\nAcompanhe seu pedido: {link}'
    registro = DTFNotificacao.objects.create(dtf=dtf, evento=evento, telefone=telefone, conteudo=texto)
    try:
        resposta = requests.post(f'{config.service_url.rstrip("/")}/notifications/send', json={'telefone': telefone, 'texto': texto, 'url': link, 'botao': 'Ver pedido e pagamento'}, headers={'Authorization': f'Bearer {config.service_token}'}, timeout=12)
        resposta.raise_for_status()
        registro.status, registro.enviado_em = 'enviado', timezone.now()
    except requests.RequestException as exc:
        registro.status, registro.erro = 'falhou', str(exc)
    registro.tentativas = 1
    registro.save(update_fields=['status', 'erro', 'tentativas', 'enviado_em'])
    return registro
