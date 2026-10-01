import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { FileText, Loader2, Plus, Printer, Search, X } from 'lucide-react';
import { api } from '../auth/useAuth';
import { useAlert } from '../contexts/AlertContext';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { formatarReal } from '../tools/formatReal';

type Recibo = {
  id: number; nome_empresa: string; nome_cliente: string; valor: string; referente_a: string;
  forma_pagamento: string; forma_pagamento_display: string; data_recebimento: string; observacoes: string;
};

const hoje = () => new Date().toISOString().slice(0, 10);
const unidades = ['zero', 'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
const dezenas = ['onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const dezenasCheias = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

const grupoPorExtenso = (numero: number) => {
  if (numero === 0) return '';
  if (numero === 100) return 'cem';
  const partes: string[] = [];
  if (numero >= 100) partes.push(centenas[Math.floor(numero / 100)]);
  const resto = numero % 100;
  if (resto <= 10) { if (resto) partes.push(unidades[resto]); }
  else if (resto < 20) partes.push(dezenas[resto - 11]);
  else {
    partes.push(dezenasCheias[Math.floor(resto / 10)]);
    if (resto % 10) partes.push(unidades[resto % 10]);
  }
  return partes.join(' e ');
};

const numeroPorExtenso = (numero: number) => {
  if (numero === 0) return 'zero';
  const escalas = [
    { singular: '', plural: '' },
    { singular: 'mil', plural: 'mil' },
    { singular: 'milhão', plural: 'milhões' },
    { singular: 'bilhão', plural: 'bilhões' },
  ];
  const partes: string[] = [];
  let restante = numero;
  let indice = 0;
  while (restante && indice < escalas.length) {
    const grupo = restante % 1000;
    if (grupo) {
      const escala = escalas[indice];
      if (indice === 1 && grupo === 1) partes.unshift('mil');
      else if (indice === 0) partes.unshift(grupoPorExtenso(grupo));
      else partes.unshift(`${grupoPorExtenso(grupo)} ${grupo === 1 ? escala.singular : escala.plural}`);
    }
    restante = Math.floor(restante / 1000);
    indice += 1;
  }
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}` : partes[0];
};

const valorPorExtenso = (valor: string | number) => {
  const centavosTotais = Math.round(Number(valor) * 100);
  const reais = Math.floor(centavosTotais / 100);
  const centavos = centavosTotais % 100;
  const valorReais = `${numeroPorExtenso(reais)} ${reais === 1 ? 'real' : 'reais'}`;
  return centavos ? `${valorReais} e ${numeroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}` : valorReais;
};
const dataBrasil = (data: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(`${data}T12:00:00`));

export default function Recibos() {
  const { items, loading, hasMore, loadMore, refresh, setSearch } = usePaginatedList<Recibo>({ endpoint: 'recibos/' });
  const { addAlert } = useAlert();
  const [showForm, setShowForm] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [printing, setPrinting] = useState<Recibo | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ empresa: '', cliente: '', valor: '', referente_a: '', forma_pagamento: 'pix', data_recebimento: hoje(), observacoes: '' });

  useEffect(() => {
    if (!showForm) return;
    Promise.all([api.get('empresas/'), api.get('clientes/', { params: { limit: 200 } })])
      .then(([empresasResponse, clientesResponse]) => {
        setEmpresas(empresasResponse.data.results ?? empresasResponse.data);
        setClientes(clientesResponse.data.results ?? clientesResponse.data);
      })
      .catch(() => addAlert('Não foi possível carregar empresas e clientes.', 'error'));
  }, [showForm, addAlert]);

  const clienteSelecionado = useMemo(() => clientes.find(cliente => String(cliente.id) === form.cliente), [clientes, form.cliente]);

  const abrirNovo = () => {
    setForm({ empresa: '', cliente: '', valor: '', referente_a: '', forma_pagamento: 'pix', data_recebimento: hoje(), observacoes: '' });
    setShowForm(true);
  };

  const salvar = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.empresa || !form.cliente || !form.valor || !form.referente_a.trim()) {
      addAlert('Preencha empresa, cliente, valor e referente a.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('recibos/', { ...form, valor: Number(form.valor.replace(',', '.')) });
      addAlert('Recibo criado.', 'success');
      setShowForm(false);
      refresh();
    } catch (error: any) {
      addAlert(error?.response?.data?.valor?.[0] || 'Não foi possível criar o recibo.', 'error');
    } finally { setSaving(false); }
  };

  const imprimir = (recibo: Recibo) => {
    setPrinting(recibo);
    window.setTimeout(() => window.print(), 50);
  };

  return <div className="space-y-6">
    <style>{`@media print { @page { size: A4 portrait; margin: 18mm; } html, body { background: #fff !important; -webkit-print-color-adjust: economy !important; print-color-adjust: economy !important; } body * { visibility: hidden !important; } #recibo-para-impressao, #recibo-para-impressao * { visibility: visible !important; color: #000 !important; background-color: transparent !important; } #recibo-para-impressao { position: fixed; inset: 0; width: 100%; box-sizing: border-box; padding: 18mm 16mm; background: #fff !important; } }`}</style>
    {printing && <article id="recibo-para-impressao" className="hidden print:block font-serif text-slate-900">
      <header className="flex items-start justify-between border-b-2 border-slate-900 pb-5"><div><p className="text-2xl font-bold">{printing.nome_empresa}</p><p className="mt-1 text-sm">RECIBO Nº {String(printing.id).padStart(6, '0')}</p></div><h1 className="text-3xl font-bold uppercase">Recibo</h1></header>
      <p className="mt-12 text-lg leading-9">Recebi de <strong>{printing.nome_cliente}</strong> a quantia de <strong>{formatarReal(printing.valor)}</strong> (<strong>{valorPorExtenso(printing.valor)}</strong>), referente a <strong>{printing.referente_a}</strong>.</p>
      <div className="mt-8 rounded border border-slate-400 p-4 text-sm"><p><strong>Forma de pagamento:</strong> {printing.forma_pagamento_display}</p>{printing.observacoes && <p className="mt-2"><strong>Observações:</strong> {printing.observacoes}</p>}</div>
      <p className="mt-14 text-right">Teresina - PI, {dataBrasil(printing.data_recebimento)}.</p><div className="mt-24 ml-auto w-80 border-t border-slate-900 pt-2 text-center text-sm">{printing.nome_empresa}<br />Assinatura / responsável</div>
    </article>}

    <div className="print:hidden flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div className="relative w-full max-w-md"><Search className="absolute left-3 top-3 text-slate-400" size={20}/><input onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar por cliente ou referência..."/></div>
      <button onClick={abrirNovo} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow-md"><Plus size={20}/> Novo recibo</button>
    </div>
    <section className="print:hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="p-4">Número</th><th className="p-4">Cliente</th><th className="p-4">Referente a</th><th className="p-4">Data</th><th className="p-4">Valor</th><th className="p-4 text-center">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(recibo => <tr key={recibo.id} className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-400">#{recibo.id}</td><td className="p-4"><p className="font-bold">{recibo.nome_cliente}</p><p className="text-xs text-slate-400">{recibo.nome_empresa}</p></td><td className="p-4 text-sm text-slate-600">{recibo.referente_a}</td><td className="p-4 text-sm">{dataBrasil(recibo.data_recebimento)}</td><td className="p-4 font-black">{formatarReal(recibo.valor)}</td><td className="p-4 text-center"><button title="Imprimir recibo" onClick={() => imprimir(recibo)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Printer size={18}/></button></td></tr>)}{!items.length && !loading && <tr><td colSpan={6} className="p-12 text-center text-slate-400">Nenhum recibo criado.</td></tr>}</tbody></table></div>{hasMore && <div className="border-t p-4 text-center"><button onClick={loadMore} className="rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold">Carregar mais</button></div>}</section>

    {showForm && <div className="print:hidden fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><form onSubmit={salvar} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b p-6"><div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Financeiro</p><h2 className="mt-1 text-2xl font-black">Criar recibo</h2></div><button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X/></button></header><div className="grid gap-5 p-6 md:grid-cols-2"><label className="text-sm font-bold">Empresa emissora<select required value={form.empresa} onChange={event => setForm({ ...form, empresa: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal"><option value="">Selecione</option>{empresas.map(empresa => <option value={empresa.id} key={empresa.id}>{empresa.nome}</option>)}</select></label><label className="text-sm font-bold">Cliente que efetuou o pagamento<select required value={form.cliente} onChange={event => setForm({ ...form, cliente: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal"><option value="">Selecione</option>{clientes.map(cliente => <option value={cliente.id} key={cliente.id}>{cliente.nome}</option>)}</select>{clienteSelecionado?.cpf && <small className="mt-1 block font-normal text-slate-400">CPF: {clienteSelecionado.cpf}</small>}</label><label className="text-sm font-bold md:col-span-2">Referente a<input required value={form.referente_a} onChange={event => setForm({ ...form, referente_a: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal" placeholder="Ex.: pagamento de impressão de camisetas"/></label><label className="text-sm font-bold">Valor recebido<input required inputMode="decimal" value={form.valor} onChange={event => setForm({ ...form, valor: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal" placeholder="0,00"/></label><label className="text-sm font-bold">Forma de pagamento<select value={form.forma_pagamento} onChange={event => setForm({ ...form, forma_pagamento: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal"><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option><option value="outro">Outro</option></select></label><label className="text-sm font-bold">Data do recebimento<input required type="date" value={form.data_recebimento} onChange={event => setForm({ ...form, data_recebimento: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal"/></label><label className="text-sm font-bold md:col-span-2">Observações<textarea value={form.observacoes} onChange={event => setForm({ ...form, observacoes: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border p-3 font-normal" placeholder="Opcional"/></label></div><footer className="flex justify-end gap-3 border-t p-6"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-5 py-3 font-bold text-slate-500">Cancelar</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={18}/> : <FileText size={18}/>} Criar recibo</button></footer></form></div>}
  </div>;
}
