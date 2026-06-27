import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { api } from '../auth/useAuth';
import { formatarReal } from '../tools/formatReal';
import { Loader2 } from 'lucide-react';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

const Card: React.FC<CardProps> = ({ label, value, sub, color = 'border-blue-600' }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${color}`}>
    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{label}</p>
    <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
    {sub && <p className="text-slate-400 text-[10px] mt-1">{sub}</p>}
  </div>
);

const Relatorios: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    api.get(`/reports/monthly/?year=${ano}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ano]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={40} />
      </div>
    );
  }

  // Dados para gráficos
  const dtfChartData = MESES.map((mes, idx) => ({
    mes,
    pedidos: data.dtf_monthly[idx]?.total_pedidos || 0,
    receita: data.dtf_monthly[idx]?.total_revenue || 0,
  }));

  const fabricaChartData = MESES.map((mes, idx) => ({
    mes,
    pedidos: data.pedido_monthly[idx]?.total_pedidos || 0,
    pecas: data.pedido_monthly[idx]?.total_pecas || 0,
  }));

  const receitaChartData = MESES.map((mes, idx) => ({
    mes,
    receita: data.revenue_received_monthly[idx]?.total_recebido || 0,
    orcamentos: data.orcamento_monthly[idx]?.total_revenue || 0,
  }));

  // Totais do ano
  const totalDtfReceita = data.dtf_monthly.reduce((s: number, m: any) => s + m.total_revenue, 0);
  const totalDtfPedidos = data.dtf_monthly.reduce((s: number, m: any) => s + m.total_pedidos, 0);
  const totalDtfMetros = data.dtf_monthly.reduce((s: number, m: any) => s + m.total_cm, 0);
  const totalFabricaPecas = data.pedido_monthly.reduce((s: number, m: any) => s + m.total_pecas, 0);
  const totalFabricaPedidos = data.pedido_monthly.reduce((s: number, m: any) => s + m.total_pedidos, 0);
  const totalReceitaRecebida = data.revenue_received_monthly.reduce((s: number, m: any) => s + m.total_recebido, 0);
  const totalOrcReceita = data.orcamento_monthly.reduce((s: number, m: any) => s + m.total_revenue, 0);

  const tooltipFormatter = (value: any) => formatarReal(Number(value));

  return (
    <div className="space-y-8 px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-800 uppercase italic">
          Relatórios <span className="text-blue-600">{ano}</span>
        </h1>
        <select
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
          className="border border-slate-200 rounded-xl px-4 py-2.5 font-black text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card
          label="Receita DTF"
          value={formatarReal(totalDtfReceita)}
          sub={`${totalDtfPedidos} pedidos`}
          color="border-blue-600"
        />
        <Card
          label="Metros Impressos"
          value={`${(totalDtfMetros / 100).toFixed(1)} m`}
          sub="linear total"
          color="border-cyan-600"
        />
        <Card
          label="Peças Fabricadas"
          value={`${totalFabricaPecas}`}
          sub={`${totalFabricaPedidos} pedidos fábrica`}
          color="border-purple-600"
        />
        <Card
          label="Receita Recebida"
          value={formatarReal(totalReceitaRecebida)}
          sub="DTF quitados"
          color="border-emerald-600"
        />
        <Card
          label="Receita Orçamentos"
          value={formatarReal(totalOrcReceita)}
          sub="itens vendidos"
          color="border-amber-600"
        />
      </div>

      {/* DTF Mensal */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-black text-slate-800 uppercase italic mb-4">
          DTF/UV — Pedidos e Receita por Mês
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dtfChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="pedidos" name="Pedidos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="receita" name="Receita (R$)" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pedidos Fábrica Mensal */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-black text-slate-800 uppercase italic mb-4">
          Pedidos de Fábrica — Pedidos e Peças por Mês
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={fabricaChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="pedidos" name="Pedidos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pecas" name="Peças" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Receita Recebida vs Orçamentos */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-black text-slate-800 uppercase italic mb-4">
          Receita Recebida vs Faturamento Orçamentos
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={receitaChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="receita"
              name="Receita DTF Recebida"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4, fill: '#10b981' }}
            />
            <Line
              type="monotone"
              dataKey="orcamentos"
              name="Receita Orçamentos"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* DTF por tipo */}
      {data.dtf_by_type.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-black text-slate-800 uppercase italic mb-4">
            DTF/UV — Por Tipo de Produto ({ano})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-slate-500 font-black uppercase text-[10px]">Tipo</th>
                  <th className="text-right py-2 text-slate-500 font-black uppercase text-[10px]">Pedidos</th>
                  <th className="text-right py-2 text-slate-500 font-black uppercase text-[10px]">Receita</th>
                  <th className="text-right py-2 text-slate-500 font-black uppercase text-[10px]">Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {data.dtf_by_type.map((row: any) => (
                  <tr key={row.tipo} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="py-3 font-bold text-slate-700">{row.tipo_display}</td>
                    <td className="py-3 text-right text-slate-600">{row.total_pedidos}</td>
                    <td className="py-3 text-right font-black text-green-600">{formatarReal(row.total_revenue)}</td>
                    <td className="py-3 text-right text-slate-400">
                      {row.total_pedidos > 0
                        ? formatarReal(row.total_revenue / row.total_pedidos)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Relatorios;