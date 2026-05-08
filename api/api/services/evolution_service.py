import requests
import logging
from django.conf import settings


logger = logging.getLogger(__name__)

class EvolutionService:
    """Serviço para integração com Evolution API"""

    @staticmethod
    def get_api_url():
        url = getattr(settings, 'EVOLUTION_API_URL', 'http://localhost:8080')
        return url.rstrip('/')

    @staticmethod
    def get_api_key():
        return getattr(settings, 'EVOLUTION_API_KEY', '')

    @staticmethod
    def get_headers():
        return {
            'apikey': EvolutionService.get_api_key(),
            'Content-Type': 'application/json'
        }

    @staticmethod
    def criar_instancia(nome):
        """Cria uma nova instância na Evolution API (integração Baileys) com webhook"""
        url = f"{EvolutionService.get_api_url()}/instance/create"

        # Webhook URL aponta para o Django
        webhook_base = getattr(settings, 'WEBHOOK_BASE_URL', 'http://localhost:8000')
        webhook_url = f"{webhook_base}/api/webhook/whatsapp/"

        payload = {
            'instanceName': nome,
            'qrcode': True,
            'integration': 'WHATSAPP-BAILEYS',
            'webhook': {
                'url': webhook_url,
                'byEvents': False,
                'base64': True,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'events': [
                    'QRCODE_UPDATED',
                    'MESSAGES_SET',
                    'MESSAGES_UPSERT',
                    'MESSAGES_UPDATE',
                    'CONNECTION_UPDATE',
                    'SEND_MESSAGE'
                ]
            }
        }

        try:
            logger.info(f"[EVOLUTION] Criando instância '{nome}' com integração BAILEYS")
            response = requests.post(url, json=payload, headers=EvolutionService.get_headers())
            response.raise_for_status()
            data = response.json()
            logger.info(f"[EVOLUTION] Instância '{nome}' criada com sucesso. ID: {data.get('instance', {}).get('instanceId', 'N/A')}")
            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"[EVOLUTION] Erro ao criar instância '{nome}': {e}")
            raise

    @staticmethod
    def obter_qr_code(instance_id):
        """Obtém o QR Code para conexão via /instance/connect/{instance_id} (GET)"""
        url = f"{EvolutionService.get_api_url()}/instance/connect/{instance_id}"

        try:
            logger.info(f"[EVOLUTION] Buscando QR Code para instância '{instance_id}'")
            response = requests.get(url, headers=EvolutionService.get_headers())
            response.raise_for_status()
            data = response.json()
            logger.info(f"[EVOLUTION] QR Code obtido com sucesso para '{instance_id}'")
            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"[EVOLUTION] Erro ao obter QR Code da instância '{instance_id}': {e}")
            raise

    @staticmethod
    def verificar_status(instance_id):
        """Verifica o status da instância"""
        url = f"{EvolutionService.get_api_url()}/instance/connectionState/{instance_id}"

        try:
            response = requests.get(url, headers=EvolutionService.get_headers())
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao verificar status da instância {instance_id}: {e}")
            return {'status': 'disconnected'}

    @staticmethod
    def enviar_mensagem(instance_id, numero, mensagem):
        """Envia mensagem via /message/sendText/{instance}"""
        url = f"{EvolutionService.get_api_url()}/message/sendText/{instance_id}"
        payload = {
            'number': numero,
            'text': mensagem
        }

        try:
            logger.info(f"[EVOLUTION] Enviando mensagem para {numero} via '{instance_id}'")
            response = requests.post(url, json=payload, headers=EvolutionService.get_headers())
            response.raise_for_status()
            data = response.json()
            logger.info(f"[EVOLUTION] Mensagem enviada com sucesso para {numero}")
            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"[EVOLUTION] Erro ao enviar mensagem para {numero} via '{instance_id}': {e}")
            raise


    @staticmethod
    def buscar_chats(instance_id, limite=50):
        """Busca chats via GET /chat/findChats/{instance}"""
        url = f"{EvolutionService.get_api_url()}/chat/findChats/{instance_id}"
        params = {'limit': limite}

        try:
            logger.info(f"[EVOLUTION] Buscando chats da instância '{instance_id}'")
            response = requests.post(url, params=params, headers=EvolutionService.get_headers())
            response.raise_for_status()
            data = response.json()
            return data

        except requests.exceptions.RequestException as e:
            logger.error(f"[EVOLUTION] Erro ao buscar chats da '{instance_id}': {e}")
            return []

    @staticmethod
    def buscar_mensagens(instance_id, numero=None, limite=50):
        """Busca mensagens via POST /chat/findMessages/{instance} e converte mídias para base64"""
        url = f"{EvolutionService.get_api_url()}/chat/findMessages/{instance_id}"
        payload: dict = {'limit': limite}
        if numero:
            # Aceita JID com ou sem sufixo (@s.whatsapp.net ou @jid)
            remote_jid = numero if '@' in numero else f"{numero}@s.whatsapp.net"
            logger.info(f"[EVOLUTION] Buscando mensagens para JID: {remote_jid}")
            payload['where'] = {'key': {'remoteJid': remote_jid}}

        try:
            logger.info(f"[EVOLUTION] Buscando mensagens da instância '{instance_id}'")
            response = requests.post(url, json=payload, headers=EvolutionService.get_headers())
            response.raise_for_status()
            data = response.json()
            # Evolution API retorna { total, pages, currentPage, records: [...] }
            # ou { messages: { records: [...] } } dependendo da versão
            messages = []
            if isinstance(data, dict):
                if 'records' in data and isinstance(data['records'], list):
                    messages = data['records']
                elif 'messages' in data and isinstance(data['messages'], dict):
                    messages = data['messages'].get('records', [])
                elif 'messages' in data and isinstance(data['messages'], list):
                    messages = data['messages']
            logger.info(f"[EVOLUTION] {len(messages)} mensagens obtidas")

            # # Filtra mensagens com mídia e converte para base64
            # tipos_midia = ['imageMessage', 'documentMessage', 'videoMessage', 'audioMessage']
            # for msg in messages['records']:
            #     msg_obj = msg.get('message', {})
            #     # Verifica se é mensagem de mídia
            #     media_type = None
            #     for tipo in tipos_midia:
            #         if msg_obj.get(tipo):
            #             media_type = tipo
            #             break

            #     if media_type and msg.get('key', {}).get('id'):
            #         try:
            #             logger.info(f"[EVOLUTION] Convertendo mídia {msg['key']['id']} ({media_type}) para base64")
            #             base64_data = EvolutionService.baixar_midia_base64(
            #                 instance_id,
            #                 msg['key']['id'],
            #                 timeout=30
            #             )
            #             if base64_data:
            #                 # Substitui a URL pela base64 no objeto da mensagem
            #                 msg_obj[media_type]['url'] = base64_data
            #                 logger.info(f"[EVOLUTION] Mídia {msg['key']['id']} convertida com sucesso ({len(base64_data)} chars)")
            #         except Exception as e:
            #             logger.warning(f"[EVOLUTION] Falha ao converter mídia {msg.get('key', {}).get('id')}: {e}")

            return {'messages': messages}
        except requests.exceptions.RequestException as e:
            logger.error(f"[EVOLUTION] Erro ao buscar mensagens da '{instance_id}': {e}")
            return {'messages': []}

    @staticmethod
    def enviar_documento(instance_id, numero, file_base64, file_name, caption=''):
        """Envia documento (PDF, CDR, ZIP, etc) via /message/sendMedia/{instance}"""
        url = f"{EvolutionService.get_api_url()}/message/sendMedia/{instance_id}"
        payload = {
            'number': numero,
            'mediatype': 'document',
            'media': file_base64,
            'caption': caption,
            'fileName': file_name,
        }

        try:
            logger.info(f"[EVOLUTION] Enviando documento '{file_name}' para {numero} via '{instance_id}'")
            response = requests.post(url, json=payload, headers=EvolutionService.get_headers())
            response.raise_for_status()
            data = response.json()
            logger.info(f"[EVOLUTION] Documento enviado com sucesso para {numero}")
            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"[EVOLUTION] Erro ao enviar documento para {numero} via '{instance_id}': {e}")
            raise

    @staticmethod
    def enviar_imagem(instance_id, numero, image_base64, caption=''):
        """Envia imagem via /message/sendMedia/{instance}"""
        url = f"{EvolutionService.get_api_url()}/message/sendMedia/{instance_id}"
        payload = {
            'number': numero,
            'mediatype': 'image',
            'media': image_base64,
            'caption': caption,
        }

        try:
            logger.info(f"[EVOLUTION] Enviando imagem para {numero} via '{instance_id}'")
            logger.info(f"[EVOLUTION] Payload: {str(payload)[:200]}...")
            response = requests.post(url, json=payload, headers=EvolutionService.get_headers())
            if response.status_code != 200:
                logger.error(f"[EVOLUTION] Erro {response.status_code}: {response.text}")
                response.raise_for_status()
            data = response.json()
            logger.info(f"[EVOLUTION] Imagem enviada com sucesso para {numero}")
            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"[EVOLUTION] Erro ao enviar imagem para {numero} via '{instance_id}': {e}")
            raise

    @staticmethod
    def baixar_midia_base64(instance_id, message_id, timeout=120):
        """
        Baixa mídia via /chat/getBase64FromMediaMessage/{instance}
        Retorna o base64 da mídia ou string vazia.
        timeout padrão de 120s para arquivos grandes.
        """
        url = f"{EvolutionService.get_api_url()}/chat/getBase64FromMediaMessage/{instance_id}"
        payload = {
            "message": {
                "key": {
                    "id": message_id,
                    "remoteJid": ""  # Opcional, mas algumas versões precisam
                }
            },
            "convertToMp4": False
        }
        try:
            logger.info(f"[EVOLUTION] Baixando mídia {message_id} da instância '{instance_id}' (timeout={timeout}s)")
            response = requests.post(url, json=payload, headers=EvolutionService.get_headers(), timeout=timeout)
            response.raise_for_status()
            data = response.json()
            # A API retorna { status, base64: "...", ... }
            base64_data = data.get('base64', '')
            if base64_data:
                logger.info(f"[EVOLUTION] Mídia {message_id} baixada com sucesso ({len(base64_data)} chars)")
            else:
                logger.warning(f"[EVOLUTION] Mídia {message_id} retornou base64 vazio")
            return base64_data
        except requests.exceptions.RequestException as e:
            logger.error(f"[EVOLUTION] Erro ao baixar mídia {message_id}: {e}")
            return ''

    @staticmethod
    def deletar_instancia(instance_id):
        """Deleta uma instância"""
        url = f"{EvolutionService.get_api_url()}/instance/delete/{instance_id}"

        try:
            response = requests.delete(url, headers=EvolutionService.get_headers())
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao deletar instância {instance_id}: {e}")
            raise

    @staticmethod
    def obter_settings(instance_id):
        """Obtém configurações da instância via GET /settings/find/{instance}"""
        url = f"{EvolutionService.get_api_url()}/settings/find/{instance_id}"

        try:
            logger.info(f"[EVOLUTION] Buscando settings da instância '{instance_id}'")
            response = requests.get(url, headers=EvolutionService.get_headers())
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"[EVOLUTION] Erro ao buscar settings da '{instance_id}': {e}")
            return {}

    @staticmethod
    def configurar_settings(instance_id, settings_data):
        """Configura settings da instância via POST /settings/set/{instance}"""
        url = f"{EvolutionService.get_api_url()}/settings/set/{instance_id}"

        try:
            logger.info(f"[EVOLUTION] Configurando settings da instância '{instance_id}'")
            response = requests.post(url, json=settings_data, headers=EvolutionService.get_headers())
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"[EVOLUTION] Erro ao configurar settings da '{instance_id}': {e}")
            raise

    @staticmethod
    def configurar_webhook(instance_id, payload):
        """Configura webhook da instância via POST /webhook/set/{instance}"""
        url = f"{EvolutionService.get_api_url()}/webhook/set/{instance_id}"
        webhook_base = getattr(settings, 'WEBHOOK_BASE_URL', 'http://localhost:8000')


        try:
            logger.info(f"[EVOLUTION] Configurando webhook da instância '{instance_id}': {webhook_base}")
            response = requests.post(url, json=payload, headers=EvolutionService.get_headers())
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"[EVOLUTION] Erro ao configurar webhook da '{instance_id}': {e}")
            raise

    @staticmethod
    def obter_webhook(instance_id):
        """Obtém configuração atual do webhook via GET /webhook/find/{instance}"""
        url = f"{EvolutionService.get_api_url()}/webhook/find/{instance_id}"

        try:
            logger.info(f"[EVOLUTION] Buscando webhook da instância '{instance_id}'")
            response = requests.get(url, headers=EvolutionService.get_headers())
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"[EVOLUTION] Erro ao buscar webhook da '{instance_id}': {e}")
            return {}
