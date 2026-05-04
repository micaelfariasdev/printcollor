from django.template.loader import render_to_string
from django.http import HttpResponse
import os

if os.name != "nt":
    from weasyprint import HTML

def gerar_pdf_from_html(template_name, context, filename):
    if os.name == "nt":
        return HttpResponse("PDF desativado no ambiente local", status=501)

    html_string = render_to_string(template_name, context)
    html = HTML(string=html_string)
    result = html.write_pdf()

    response = HttpResponse(result, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    return response