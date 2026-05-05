import React, { useState, useEffect } from 'react';
import { X, Upload, Save, Loader2, Ruler } from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';
import { formatarReal } from '../tools/formatReal';
import { useAlert } from '../contexts/AlertContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clienteId?: number;
}

const TIPOS = [
  { value: 'dtf_textil', label: 'DTF Têxtil', unit: 'ml' },
  { value: 'dtf_uv', label: 'DTF UV', unit: 'ml' },
  { value: 'sublimacao', label: 'Sublimação', unit: 'm2' },
];

const ModalNovoDTF: React.FC<Props> = ({ isOpen, onClose, onSuccess, clienteId: propClienteId }) => {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { addAlert } = useAlert();

  const [clienteId, setClienteId] = useState('');
  const [tipoProduto, setTipoProduto] = useState('dtf_textil');
  const [tamanhoCm, setTamanhoCm] = useState<number>(0);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [configs, setConfigs] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.get('dtf-config/'),
        api.get('clientes/'),
      ]).then(([resCfg, resCli]) => {
        setConfigs(resCfg.data);
        const found = resCfg.data.find((c: any) => c.tipo_produto === 'dtf_textil');
        setConfig(found);
        setClientes(resCli.data);
      });
      if (propClienteId) {
        setClienteId(String(propClienteId));
      }
    }
  }, [isOpen, propClienteId]);

  useEffect(() => {
    const found = configs.find((c) => c.tipo_produto === tipoProduto);
    setConfig(found || null);
  }, [tipoProduto, configs]);

  const calcularTotal = () => {
    if (!config) return 0;
    const precoPorMetro = Number(config.valor_metro);
    const precoMinimo = Number(config.preco_minimo);
    const valorCalculado = (tamanhoCm / 100) * precoPorMetro;
    return valorCalculado < precoMinimo ? precoMinimo : valorCalculado;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setArquivo(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) {
      addAlert('O arquivo de layout (PDF/Imagem) é obrigatório.', 'error');
      return;
    }
    if (tamanhoCm <= 0) {
      addAlert('Informe a metragem.', 'error');
      return;
    }
    if (!clienteId) {
      addAlert('Selecione um cliente.', 'error');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('cliente', clienteId);
    formData.append('tamanho_cm', tamanhoCm.toString());
    formData.append('tipo_produto', tipoProduto);
    formData.append('layout_arquivo', arquivo);

    try {
      await api.post('dtf/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addAlert('Pedido DTF criado! Valor: ' + formatarReal(calcularTotal()), 'success');
      onSuccess();
      onClose();
      setClienteId('');
      setTipoProduto('dtf_textil');
      setTamanhoCm(0);
      setArquivo(null);
    } catch (err: any) {
      addAlert(err?.response?.data?.detail || 'Erro ao criar pedido.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (!isOpen) return;
      const items = event.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const file = new File([blob], `pasted_image_${Date.now()}.png`, {
                type: blob.type,
              });
              setArquivo(file);
            }
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">
            Novo Pedido <span className={theme.colors.accentText}>DTF</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Cliente */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase ml-1">
              Cliente Destino
            </label>
            <input
              list="clientes-list"
              placeholder="Digite para buscar cliente..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 transition-all"
              disabled={!!propClienteId}
              onChange={(e) => {
                const cliente = clientes.find((c) => c.nome === e.target.value);
                if (cliente) setClienteId(cliente.id);
              }}
            />
            <datalist id="clientes-list">
              {clientes.map((c) => (
                <option key={c.id} value={c.nome} />
              ))}
            </datalist>
          </div>

          {/* Tipo de Produto */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase ml-1">
              Tipo de Produto
            </label>
            <select
              value={tipoProduto}
              onChange={(e) => setTipoProduto(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Tamanho e Valor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                <Ruler size={14} /> Tamanho (cm)
              </label>
              <input
                required
                type="number"
                step="0.01"
                placeholder="Ex: 150"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                onChange={(e) => setTamanhoCm(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase">
                Valor Estimado
              </label>
              <div className="bg-blue-50 text-blue-700 rounded-2xl p-4 font-black text-lg">
                {formatarReal(calcularTotal())}
              </div>
            </div>
          </div>

          {/* Upload de Arquivo */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase">
              Arquivo de Layout
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-3xl p-8 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                  : 'border-slate-200 bg-slate-50/50 hover:border-blue-400'
              }`}
            >
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) =>
                  setArquivo(e.target.files ? e.target.files[0] : null)
                }
              />
              {arquivo ? (
                <div className="animate-in fade-in zoom-in flex flex-col items-center">
                  <span className="text-green-500 mb-2">✔</span>
                  <span className="text-sm font-bold text-slate-700 truncate max-w-[250px]">
                    {arquivo.name}
                  </span>
                  <span className="text-[10px] text-green-600 font-bold uppercase mt-1">
                    Pronto para envio
                  </span>
                </div>
              ) : (
                <div className={`flex flex-col items-center ${isDragging ? 'text-blue-500' : 'text-slate-400'}`}>
                  <Upload size={32} className={isDragging ? 'animate-bounce text-blue-500' : 'text-blue-500'} />
                  <span className="text-sm font-bold text-slate-600 mt-2">
                    {isDragging ? 'Solte para anexar' : 'Selecione, arraste ou use Ctrl + V'}
                  </span>
                  <span className="text-[10px] uppercase mt-1">PDF, TIFF ou Imagens</span>
                </div>
              )}
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
              className={`flex-[2] ${theme.colors.primaryButton} text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 disabled:opacity-50`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Pedido</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNovoDTF;
