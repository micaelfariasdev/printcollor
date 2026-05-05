import React, { useState, useEffect } from 'react';
import { Mail, Loader2, ShieldCheck, KeyRound, BadgeCheck, Printer } from 'lucide-react';
import { theme } from '../components/Theme';
import { api } from '../auth/useAuth';
import { useAlert } from '../contexts/AlertContext';

const TIPOS_DTF = [
  { value: 'dtf_textil', label: 'DTF Têxtil' },
  { value: 'dtf_uv', label: 'DTF UV' },
  { value: 'sublimacao', label: 'Sublimação' },
];

const Configuracoes: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'perfil' | 'seguranca' | 'dtf'>('perfil');
  const { addAlert } = useAlert();

  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
  });

  const [pwdData, setPwdData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [dtfConfigs, setDtfConfigs] = useState<any[]>([]);
  const [dtfValues, setDtfValues] = useState<{ [key: string]: { valor_metro: string; preco_minimo: string } }>({});

  useEffect(() => {
    api.get('/me/').then((res) => {
      setFormData({
        username: res.data.username || '',
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        email: res.data.email || '',
      });
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'dtf') {
      api.get('dtf-config/').then((res) => {
        setDtfConfigs(res.data);
        const vals: any = {};
        res.data.forEach((c: any) => {
          vals[c.tipo_produto] = {
            valor_metro: String(c.valor_metro),
            preco_minimo: String(c.preco_minimo),
          };
        });
        setDtfValues(vals);
      });
    }
  }, [activeTab]);

  const handleDtfChange = (tipo: string, field: 'valor_metro' | 'preco_minimo', value: string) => {
    setDtfValues((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], [field]: value },
    }));
  };

  const handleDtfSave = async (tipo: string) => {
    const vals = dtfValues[tipo];
    if (!vals) return;
    setLoading(true);
    try {
      const existing = dtfConfigs.find((c) => c.tipo_produto === tipo);
      if (existing) {
        await api.put(`dtf-config/${existing.id}/`, {
          tipo_produto: tipo,
          valor_metro: vals.valor_metro,
          preco_minimo: vals.preco_minimo,
        });
      } else {
        await api.post('dtf-config/', {
          tipo_produto: tipo,
          valor_metro: vals.valor_metro,
          preco_minimo: vals.preco_minimo,
        });
      }
      addAlert('Configuração salva!', 'success');
    } catch {
      addAlert('Erro ao salvar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/me/', formData);
      addAlert("Perfil atualizado com sucesso!", 'success');
    } catch (err) {
      addAlert("Erro ao atualizar perfil.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdData.new_password !== pwdData.confirm_password) {
      addAlert("As novas senhas não coincidem!", 'error'); return;
    }
    setLoading(true);
    try {
      await api.post('/change-password/', {
        current_password: pwdData.current_password,
        new_password: pwdData.new_password
      });
      addAlert("Senha alterada com sucesso!", 'success');
      setPwdData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      addAlert(err.response?.data?.error || "Erro ao alterar senha.", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-[1.5rem] shadow-sm border border-slate-200 w-fit">
        <button onClick={() => setActiveTab('perfil')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'perfil' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Meu Perfil</button>
        <button onClick={() => setActiveTab('seguranca')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'seguranca' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Segurança</button>
        <button onClick={() => setActiveTab('dtf')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'dtf' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}><Printer size={14} className="inline mr-1" /> DTF</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Avatar Dinâmico */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm text-center sticky top-8">
            <div className="w-24 h-24 bg-linear-to-br from-blue-600 to-indigo-700 rounded-4xl mx-auto mb-4 flex items-center justify-center text-3xl font-black text-white shadow-xl border-4 border-white">
              {(formData.first_name || formData.username).charAt(0).toUpperCase()}
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase italic truncate">
              {formData.first_name} {formData.last_name}
            </h3>
            <p className="text-xs font-bold text-slate-400 mb-4">@{formData.username}</p>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck size={14} /> Usuária Ativa
            </div>
          </div>
        </div>

        {/* Lado Direito: Forms */}
        <div className="lg:col-span-2">
          {activeTab === 'perfil' ? (
            <form onSubmit={handleUpdateProfile} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
              <h2 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-3">
                <BadgeCheck className="text-blue-500" /> Dados Pessoais
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome</label>
                  <input type="text" value={formData.first_name} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Sobrenome</label>
                  <input type="text" value={formData.last_name} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 text-slate-300" size={18} />
                    <input type="email" value={formData.email} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 font-bold outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={loading} className={`${theme.colors.primaryButton} w-full py-4 rounded-2xl text-white font-black uppercase shadow-xl disabled:opacity-50`}>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "Salvar Perfil"}
              </button>
            </form>
          ) : activeTab === 'seguranca' ? (
            <form onSubmit={handleChangePassword} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
              <h2 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-3">
                <KeyRound className="text-amber-500" /> Segurança da Conta
              </h2>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Senha Atual</label>
                <input type="password" value={pwdData.current_password} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold outline-none" onChange={(e) => setPwdData({...pwdData, current_password: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nova Senha</label>
                  <input type="password" value={pwdData.new_password} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold outline-none" onChange={(e) => setPwdData({...pwdData, new_password: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Repetir Senha</label>
                  <input type="password" value={pwdData.confirm_password} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold outline-none" onChange={(e) => setPwdData({...pwdData, confirm_password: e.target.value})} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase shadow-xl hover:bg-black transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "Atualizar Senha"}
              </button>
            </form>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
              <h2 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-3">
                <Printer className="text-blue-500" /> Configurações DTF
              </h2>
              {TIPOS_DTF.map((tipo) => (
                <div key={tipo.value} className="border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h3 className="font-black text-slate-700 uppercase text-sm">{tipo.label}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                        Valor por Metro (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="35.00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        value={dtfValues[tipo.value]?.valor_metro || ''}
                        onChange={(e) => handleDtfChange(tipo.value, 'valor_metro', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                        Preço Mínimo (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="20.00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        value={dtfValues[tipo.value]?.preco_minimo || ''}
                        onChange={(e) => handleDtfChange(tipo.value, 'preco_minimo', e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDtfSave(tipo.value)}
                    className="bg-slate-900 text-white w-full py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-black transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : `Salvar ${tipo.label}`}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;