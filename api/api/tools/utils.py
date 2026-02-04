from django.template.loader import render_to_string
from weasyprint import HTML
from django.http import HttpResponse

def gerar_pdf_from_html(template_name, context, filename):
    # 1. Renderiza o HTML com os dados
    html_string = render_to_string(template_name, context)
    
    # 2. Gera o PDF usando WeasyPrint
    # Opcional: Adicione base_url=request.build_absolute_uri() se precisar de caminhos relativos
    html = HTML(string=html_string)
    result = html.write_pdf()

    # 3. Prepara a resposta
    response = HttpResponse(result, content_type='application/pdf')
    # Use 'attachment' para forçar download ou 'inline' para abrir no navegador
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response