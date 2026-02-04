import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Shield, UserCircle } from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';

const ModalEditarUsuario = ({ isOpen, onClose, onSuccess, userId }: any) => {
  const [loading, setLoading] = useState(false);
  const [nivel, setNivel] = useState('vendedor');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      api.get(`usuarios/${userId}/`).then(res => {
        setNivel(res.data.nivel_acesso);
        setIsAdmin(res.data.is_staff);
      });
    }
  }, [isOpen, userId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.patch(`usuarios/${userId}/`, {
        nivel_acesso: nivel,
        is_staff: isAdmin
      });
      onSuccess();
      onClose();
    } catch (err) { alert("Erro ao mudar cargo."); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800 uppercase italic">Editar <span className="text-blue-600">Cargo</span></h2>
          <button onClick={onClose}><X size={24} className="text-slate-300" /></button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Nível de Acesso</label>
            <select 
              value={nivel}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none"
              onChange={(e) => setNivel(e.target.value)}
            >
              <option value="vendedor">Vendedor</option>
              <option value="financeiro">Financeiro</option>
            </select>
          </div>

          <button 
            type="button"
            onClick={() => setIsAdmin(!isAdmin)}
            className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${isAdmin ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-100 text-slate-400'}`}
          >
            <div className="flex items-center gap-3">
              <Shield size={20} />
              <span className="text-sm font-bold uppercase">Acesso Administrador</span>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${isAdmin ? 'bg-amber-400' : 'bg-slate-200'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isAdmin ? 'left-5' : 'left-1'}`} />
            </div>
          </button>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 font-bold text-slate-400">Cancelar</button>
          <button onClick={handleSave} disabled={loading} className={`${theme.colors.primaryButton} flex-[2] text-white py-4 rounded-2xl font-black uppercase shadow-xl disabled:opacity-50`}>
            {loading ? <Loader2 className="animate-spin mx-auto" size={20}/> : "Salvar Alteração"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEditarUsuario;