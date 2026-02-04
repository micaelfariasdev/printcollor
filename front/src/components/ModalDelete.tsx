import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../auth/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  endpoint: string; // Ex: 'produtos' ou 'clientes'
  itemId: number | null;
  itemName: string;
}

const ModalDelete: React.FC<Props> = ({ isOpen, onClose, onSuccess, endpoint, itemId, itemName }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      // Faz a chamada DELETE para o endpoint configurado
      await api.delete(`${endpoint}/${itemId}/`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao deletar:", err);
      alert("Não foi possível excluir este item. Verifique se ele possui vínculos.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-red-100">
        
        {/* Header de Alerta */}
        <div className="p-6 flex flex-col items-center text-center space-y-4 bg-red-50/50">
          <div className="p-4 bg-red-100 text-red-600 rounded-full">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase italic">Confirmar Exclusão</h2>
            <p className="text-sm text-slate-500 font-medium px-4 mt-2">
              Você tem certeza que deseja apagar <span className="text-red-600 font-bold">"{itemName}"</span>?
            </p>
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="p-6 space-y-3">
          <button 
            disabled={loading}
            onClick={handleDelete}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20}/> : <><Trash2 size={20}/> Sim, Excluir</>}
          </button>
          
          <button 
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-slate-400 hover:text-slate-600 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDelete;