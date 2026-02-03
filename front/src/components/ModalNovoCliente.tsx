import React, { useState } from 'react';
import { X, Save, Loader2, User, Mail, Phone, CreditCard, Building2 } from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ModalNovoCliente: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState<'CPF' | 'CNPJ'>('CPF');
  
  // Estado do formulário refletindo o Model do Django
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    cnpj: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Limpa o campo que não está sendo usado antes de enviar
      const payload = {
        ...formData,
        cpf: tipoDocumento === 'CPF' ? formData.cpf : null,
        cnpj: tipoDocumento === 'CNPJ' ? formData.cnpj : null,
      };

      await api.post('clientes/', payload);
      onSuccess();
      onClose();
      // Reset
      setFormData({ nome: '', email: '', telefone: '', cpf: '', cnpj: '' });
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar cliente. Verifique se o CPF/CNPJ já existe.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">
            Novo <span className={theme.colors.accentText}>Cliente</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Nome */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome Completo / Razão Social</label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input 
                required
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                placeholder="Ex: João Silva"
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
              />
            </div>
          </div>

          {/* Seletor CPF/CNPJ */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              type="button"
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${tipoDocumento === 'CPF' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              onClick={() => setTipoDocumento('CPF')}
            >CPF</button>
            <button 
              type="button"
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${tipoDocumento === 'CNPJ' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              onClick={() => setTipoDocumento('CNPJ')}
            >CNPJ</button>
          </div>

          {/* Documento Dinâmico */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{tipoDocumento}</label>
            <div className="relative">
              {tipoDocumento === 'CPF' ? <CreditCard className="absolute left-4 top-3.5 text-slate-400" size={18} /> : <Building2 className="absolute left-4 top-3.5 text-slate-400" size={18} />}
              <input 
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder={tipoDocumento === 'CPF' ? "000.000.000-00" : "00.000.000/0000-00"}
                onChange={(e) => setFormData({...formData, [tipoDocumento.toLowerCase()]: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* E-mail */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                <input 
                  type="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  placeholder="exemplo@email.com"
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            {/* Telefone */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">WhatsApp / Telefone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 text-slate-400" size={18} />
                <input 
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  placeholder="(00) 00000-0000"
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
            >Cancelar</button>
            <button 
              type="submit"
              disabled={loading}
              className={`flex-[2] ${theme.colors.primaryButton} text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 disabled:opacity-50`}
            >
              {loading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Salvar Cliente</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNovoCliente;