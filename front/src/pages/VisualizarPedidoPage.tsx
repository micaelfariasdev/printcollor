import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { api } from '../auth/useAuth';
import { Printer, ArrowLeft, FileDown, Loader2 } from 'lucide-react';
import logo from '../assets/logo-printcollor-blk.png';

const VisualizarPedidoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    api.get(`pedidos/${id}/`).then((response) => {
      setPedido(response.data);
      setLoading(false);
    });
  }, [id]);

  const handleDownload = async () => {
    if (!pedido) return;
    setIsDownloading(true);
    try {
      const response = await api.get(`pedidos/${id}/gerar_pdf/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${pedido.cliente_nome}-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold tracking-widest uppercase italic">
        Carregando Pedido...
      </div>
    );

  // --- LÓGICA DE GRADES (RECUPERADA) ---
  const tamanhos = Object.entries(pedido.detalhes_tamanho || {});
  const gradeBL = tamanhos.filter(([tam]) =>
    tam.toLowerCase().startsWith('bl')
  );
  const gradeInfantil = tamanhos.filter(([tam]) => {
    const n = parseInt(tam);
    return !isNaN(n) && n <= 16 && !tam.toLowerCase().startsWith('bl');
  });
  const gradeAdulto = tamanhos.filter(([tam]) => {
    const isBL = tam.toLowerCase().startsWith('bl');
    const n = parseInt(tam);
    const isInfantil = !isNaN(n) && n <= 16;
    const isGeneric = tam.toLowerCase() === 'quantidade';
    return !isBL && !isInfantil && !isGeneric;
  });

  return (
    <div className="min-h-screen bg-slate-800 flex flex-col items-center p-4 print:p-0 print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          @page { size: A4 landscape; margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }

        .folha-a4 {
          width: 297mm; height: 210mm; background: white; padding: 0.6cm;
          box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden;
        }

        .header-container { display: table; width: 100%; background: #f8fafc; padding: 10px 15px; border-radius: 12px; border: 1px solid #e2e8f0; flex-shrink: 0; margin-bottom: 10px; }
        .logo-section { display: table-cell; vertical-align: middle; width: 15%; font-weight: 900; color: #2563eb; font-size: 16px; }
        .client-highlight { display: table-cell; vertical-align: middle; width: 55%; padding-left: 20px; border-left: 2px solid #2563eb; }
        .date-section { display: table-cell; vertical-align: middle; text-align: right; width: 30%; }
        .client-name { margin: 0; font-size: 18px; color: #1e293b; font-weight: 900; text-transform: uppercase; line-height: 1.1; }
        .order-subtitle { font-size: 11px; color: #2563eb; font-weight: bold; }

        .layout-main { flex-grow: 1; width: 290mm; margin: 0 auto; text-align: center; border: 1px dashed #cbd5e1; border-radius: 12px; background: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 0; }
        .layout-img { max-width: 100%; max-height: 100%; object-fit: contain; }

        .specs-footer { display: flex; gap: 20px; width: 285mm; margin: 10px auto 0 auto; background: #f1f5f9; padding: 10px; border-radius: 12px; flex-shrink: 0; }
        .grid-column { width: 135mm; vertical-align: top; padding-right: 15px; }
        .total-column { width: 40mm; vertical-align: top; text-align: center; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; padding: 0 10px; }
        .specs-column { width: 110mm; vertical-align: top; padding: 0 10px; }

        .section-label { font-size: 12px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 3px; display: block; }
        .spec-text { font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 4px; display: block; }

        .grid-box { display: inline-block; background: #fff; border: 1px solid #e2e8f0; padding: 2px 5px; border-radius: 4px; text-align: center; min-width: 32px; margin-right: 4px; margin-bottom: 4px; }
        .grid-label { display: block; font-size: 14px; font-weight: bold; color: #000000; text-transform: uppercase; }
        .grid-value { font-size: 35px; font-weight: 900; color: #2563eb; line-height: 1; }
        
        .total-badge { background: #2563eb; color: #fff; padding: 8px; border-radius: 10px; display: inline-block; }
        .footer-note { text-align: right; font-size: 7px; color: #94a3b8; margin-top: 4px; }
      `}</style>

      {/* AÇÕES */}
      <div className="w-[290mm] flex justify-between mb-4 no-print">
        <button
          onClick={() => navigate(-1)}
          className="text-white font-bold flex items-center gap-2"
        >
          <ArrowLeft size={20} /> VOLTAR
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="bg-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2"
          >
            {isDownloading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <FileDown size={18} />
            )}{' '}
            PDF
          </button>
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-md flex items-center gap-2"
          >
            <Printer size={18} /> IMPRIMIR
          </button>
        </div>
      </div>

      <div className="folha-a4 shadow-2xl print:shadow-none">
        {/* HEADER */}
        <div className="header-container">
          <div className="logo-section">
            <img
              src={logo}
              alt="PrintCollor Logo"
              className="w-full h-17 object-cover drop-shadow-[0_0_0_4px_white]"
            />
          </div>
          <div className="client-highlight">
            <h1 className="client-name">{pedido.cliente_nome}</h1>
            <div className="order-subtitle">{pedido.nome_descricao}</div>
          </div>
          <div className="date-section">
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
              PEDIDO #{pedido.id}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Emissão:{' '}
              {new Date(pedido.data_criacao).toLocaleDateString('pt-BR')} |{' '}
              <strong>
                ENTREGA:{' '}
                {new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}
              </strong>
            </div>
          </div>
        </div>

        {/* LAYOUT (DINÂMICO) */}
        <div className="layout-main">
          {pedido.layout ? (
            <img src={pedido.layout} className="layout-img" alt="Layout" />
          ) : (
            <strong>LAYOUT INDISPONÍVEL</strong>
          )}
        </div>

        {/* FOOTER (EXATAMENTE COMO VOCÊ QUERIA) */}
        <div className="specs-footer">
          <div className="grid-column">
            <span className="section-label">Grade de Quantidades</span>

            {gradeAdulto.length > 0 && (
              <div style={{ marginBottom: '4px' }}>
                {gradeAdulto.map(([tam, qtd]) => (
                  <div
                    key={tam}
                    className="grid-box"
                    style={{ borderColor: '#fef3c7' }}
                  >
                    <span className="grid-label">{tam}</span>
                    <span className="grid-value">{String(qtd).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            )}

            {gradeBL.length > 0 && (
              <div style={{ marginBottom: '4px' }}>
                {gradeBL.map(([tam, qtd]) => (
                  <div
                    key={tam}
                    className="grid-box"
                    style={{ borderColor: '#fef3c7' }}
                  >
                    <span className="grid-label">{tam}</span>
                    <span className="grid-value">{String(qtd).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            )}

            {gradeInfantil.length > 0 && (
              <div style={{ marginBottom: '4px' }}>
                {gradeInfantil.map(([tam, qtd]) => (
                  <div
                    key={tam}
                    className="grid-box"
                    style={{ borderColor: '#fef3c7' }}
                  >
                    <span className="grid-label">{tam}</span>
                    <span className="grid-value">{String(qtd).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Caso quantidade única (bolsa, etc) */}
            {gradeAdulto.length === 0 &&
              gradeBL.length === 0 &&
              gradeInfantil.length === 0 && (
                <div className="grid-box" style={{ borderColor: '#2563eb' }}>
                  <span className="grid-label">QTD</span>
                  <span className="grid-value">{String(pedido.total_pecas).padStart(2, '0')}</span>
                </div>
              )}
          </div>

          <div className="total-column">
            <span className="section-label">Total</span>
            <div className="total-badge">
              <div style={{ fontSize: '25px', fontWeight: '900' }}>
                {pedido.total_pecas}
              </div>
              <div
                style={{ fontSize: '17px', fontWeight: 'bold', opacity: 0.8 }}
              >
                UNIDADES
              </div>
            </div>
          </div>

          {/* INFORMAÇÕES EXATAMENTE COMO NO MODELO HTML */}
          <div className="specs-column">
            <span className="section-label">Informações</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              OBSERVAÇÃO:
            </span>
            <span className="spec-text">{pedido.descricao?.toUpperCase()}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              MATERIAL:
            </span>
            <span className="spec-text">{pedido.material?.toUpperCase()}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              APLICAÇÃO:
            </span>
            <span className="spec-text">
              {pedido.aplicacao_arte?.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="footer-note">
          Print Collor Factory - {new Date().toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  );
};

export default VisualizarPedidoPage;
