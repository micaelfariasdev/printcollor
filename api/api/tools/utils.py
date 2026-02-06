from django.template.loader import render_to_string
from weasyprint import HTML
from django.http import HttpResponse

def gerar_pdf_from_html(template_name, context, filename):
    html_string = render_to_string(template_name, context)
    html = HTML(string=html_string)
    result = html.write_pdf()
    response = HttpResponse(result, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    
    return response