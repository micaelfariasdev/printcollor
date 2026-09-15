import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { api } from '../auth/useAuth';
import { Printer, ArrowLeft, Camera } from 'lucide-react';
import logo from '../assets/logo-printcollor-blk.png';
import html2canvas from 'html2canvas';
import { useAlert } from '../contexts/AlertContext';
import { separarGrade } from '../tools/pedidoGrade';

type StatusPedido = 'pendente' | 'em_producao' | 'finalizado';

interface PedidoFabrica {
  id: number;
  cliente_nome: string;
  nome_descricao: string;
  data_criacao: string;
  data_entrega?: string | null;
  status: StatusPedido;
  layout?: string | null;
  detalhes_tamanho: Record<string, string | number>;
  total_pecas: number;
  descricao?: string;
  material?: string;
  aplicacao_arte?: string;
}

const VisualizarPedidoPage = () => {
  const { addAlert } = useAlert();
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState<PedidoFabrica | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleTrocarStatus = async (novo: StatusPedido) => {
    if (!pedido) return;
    if (novo === pedido.status) return;
    if (novo === 'finalizado' && !window.confirm('Marcar este pedido como finalizado?')) return;
    setIsUpdatingStatus(true);
    try {
      await api.patch(`pedidos/${id}/`, { status: novo });
      setPedido((atual) => atual ? { ...atual, status: novo } : atual);
      addAlert(`Pedido #${id} movido para ${novo.replace('_', ' ')}`, 'info');
    } catch {
      addAlert('Erro ao atualizar status.', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    api.get(`pedidos/${id}/`)
      .then((response) => setPedido(response.data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const captureAndCopy = async () => {
    const folha = document.getElementById('folha-pedido');
    if (!folha) return;
    try {
      const canvas = await html2canvas(folha as HTMLElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        onclone: (doc) => {
          const el = doc.getElementById('folha-pedido');
          if (el) {
            (el as HTMLElement).style.boxShadow = 'none';
            (el as HTMLElement).style.filter = 'none';
            (el as HTMLElement).style.transform = 'none';
          }
          doc.querySelectorAll('*').forEach((node) => {
            const el = node as HTMLElement;
            const style = (doc as Document).defaultView?.getComputedStyle(el);
            if (!style) return;
            if (style.color && style.color.includes('oklch')) {
              el.style.color = '#000000';
            }
            if (style.backgroundColor && style.backgroundColor.includes('oklch')) {
              el.style.backgroundColor = '#ffffff';
            }
            if (style.borderColor && style.borderColor.includes('oklch')) {
              el.style.borderColor = '#e2e8f0';
            }
            if (style.fill && style.fill.includes('oklch')) {
              el.style.fill = '#000000';
            }
          });
        },
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        addAlert('Print copiado! Use Ctrl+V para colar.', 'success');
      }, 'image/png');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!pedido) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        captureAndCopy();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pedido]);

  // Autoescala somente para a visualização; impressão preserva A4 real.
  const escalaRef = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  useEffect(() => {
    if (!escalaRef.current) return;
    const aplicarEscala = () => {
      const disponivel = window.innerHeight - 120;
      const disponivelLarg = window.innerWidth - 40;
      const scaleY = disponivel / 210;
      const scaleX = disponivelLarg / 297;
      const scale = Math.min(scaleY, scaleX, 1);
      setEscala(scale);
    };
    aplicarEscala();
    const ro = new ResizeObserver(aplicarEscala);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [loading]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold tracking-widest uppercase italic">
        Carregando Pedido...
      </div>
    );

  if (loadError || !pedido) {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-slate-900 text-white p-6 text-center">
        <p className="font-bold uppercase tracking-widest">Não foi possível carregar o pedido.</p>
        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-slate-700 font-bold">Voltar</button>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-blue-600 font-bold">Tentar novamente</button>
        </div>
      </div>
    );
  }

  // --- LÓGICA DE ORDENAÇÃO DE TAMANHOS ---
  const { gradeAdulto, gradeBL, gradeInfantil } = separarGrade(pedido.detalhes_tamanho);

  return (
    <div className="min-h-screen bg-slate-800 flex flex-col items-center p-4 print:p-0 print:bg-white overflow-y-auto">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .preview-scale { width: 297mm !important; height: 210mm !important; }
          .folha-a4 { transform: none !important; }
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
      <div className="w-full max-w-[290mm] flex justify-between mb-4 no-print">
        <button
          onClick={() => navigate(-1)}
          className="text-white font-bold flex items-center gap-2"
        >
          <ArrowLeft size={20} /> VOLTAR
        </button>
        <div className="flex gap-2 items-center">
          <select
            value={pedido.status}
            disabled={isUpdatingStatus}
            onChange={(event) => handleTrocarStatus(event.target.value as StatusPedido)}
            aria-label="Alterar status do pedido"
            className={`px-3 py-2 rounded-lg font-black text-xs no-print ${
              pedido?.status === 'finalizado'
                ? 'bg-green-700 text-green-200'
                : pedido?.status === 'em_producao'
                ? 'bg-yellow-700 text-yellow-200'
                : 'bg-orange-700 text-orange-200'
            }`}
          >
            <option value="pendente">PENDENTE</option>
            <option value="em_producao">EM PRODUÇÃO</option>
            <option value="finalizado">FINALIZADO</option>
          </select>
          <button
            onClick={captureAndCopy}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2"
          >
            <Camera size={18} /> Print
          </button>
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-md flex items-center gap-2"
          >
            <Printer size={18} /> IMPRIMIR
          </button>
        </div>
      </div>

      <div
        ref={escalaRef}
        className="preview-scale"
        style={{ width: `${297 * escala}mm`, height: `${210 * escala}mm` }}
      >
      <div id="folha-pedido" className="folha-a4 shadow-2xl print:shadow-none" style={{ transform: `scale(${escala})`, transformOrigin: 'top left' }}>
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
              {new Date(pedido.data_criacao).toLocaleDateString('pt-BR')} 
             {pedido.data_entrega &&  <strong>
              {' '}| ENTREGA:{' '}
                {new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}
              </strong>}
            </div>
          </div>
        </div>

        {/* LAYOUT */}
        <div className="layout-main">
          {pedido.layout ? (
            <img src={pedido.layout} className="layout-img" alt="Layout" />
          ) : (
            <strong>LAYOUT INDISPONÍVEL</strong>
          )}
        </div>

        {/* FOOTER */}
        <div className="specs-footer">
          <div className="grid-column">
            <span className="section-label">Grade de Quantidades</span>

            {gradeAdulto.length > 0 && (
              <div style={{ marginBottom: '4px' }}>
                {gradeAdulto.map(([tam, qtd]) => (
                  <div
                    key={tam}
                    className="grid-box"
                    style={{ borderColor: '#e2e8f0' }}
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
                    style={{ borderColor: '#e2e8f0' }}
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
                    style={{ borderColor: '#e2e8f0' }}
                  >
                    <span className="grid-label">{tam}</span>
                    <span className="grid-value">{String(qtd).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            )}

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
    </div>
  );
};

export default VisualizarPedidoPage;
