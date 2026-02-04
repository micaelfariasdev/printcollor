import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Loader2,
  Building2,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  empresaId: number | null;
}

const ModalEditarEmpresa: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  empresaId,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    template_id: 1,
  });

  useEffect(() => {
    if (isOpen && empresaId) {
      setLoading(true);
      api
        .get(`empresas/${empresaId}/`)
        .then((res) => {
          setFormData({
            nome: res.data.nome || '',
            cnpj: res.data.cnpj || '',
            email: res.data.email || '',
            telefone: res.data.telefone || '',
            endereco: res.data.endereco || '',
            template_id: res.data.template_id || 1,
          });
        })
        .catch((err) => console.error('Erro ao carregar empresa', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, empresaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(`empresas/${empresaId}/`, formData);
      onSuccess();
      onClose();
    } catch (err) {
      alert('Erro ao atualizar empresa. Verifique se o CNPJ é válido e único.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">
            Editar <span className={theme.colors.accentText}>Empresa</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Razão Social
            </label>
            <div className="relative">
              <Building2
                className="absolute left-4 top-3.5 text-slate-400"
                size={18}
              />
              <input
                required
                value={formData.nome}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              CNPJ
            </label>
            <div className="relative">
              <CreditCard
                className="absolute left-4 top-3.5 text-slate-400"
                size={18}
              />
              <input
                required
                value={formData.cnpj}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                onChange={(e) =>
                  setFormData({ ...formData, cnpj: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Telefone
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-4 top-3.5 text-slate-400"
                  size={18}
                />
                <input
                  value={formData.telefone}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                E-mail
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-3.5 text-slate-400"
                  size={18}
                />
                <input
                  type="email"
                  value={formData.email}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Endereço
            </label>
            <div className="relative">
              <MapPin
                className="absolute left-4 top-3.5 text-slate-400"
                size={18}
              />
              <input
                value={formData.endereco}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                onChange={(e) =>
                  setFormData({ ...formData, endereco: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Unidade do Template (PDF)
              </label>
              <div className="relative">
                <Building2
                  className="absolute left-4 top-3.5 text-slate-400"
                  size={18}
                />
                <select
                  value={formData.template_id}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold appearance-none cursor-pointer"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      template_id: parseInt(e.target.value),
                    })
                  }
                >
                  <option value={1}>Empresa 1 - Matriz</option>
                  <option value={2}>Empresa 2 - Filial 01</option>
                  <option value={3}>Empresa 3 - Filial 02</option>
                </select>
                {/* Ícone de seta para indicar que é um select */}
                <div className="absolute right-4 top-4 pointer-events-none text-slate-400">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`${theme.colors.primaryButton} flex-[2] text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 transition-all active:scale-95`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Save size={20} /> Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEditarEmpresa;
