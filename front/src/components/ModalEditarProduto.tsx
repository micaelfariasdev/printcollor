import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Package, DollarSign } from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  produtoId: number | null;
}

const ModalEditarProduto: React.FC<Props> = ({ isOpen, onClose, onSuccess, produtoId }) => {
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [precoBase, setPrecoBase] = useState('');

  useEffect(() => {
    if (isOpen && produtoId) {
      setLoading(true);
      api.get(`produtos/${produtoId}/`)
        .then((res) => {
          setNome(res.data.nome);
          setPrecoBase(res.data.preco_base);
        })
        .catch((err) => console.error("Erro ao carregar produto", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, produtoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch(`produtos/${produtoId}/`, {
        nome: nome,
        preco_base: precoBase
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert("Erro ao atualizar produto.");
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
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">
            Editar <span className={theme.colors.accentText}>Produto</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Nome do Produto */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome do Produto</label>
            <div className="relative">
              <Package className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input 
                required
                type="text"
                value={nome}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
          </div>

          {/* Preço Base */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Preço Base (Venda)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input 
                required
                type="number"
                step="0.01"
                value={precoBase}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 pl-12 outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                onChange={(e) => setPrecoBase(e.target.value)}
              />
            </div>
          </div>

          {/* Ações */}
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
              className={`flex-[2] ${theme.colors.primaryButton} text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95`}
            >
              {loading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Salvar Alterações</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEditarProduto;