import React, { useState } from 'react';
import { X, Save, Loader2, User, Mail, Lock, ShieldCheck } from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ModalNovoUsuario: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    nivel_acesso: 'vendedor',
    codigo_convite: 'PRINTCOLLOR2026',
    is_staff: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('usuarios/', formData);
      onSuccess();
      onClose();
      // Reset do form
      setFormData({ username: '', email: '', password: '', nivel_acesso: 'vendedor', codigo_convite: 'PRINTCOLLOR2026', is_staff: false });
    } catch (err) {
      console.error(err);
      alert("Erro ao criar usuária. Verifique se o nome de usuário ou e-mail já existem.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <h2 className="text-2xl font-black text-slate-800 uppercase italic leading-none">
            Nova <span className={theme.colors.accentText}>Usuária</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Nome de Usuário */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Username (Login)</label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input 
                required
                type="text"
                placeholder="ex: maria_print"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>
          </div>

          {/* E-mail */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input 
                required
                type="email"
                placeholder="maria@printcollor.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Senha Inicial</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input 
                required
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          {/* Nível de Acesso */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cargo / Nível</label>
            <select 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setFormData({...formData, nivel_acesso: e.target.value})}
            >
              <option value="vendedor">Vendedor</option>
              <option value="financeiro">Financeiro</option>
              <option value="maquina">Máquina</option>
            </select>
          </div>

          {/* Switch Admin */}
          <div 
            onClick={() => setFormData({...formData, is_staff: !formData.is_staff})}
            className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${formData.is_staff ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-white'}`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className={formData.is_staff ? 'text-amber-600' : 'text-slate-300'} size={20} />
              <span className={`text-xs font-black uppercase ${formData.is_staff ? 'text-amber-700' : 'text-slate-400'}`}>Dar acesso Administrador</span>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${formData.is_staff ? 'bg-amber-400' : 'bg-slate-200'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.is_staff ? 'left-5' : 'left-1'}`} />
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
            >Cancelar</button>
            <button 
              type="submit"
              disabled={loading}
              className={`flex-[2] ${theme.colors.primaryButton} text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95`}
            >
              {loading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Criar Usuária</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNovoUsuario;