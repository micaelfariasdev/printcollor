from django.template.loader import render_to_string
from weasyprint import HTML
import tempfile
from django.http import HttpResponse

def gerar_pdf_from_html(template_name, context, filename):
    # 1. Renderiza o HTML com os dados do Django
    html_string = render_to_string(template_name, context)
    
    # 2. Cria o PDF
    html = HTML(string=html_string)
    result = html.write_pdf()

    # 3. Prepara a resposta do navegador
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename={filename}'
    response.write(result)
    
    return response