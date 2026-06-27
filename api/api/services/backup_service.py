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
# Nomes em minúsculas para compatibilidade com backup
# Auth models primeiro (grupos e permissões)
MODELOS_BACKUP = [
    'permission',  # auth_permission (primeiro, sem dependencias)
    'group',  # auth_group (depende de permission via M2M)
    'empresa',  # api_empresa
    'cliente',  # api_cliente
    'produto',  # api_produto
    'usuario',  # api_usuario (depende de Group e Permission)
    'dtfconfig',  # api_dtfconfig (precos DTF/estampa)
    'configuracaoloja',  # api_configuracaoloja (singleton PIX)
    'orcamento',  # api_orcamento (depende de Cliente, Usuario, Empresa)
    'itemorcamento',  # api_itemorcamento (depende de Orcamento, Produto)
    'pedidofabrica',  # api_pedidofabrica (depende de Cliente, Produto)
    'dtfvendor',  # api_dtfvendor (DTF, sublimacao, estampa)
    'whatsappinstance',  # api_whatsappinstance (depende de Usuario)
    'whatsappmessage',  # api_whatsappmessage (depende de WhatsAppInstance, Cliente)
]

# Mapeamento de nomes de modelos para objetos Django
# Necessário porque os nomes no backup podem estar em minúsculas
MODELO_MAP = {
    'group': ('auth', 'Group'),
    'permission': ('auth', 'Permission'),
    'empresa': ('api', 'Empresa'),
    'cliente': ('api', 'Cliente'),
    'produto': ('api', 'Produto'),
    'usuario': ('api', 'Usuario'),
    'orcamento': ('api', 'Orcamento'),
    'itemorcamento': ('api', 'ItemOrcamento'),
    'pedidofabrica': ('api', 'PedidoFabrica'),
    'dtfvendor': ('api', 'DTFVendor'),
    'dtfconfig': ('api', 'DTFConfig'),
    'whatsappinstance': ('api', 'WhatsAppInstance'),
    'whatsappmessage': ('api', 'WhatsAppMessage'),
    'configuracaoloja': ('api', 'ConfiguracaoLoja'),
}


