import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Upload, CheckCircle2, DollarSign, Image as ImageIcon, FileText } from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dtfId: number | null;
}

const ModalEditarDTF: React.FC<Props> = ({ isOpen, onClose, onSuccess, dtfId }) => {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Estados do Formulário
  const [cliente, setCliente] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [foiImpresso, setFoiImpresso] = useState('pendente');
  const [estaPago, setEstaPago] = useState(false);
  const [foiEntregue, setFoiEntregue] = useState(false);
  
  // Arquivos
  const [novoLayout, setNovoLayout] = useState<File | null>(null);
  const [novoComprovante, setNovoComprovante] = useState<File | null>(null);
  const [urlsAtuais, setUrlsAtuais] = useState({ layout: '', comprovante: '' });

  useEffect(() => {
    if (isOpen && dtfId) {
      setLoading(true);
      Promise.all([
        api.get('clientes/'),
        api.get(`dtf/${dtfId}/`)
      ]).then(([resCli, resDtf]) => {
        setClientes(resCli.data);
        const d = resDtf.data;
        setCliente(d.cliente);
        setTamanho(d.tamanho_cm);
        setFoiImpresso(d.foi_impresso);
        setEstaPago(d.esta_pago);
        setFoiEntregue(d.foi_entregue);
        setUrlsAtuais({ layout: d.layout_arquivo, comprovante: d.comprovante_pagamento });
      }).finally(() => setLoading(false));
    }
  }, [isOpen, dtfId]);

  // Suporte a Ctrl+V para o Layout
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const item = e.clipboardData?.items[0];
      if (item?.type.includes('image')) {
        const blob = item.getAsFile();
        if (blob) setNovoLayout(new File([blob], `update_layout_${Date.now()}.png`, { type: blob.type }));
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Handlers para Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.includes('image') || file.type === 'application/pdf')) {
      setNovoComprovante(file);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('cliente', cliente);
    formData.append('tamanho_cm', tamanho);
    formData.append('foi_impresso', foiImpresso);
    formData.append('esta_pago', String(estaPago));
    formData.append('foi_entregue', String(foiEntregue));
    
    if (novoLayout) formData.append('layout_arquivo', novoLayout);
    if (novoComprovante) formData.append('comprovante_pagamento', novoComprovante);

    try {
      await api.patch(`dtf/${dtfId}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert("Erro ao atualizar DTF.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">
            Editar Pedido <span className={theme.colors.accentText}>DTF #{dtfId}</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={24} /></button>
        </div>

        <form onSubmit={handleSalvar} className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cliente</label>
              <select value={cliente} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold outline-none" onChange={e => setCliente(e.target.value)}>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tamanho (cm lineares)</label>
              <input type="number" value={tamanho} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold outline-none" onChange={e => setTamanho(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button type="button" onClick={() => setFoiImpresso(foiImpresso === 'impresso' ? 'pendente' : 'impresso')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${foiImpresso === 'impresso' ? 'border-green-500 bg-green-50 text-green-600' : 'border-slate-100 text-slate-400'}`}>
              <CheckCircle2 size={20} /> <span className="text-[10px] font-black uppercase">Impresso</span>
            </button>
            <button type="button" onClick={() => setEstaPago(!estaPago)} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${estaPago ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>
              <DollarSign size={20} /> <span className="text-[10px] font-black uppercase">Pago</span>
            </button>
            <button type="button" onClick={() => setFoiEntregue(!foiEntregue)} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${foiEntregue ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-100 text-slate-400'}`}>
              <Upload size={20} /> <span className="text-[10px] font-black uppercase">Entregue</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Layout com Ctrl+V */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Alterar Layout (Ctrl+V)</label>
              <div className="relative h-32 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center overflow-hidden bg-slate-50">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setNovoLayout(e.target.files![0])} />
                {novoLayout ? (
                  <span className="text-[10px] font-bold text-blue-600 px-4 text-center truncate w-full">{novoLayout.name}</span>
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <ImageIcon size={24} />
                    <span className="text-[10px] font-bold uppercase mt-1">Trocar Imagem</span>
                  </div>
                )}
              </div>
            </div>

            {/* Comprovante com Drag and Drop */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Comprovante de Pagamento</label>
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative h-32 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center overflow-hidden transition-all duration-200 ${
                  isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setNovoComprovante(e.target.files![0])} />
                {novoComprovante || urlsAtuais.comprovante ? (
                  <div className="flex flex-col items-center text-green-600 p-4">
                    <FileText size={24} />
                    <span className="text-[10px] font-bold uppercase mt-1 text-center truncate w-full">
                      {novoComprovante ? novoComprovante.name : "Arquivo já enviado"}
                    </span>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center transition-colors ${isDragging ? 'text-blue-500' : 'text-slate-400'}`}>
                    <Upload size={24} className={isDragging ? 'animate-bounce' : ''} />
                    <span className="text-[10px] font-bold uppercase mt-1 text-center">
                      {isDragging ? 'Solte para anexar' : 'Arraste ou clique'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="p-8 border-t border-slate-50 flex gap-3 bg-white">
          <button onClick={onClose} className="flex-1 py-4 font-bold text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
          <button onClick={handleSalvar} disabled={loading} className={`${theme.colors.primaryButton} flex-[2] text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl disabled:opacity-50`}>
            {loading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Salvar Pedido</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEditarDTF;