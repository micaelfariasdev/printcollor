import { useState, useEffect, useCallback } from 'react';
import { api } from '../auth/useAuth';
import { RefreshCw, AlertTriangle, Eye, Printer, Truck, Clock } from 'lucide-react';

interface KDSPanel {
  dtf: {
    total: number;
    pagos: number;
    fila: number;
    fila_list: DTFListItem[];
    prontos_entrega: number;
    prontos_entrega_list: DTFListItem[];
    entregue: number;
    urgentes: UrgenteItem[];
  };
  pedido_fabrica: {
    total: number;
    pendente: number;
    em_producao: number;
    finalizado: number;
    urgentes: UrgenteItem[];
  };
}

interface DTFListItem {
  id: number;
  cliente: string;
  descricao: string;
  status_display: string;
  foi_impresso: string;
  foi_entregue: boolean;
  esta_pago: boolean;
  data_criacao: string;
}

interface UrgenteItem {
  id: number;
  tipo: string;
  cliente: string;
  descricao: string;
  data_criacao: string;
  foi_impresso?: boolean;
  foi_entregue?: boolean;
}

function diasAtras(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / 86400000);
}

export default function Dashboard() {
  const [data, setData] = useState<KDSPanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchKDS = useCallback(async () => {
    try {
      const res = await api.get('/kds/');
      setData(res.data);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKDS();
    const interval = setInterval(fetchKDS, 30000);
    return () => clearInterval(interval);
  }, [fetchKDS]);

  const toggle = async (id: number, tipo: string, field: 'foi_impresso' | 'foi_entregue', val: any) => {
    const path = tipo === 'DTF' ? `/dtf/${id}/` : `/pedidos/${id}/`;
    await api.patch(path, { [field]: val });
    fetchKDS();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!data) return null;

  const { dtf, pedido_fabrica } = data;
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const renderUrgentes = (itens: UrgenteItem[], cor: string) => {
    if (itens.length === 0) return null;

    return (
      <div className="mt-2">
        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${cor} mb-1.5`}>
          <AlertTriangle size={11} /> Urgentes ({itens.length})
        </div>
        {itens.map(item => (
          <div key={`${item.tipo}-${item.id}`} className="flex items-center gap-2 py-1.5 border-b border-slate-800 last:border-0">
            <button
              onClick={() => window.open(item.tipo === 'DTF' ? `/dtf/${item.id}/visualizar` : `/pedido/${item.id}/visualizar`, '_blank', 'width=900,height=700')}
              className="text-blue-400 hover:text-blue-300 flex-shrink-0"
              title="Visualizar"
            >
              <Eye size={12} />
            </button>
            <span className={`text-[9px] font-black px-1 rounded flex-shrink-0 ${item.tipo === 'DTF' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'}`}>
              {item.tipo}
            </span>
            <span className="text-[11px] text-slate-300 flex-1 truncate">{item.cliente}</span>
            <span className="text-[9px] text-slate-500 hidden md:inline">{item.descricao}</span>
            <span className="text-[9px] font-black text-red-400 flex-shrink-0">{diasAtras(item.data_criacao)}d</span>
            {item.tipo === 'DTF' && (
              <>
                <button
                  onClick={() => toggle(item.id, item.tipo, 'foi_impresso', item.foi_impresso ? 'pendente' : 'impresso')}
                  title={item.foi_impresso ? 'Marcar não impresso' : 'Marcar impresso'}
                  className={`flex-shrink-0 ${item.foi_impresso ? 'text-green-400' : 'text-slate-600 hover:text-green-400'}`}
                >
                  <Printer size={11} />
                </button>
                <button
                  onClick={() => toggle(item.id, item.tipo, 'foi_entregue', !item.foi_entregue)}
                  title={item.foi_entregue ? 'Marcar não entregue' : 'Marcar entregue'}
                  className={`flex-shrink-0 ${item.foi_entregue ? 'text-emerald-400' : 'text-slate-600 hover:text-emerald-400'}`}
                >
                  <Truck size={11} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderDTFListSection = (titulo: string, lista: any[], icone: React.ReactNode, cor: string) => {
    if (lista.length === 0) return null;
    return (
      <div className="mt-2">
        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${cor} mb-2`}>
          {icone} {titulo} ({lista.length})
        </div>
        <div className="space-y-1">
          {lista.map(item => (
            <div key={item.id} className="flex items-center gap-2 py-1.5 px-3 bg-slate-800 rounded-lg">
              <button
                onClick={() => window.open(`/dtf/${item.id}/visualizar`, '_blank', 'width=900,height=700')}
                className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                title="Visualizar"
              >
                <Eye size={12} />
              </button>
              <span className="text-[11px] text-slate-300 flex-1 truncate">{item.cliente}</span>
              <span className="text-[9px] text-slate-500">{item.descricao}</span>
              {item.status_display !== undefined && (
                <span className="flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                  {item.status_display}
                </span>
              )}
              {item.foi_impresso !== undefined && (
                <button
                  onClick={() => toggle(item.id, 'DTF', 'foi_impresso', item.foi_impresso === 'impresso' ? 'pendente' : 'impresso')}
                  className={`flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded ${item.foi_impresso === 'impresso' ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'}`}
                >
                  {item.foi_impresso === 'impresso' ? 'Impresso' : 'Pendente'}
                </button>
              )}
              {item.foi_entregue !== undefined && (
                <button
                  onClick={() => toggle(item.id, 'DTF', 'foi_entregue', !item.foi_entregue)}
                  className={`flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded ${item.foi_entregue ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'}`}
                >
                  {item.foi_entregue ? 'Entregue' : 'Entregar'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDTFColumn = () => (
    <div className="bg-slate-900 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-blue-400 uppercase tracking-wider">Estampas & Gravuras</h2>
        <span className="text-[10px] text-slate-500">{hoje}</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pagos', val: dtf.pagos, cor: 'text-blue-400' },
          { label: 'Fila', val: dtf.fila, cor: 'text-yellow-400' },
          { label: 'Prontos', val: dtf.prontos_entrega, cor: 'text-orange-400' },
          { label: 'Entregues', val: dtf.entregue, cor: 'text-emerald-400' },
        ].map(({ label, val, cor }) => (
          <div key={label} className="bg-slate-800 rounded-xl p-3 text-center">
            <p className={`text-3xl font-black ${cor}`}>{val}</p>
            <p className="text-[9px] text-slate-500 uppercase font-bold mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
        <div className="flex-1">
          <p className="text-[9px] text-slate-500 uppercase font-black">Total hoje</p>
          <p className="text-2xl font-black text-slate-200">{dtf.total}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-500 uppercase font-black">Orçamentos</p>
          <p className="text-xl font-black text-slate-400">{dtf.fila}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-slate-800 rounded-xl px-4 py-3">
          <p className="text-[9px] text-slate-500 uppercase font-black">Fila <span className="text-yellow-400">(pagos)</span></p>
          <p className="text-2xl font-black text-yellow-400">{dtf.fila}</p>
        </div>
        <div className="flex-1 bg-slate-800 rounded-xl px-4 py-3">
          <p className="text-[9px] text-slate-500 uppercase font-black">Prontos <span className="text-orange-400">(impressos)</span></p>
          <p className="text-2xl font-black text-orange-400">{dtf.prontos_entrega}</p>
        </div>
        <div className="flex-1 bg-slate-800 rounded-xl px-4 py-3">
          <p className="text-[9px] text-slate-500 uppercase font-black">Entregues <span className="text-emerald-400">(hoje)</span></p>
          <p className="text-2xl font-black text-emerald-400">{dtf.entregue}</p>
        </div>
      </div>

      {renderDTFListSection('Fila', dtf.fila_list, <Clock size={11} />, 'text-yellow-400')}
      {renderDTFListSection('Prontos para Entrega', dtf.prontos_entrega_list, <Printer size={11} />, 'text-orange-400')}

      {renderUrgentes(dtf.urgentes, 'text-red-400')}
    </div>
  );

  const renderFabricaColumn = () => (
    <div className="bg-slate-900 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-purple-400 uppercase tracking-wider">Confecção Fábrica</h2>
        <span className="text-[10px] text-slate-500">{hoje}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pendentes', val: pedido_fabrica.pendente, cor: 'text-yellow-400' },
          { label: 'Produção', val: pedido_fabrica.em_producao, cor: 'text-orange-400' },
          { label: 'Finalizados', val: pedido_fabrica.finalizado, cor: 'text-green-400' },
        ].map(({ label, val, cor }) => (
          <div key={label} className="bg-slate-800 rounded-xl p-3 text-center">
            <p className={`text-3xl font-black ${cor}`}>{val}</p>
            <p className="text-[9px] text-slate-500 uppercase font-bold mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
        <div className="flex-1">
          <p className="text-[9px] text-slate-500 uppercase font-black">Total hoje</p>
          <p className="text-2xl font-black text-slate-200">{pedido_fabrica.total}</p>
        </div>
      </div>

      {renderUrgentes(pedido_fabrica.urgentes, 'text-red-400')}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Painel KDS</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Atualiza automático a cada 30s
            {lastUpdate && <span className="ml-2">· Última: {lastUpdate.toLocaleTimeString('pt-BR')}</span>}
          </p>
        </div>
        <button
          onClick={fetchKDS}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition"
        >
          <RefreshCw size={14} /> Atualizar
        </button>
        <button
          onClick={async () => {
            await api.post('sync-status/');
            fetchKDS();
          }}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-blue-300 px-4 py-2 rounded-xl text-xs font-bold transition"
        >
          <RefreshCw size={14} /> Sincronizar Status
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {renderDTFColumn()}
        {renderFabricaColumn()}
      </div>

      <div className="mt-6 flex gap-6 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-400" />
          <span className="text-[10px] text-slate-500">Pendente / Aprovado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-400" />
          <span className="text-[10px] text-slate-500">Em Produção</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-400" />
          <span className="text-[10px] text-slate-500">Finalizado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-400" />
          <span className="text-[10px] text-slate-500">Urgente (2+ dias)</span>
        </div>
      </div>
    </div>
  );
}