class BackupService:
    """Serviço para backup e restauração segura"""

    @staticmethod
    def create_backup(filename):
        """Cria um arquivo de backup ZIP"""
        try:
            buffer = BackupService.export_backup()
            backup_dir = Path(settings.BASE_DIR) / 'backups'
            backup_dir.mkdir(parents=True, exist_ok=True)
            backup_path = backup_dir / f"{filename}.zip"
            with open(backup_path, 'wb') as f:
                f.write(buffer.getvalue())
            return str(backup_path)
        except Exception as e:
            logger.error(f"Erro ao criar backup: {e}")
            raise

    @staticmethod
    def export_backup():
        """Exporta banco e mídia para um arquivo ZIP"""
        from io import BytesIO
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # 1. Backup do Banco de Dados (modelo por modelo, ordem correta)
            all_data = []
            for model_name in MODELOS_BACKUP:
                try:
                    if model_name not in MODELO_MAP:
                        logger.warning(f"Modelo {model_name} não está no MODELO_MAP")
                        continue
                    app_label, model_class_name = MODELO_MAP[model_name]
                    model = apps.get_model(app_label, model_class_name)
                    data = serializers.serialize('json', model.objects.all())
                    all_data.append({
                        'model': f'{app_label}.{model_name}',
                        'data': json.loads(data)
                    })
                except LookupError:
                    logger.warning(f"Modelo {model_name} não encontrado")
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
                            if model_name not in MODELO_MAP:
                                logger.warning(f"Modelo {model_name} não está no MODELO_MAP")
                                continue
                            app_label, model_class_name = MODELO_MAP[model_name]
                            model = apps.get_model(app_label, model_class_name)
                            table_name = model._meta.db_table
                            if table_name not in existing_tables:
                                logger.info(f"Tabela {table_name} não existe, pulando limpeza")
                                continue
                            model.objects.all().delete()
                        except LookupError:
                            logger.warning(f"Modelo {model_name} não encontrado")
                            continue
                        except Exception as e:
                            logger.warning(f"Não foi possível limpar {model_name}: {e}")
                            continue

                    # Restaura na ordem correta usando MODELOS_BACKUP
                    # Organiza os dados por modelo (chave: 'app_label.model_name')
                    model_data_dict = {}

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

                            # Determina o nome completo do modelo (app_label.model_name)
                            if isinstance(model_data[0], dict) and 'model' in model_data[0]:
                                full_model_name = model_data[0]['model']  # ex: 'api.empresa'
                            else:
                                continue

                            if full_model_name not in model_data_dict:
                                model_data_dict[full_model_name] = []
                            model_data_dict[full_model_name].extend(model_data)

                        except Exception as e:
                            logger.warning(f"Erro ao processar item de backup: {e}")
                            continue

                    # Mapeia nomes completos para nomes simples usados em MODELOS_BACKUP
                    full_name_to_simple = {}
                    for simple_name in MODELOS_BACKUP:
                        if simple_name in MODELO_MAP:
                            app_label, model_class_name = MODELO_MAP[simple_name]
                            full_name = f"{app_label}.{simple_name}"
                            full_name_to_simple[full_name] = simple_name

                    # Restaura seguindo a ordem de MODELOS_BACKUP
                    for model_name in MODELOS_BACKUP:
                        if model_name not in MODELO_MAP:
                            logger.warning(f"Modelo {model_name} não está no MODELO_MAP")
                            continue

                        app_label, model_class_name = MODELO_MAP[model_name]
                        full_model_name = f"{app_label}.{model_name}"

                        if full_model_name not in model_data_dict:
                            continue

                        try:
                            model = apps.get_model(app_label, model_class_name)
                            model_data = model_data_dict[full_model_name]

                            # Processa cada registro para tratar M2M
                            for record in model_data:
                                if not isinstance(record, dict) or 'fields' not in record:
                                    continue

                                # Separa campos M2M dos normais
                                fields = record['fields']
                                m2m_fields = {}
                                normal_fields = {}

                                for key, value in fields.items():
                                    if isinstance(value, list):
                                        m2m_fields[key] = value
                                    else:
                                        normal_fields[key] = value

                                # Cria/atualiza o objeto sem os campos M2M
                                record_without_m2m = {
                                    'model': record.get('model', full_model_name),
                                    'pk': record.get('pk'),
                                    'fields': normal_fields
                                }

                                json_str = json.dumps([record_without_m2m])
                                for obj in serializers.deserialize('json', io.StringIO(json_str)):
                                    obj.save()

                                    # Agora adiciona os campos M2M
                                    instance = obj.object
                                    for m2m_field_name, m2m_values in m2m_fields.items():
                                        if not m2m_values:
                                            continue
                                        try:
                                            m2m_manager = getattr(instance, m2m_field_name)
                                            # Limpa relações existentes
                                            m2m_manager.clear()
                                            # Adiciona novas relações - aceita tanto IDs quanto objetos
                                            for value in m2m_values:
                                                if isinstance(value, int):
                                                    # É um ID direto
                                                    m2m_manager.add(value)
                                                elif isinstance(value, dict) and 'pk' in value:
                                                    # É um objeto serializado
                                                    m2m_manager.add(value['pk'])
                                                elif hasattr(value, 'pk'):
                                                    # É um objeto Django
                                                    m2m_manager.add(value.pk)
                                        except Exception as e:
                                            logger.warning(f"Erro ao restaurar M2M {m2m_field_name}: {e}")

                            logger.info(f"Restaurado {full_model_name} com sucesso")
                        except Exception as e:
                            logger.warning(f"Erro ao restaurar {full_model_name}: {e}")
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
                        source = zip_ref.open(file_info)
                        target = open(target_path, 'wb')
                        try:
                            target.write(source.read())
                        finally:
                            target.close()
                            source.close()

            return True, "Sistema restaurado com sucesso!"
        except Exception as e:
            logger.error(f"Erro ao importar backup: {e}")
            return False, f"Erro ao processar o arquivo de backup: {str(e)}"
