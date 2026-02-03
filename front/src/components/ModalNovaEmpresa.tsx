import React, { useState } from 'react';
import { X, Save, Loader2, Building2, CreditCard, Mail, Phone, MapPin } from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ModalNovaEmpresa: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '', cnpj: '', email: '', telefone: '', endereco: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('empresas/', formData);
      onSuccess();
      onClose();
      setFormData({ nome: '', cnpj: '', email: '', telefone: '', endereco: '' });
    } catch (err) {
      alert("Erro ao cadastrar empresa. Verifique se o CNPJ é único.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">
            Configurar <span className={theme.colors.accentText}>Empresa</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={24} className="text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Razão Social / Nome Fantasia</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                onChange={(e) => setFormData({...formData, nome: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">CNPJ</label>
            <div className="relative">
              <CreditCard className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input required placeholder="00.000.000/0000-00" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                onChange={(e) => setFormData({...formData, cnpj: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Telefone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 text-slate-400" size={18} />
                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Endereço Completo</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                onChange={(e) => setFormData({...formData, endereco: e.target.value})} />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all">Cancelar</button>
            <button type="submit" disabled={loading} className={`flex-[2] ${theme.colors.primaryButton} text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95`}>
              {loading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Salvar Empresa</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNovaEmpresa;