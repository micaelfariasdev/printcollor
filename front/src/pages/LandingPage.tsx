import { useState } from 'react';
import {
  Printer, Zap, ArrowRight, Upload, Loader2,
  CheckCircle,
  Scissors, Activity, Layers, Cpu
} from 'lucide-react';
import { api } from '../auth/useAuth';
import { useAlert } from '../contexts/AlertContext';
import logo from '../assets/logo-printcollor.png';

export const LandingPage = () => {
  const { addAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    cliente_nome: '',
    whatsapp: '',
    tipo_servico: 'dtf',
    descricao: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const data = new FormData();
    Object.entries(formData).forEach(([key, val]) => data.append(key, val));
    if (arquivo) data.append('arquivo', arquivo);

    try {
      await api.post('solicitar-orcamento/', data);
      setEnviado(true);
      addAlert('Solicitação enviada!', 'success');
    } catch (error) {
      addAlert('Erro ao enviar.', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#020617] font-sans text-white overflow-x-hidden overflow-y-auto">
      
      {/* Navbar Premium */}
      <nav className="fixed top-4 inset-x-4 z-50">
        <div className="max-w-6xl mx-auto bg-[#0f172a]/70 backdrop-blur-xl border border-white/10 px-6 h-16 rounded-2xl flex items-center justify-between shadow-2xl">
          <img src={logo} alt="PrintCollor" className="h-10 object-contain" />
          <div className="hidden md:flex gap-8 text-[10px] font-black uppercase italic tracking-[0.2em] text-slate-400">
            <a href="#tecnologia" className="hover:text-blue-500 transition">Tecnologia</a>
            <a href="#produtos" className="hover:text-blue-500 transition">Produtos</a>
            <a href="#orcamento" className="hover:text-blue-500 transition">Orçamento</a>
          </div>
          <a href="#orcamento" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-black uppercase italic text-[10px] tracking-widest transition-all">
            Solicitar Orçamento
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full -z-10"></div>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center text-left">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-widest italic">
              <Activity size={12} className="animate-pulse" /> Produção Industrial em Tempo Real
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase italic leading-[0.8] tracking-tighter">
              Velocidade <br /> <span className="text-blue-600">Máxima.</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-md font-medium">
              A maior infraestrutura de impressão digital de Teresina. Tecnologia de fábrica para pequenos e grandes volumes.
            </p>
          </div>

          <div id="orcamento" className="bg-white rounded-[2.5rem] p-8 shadow-2xl text-slate-900 border border-slate-200">
            {enviado ? (
              <div className="py-20 text-center space-y-4">
                <CheckCircle size={60} className="text-green-500 mx-auto" />
                <h2 className="text-2xl font-black uppercase italic text-slate-800">Recebemos seu pedido!</h2>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Em breve entraremos em contato via WhatsApp.</p>
                <button onClick={() => setEnviado(false)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase italic text-xs">Novo Orçamento</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic text-slate-800">Solicitar Orçamento</h2>
                <div className="grid grid-cols-2 gap-4">
                   <input required placeholder="Nome" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({...formData, cliente_nome: e.target.value})} />
                   <input required placeholder="WhatsApp" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                </div>
                <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" onChange={e => setFormData({...formData, tipo_servico: e.target.value})}>
                  <option value="dtf">DTF Têxtil (Rolo)</option>
                  <option value="uv">DTF UV (Brindes)</option>
                  <option value="sublimacao">Sublimação Total / Calandra</option>
                  <option value="fardamento">Fardamento / Camisaria</option>
                  <option value="laser">Corte a Laser</option>
                </select>
                <textarea required placeholder="Quantidades, tamanhos e detalhes..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold h-24 outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({...formData, descricao: e.target.value})} />
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition text-slate-400 font-black uppercase text-[10px]">
                  <Upload size={18} /> {arquivo ? arquivo.name : 'Anexar Arte'}
                  <input type="file" className="hidden" onChange={e => setArquivo(e.target.files ? e.target.files[0] : null)} />
                </label>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase italic shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                  {loading ? <Loader2 className="animate-spin" /> : <>Pedir Orçamento <ArrowRight size={20} /></>}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Seção Tecnologia e Poder de Máquina */}
      <section id="tecnologia" className="py-24 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 text-left">
          <div className="mb-16">
            <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-4">Nossa <span className="text-blue-500">Engenharia</span></h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Capacidade produtiva real sem intermediários</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="bg-slate-950 p-8 rounded-[2rem] border border-white/5 space-y-4">
              <Printer className="text-blue-500" size={32} />
              <h3 className="text-2xl font-black italic uppercase">DTF Têxtil</h3>
              <p className="text-slate-500 text-sm font-bold leading-relaxed">Imprimindo mais de <span className="text-white text-lg">50 metros por hora</span> com 58cm de largura. Alta definição para qualquer tecido.</p>
            </div>
            <div className="bg-slate-950 p-8 rounded-[2rem] border border-white/5 space-y-4">
              <Zap className="text-purple-500" size={32} />
              <h3 className="text-2xl font-black italic uppercase">DTF UV 3D</h3>
              <p className="text-slate-500 text-sm font-bold leading-relaxed">Personalização com relevo e largura de <span className="text-white text-lg">58cm</span>. Perfeito para rígidos e brindes de alto padrão.</p>
            </div>
            <div className="bg-slate-950 p-8 rounded-[2rem] border border-white/5 space-y-4">
              <Layers className="text-orange-500" size={32} />
              <h3 className="text-2xl font-black italic uppercase">Sublimação</h3>
              <p className="text-slate-500 text-sm font-bold leading-relaxed">Infraestrutura com <span className="text-white text-lg">3 máquinas</span> industriais e <span className="text-white text-lg">Calandra</span> para rolos fechados.</p>
            </div>
            <div className="bg-slate-950 p-8 rounded-[2rem] border border-white/5 space-y-4">
              <Scissors className="text-green-500" size={32} />
              <h3 className="text-2xl font-black italic uppercase">Corte a Laser</h3>
              <p className="text-slate-500 text-sm font-bold leading-relaxed">Acabamento milimétrico para tecidos e patches. Precisão digital que elimina falhas humanas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Banner Grande - Calandra/Laser */}
      <section className="py-10 px-6">
        <div className="max-w-7xl mx-auto bg-gradient-to-br from-blue-700 to-blue-900 rounded-[3.5rem] p-12 md:p-20 relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
          <div className="absolute top-0 right-0 p-10 opacity-10"><Cpu size={300} /></div>
          <div className="relative z-10 text-left space-y-6 md:w-2/3">
            <span className="bg-white/20 px-4 py-1 rounded-full text-[10px] font-black uppercase italic tracking-widest">Produção em Rolo</span>
            <h2 className="text-5xl md:text-7xl font-black uppercase italic leading-none">Sublimação em <br /> Larga Escala</h2>
            <p className="text-blue-100 font-bold max-w-lg">Nossa Calandra industrial permite a estampagem de tecidos em rolo com velocidade e fidelidade de cor imbatíveis no mercado piauiense.</p>
            <div className="flex gap-4 pt-4 text-left">
              <div className="bg-white/10 p-4 rounded-2xl"><p className="text-2xl font-black italic">3x</p><p className="text-[8px] uppercase font-bold text-blue-200 tracking-widest">Capacidade</p></div>
              <div className="bg-white/10 p-4 rounded-2xl"><p className="text-2xl font-black italic">100%</p><p className="text-[8px] uppercase font-bold text-blue-200 tracking-widest">Fidelidade</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer com Logo Grande */}
      <footer className="py-24 border-t border-white/5 bg-[#020617] text-center space-y-12">
        <div className="max-w-7xl mx-auto px-6">
            <img src={logo} alt="PrintCollor" className="h-40 mx-auto" />
            <div className="grid md:grid-cols-2 gap-8 py-12 text-slate-500 border-y border-white/5">
                <div>
                    <h5 className="font-black text-white uppercase italic text-[10px] tracking-widest mb-4">Endereço</h5>
                    <p className="text-xs font-bold leading-relaxed">Teresina - PI <br /> R. Coelho de Resende, 540 / Centro-Sul</p>
                </div>
                <div>
                    <h5 className="font-black text-white uppercase italic text-[10px] tracking-widest mb-4">Contato</h5>
                    <p className="text-xs font-bold leading-relaxed">(86) 9 9817-1570 <br /> printcollor8@gmail.com</p>
                </div>
            </div>
            <p className="text-slate-700 text-[9px] font-black uppercase tracking-[0.5em] pt-12">© 2026 PrintCollor Graphics • Sistema Interno PC-ERP</p>
        </div>
      </footer>
    </div>
  );
};