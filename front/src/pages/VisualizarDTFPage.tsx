import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { api } from '../auth/useAuth';
import { Printer, ArrowLeft, Loader2, FileDown } from 'lucide-react';
import { formatarReal } from '../tools/formatReal';
import logo from '../assets/logo-printcollor-blk.png';

const VisualizarDTFPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dtf, setDtf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    api.get(`dtf/${id}/`).then((response) => {
      setDtf(response.data);
      setLoading(false);
    });
  }, [id]);

  const handleDownload = async () => {
    if (!dtf) return;
    setIsDownloading(true);
    try {
      const response = await api.get(`dtf/${id}/gerar_pdf/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dtf-${dtf.nome_cliente}-${id}.pdf`);
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold uppercase italic">
      <Loader2 className="animate-spin mr-3" size={24} /> Carregando DTF...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-800 p-4 md:p-8 flex flex-col items-center print:bg-white print:p-0">
      
      <style>{`
        @media print {
          body, html { background: white !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
          .no-print { display: none !important; }
          #folha-dtf {
            position: absolute; top: 0; left: 0; 
            width: 210mm !important; 
            height: 297mm !important;
            margin: 0 !important; padding: 0.8cm !important; 
            box-shadow: none !important; border: none !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
          }
          @page { size: A4 portrait; margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* AÇÕES */}
      <div className="w-full max-w-[210mm] mb-4 flex justify-between items-center no-print">
        <button onClick={() => navigate(-1)} className="text-slate-300 hover:text-white font-bold flex items-center gap-2 transition-colors">
          <ArrowLeft size={20} /> VOLTAR
        </button>
        <div className="flex gap-3">
          <button onClick={handleDownload} disabled={isDownloading} className="bg-white hover:bg-slate-100 text-slate-800 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95">
            {isDownloading ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />} PDF
          </button>
          <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 shadow-lg transition-all active:scale-95">
            <Printer size={20} /> IMPRIMIR DTF
          </button>
        </div>
      </div>

      {/* FOLHA A4 VERTICAL */}
      <div 
        id="folha-dtf" 
        className="bg-white shadow-2xl flex flex-col" 
        style={{ 
          width: '210mm', 
          height: '297mm', 
          padding: '0.8cm', 
          boxSizing: 'border-box', 
          fontFamily: 'Arial, sans-serif',
          overflow: 'hidden' 
        }}
      >
        {/* Header - Shrink-0 para não amassar */}
        <div className="flex justify-between border-b-4 items-center border-slate-900  mb-2 flex-shrink-0">
            <img
              src={logo}
              alt="PrintCollor Logo"
              className="h-20 w-30 object-cover drop-shadow-[0_0_0_4px_white]"
            />
            <div className=" inline-block bg-slate-100 px-3  rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600">
              Pedido #{dtf.id}
            </div>
            <div className="text-right flex flex-col justify-end">
            <span className="text-md font-bold text-slate-900 leading-none">
              {new Date(dtf.data_criacao).toLocaleString('pt-BR')}
            </span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Data de Emissão</span>
          </div>
        </div>

        {/* Info Grid - Shrink-0 */}
        <div className="grid grid-cols-2 gap-3 mb-4 flex-shrink-0">
          <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">Cliente</span>
            <span className="text-lg font-bold text-slate-900 uppercase leading-none">{dtf.nome_cliente}</span>
          </div>
          
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">Tamanho</span>
            <span className="text-md font-bold text-slate-900 leading-none">{dtf.tamanho_cm} cm</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">Valor Total</span>
            <span className="text-md font-bold text-slate-900 leading-none">{formatarReal(dtf.valor_total)}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">Pagamento</span>
            <span className={`text-md font-black uppercase leading-none ${dtf.esta_pago ? 'text-green-600' : 'text-red-600'}`}>
              {dtf.esta_pago ? '✓ PAGO' : '⚠ PENDENTE'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">Produção</span>
            <span className="text-md font-bold text-slate-900 uppercase leading-none">{dtf.foi_impresso}</span>
          </div>
        </div>

        {/* Alerta de PIX - Shrink-0 */}
        {!dtf.esta_pago && (
          <div className="mb-4 bg-blue-50 border-2 border-blue-600 rounded-xl p-3 flex justify-between items-center flex-shrink-0">
            <div>
              <span className="text-blue-600 font-black text-[10px] uppercase block leading-none mb-1">Pagamento PIX</span>
              <span className="text-xl font-black text-blue-900 block leading-none">CNPJ: 04.811.720/0001-98</span>
              <p className="text-[10px] font-bold text-blue-700 mt-1 uppercase italic leading-none">Favorecido: D. R. OS SANTOS NETO | Banco do Brasil</p>
            </div>
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-center shadow-md">
                <span className="block text-[8px] font-black opacity-80 uppercase">Total</span>
                <span className="text-lg font-black leading-none">{formatarReal(dtf.valor_total)}</span>
            </div>
          </div>
        )}

        {/* Visualização de Arquivos - FLEX-1 e MIN-H-0 para limitar o crescimento */}
        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0 mb-4">
          <div className="flex flex-col min-h-0">
            <span className="text-[10px] font-black text-slate-400 uppercase mb-2 flex-shrink-0">Arquivo Layout</span>
            <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden p-2">
              {dtf?.layout_arquivo ? (
                <img src={dtf.layout_arquivo} className="max-w-full max-h-full object-contain" alt="Layout" />
              ) : (
                <span className="text-slate-300 font-black text-xs uppercase">Sem Imagem</span>
              )}
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <span className="text-[10px] font-black text-slate-400 uppercase mb-2 flex-shrink-0">Comprovante</span>
            <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden p-2">
              {dtf?.comprovante_pagamento ? (
                <img src={dtf.comprovante_pagamento} className="max-w-full max-h-full object-contain" alt="Comprovante" />
              ) : (
                <span className="text-slate-300 font-black text-xs uppercase">Sem Comprovante</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Shrink-0 */}
        <div className="mt-auto pt-3 border-t border-slate-100 text-center flex-shrink-0">
          <p className="text-[9px] text-slate-400 leading-tight font-bold uppercase tracking-widest">
            Comprovante interno PrintCollor. Conferência de responsabilidade da emissora.
          </p>
          <p className="text-[8px] text-slate-300 mt-1">Gerado em {new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
};

export default VisualizarDTFPage;