import { useEffect, useState, useRef } from 'react';
import { api } from '../auth/useAuth';
import { useAlert } from '../contexts/AlertContext';
import {
  Layers,
  Calendar,
  Maximize2,
  ArrowLeftCircle,
  ArrowRightCircle,
  RotateCcw,
} from 'lucide-react';

export const PedidosCarrosselMobile = () => {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addAlert } = useAlert();
  const scrollRef = useRef<HTMLDivElement>(null);

  const carregarDados = () => {
    api.get('pedidos/').then((response) => {
      const lista = Object.values(response.data)
        .filter((p: any) => p.status !== 'finalizado')
        .sort((a: any, b: any) => b.id - a.id);
      setPedidos(lista);
      setLoading(false);
    });
  };

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 300000);
    return () => clearInterval(interval);
  }, []);

  // ADICIONADO APENAS A FUNÇÃO DE STATUS
  const handleTrocarStatusRapido = async (id: number, statusAtual: string) => {
    const proximosStatus: { [key: string]: string } = {
      pendente: 'em_producao',
      em_producao: 'finalizado',
    };
    const novoStatus = proximosStatus[statusAtual];
    if (!novoStatus) return;

    try {
      await api.patch(`pedidos/${id}/`, { status: novoStatus });
      addAlert(`Pedido #${id} atualizado!`, 'success');
      if (navigator.vibrate) navigator.vibrate(50);
      carregarDados();
    } catch (error) {
      addAlert('Erro ao mudar status.', 'error');
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-blue-500 font-black italic uppercase text-sm">
      Carregando Painel...
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden flex flex-col">
      <div id="aviso-orientacao" className="hidden font-black uppercase italic">
        <div className="animate-bounce mb-4 text-blue-500">
          <RotateCcw size={48} />
        </div>
        <p className="text-xl text-white">Gire o aparelho</p>
        <p className="text-[10px] text-slate-500 mt-2">O painel de produção funciona apenas na horizontal</p>
      </div>

      <div id="carrossel-principal" className="flex-1 flex flex-col overflow-hidden">
        <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 shadow-lg z-10">
          <div className="flex items-center gap-2">
            <span className="text-blue-500 font-black text-[10px] italic tracking-tighter">PRINT COLLOR</span>
            <div className="h-4 w-px bg-slate-700 mx-1" />
            <span className="text-[9px] text-slate-400 font-bold uppercase italic">{pedidos.length} Pedidos Ativos</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => scroll('left')} className="text-slate-500 hover:text-white active:scale-90 transition-all">
              <ArrowLeftCircle size={24} />
            </button>
            <button onClick={() => scroll('right')} className="text-slate-500 hover:text-white active:scale-90 transition-all">
              <ArrowRightCircle size={24} />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-x-auto snap-x snap-mandatory flex scroll-smooth no-scrollbar">
          {pedidos.map((item) => {
            const tamanhos = Object.entries(item.detalhes_tamanho || {});
            const gradeBL = tamanhos.filter(([tam]) => tam.toLowerCase().startsWith('bl'));
            const gradeInfantil = tamanhos.filter(([tam]) => {
              const n = parseInt(tam);
              return !isNaN(n) && n <= 16 && !tam.toLowerCase().startsWith('bl');
            });
            const gradeAdulto = tamanhos.filter(([tam]) => {
              const isBL = tam.toLowerCase().startsWith('bl');
              const n = parseInt(tam);
              return (!isBL && !isNaN(n) === false && tam.toLowerCase() !== 'quantidade') || (!isNaN(n) && n > 16);
            });

            return (
              <div key={item.id} className="w-screen h-full shrink-0 snap-start snap-always flex p-2 gap-2 overflow-hidden">
                <div className="w-[60%] bg-white rounded-xl relative border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                  {item.layout ? (
                    <img src={item.layout} className="max-w-full max-h-full object-contain p-1" alt="Layout" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-300 uppercase font-black text-xs">
                      <Layers size={40} className="mb-2" /> Sem Imagem
                    </div>
                  )}

                  <div className="absolute top-2 left-2 bg-slate-900/90 px-3 py-1 rounded-lg border border-white/10 shadow-2xl">
                    <span className="text-white font-black text-xs block leading-none">#{item.id}</span>
                    <span className="text-blue-400 font-bold text-[9px] uppercase truncate max-w-[150px] block">{item.cliente_nome}</span>
                  </div>

                  {/* ADICIONADO APENAS O BOTÃO DE STATUS NO CANTO SUPERIOR DIREITO */}
                  <button
                    onClick={() => handleTrocarStatusRapido(item.id, item.status)}
                    className={`absolute top-2 right-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-lg transition-all active:scale-90 ${
                      item.status === 'em_producao' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
                    }`}
                  >
                    {item.status.replace('_', ' ')}
                  </button>

                  <button
                    onClick={() => window.open(`/pedido/${item.id}/visualizar`, '_blank')}
                    className="absolute bottom-2 right-2 bg-blue-600 p-2 rounded-lg text-white shadow-lg active:scale-90 transition hover:bg-blue-500"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>

                <div className="w-[40%] flex flex-col gap-2 h-full overflow-hidden">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shrink-0 shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-blue-500 font-black text-xs uppercase italic tracking-tighter truncate max-w-[70%]">{item.nome_descricao}</span>
                      <span className="text-slate-400 font-bold text-[9px] flex items-center gap-1 shrink-0">
                        <Calendar size={10} /> {new Date(item.data_entrega).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="space-y-1 mt-1">
                      <div>
                        <span className="text-[8px] text-slate-500 font-black uppercase">Observação:</span>
                        <p className="text-white text-[10px] font-bold uppercase leading-tight line-clamp-2">{item.descricao || 'N/A'}</p>
                      </div>
                      <div className="flex gap-4 border-t border-slate-800 pt-1">
                        <div>
                          <span className="text-[8px] text-slate-500 font-black uppercase">Material:</span>
                          <p className="text-white text-[9px] font-bold uppercase truncate max-w-[80px]">{item.material}</p>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-500 font-black uppercase">Aplicação:</span>
                          <p className="text-blue-400 text-[9px] font-bold uppercase truncate max-w-[80px]">{item.aplicacao_arte}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-3 flex-1 flex flex-col min-h-0 shadow-md">
                    <span className="text-[10px] font-black text-slate-400 uppercase mb-2 shrink-0 tracking-widest">Grade de Peças</span>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {gradeAdulto.length > 0 && (
                        <div className="flex flex-wrap gap-1 pb-1 border-b border-slate-50">
                          {gradeAdulto.map(([tam, qtd]) => (
                            <div key={tam} className="bg-slate-50 border border-slate-200 rounded p-1 text-center min-w-[42px]">
                              <span className="block text-[8px] font-black text-slate-400 uppercase">{tam}</span>
                              <span className="text-xl font-black text-blue-600 leading-none">{String(qtd).padStart(2, '0')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {gradeBL.length > 0 && (
                        <div className="flex flex-wrap gap-1 pb-1 border-b border-slate-50">
                          {gradeBL.map(([tam, qtd]) => (
                            <div key={tam} className="bg-amber-50/30 border border-amber-100 rounded p-1 text-center min-w-[42px]">
                              <span className="block text-[8px] font-black text-amber-600 uppercase">{tam}</span>
                              <span className="text-xl font-black text-amber-700 leading-none">{String(qtd).padStart(2, '0')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {gradeInfantil.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {gradeInfantil.map(([tam, qtd]) => (
                            <div key={tam} className="bg-green-50/30 border border-green-100 rounded p-1 text-center min-w-[42px]">
                              <span className="block text-[8px] font-black text-green-600 uppercase">{tam}</span>
                              <span className="text-xl font-black text-green-700 leading-none">{String(qtd).padStart(2, '0')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {gradeAdulto.length === 0 && gradeBL.length === 0 && gradeInfantil.length === 0 && (
                        <div className="bg-blue-50 border border-blue-100 rounded p-2 text-center w-full my-auto">
                          <span className="block text-[10px] font-black text-blue-400 uppercase">Quantidade Única</span>
                          <span className="text-3xl font-black text-blue-600 leading-none">{String(item.total_pecas).padStart(2, '0')}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-2 border-t border-slate-100 flex justify-between items-center shrink-0">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total:</span>
                      <span className="text-xl font-black text-slate-900 leading-none">{item.total_pecas} <small className="text-[10px] text-slate-400">PÇS</small></span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center shrink-0">
          <span className="text-[7px] text-slate-600 font-bold uppercase tracking-[0.2em]">PrintCollor Mobile Factory Interface</span>
        </div>
      </div>
    </div>
  );
};