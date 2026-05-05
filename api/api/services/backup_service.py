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

# Lista explícita de modelos para backup
MODELOS_BACKUP = [
    'Orcamento', 'ItemOrcamento', 'PedidoFabrica',
    'DTFVendor', 'Cliente', 'Produto', 'Empresa',
    'SolicitacaoOrcamento', 'Usuario', 'PricingConfig',
]


class BackupService:
    """Serviço para backup e restauração segura"""

    @staticmethod
    def export_backup():
        """Exporta banco e mídia para um arquivo ZIP"""
        from io import BytesIO

        buffer = BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # 1. Backup do Banco de Dados
            api_app = apps.get_app_config('api')
            all_objects = []
            for model_name in MODELOS_BACKUP:
                try:
                    model = api_app.get_model(model_name)
                    all_objects.extend(model.objects.all())
                except LookupError:
                    continue

            json_data = serializers.serialize('json', all_objects)
            zip_file.writestr('db_backup.json', json_data)

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
            with zipfile.ZipFile(backup_file, 'r') as zip_ref:
                # 1. Restaurar Banco de Dados
                if 'db_backup.json' in zip_ref.namelist():
                    db_data = zip_ref.read('db_backup.json').decode('utf-8')
                    for deserialized_obj in serializers.deserialize('json', db_data):
                        deserialized_obj.save()

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
            return False, "Erro ao processar o arquivo de backup"
