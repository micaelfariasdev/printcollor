from django.http import HttpResponse
from django.template.loader import render_to_string
from io import BytesIO

try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except OSError:
    HTML = None
    WEASYPRINT_AVAILABLE = False


class PDFService:
    """Serviço centralizado para geração de PDFs"""

    @staticmethod
    def generate_orcamento_pdf(orcamento):
        """Gera PDF de orçamento usando WeasyPrint"""
        if not WEASYPRINT_AVAILABLE:
            raise RuntimeError('PDF generation unavailable on this system (GTK3 required).')

        html_string = render_to_string('pdfs/pedido.html', {'pedido': orcamento})
        html = HTML(string=html_string, base_url='http://localhost:8000')
        pdf_file = BytesIO()
        html.write_pdf(pdf_file)
        pdf_file.seek(0)
        return pdf_file

    @staticmethod
    def generate_pedido_pdf(pedido):
        """Gera PDF de pedido de fábrica"""
        if not WEASYPRINT_AVAILABLE:
            raise RuntimeError('PDF generation unavailable on this system (GTK3 required).')

        # Determina qual template usar baseado na empresa
        template_id = pedido.cliente.empresa.template_id if hasattr(pedido.cliente, 'empresa') else 1
        template_map = {1: 'pdfs/1.html', 2: 'pdfs/2.html', 3: 'pdfs/3.html'}
        template = template_map.get(template_id, 'pdfs/pedido.html')

        html_string = render_to_string(template, {'pedido': pedido})
        html = HTML(string=html_string, base_url='http://localhost:8000')
        pdf_file = BytesIO()
        html.write_pdf(pdf_file)
        pdf_file.seek(0)
        return pdf_file

    @staticmethod
    def generate_dtf_pdf(vendor):
        """Gera PDF de venda DTF"""
        if not WEASYPRINT_AVAILABLE:
            raise RuntimeError('PDF generation unavailable on this system (GTK3 required).')

        html_string = render_to_string('pdfs/dtf_pedido.html', {'vendor': vendor})
        html = HTML(string=html_string, base_url='http://localhost:8000')
        pdf_file = BytesIO()
        html.write_pdf(pdf_file)
        pdf_file.seek(0)
        return pdf_file
