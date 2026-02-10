import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Upload, Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { api } from '../auth/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pedidoId: number | null;
}

export default function ModalEditarPedidoFabrica({
  isOpen,
  onClose,
  onSuccess,
  pedidoId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState<any>({
    nome_descricao: '',
    status: 'pendente',
    material: '',
    aplicacao_arte: '',
    descricao: '',
    cliente: '',
    detalhes_tamanho: {},
  });
  const [novaChave, setNovaChave] = useState('');

  // Carregar dados do pedido ao abrir o modal
  useEffect(() => {
    if (isOpen && pedidoId) {
      api.get(`pedidos/${pedidoId}/`).then((res) => {
        setFormData(res.data);
      });
      setArquivo(null); // Reset do arquivo ao trocar de pedido
    }
  }, [isOpen, pedidoId]);

  // Lógica de Colar Imagem (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const files = e.clipboardData?.files;
      if (files && files.length > 0 && files[0].type.startsWith('image/')) {
        setArquivo(files[0]);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const updateGrade = (chave: string, valor: string) => {
    setFormData({
      ...formData,
      detalhes_tamanho: {
        ...formData.detalhes_tamanho,
        [chave]: Number(valor),
      },
    });
  };

  const addNovoCampo = () => {
    if (!novaChave) return;
    setFormData({
      ...formData,
      detalhes_tamanho: {
        ...formData.detalhes_tamanho,
        [novaChave.toLowerCase()]: 0,
      },
    });
    setNovaChave('');
  };

  // Lógica de Arrastar Arquivo
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setArquivo(e.dataTransfer.files[0]);
    }
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = new FormData();

      // 1. Filtrar a grade para remover valores zerados
      const gradeLimpa: any = {};
      Object.entries(formData.detalhes_tamanho).forEach(([tamanho, qtd]) => {
        if (Number(qtd) > 0) gradeLimpa[tamanho] = Number(qtd);
      });

      // 2. Montar FormData para o Django
      data.append('nome_descricao', formData.nome_descricao);
      data.append('status', formData.status);
      data.append('material', formData.material);
      data.append('aplicacao_arte', formData.aplicacao_arte);
      data.append('descricao', formData.descricao || '');
      data.append('detalhes_tamanho', JSON.stringify(gradeLimpa));
      
      const clienteId = typeof formData.cliente === 'object' ? formData.cliente.id : formData.cliente;
      data.append('cliente', clienteId);

      // 3. Adicionar novo layout apenas se o usuário selecionou um
      if (arquivo) {
        data.append('layout', arquivo);
      }

      await api.patch(`pedidos/${pedidoId}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar:', error.response?.data);
      alert('Erro ao salvar. Verifique os campos obrigatórios.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase italic">Editar Pedido</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: #{pedidoId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition active:scale-90"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descrição do Pedido</label>
              <input name="nome_descricao" value={formData.nome_descricao} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600">
                <option value="pendente">PENDENTE</option>
                <option value="em_producao">EM PRODUÇÃO</option>
                <option value="finalizado">FINALIZADO</option>
              </select>
            </div>
          </div>

          {/* Grade de Tamanhos */}
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <label className="text-xs font-black text-slate-700 uppercase">Grade de Quantidades</label>
              <div className="flex gap-2">
                <input value={novaChave} onChange={(e) => setNovaChave(e.target.value)} placeholder="Novo (ex: XG)" className="p-1.5 text-[10px] rounded-lg border border-slate-200 outline-none w-24" />
                <button onClick={addNovoCampo} className="bg-slate-800 text-white p-1.5 rounded-lg hover:bg-black transition text-[10px] font-bold uppercase">Add</button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {Object.entries(formData.detalhes_tamanho).map(([chave, valor]: any) => (
                <div key={chave} className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">{chave}</label>
                  <input type="number" value={valor} onChange={(e) => updateGrade(chave, e.target.value)} className="w-full text-center text-sm font-black text-blue-600 outline-none bg-transparent" />
                </div>
              ))}
            </div>
          </div>

          {/* Material, Aplicação e Obs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Material</label><input name="material" value={formData.material} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold" /></div>
            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Aplicação</label><input name="aplicacao_arte" value={formData.aplicacao_arte} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold" /></div>
          </div>
          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Observações</label><textarea name="descricao" value={formData.descricao} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm h-16" /></div>

          {/* ALTERAR LAYOUT */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><ImageIcon size={10}/> Trocar Layout (Opcional)</label>
            <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-[2rem] p-6 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer
                ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-slate-200 bg-slate-50/50 hover:border-blue-400'}
                ${arquivo ? 'border-green-500 bg-green-50' : ''}`}>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => setArquivo(e.target.files ? e.target.files[0] : null)} />
              <div className="pointer-events-none">
                {arquivo ? (
                  <div className="flex flex-col items-center animate-in fade-in zoom-in">
                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2"><CheckCircle2 size={20} /></div>
                    <span className="text-xs font-bold text-slate-700">{arquivo.name}</span>
                  </div>
                ) : (
                  <div className="text-slate-400">
                    <Upload size={24} className={`mx-auto mb-2 text-blue-500 ${isDragging ? 'animate-bounce' : ''}`} />
                    <p className="text-[9px] font-black uppercase">Arraste ou Ctrl+V para trocar a arte</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition uppercase text-xs">Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Salvar Pedido</>}
          </button>
        </div>
      </div>
    </div>
  );
}