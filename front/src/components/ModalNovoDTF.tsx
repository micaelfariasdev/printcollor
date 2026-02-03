import React, { useState, useEffect } from 'react';
import { X, Upload, Save, Loader2, Ruler, User } from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';
import { formatarReal } from '../tools/formatReal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ModalNovoDTF: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);

  // Estados do Form
  const [clienteId, setClienteId] = useState('');
  const [tamanhoCm, setTamanhoCm] = useState<number>(0);
  const [arquivo, setArquivo] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.get('clientes/').then((res) => setClientes(res.data));
    }
  }, [isOpen]);

  // Cálculo do Valor Total (Simulando a lógica do seu Model Django)
  const calcularTotal = () => {
    const precoPorMetro = 35.0;
    const valorCalculado = (tamanhoCm / 100) * precoPorMetro;
    return valorCalculado < 20.0 ? 20.0 : valorCalculado;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !arquivo || tamanhoCm <= 0)
      return alert('Preencha todos os campos!');

    setLoading(true);

    // Como tem arquivo, precisamos usar FormData
    const formData = new FormData();
    formData.append('cliente', clienteId);
    formData.append('tamanho_cm', tamanhoCm.toString());
    formData.append('layout_arquivo', arquivo);

    try {
      await api.post('dtf/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess();
      onClose();
      // Reset
      setClienteId('');
      setTamanhoCm(0);
      setArquivo(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar pedido de DTF.');
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
              // Cria um objeto File a partir do Blob colado
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
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase italic">
              Novo Pedido <span className={theme.colors.accentText}>DTF</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Cliente */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
              <User size={14} /> Cliente
            </label>
            <select
              required
              value={clienteId}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Selecione o cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
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
            <div className="relative border-2 border-dashed border-slate-200 rounded-3xl p-8 hover:border-blue-400 transition-colors bg-slate-50/50 flex flex-col items-center justify-center text-center cursor-pointer">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) =>
                  setArquivo(e.target.files ? e.target.files[0] : null)
                }
              />
              <Upload className="text-blue-500 mb-2" size={32} />
              <span className="text-sm font-bold text-slate-600">
                {arquivo
                  ? arquivo.name
                  : 'Clique para selecionar ou use Ctrl + V'}
              </span>
              <span className="text-[10px] text-slate-400 uppercase mt-1">
                {arquivo
                  ? 'Imagem pronta para envio'
                  : 'PDF, TIFF ou Imagem da Área de Transferência'}
              </span>
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
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Save size={20} /> Salvar Pedido
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNovoDTF;
