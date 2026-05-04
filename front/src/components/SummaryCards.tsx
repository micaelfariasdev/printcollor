import React, { useEffect, useState } from 'react';
import { api } from '../auth/useAuth';
import { formatarReal } from '../tools/formatReal';
import { TrendingUp, Printer, FileText, LayoutDashboard } from 'lucide-react';

const SummaryCards = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Rota que retorna o JSON de performance mensal
    api.get('dashboard/').then(res => setStats(res.data));
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 text-left">
      {/* HEADER INDUSTRIAL */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-xl text-white">
            <LayoutDashboard size={20} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 uppercase italic leading-none">
            Performance <span className="text-blue-600">Mensal</span>
        </h2>
        <div className="h-1 flex-1 bg-slate-200 rounded-full mt-1">
          <div className="h-full w-24 bg-blue-600 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* GRID DE CARDS COM AS CHAVES DA NOVA API */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'Orçamentos Site', 
            val: stats?.orcamentos?.total, 
            color: 'border-blue-500', 
            icon: <FileText size={14} /> 
          },
          { 
            label: 'Produção Fábrica', 
            val: stats?.producao?.total_pecas_fabrica, 
            color: 'border-purple-500', 
            icon: <TrendingUp size={14} /> 
          },
          { 
            label: 'Linear (Metros)', 
            val: `${stats?.producao?.linear_metros || 0}m`, 
            color: 'border-green-500', 
            icon: <Printer size={14} /> 
          },
          { 
            label: 'Pedidos Ativos', 
            val: stats?.producao?.vendas_count, 
            color: 'border-orange-500', 
            icon: <Activity size={14} /> 
          },
        ].map((c, i) => (
          <div key={i} className={`bg-white p-5 rounded-[2rem] shadow-sm border-l-8 ${c.color} hover:scale-[1.02] transition-transform`}>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-slate-400">{c.icon}</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.label}</p>
            </div>
            <h3 className="text-2xl font-black text-slate-800 leading-none">{c.val ?? 0}</h3>
          </div>
        ))}
      </div>

      {/* CARD DE FATURAMENTO PRINCIPAL */}
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border-b-[12px] border-blue-600">
        {/* EFEITO HUD DE FUNDO */}
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <TrendingUp size={180} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col items-start">
            <p className="text-[10px] font-black uppercase opacity-40 tracking-[0.3em] mb-3 italic">
                Faturamento Bruto ({stats?.periodo || '--/----'})
            </p>
            <h3 className="text-6xl font-black italic tracking-tighter text-blue-400 leading-none">
              {formatarReal(stats?.faturamento?.total || 0)}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8">
            <div>
                <p className="text-[8px] font-black uppercase opacity-40 italic">Líquido Pago</p>
                <p className="text-lg font-black text-green-400 leading-none">
                    {formatarReal(stats?.faturamento?.pago || 0)}
                </p>
            </div>
            <div>
                <p className="text-[8px] font-black uppercase opacity-40 italic">A Receber</p>
                <p className="text-lg font-black text-amber-400 leading-none">
                    {formatarReal(stats?.faturamento?.pendente || 0)}
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Ícone de atividade que faltou no import inicial
const Activity = ({ size, className }: any) => (
    <svg 
        width={size} height={size} viewBox="0 0 24 24" fill="none" 
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" 
        strokeLinejoin="round" className={className}
    >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

export default SummaryCards;