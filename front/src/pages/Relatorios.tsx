import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../auth/useAuth';
import { formatarReal } from '../tools/formatReal';
import { Loader2, Printer, Download, ChevronDown, ChevronRight, Calendar } from 'lucide-react';

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

const STATUS_COLORS: Record<string, string> = {
  orcamento: 'bg-slate-100 text-slate-600',
  aprovado: 'bg-blue-100 text-blue-700',
  producao: 'bg-amber-100 text-amber-700',
  analise: 'bg-purple-100 text-purple-700',
  concluido: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-600',
  entregue: 'bg-emerald-100 text-emerald-700',
  recusado: 'bg-red-100 text-red-600',
  aguardando: 'bg-yellow-100 text-yellow-700',
  pago: 'bg-green-100 text-green-700',
  pendente: 'bg-amber-100 text-amber-700',
};

const StatusBadge: React.FC<{ status: any }> = ({ status }) => {
  const s = String(status ?? "")
  const cls = STATUS_COLORS[s.toLowerCase()] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${cls}`}>
      {s}
    </span>
  );
};

const Relatorios: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const fabricaTableRef = useRef<HTMLDivElement>(null);

  const [fabricaData, setFabricaData] = useState<any[]>([]);
  const [fabricaLoading, setFabricaLoading] = useState(false);
  const [fabricaStart, setFabricaStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [fabricaEnd, setFabricaEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [fabricaCliente, setFabricaCliente] = useState('');
  const [fabricaStatus, setFabricaStatus] = useState('');
  const [fabricaPage, setFabricaPage] = useState(1);
  const [fabricaHasMore, setFabricaHasMore] = useState(false);

  const [monthTab, setMonthTab] = useState<'dtf' | 'fabrica'>('dtf');
  const [monthOrders, setMonthOrders] = useState<Record<string, any>>({});
  const [monthOrdersLoading, setMonthOrdersLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    api.get(`/reports/monthly/?year=${ano}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ano]);

  const loadFabrica = (page = 1) => {
    setFabricaLoading(true);
    const params: any = { page };
    if (fabricaStart) params.data_start = fabricaStart;
    if (fabricaEnd) params.data_end = fabricaEnd;
    if (fabricaCliente) params.cliente = fabricaCliente;
    if (fabricaStatus) params.status = fabricaStatus;

    api.get('/pedidos/', { params })
      .then((res) => {
        const items = res.data.results || res.data;
        if (page === 1) {
          setFabricaData(items);
        } else {
          setFabricaData(prev => [...prev, ...items]);
        }
        setFabricaHasMore(!!res.data.next);
        setFabricaPage(page);
        setFabricaLoading(false);
      })
      .catch(() => setFabricaLoading(false));
  };

  

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open('', '', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Relatório PrintCollor ${ano}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            h2 { font-size: 16px; color: #555; margin-top: 24px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
            th { background: #f8f9fa; text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 700; text-transform: uppercase; font-size: 11px; color: #64748b; }
            td { padding: 7px 12px; border: 1px solid #f1f5f9; }
            .text-right { text-align: right; }
            .text-green { color: #059669; }
            .grid-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .mini-card { background: #f8fafc; border-left: 3px solid #3b82f6; padding: 10px 14px; }
            .mini-card .lbl { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
            .mini-card .val { font-size: 18px; font-weight: 800; color: #1e293b; }
            .mini-card .sub { font-size: 10px; color: #94a3b8; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handlePrintFabrica = () => {
    const el = fabricaTableRef.current;
    if (!el) return;
    const win = window.open('', '', 'width=900,height=700');
    if (!win) return;
    const totalPecas = fabricaData.reduce((s: number, p: any) => s + (typeof p.total_pecas === 'number' ? p.total_pecas : typeof p.pecas_count === 'number' ? p.pecas_count : 0), 0);
    win.document.write(`
      <html>
        <head>
          <title>Pedidos Fábrica — ${fabricaStart} a ${fabricaEnd}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
            h1 { font-size: 20px; margin: 0; }
            .resumo { font-size: 13px; color: #555; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f0f0f0; text-align: left; padding: 6px 10px; border: 1px solid #ccc; font-weight: 700; text-transform: uppercase; font-size: 10px; color: #64748b; }
            td { padding: 5px 10px; border: 1px solid #eee; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Pedidos de Fábrica</h1>
            <span style="font-size:12px;color:#888">${fabricaStart} → ${fabricaEnd}</span>
          </div>
          <div class="resumo">
            <strong>${fabricaData.length}</strong> pedidos &nbsp;|&nbsp;
            <strong>${totalPecas}</strong> peças total${fabricaCliente ? ` &nbsp;|&nbsp; Cliente: ${fabricaCliente}` : ''}${fabricaStatus ? ` &nbsp;|&nbsp; Status: ${fabricaStatus}` : ''}
          </div>
          ${el.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleDownload = () => {
    const rows = [
      ['Mês', 'Tipo', 'Pedidos DTF', 'Qtd', 'Und', 'Receita DTF (R$)', 'Pedidos Fábrica', 'Peças Fábrica', 'Receita Recebida DTF (R$)'],
    ];
    MESES.forEach((mes, i) => {
      const d = data.dtf_monthly[i] || {};
      const p = data.pedido_monthly[i] || {};
      const r = data.revenue_received_monthly[i] || {};
      const monthTypes = data.dtf_by_type_monthly.filter((t: any) => t.mes === i + 1);
      if (monthTypes.length > 0) {
        monthTypes.forEach((t: any) => {
          rows.push([
            mes, t.tipo_display,
            String(t.total_pedidos || 0),
            String(t.quantidade || 0),
            t.unidade,
            String((t.total_revenue || 0).toFixed(2)),
            String(p.total_pedidos || 0),
            String(p.total_pecas || 0),
            String((r.total_recebido || 0).toFixed(2)),
          ]);
        });
      } else {
        rows.push([
          mes, '',
          String(d.total_pedidos || 0),
          '', '',
          String((d.total_revenue || 0).toFixed(2)),
          String(p.total_pedidos || 0),
          String(p.total_pecas || 0),
          String((r.total_recebido || 0).toFixed(2)),
        ]);
      }
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_printcollor_${ano}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalDtfReceita = data?.dtf_monthly?.reduce((s: number, m: any) => s + m.total_revenue, 0) || 0;
  const totalDtfPedidos = data?.dtf_monthly?.reduce((s: number, m: any) => s + m.total_pedidos, 0) || 0;

  const totalMetrosLineares = data?.dtf_by_type
    ?.filter((t: any) => t.unidade === 'm')
    ?.reduce((s: number, t: any) => s + t.quantidade, 0) || 0;
  const totalM2 = data?.dtf_by_type
    ?.filter((t: any) => t.unidade === 'm²')
    ?.reduce((s: number, t: any) => s + t.quantidade, 0) || 0;
  const totalUnidades = data?.dtf_by_type
    ?.filter((t: any) => t.unidade === 'un')
    ?.reduce((s: number, t: any) => s + t.quantidade, 0) || 0;

  const totalFabricaPecas = data?.pedido_monthly?.reduce((s: number, m: any) => s + m.total_pecas, 0) || 0;
  const totalFabricaPedidos = data?.pedido_monthly?.reduce((s: number, m: any) => s + m.total_pedidos, 0) || 0;
  const totalReceitaRecebida = data?.revenue_received_monthly?.reduce((s: number, m: any) => s + m.total_recebido, 0) || 0;


  const dtfChartData = MESES.map((mes, idx) => {
    const monthTypes = (data?.dtf_by_type_monthly || []).filter((t: any) => t.mes === idx + 1);
    const byTipo: Record<string, number> = {};
    let totalPedidos = 0;
    let totalReceita = 0;
    monthTypes.forEach((t: any) => {
      byTipo[t.tipo] = t.quantidade;
      totalPedidos += t.total_pedidos;
      totalReceita += t.total_revenue;
    });
    return {
      mes,
      pedidos: totalPedidos,
      receita: totalReceita,
      dtf_textil: byTipo['dtf_textil'] || 0,
      dtf_uv: byTipo['dtf_uv'] || 0,
      sublimacao: byTipo['sublimacao'] || 0,
      estampa: byTipo['estampa'] || 0,
    };
  });

  const fabricaChartData = MESES.map((mes, idx) => {
    const p = data?.pedido_monthly?.[idx] || {};
    return {
      mes,
      pedidos: p.total_pedidos || 0,
      pecas: p.total_pecas || 0,
    };
  });

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-800 uppercase italic">
          Relatórios <span className="text-blue-600">{ano}</span>
        </h1>
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition"
          >
            <Download size={16} /> Baixar CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black hover:bg-black transition"
          >
            <Printer size={16} /> Imprimir
          </button>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="border border-slate-200 rounded-xl px-4 py-2 font-black text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          label="Receita DTF"
          value={formatarReal(totalDtfReceita)}
          sub={`${totalDtfPedidos} pedidos`}
          color="border-blue-600"
        />
        <Card
          label="Metros Lineares"
          value={`${totalMetrosLineares.toFixed(1)} m`}
          sub="Têxtil + UV"
          color="border-cyan-600"
        />
        <Card
          label="Peças Fabricadas"
          value={`${totalFabricaPecas}`}
          sub={`${totalFabricaPedidos} pedidos fábrica`}
          color="border-purple-600"
        />
        <Card
          label="Receita Recebida DTF"
          value={formatarReal(totalReceitaRecebida)}
          sub="DTF quitados"
          color="border-emerald-600"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          label="Sublimação (m²)"
          value={`${totalM2.toFixed(1)} m²`}
          sub="área total sublimada"
          color="border-pink-600"
        />
        <Card
          label="Estampa (unidades)"
          value={`${totalUnidades.toFixed(0)} un`}
          sub="estampas unitárias"
          color="border-orange-600"
        />
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-black text-slate-800 uppercase italic mb-4">
          DTF/UV — Pedidos e Receita por Mês
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dtfChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}`} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(v) => `R$ ${v.toLocaleString('pt-BR')}`}
            />
            <Tooltip
              formatter={(value: any, name: any) => {
                if (name === "Receita") return [formatarReal(Number(value)), name];
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="pedidos" name="Pedidos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="receita" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

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
                  <th className="text-right py-2 text-slate-500 font-black uppercase text-[10px]">Qtd Total</th>
                  <th className="text-right py-2 text-slate-500 font-black uppercase text-[10px]">Und</th>
                  <th className="text-right py-2 text-slate-500 font-black uppercase text-[10px]">Receita</th>
                  <th className="text-right py-2 text-slate-500 font-black uppercase text-[10px]">Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {data.dtf_by_type.map((row: any) => (
                  <tr key={row.tipo} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="py-3 font-bold text-slate-700">{row.tipo_display}</td>
                    <td className="py-3 text-right text-slate-600">{row.total_pedidos}</td>
                    <td className="py-3 text-right font-black text-slate-800">{row.quantidade}</td>
                    <td className="py-3 text-right text-slate-400">{row.unidade}</td>
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

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-black text-slate-800 uppercase italic mb-4">
          Resumo Mensal — {ano}
          <span className="text-slate-400 font-normal text-xs ml-3">(clique em um mês para ver detalhamento)</span>
        </h2>
        <div className="overflow-x-auto" ref={printRef}>
          <table className="w-full text-sm" id="relatorio-tabela">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-3 text-slate-500 font-black uppercase text-[10px] w-8"></th>
                <th className="text-left py-3 text-slate-500 font-black uppercase text-[10px]">Mês</th>
                <th className="text-right py-3 text-slate-500 font-black uppercase text-[10px]">Pedidos DTF</th>
                <th className="text-right py-3 text-slate-500 font-black uppercase text-[10px]">Receita DTF</th>
                <th className="text-right py-3 text-slate-500 font-black uppercase text-[10px]">Receita Recebida</th>
                <th className="text-right py-3 text-slate-500 font-black uppercase text-[10px]">Pedidos Fábrica</th>
                <th className="text-right py-3 text-slate-500 font-black uppercase text-[10px]">Peças Fábrica</th>
              </tr>
            </thead>
            <tbody>
              {MESES.map((mes, i) => {
                const d = data.dtf_monthly[i] || {};
                const p = data.pedido_monthly[i] || {};
                const r = data.revenue_received_monthly[i] || {};
                const mesKey = `${ano}-${i + 1}`;
                const isExpanded = expandedMonth === i + 1;
                const hasData = (d.total_pedidos || 0) > 0 || (p.total_pedidos || 0) > 0;

                const monthDtfOrders = monthOrders[mesKey]?.dtf || [];
                const monthFabricaOrders = monthOrders[mesKey]?.fabrica || [];
                const loadingMonth = monthOrdersLoading[mesKey];
                const dtfTotal = monthDtfOrders.reduce((s: number, o: any) => s + (o.valor_total || 0), 0);

                return (
                  <React.Fragment key={mes}>
                    <tr
                      className={`border-b border-slate-50 cursor-pointer hover:bg-blue-50 transition ${hasData ? '' : 'opacity-40'}`}
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedMonth(null);
                        } else {
                          setExpandedMonth(i + 1);
                          setMonthTab('dtf');
                          if (!monthOrders[mesKey]) {
                            setMonthOrdersLoading(prev => ({ ...prev, [mesKey]: true }));
                            Promise.all([
                              api.get(`/reports/dtf-orders/?year=${ano}&month=${i + 1}`),
                              api.get(`/reports/fabrica-orders/?year=${ano}&month=${i + 1}`),
                            ]).then(([dtfRes, fabRes]) => {
                              setMonthOrders(prev => ({ ...prev, [mesKey]: { dtf: dtfRes.data.orders || [], fabrica: fabRes.data.orders || [] } }));
                              setMonthOrdersLoading(prev => ({ ...prev, [mesKey]: false }));
                            }).catch(() => {
                              setMonthOrdersLoading(prev => ({ ...prev, [mesKey]: false }));
                            });
                          }
                        }
                      }}
                    >
                      <td className="py-2.5 pl-2 text-slate-400">
                        {isExpanded
                          ? <ChevronDown size={14} className="text-blue-500" />
                          : <ChevronRight size={14} />}
                      </td>
                      <td className="py-2.5 font-black text-slate-700">{mes}</td>
                      <td className="py-2.5 text-right">{d.total_pedidos || 0}</td>
                      <td className="py-2.5 text-right font-bold text-green-600">{formatarReal(d.total_revenue || 0)}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">{formatarReal(r.total_recebido || 0)}</td>
                      <td className="py-2.5 text-right">{p.total_pedidos || 0}</td>
                      <td className="py-2.5 text-right">{p.total_pecas || 0}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b-2 border-blue-200 bg-blue-50/30">
                        <td colSpan={7} className="p-0">
                          <div className="px-6 py-3">
                            <div className="flex gap-4 mb-3 border-b border-blue-200">
                              <button
                                onClick={e => { e.stopPropagation(); setMonthTab('dtf'); }}
                                className={`pb-2 text-xs font-black uppercase tracking-wide border-b-2 transition ${monthTab === 'dtf' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                              >
                                DTF/UV ({monthDtfOrders.length})
                                <span className="ml-2 text-[10px] font-normal">{formatarReal(dtfTotal)}</span>
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setMonthTab('fabrica'); }}
                                className={`pb-2 text-xs font-black uppercase tracking-wide border-b-2 transition ${monthTab === 'fabrica' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                              >
                                Fábrica ({monthFabricaOrders.length})                              </button>
                            </div>

                            {loadingMonth ? (
                              <div className="flex justify-center py-6"><Loader2 className="animate-spin text-blue-400" size={24} /></div>
                            ) : monthTab === 'dtf' ? (
                              monthDtfOrders.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2">sem pedidos DTF neste mês</p>
                              ) : (
                                <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-blue-100">
                                  <table className="w-full text-xs">
                                    <thead className="bg-blue-100 sticky top-0">
                                      <tr>
                                        <th className="text-left py-1.5 pl-3 text-slate-500 font-black uppercase text-[9px]">ID</th>
                                        <th className="text-left py-1.5 text-slate-500 font-black uppercase text-[9px]">Cliente</th>
                                        <th className="text-left py-1.5 text-slate-500 font-black uppercase text-[9px]">Tipo</th>
                                        <th className="text-center py-1.5 text-slate-500 font-black uppercase text-[9px]">Status</th>
                                        <th className="text-right py-1.5 text-slate-500 font-black uppercase text-[9px]">Qtd</th>
                                        <th className="text-right py-1.5 text-slate-500 font-black uppercase text-[9px]">Valor</th>
                                        <th className="text-left py-1.5 pr-3 text-slate-500 font-black uppercase text-[9px]">Data</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {monthDtfOrders.map((o: any) => (
                                        <tr key={o.id} className="border-b border-blue-50 hover:bg-blue-100/50">
                                          <td className="py-1.5 pl-3 font-black text-blue-600">#{o.id}</td>
                                          <td className="py-1.5 font-bold text-slate-700">{o.cliente_nome}</td>
                                          <td className="py-1.5 text-slate-500">{o.tipo_display}</td>
                                          <td className="py-1.5 text-center"><StatusBadge status={o.status} /></td>
                                          <td className="py-1.5 text-right font-black">{o.quantidade} {o.unidade}</td>
                                          <td className="py-1.5 text-right font-bold text-green-600">{formatarReal(o.valor_total)}</td>
                                          <td className="py-1.5 pr-3 text-slate-400">{o.data_criacao}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )
                            ) : (
                              monthFabricaOrders.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2">sem pedidos fábrica neste mês</p>
                              ) : (
                                <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-purple-100">
                                  <table className="w-full text-xs">
                                    <thead className="bg-purple-100 sticky top-0">
                                      <tr>
                                        <th className="text-left py-1.5 pl-3 text-slate-500 font-black uppercase text-[9px]">ID</th>
                                        <th className="text-left py-1.5 text-slate-500 font-black uppercase text-[9px]">Cliente</th>
                                        <th className="text-center py-1.5 text-slate-500 font-black uppercase text-[9px]">Status</th>
                                        <th className="text-right py-1.5 text-slate-500 font-black uppercase text-[9px]">Peças</th>
                                        <th className="text-left py-1.5 pr-3 text-slate-500 font-black uppercase text-[9px]">Data</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {monthFabricaOrders.map((o: any) => (
                                        <tr key={o.id} className="border-b border-purple-50 hover:bg-purple-100/50">
                                          <td className="py-1.5 pl-3 font-black text-purple-600">#{o.id}</td>
                                          <td className="py-1.5 font-bold text-slate-700">{o.cliente_nome}</td>
                                          <td className="py-1.5 text-center"><StatusBadge status={o.status} /></td>
                                          <td className="py-1.5 text-right font-black">{o.total_pecas}</td>
                                          <td className="py-1.5 pr-3 text-slate-400">{o.data_criacao}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              <tr className="bg-slate-50 font-black">
                <td className="py-2.5"></td>
                <td className="py-2.5 text-slate-800">TOTAL</td>
                <td className="py-2.5 text-right">{totalDtfPedidos}</td>
                <td className="py-2.5 text-right text-green-600">{formatarReal(totalDtfReceita)}</td>
                <td className="py-2.5 text-right text-emerald-600">{formatarReal(totalReceitaRecebida)}</td>
                <td className="py-2.5 text-right">{totalFabricaPedidos}</td>
                <td className="py-2.5 text-right">{totalFabricaPecas}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-black text-slate-800 uppercase italic mb-4">
          Pedidos de Fábrica — Relatório Detalhado
        </h2>

        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Data Início</label>
            <input
              type="date"
              value={fabricaStart}
              onChange={e => setFabricaStart(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Data Fim</label>
            <input
              type="date"
              value={fabricaEnd}
              onChange={e => setFabricaEnd(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Cliente</label>
            <input
              type="text"
              value={fabricaCliente}
              onChange={e => setFabricaCliente(e.target.value)}
              placeholder="nome do cliente..."
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 w-40"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Status</label>
            <select
              value={fabricaStatus}
              onChange={e => setFabricaStatus(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="producao">Produção</option>
              <option value="concluido">Concluído</option>
              <option value="entregue">Entregue</option>
              <option value="cancelado">Cancelado</option>
              <option value="aprovado">Aprovado</option>
              <option value="analise">Análise</option>
              <option value="orcamento">Orçamento</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Ano</label>
            <select
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={() => loadFabrica(1)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition"
          >
            <Calendar size={14} /> Filtrar
          </button>
          {fabricaData.length > 0 && (
            <button
              onClick={handlePrintFabrica}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black hover:bg-black transition"
            >
              <Printer size={14} /> Imprimir
            </button>
          )}
        </div>

        {fabricaLoading && fabricaData.length === 0 ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
        ) : (
          <>
            {!fabricaLoading && fabricaData.length > 0 && (
                <div className="flex gap-6 mb-3 bg-slate-50 rounded-xl p-3">
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase">Pedidos</span>
                    <p className="text-xl font-black text-slate-800">{fabricaData.length}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase">Peças Total</span>
                    <p className="text-xl font-black text-purple-600">{fabricaData.reduce((s: number, p: any) => s + (typeof p.total_pecas === 'number' ? p.total_pecas : typeof p.pecas_count === 'number' ? p.pecas_count : 0), 0)}</p>
                  </div>
                </div>
              )}
            <div className="overflow-x-auto max-h-96 overflow-y-auto" ref={fabricaTableRef}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr>
                    <th className="text-left py-2 pl-3 text-slate-500 font-black uppercase text-[9px]">ID</th>
                    <th className="text-left py-2 text-slate-500 font-black uppercase text-[9px]">Cliente</th>
                    <th className="text-left py-2 text-slate-500 font-black uppercase text-[9px]">Data</th>
                    <th className="text-right py-2 text-slate-500 font-black uppercase text-[9px]">Peças</th>
                    <th className="text-center py-2 text-slate-500 font-black uppercase text-[9px]">Status</th>
                    <th className="text-left py-2 pr-3 text-slate-500 font-black uppercase text-[9px]">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricaData.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-400 italic">nenhum pedido encontrado</td></tr>
                  ) : fabricaData.map((ped: any) => (
                    <tr key={ped.id} className="border-b border-slate-50 hover:bg-blue-50/50 transition">
                      <td className="py-2.5 pl-3 font-black text-slate-700">#{ped.id}</td>
                      <td className="py-2.5 font-bold text-slate-600">{ped.cliente_nome || ped.cliente?.nome || '—'}</td>
                      <td className="py-2.5 text-slate-500">{ped.data_criacao ? new Date(ped.data_criacao).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="py-2.5 text-right font-black text-slate-700">{typeof ped.total_pecas === 'number' ? ped.total_pecas : typeof ped.pecas_count === 'number' ? ped.pecas_count : '—'}</td>
                      <td className="py-2.5 text-center"><StatusBadge status={ped.status} /></td>
                      <td className="py-2.5 pr-3 text-slate-500 text-[10px]">
                        {ped.detalhes_tamanho && typeof ped.detalhes_tamanho === 'object' ? (
                          <span className="text-slate-600">
                            {Object.entries(ped.detalhes_tamanho).map(([t, q], i) => (
                              <span key={t}>{i > 0 ? ' · ' : ''}{t.toUpperCase()} {String(q)}</span>
                            ))}
                          </span>
                        ) : ped.detalhes_tamanho ? (
                          <span>{ped.detalhes_tamanho}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {fabricaHasMore && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => loadFabrica(fabricaPage + 1)}
                  className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-200 transition"
                >
                  {fabricaLoading ? 'Carregando...' : 'Carregar mais'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Relatorios;