import React, { useState, useEffect } from 'react';
import { Mail, Loader2, ShieldCheck, KeyRound, BadgeCheck } from 'lucide-react';
import { theme } from '../components/Theme';
import { api } from '../auth/useAuth';

const Configuracoes: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'perfil' | 'seguranca'>('perfil');
  
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/me/', formData);
      alert("✅ Perfil atualizado com sucesso!");
    } catch (err) {
      alert("❌ Erro ao atualizar perfil.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdData.new_password !== pwdData.confirm_password) {
      return alert("As novas senhas não coincidem!");
    }
    setLoading(true);
    try {
      await api.post('/change-password/', {
        current_password: pwdData.current_password,
        new_password: pwdData.new_password
      });
      alert("🔒 Senha alterada com sucesso!");
      setPwdData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao alterar senha.");
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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;