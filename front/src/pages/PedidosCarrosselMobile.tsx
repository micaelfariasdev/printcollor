import React, { useEffect, useState, useRef } from 'react';
import { api } from '../auth/useAuth';
import { useAlert } from '../contexts/AlertContext';
import {
  Layers,
  Calendar,
  Maximize2,
  ArrowLeftCircle,
  ArrowRightCircle,
  RotateCcw,
  RefreshCw, // Importado para o botão de atualizar
} from 'lucide-react';

export const PedidosCarrosselMobile = () => {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [dtfs, setDtfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pedidos' | 'dtf'>('pedidos');
  const { addAlert } = useAlert();
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- LÓGICA DE ORDENAÇÃO DE TAMANHOS (mesma do VisualizarPedidoPage) ---
  const ordemTamanhos: { [key: string]: number } = {
    'pp': 1, 'p': 2, 'm': 3, 'g': 4, 'gg': 5, 'xgg': 6, 'xxgg': 7,
    'bl pp': 10, 'bl p': 11, 'bl m': 12, 'bl g': 13, 'bl gg': 14, 'bl xgg': 15, 'bl xxgg': 16,
    '02': 20, '04': 21, '06': 22, '08': 23, '10': 24, '12': 25, '14': 26, '16': 27,
    '2a': 20, '4a': 21, '6a': 22, '8a': 23, '10a': 24, '12a': 25, '14a': 26, '16a': 27
  };

  const ordenarGrade = (a: [string, any], b: [string, any]) => {
    const pesoA = ordemTamanhos[a[0].toLowerCase()] || 99;
    const pesoB = ordemTamanhos[b[0].toLowerCase()] || 99;
    return pesoA - pesoB;
  };

  const getGradeData = (detalhes: any) => {
    const tamanhos = Object.entries(detalhes || {});

    const gradeBL = tamanhos
      .filter(([tam]) => tam.toLowerCase().startsWith('bl'))
      .sort(ordenarGrade);

    const gradeInfantil = tamanhos
      .filter(([tam]) => {
        const n = parseInt(tam);
        return !isNaN(n) && n <= 16 && !tam.toLowerCase().startsWith('bl');
      })
      .sort(ordenarGrade);

    const gradeAdulto = tamanhos
      .filter(([tam]) => {
        const isBL = tam.toLowerCase().startsWith('bl');
        const n = parseInt(tam);
        const isInfantil = !isNaN(n) && n <= 16;
        const isGeneric = tam.toLowerCase() === 'quantidade';
        return !isBL && !isInfantil && !isGeneric;
      })
      .sort(ordenarGrade);

    return { gradeBL, gradeInfantil, gradeAdulto };
  };

  const carregarDados = async () => {
    setRefreshing(true);
    try {
      const response = await api.get('pedidos/');
      const lista = Object.values(response.data)
        .filter((p: any) => p.status !== 'finalizado')
        .sort((a: any, b: any) => b.id - a.id);
      setPedidos(lista);
    } catch (error) {
      addAlert('Erro ao atualizar lista.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarPedidos();
    carregarDTFs();
    const interval = setInterval(() => { carregarPedidos(); carregarDTFs(); }, 600000);
    return () => clearInterval(interval);
  }, []);

  const carregarPedidos = async () => {
    setRefreshing(true);
    try {
      const response = await api.get('pedidos/');
      const lista = Object.values(response.data)
        .filter((p: any) => p.status !== 'finalizado')
        .sort((a: any, b: any) => b.id - a.id);
      setPedidos(lista);
    } catch (error) {
      addAlert('Erro ao atualizar lista.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const carregarDTFs = async () => {
    try {
      const response = await api.get('dtf/');
      const lista = Object.values(response.data)
        .filter((p: any) => p.status !== 'finalizado')
        .sort((a: any, b: any) => b.id - a.id);
      setDtfs(lista);
    } catch (error) {
      addAlert('Erro ao atualizar DTFs.', 'error');
    }
  };

  const handleTrocarStatusRapido = async (id: number, statusAtual: string, tipo: 'pedido' | 'dtf') => {
    const proximosStatus: { [key: string]: string } = {
      pendente: 'em_producao',
      em_producao: 'finalizado',
    };
    const novoStatus = proximosStatus[statusAtual];
    if (!novoStatus) return;

    try {
      const endpoint = tipo === 'pedido' ? `pedidos/${id}/` : `dtf/${id}/`;
      await api.patch(endpoint, { status: novoStatus });
      addAlert(`${tipo === 'pedido' ? 'Pedido' : 'DTF'} #${id} atualizado!`, 'success');
      if (navigator.vibrate) navigator.vibrate(50);
      tipo === 'pedido' ? carregarPedidos() : carregarDTFs();
    } catch (error) {
      addAlert('Erro ao mudar status.', 'error');
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo =
        direction === 'left'
          ? scrollLeft - clientWidth
          : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (loading)
    return (
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
        <p className="text-[10px] text-slate-500 mt-2">
          O painel de produção funciona apenas na horizontal
        </p>
      </div>

      <div
        id="carrossel-principal"
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 shadow-lg z-10">
          <div className="flex items-center gap-2">
            <span className="text-blue-500 font-black text-[10px] italic tracking-tighter">
              PRINT COLLOR
            </span>
            <div className="h-4 w-px bg-slate-700 mx-1" />
            {/* TABS */}
            <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('pedidos')}
                className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded-md transition-all ${activeTab === 'pedidos'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                Pedidos ({pedidos.length})
              </button>
              <button
                onClick={() => setActiveTab('dtf')}
                className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded-md transition-all ${activeTab === 'dtf'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                DTF ({dtfs.length})
              </button>
            </div>

            {/* BOTÃO ATUALIZAR MANUALMENTE */}
            <button
              onClick={activeTab === 'pedidos' ? carregarPedidos : carregarDTFs}
              className={`ml-2 text-slate-500 hover:text-blue-400 transition-all ${refreshing ? 'animate-spin text-blue-500' : ''}`}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => scroll('left')}
              className="text-slate-500 hover:text-white active:scale-90 transition-all"
            >
              <ArrowLeftCircle size={24} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="text-slate-500 hover:text-white active:scale-90 transition-all"
            >
              <ArrowRightCircle size={24} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto snap-x snap-mandatory flex scroll-smooth no-scrollbar"
        >
          {(activeTab === 'pedidos' ? pedidos : dtfs).map((item) => {
            const isDTF = activeTab === 'dtf';

            // Para DTF, usar dados diferentes
            let gradeAdulto: [string, any][] = [];
            let gradeBL: [string, any][] = [];
            let gradeInfantil: [string, any][] = [];
            let totalPecas = 0;

            if (!isDTF) {
              const tamanhos = Object.entries(item.detalhes_tamanho || {});
              const { gradeBL: bl, gradeInfantil: inf, gradeAdulto: ad } = getGradeData(item.detalhes_tamanho);
              gradeBL = bl;
              gradeInfantil = inf;
              gradeAdulto = ad;
              totalPecas = item.total_pecas || 0;
            } else {
              // DTF: mostrar tipo, tamanho e unidade
              gradeAdulto = [[`${item.tipo_produto === 'sublimacao' ? '🔥 SUBL' : item.tipo_produto === 'dtf_uv' ? '🔷 UV' : '🖨️ TXT'}`, '']] as [string, any][];
              gradeBL = [[`${item.tamanho_cm} ${item.unidade === 'm2' ? 'm²' : 'cm'}`, '']] as [string, any][];
              gradeInfantil = [[item.status?.toUpperCase() || 'ORÇAMENTO', '']] as [string, any][];
              totalPecas = 1;
            }

            return (
              <div
                key={item.id}
                className="w-screen h-full shrink-0 snap-start snap-always flex p-0 gap-1 overflow-hidden"
              >
                <div className="w-[60%] bg-white relative border-r border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                  {item.layout ? (
                    <img
                      src={item.layout}
                      className="max-w-full max-h-full object-contain p-1"
                      alt="Layout"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-300 uppercase font-black text-xs">
                      <Layers size={40} className="mb-2" /> Sem Imagem
                    </div>
                  )}

                  <div className="absolute top-2 left-2 bg-slate-900/90 px-3 py-1 rounded-lg border border-white/10 shadow-2xl">
                    <span className="text-white font-black text-xs block leading-none">
                      #{item.id}
                    </span>
                    <span className="text-blue-400 font-bold text-[9px] uppercase truncate max-w-[150px] block">
                      {isDTF ? (item.cliente_nome || item.nome_cliente) : item.nome_descricao}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      handleTrocarStatusRapido(item.id, item.status || 'orcamento', isDTF ? 'dtf' : 'pedido')
                    }
                    className={`absolute top-2 right-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-lg transition-all active:scale-90 ${isDTF
                        ? item.status === 'finalizado'
                          ? 'bg-green-600 text-white'
                          : item.status === 'aprovado'
                            ? 'bg-blue-600 text-white'
                            : item.status === 'em_producao'
                              ? 'bg-purple-600 text-white'
                              : 'bg-amber-500 text-white'
                        : item.status === 'em_producao'
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                  >
                    {(item.status || 'orcamento').replace('_', ' ')}
                  </button>

                  <button
                    onClick={() =>
                      window.open(
                        isDTF ? `/dtf/${item.id}/visualizar` : `/pedido/${item.id}/visualizar`,
                        '_blank'
                      )
                    }
                    className="absolute bottom-2 right-2 bg-blue-600 p-2 rounded-lg text-white shadow-lg active:scale-90 transition hover:bg-blue-500"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>

                <div className="w-[40%] flex flex-col gap-1 h-full overflow-hidden p-1 bg-slate-950">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shrink-0 shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-blue-500 font-black text-xs uppercase italic tracking-tighter truncate max-w-[70%]">
                        {isDTF ? (item.cliente_nome || item.nome_cliente) : item.nome_descricao}
                      </span>
                      <span className="text-slate-400 font-bold text-[9px] flex items-center gap-1 shrink-0">
                        <Calendar size={10} />{' '}
                        {item.data_entrega
                          ? new Date(item.data_entrega).toLocaleDateString('pt-BR')
                          : 'Sem data'}
                      </span>
                    </div>

                    {isDTF ? (
                      <>
                        {/* DTF Info Grid */}
                        <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-slate-800">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[7px] text-slate-500 font-black uppercase leading-none mb-1">
                              Tipo:
                            </span>
                            <span className="text-white text-[9px] font-bold uppercase truncate">
                              {item.tipo_produto === 'sublimacao' ? '🔥 SUBLIMAÇÃO' : item.tipo_produto === 'dtf_uv' ? '🔷 DTF UV' : '🖨️ DTF TÊXTIL'}
                            </span>
                          </div>
                          <div className="flex flex-col border-l border-slate-700 pl-2 min-w-0">
                            <span className="text-[7px] text-slate-500 font-black uppercase leading-none mb-1">
                              Tamanho:
                            </span>
                            <span className="text-white text-[9px] font-bold uppercase truncate">
                              {item.tamanho_cm} {item.unidade === 'm2' ? 'm²' : 'cm'}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[7px] text-slate-500 font-black uppercase leading-none mb-1">
                              Valor:
                            </span>
                            <span className="text-green-400 text-[9px] font-bold uppercase truncate">
                              {typeof item.valor_total === 'number'
                                ? item.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                : item.valor_total || 'R$ 0,00'}
                            </span>
                          </div>
                          <div className="flex flex-col border-l border-slate-700 pl-2 min-w-0">
                            <span className="text-[7px] text-slate-500 font-black uppercase leading-none mb-1">
                              Status:
                            </span>
                            <span className="text-blue-400 text-[9px] font-bold uppercase truncate">
                              {item.status?.toUpperCase() || 'ORÇAMENTO'}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Pedido Info Grid */}
                        <div className="grid grid-cols-3 gap-2 mt-1 pt-1 border-t border-slate-800">
                          {/* Observação - Agora usando grid para controlar melhor o espaço */}
                          <div className="flex flex-col min-w-0">
                            <span className="text-[7px] text-slate-500 font-black uppercase leading-none mb-1">
                              Observação:
                            </span>
                            <p className="text-white text-[9px] font-bold uppercase leading-tight line-clamp-4 break-all">
                              {item.descricao || 'N/A'}
                            </p>
                          </div>

                          {/* Material */}
                          <div className="flex flex-col border-l border-slate-700 pl-2 min-w-0">
                            <span className="text-[7px] text-slate-500 font-black uppercase leading-none mb-1">
                              Material:
                            </span>
                            <p className="text-white text-[9px] font-bold uppercase truncate">
                              {item.material}
                            </p>
                          </div>

                          {/* Aplicação */}
                          <div className="flex flex-col border-l border-slate-700 pl-2 min-w-0">
                            <span className="text-[7px] text-slate-500 font-black uppercase leading-none mb-1">
                              Aplicação:
                            </span>
                            <p className="text-blue-400 text-[9px] font-bold uppercase truncate">
                              {item.aplicacao_arte}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-white rounded-xl p-3 flex-1 flex flex-col min-h-0 shadow-md">
                    <span className="text-[10px] font-black text-slate-400 uppercase mb-2 shrink-0 tracking-widest">
                      {isDTF ? 'Detalhes' : 'Grade'}
                    </span>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {isDTF ? (
                        <>
                          {gradeAdulto.length > 0 && (
                            <div className="bg-blue-50 border border-blue-100 rounded p-3">
                              <span className="block text-[8px] font-black text-blue-600 uppercase mb-1">
                                Tipo de Produto
                              </span>
                              <span className="text-lg font-black text-blue-800 leading-none">
                                {gradeAdulto[0][0]}
                              </span>
                            </div>
                          )}
                          {gradeBL.length > 0 && (
                            <div className="bg-purple-50 border border-purple-100 rounded p-3">
                              <span className="block text-[8px] font-black text-purple-600 uppercase mb-1">
                                Tamanho / Unidade
                              </span>
                              <span className="text-lg font-black text-purple-800 leading-none">
                                {gradeBL[0][0]}
                              </span>
                            </div>
                          )}
                          {gradeInfantil.length > 0 && (
                            <div className="bg-amber-50 border border-amber-100 rounded p-3">
                              <span className="block text-[8px] font-black text-amber-600 uppercase mb-1">
                                Status
                              </span>
                              <span className="text-lg font-black text-amber-800 leading-none">
                                {gradeInfantil[0][0]}
                              </span>
                            </div>
                          )}
                          <div className="bg-green-50 border border-green-100 rounded p-3">
                            <span className="block text-[8px] font-black text-green-600 uppercase mb-1">
                              Cliente
                            </span>
                            <span className="text-lg font-black text-green-800 leading-none truncate block">
                              {item.cliente_nome || item.nome_cliente}
                            </span>
                          </div>
                          {item.descricao && (
                            <div className="bg-slate-50 border border-slate-100 rounded p-3">
                              <span className="block text-[8px] font-black text-slate-600 uppercase mb-1">
                                Observação
                              </span>
                              <span className="text-sm font-bold text-slate-800 leading-tight block break-all">
                                {item.descricao}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                      {gradeAdulto.length > 0 && (
                        <div className="flex flex-wrap gap-1 pb-1 border-b border-slate-50">
                          {gradeAdulto.map(([tam, qtd]) => (
                            <div
                              key={tam}
                              className="bg-slate-50 border border-slate-200 rounded p-1 text-center min-w-[42px]"
                            >
                              <span className="block text-[8px] font-black text-slate-400 uppercase">
                                {tam}
                              </span>
                              <span className="text-xl font-black text-blue-600 leading-none">
                                {String(qtd).padStart(2, '0')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {gradeBL.length > 0 && (
                        <div className="flex flex-wrap gap-1 pb-1 border-b border-slate-50">
                          {gradeBL.map(([tam, qtd]) => (
                            <div
                              key={tam}
                              className="bg-amber-50/30 border border-amber-100 rounded p-1 text-center min-w-[42px]"
                            >
                              <span className="block text-[8px] font-black text-amber-600 uppercase">
                                {tam}
                              </span>
                              <span className="text-xl font-black text-amber-700 leading-none">
                                {String(qtd).padStart(2, '0')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {gradeInfantil.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {gradeInfantil.map(([tam, qtd]) => (
                            <div
                              key={tam}
                              className="bg-green-50/30 border border-green-100 rounded p-1 text-center min-w-[42px]"
                            >
                              <span className="block text-[8px] font-black text-green-600 uppercase">
                                {tam}
                              </span>
                              <span className="text-xl font-black text-green-700 leading-none">
                                {String(qtd).padStart(2, '0')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                        </>
                      )}

                    {(isDTF && !item.descricao) || (!isDTF && gradeAdulto.length === 0 && gradeBL.length === 0 && gradeInfantil.length === 0) && (
                      <div className="flex-1 items-center justify-center text-slate-300 text-[10px] font-bold uppercase italic">
                        {isDTF ? 'Sem observações' : 'Sem grade definida'}
                      </div>
                    )}
                  </div>

                  {!isDTF && (
                    <div className="mt-auto pt-2 border-t border-slate-100 flex justify-between items-center shrink-0">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Total:
                      </span>
                      <span className="text-xl font-black text-slate-900 leading-none">
                        {item.total_pecas}{' '}
                        <small className="text-[10px] text-slate-400">
                          PÇS
                        </small>
                      </span>
                    </div>
                  )}
                </div>
              </div>
              </div>
        );
          })}
      </div>

      <div className="h-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center shrink-0">
        <span className="text-[7px] text-slate-600 font-bold uppercase tracking-[0.2em]">
          PrintCollor Mobile Factory Interface
        </span>
      </div>
    </div>
    </div >
  );
};
