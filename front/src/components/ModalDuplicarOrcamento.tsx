import React, { useState, useEffect } from 'react';
import { X, Copy, Loader2 } from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';
import { useAlert } from '../contexts/AlertContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (novoId: number) => void;
  orcamentoId: number;
  orcamentoNome: string;
}

const ModalDuplicarOrcamento: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  orcamentoId,
  orcamentoNome,
}) => {
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const { addAlert } = useAlert();

  useEffect(() => {
    if (isOpen) {
      api.get('empresas/').then(res => {
        setEmpresas(res.data.results || []);
      });
    }
  }, [isOpen]);

  const handleDuplicar = async () => {
    if (!selectedEmpresa) {
      addAlert('Selecione a empresa emissora.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(`orcamentos/${orcamentoId}/duplicar/`, {
        empresa_id: parseInt(selectedEmpresa),
      });
      addAlert('Orçamento duplicado com sucesso!', 'success');
      onSuccess(res.data.id);
      onClose();
    } catch {
      addAlert('Erro ao duplicar orçamento.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">
              Duplicar <span className={theme.colors.accentText}>Orçamento</span>
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {orcamentoNome}
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-all">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase ml-1">
              Empresa Emissora (cópia)
            </label>
            <select
              value={selectedEmpresa}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 transition-all"
              onChange={e => setSelectedEmpresa(e.target.value)}
            >
              <option value="">Selecione a empresa...</option>
              {empresas.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 ml-1">
              Os dados do cliente e itens serão mantidos.
            </p>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 flex gap-3 justify-end bg-white">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleDuplicar}
            disabled={loading}
            className={`${theme.colors.primaryButton} text-white px-6 py-3 rounded-2xl font-black uppercase text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95`}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Copy size={16} />}
            Duplicar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDuplicarOrcamento;