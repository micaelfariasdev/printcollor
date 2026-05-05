import zipfile
import os
import logging
import json
from pathlib import Path
from django.conf import settings
from django.http import JsonResponse
from django.core import serializers
from django.apps import apps

logger = logging.getLogger(__name__)

# Ordem de modelos para backup (pais antes dos filhos)
MODELOS_BACKUP = [
    'Empresa',
    'Cliente',
    'Produto',
    'Usuario',
    'Orcamento',
    'ItemOrcamento',
    'PedidoFabrica',
    'DTFVendor',
    'DTFConfig',
    'WhatsAppInstance',
    'SolicitacaoOrcamento',
    'PricingConfig',
]


class BackupService:
    """Serviço para backup e restauração segura"""

    @staticmethod
    def export_backup():
        """Exporta banco e mídia para um arquivo ZIP"""
        from io import BytesIO
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # 1. Backup do Banco de Dados (modelo por modelo, ordem correta)
            api_app = apps.get_app_config('api')
            all_data = []
            for model_name in MODELOS_BACKUP:
                try:
                    model = api_app.get_model(model_name)
                    data = serializers.serialize('json', model.objects.all())
                    all_data.append({
                        'model': f'api.{model_name.lower()}',
                        'data': json.loads(data)
                    })
                except LookupError:
                    continue

            zip_file.writestr('db_backup.json', json.dumps(all_data, indent=2))

            # 2. Backup dos Arquivos de Mídia
            media_root = Path(settings.MEDIA_ROOT)
            if media_root.exists():
                for root, dirs, files in os.walk(media_root):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, media_root)
                        zip_file.write(file_path, os.path.join('media', arcname))

        buffer.seek(0)
        return buffer

    @staticmethod
    def import_backup(backup_file):
        """
        Importa backup de forma segura.
        Extrai apenas para MEDIA_ROOT, validando path traversal.
        """
        try:
            import io
            with zipfile.ZipFile(backup_file, 'r') as zip_ref:
                # 1. Restaurar Banco de Dados
                if 'db_backup.json' in zip_ref.namelist():
                    db_data = zip_ref.read('db_backup.json').decode('utf-8')
                    backup_json = json.loads(db_data)

                    # Valida se o backup é uma lista
                    if not isinstance(backup_json, list):
                        return False, "Formato de backup inválido: JSON deve ser uma lista."

                    # Limpa o banco antes de restaurar (exceto auth)
                    # Usa uma conexão direta para verificar se a tabela existe antes de deletar
                    from django.db import connection
                    api_app = apps.get_app_config('api')
                    existing_tables = set()

                    # Pega todas as tabelas existentes no banco
                    with connection.cursor() as cursor:
                        if 'sqlite' in connection.settings_dict['ENGINE']:
                            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                            existing_tables = {row[0] for row in cursor.fetchall()}
                        else:  # PostgreSQL
                            cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname='public';")
                            existing_tables = {row[0] for row in cursor.fetchall()}

                    for model_name in reversed(MODELOS_BACKUP):
                        try:
                            model = api_app.get_model(model_name)
                            table_name = model._meta.db_table
                            if table_name not in existing_tables:
                                logger.info(f"Tabela {table_name} não existe, pulando limpeza")
                                continue
                            model.objects.all().delete()
                        except LookupError:
                            logger.warning(f"Modelo {model_name} não encontrado no app api")
                            continue
                        except Exception as e:
                            logger.warning(f"Não foi possível limpar {model_name}: {e}")
                            continue

                    # Restaura na ordem correta
                    # backup_json pode ser:
                    # 1. Novo formato: [{'model': 'api.xxx', 'data': [...]}, ...]
                    # 2. Antigo formato: [{'model': 'api.xxx', 'pk': ..., 'fields': {...}}, ...]
                    for item in backup_json:
                        try:
                            # Detecta formato
                            if 'data' in item:
                                # Novo formato: item['data'] é uma lista de objetos
                                model_data = item['data']
                                if not isinstance(model_data, list):
                                    model_data = [model_data]
                            else:
                                # Formato antigo: item é um objeto direto
                                model_data = [item]

                            if not model_data:
                                continue

                            # Reconstrói o JSON para o Django
                            json_str = json.dumps(model_data)
                            for obj in serializers.deserialize('json', io.StringIO(json_str)):
                                obj.save()
                        except Exception as e:
                            logger.warning(f"Erro ao restaurar item de backup: {e}")
                            continue

                # 2. Restaurar Mídia (apenas para MEDIA_ROOT)
                media_root = Path(settings.MEDIA_ROOT)
                for file_info in zip_ref.infolist():
                    if file_info.filename.startswith('media/'):
                        # Validar path traversal
                        member_path = os.path.normpath(file_info.filename)
                        if member_path.startswith('..') or os.path.isabs(member_path):
                            logger.warning(f"Tentativa de path traversal detectada: {file_info.filename}")
                            continue
                        # Extrair apenas para a pasta media
                        target_path = media_root / member_path.replace('media/', '', 1)
                        target_dir = target_path.parent
                        if not target_dir.exists():
                            target_dir.mkdir(parents=True, exist_ok=True)
                        with zip_ref.open(file_info) as source, open(target_path, 'wb') as target:
                            target.write(source.read())

            return True, "Sistema restaurado com sucesso!"
        except Exception as e:
            logger.error(f"Erro ao importar backup: {e}")
            return False, f"Erro ao processar o arquivo de backup: {str(e)}"
