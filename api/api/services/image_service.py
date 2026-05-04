from PIL import Image
from django.core.files.base import ContentFile
import io


class ImageService:
    """Serviço para processamento e otimização de imagens"""

    @staticmethod
    def convert_to_webp(imagem_input, max_width=None, quality=85):
        """
        Converte imagem para WebP, redimensiona se necessário e otimiza.
        Retorna ContentFile com a imagem processada.
        """
        img = Image.open(imagem_input)

        # Converte para RGB se necessário (WebP suporta RGBA, mas JPEG não)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")

        # Redimensiona se exceder a largura máxima
        if max_width and img.width > max_width:
            ratio = max_width / float(img.width)
            new_height = int(float(img.height) * float(ratio))
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

        # Salva como WebP
        buffer = io.BytesIO()
        img.save(buffer, format='WebP', quality=quality, optimize=True)
        buffer.seek(0)

        # Novo nome com extensão .webp
        original_name = imagem_input.name.split('.')[0]
        return ContentFile(buffer.read(), name=f"{original_name}.webp")

    @staticmethod
    def processar_imagem_base64(base64_string, max_size=(800, 800)):
        """
        Processa imagem em base64, redimensiona e converte para WebP.
        """
        import base64
        import re

        # Remove prefixo data:image/...;base64,
        base64_string = re.sub(r'^data:image/\w+;base64,', '', base64_string)
        image_data = base64.b64decode(base64_string)
        img = Image.open(io.BytesIO(image_data))

        if img.mode in ("RGBA", "P"):
            img = img.convert("RGBA")

        img.thumbnail(max_size, Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format='WebP', quality=85, optimize=True)
        buffer.seek(0)

        return ContentFile(buffer.read(), name="imagem_processada.webp")
