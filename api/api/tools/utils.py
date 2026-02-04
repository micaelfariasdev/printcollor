# api/tools/utils.py
from django.template.loader import get_template
from django.http import HttpResponse
from xhtml2pdf import pisa # Certifique-se de ter dado: pip install xhtml2pdf
from io import BytesIO

def gerar_pdf_from_html(template_path, context, filename):
    # 1. Carrega o template e renderiza para HTML
    template = get_template(template_path)
    html = template.render(context)
    
    # 2. Prepara o buffer para o PDF
    result = BytesIO()
    
    # 3. Cria o PDF a partir do HTML
    # pisa.CreatePDF costuma ser a causa do erro se os parâmetros estiverem fora de ordem
    pdf = pisa.pisaDocument(BytesIO(html.encode("UTF-8")), result)
    
    # 4. Verifica erros e retorna a resposta do Django
    if not pdf.err:
        response = HttpResponse(result.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    
    return HttpResponse('Erro ao gerar PDF', status=400)