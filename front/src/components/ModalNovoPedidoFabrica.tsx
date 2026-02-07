import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, Save, Shirt, Copy, Loader2, CheckCircle2, FileText, Info, Calendar, Scissors } from 'lucide-react';
import { api } from '../auth/useAuth';

export default function ModalNovoPedidoFabrica({ isOpen, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState<any>({
    cliente: '',
    nome_descricao: '',
    material: '',
    aplicacao_arte: '',
    descricao: '',
    data_entrega: '', // Campo novo importante para o PDF
    status: 'pendente',
    detalhes_tamanho: {},
  });

  useEffect(() => {
    if (isOpen) api.get('clientes/').then((res) => setClientes(res.data));
  }, [isOpen]);

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

  useEffect(() => {
    const handlePasteGlobal = (e: ClipboardEvent) => {
      if (!isOpen) return;
      if (e.clipboardData?.files.length) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) setArquivo(file);
        return;
      }
      const text = e.clipboardData?.getData('text');
      if (text) {
        const matches = text.matchAll(/([a-zA-Z0-9\s]+)[:\-\s]+(\d+)/g);
        const novaGrade: any = { ...formData.detalhes_tamanho };
        let encontrou = false;
        for (const match of matches) {
          novaGrade[match[1].trim().toLowerCase()] = Number(match[2]);
          encontrou = true;
        }
        if (encontrou) setFormData((prev: any) => ({ ...prev, detalhes_tamanho: novaGrade }));
      }
    };
    window.addEventListener('paste', handlePasteGlobal);
    return () => window.removeEventListener('paste', handlePasteGlobal);
  }, [isOpen, formData.detalhes_tamanho]);

  const aplicarPreset = (tipo: string) => {
    const presets: any = {
      completo: ['pp', 'p', 'm', 'g', 'gg', 'xgg', 'xxgg', 'bl pp', 'bl p', 'bl m', 'bl g', 'bl gg', 'bl xgg', 'bl xxgg', '2a', '4a', '6a', '8a', '10a', '12a', '14a'],
      calcas: ['34', '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60'],
      unico: ['quantidade']
    };
    const novaGrade: any = {};
    presets[tipo].forEach((t: string) => novaGrade[t] = 0);
    setFormData({ ...formData, detalhes_tamanho: novaGrade });
  };

 const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!arquivo) return alert("O arquivo de layout é obrigatório!");

  setLoading(true);

  // --- LÓGICA PARA FILTRAR ZERADOS ---
  const gradeLimpa: any = {};
  Object.entries(formData.detalhes_tamanho).forEach(([tamanho, qtd]) => {
    if (Number(qtd) > 0) {
      gradeLimpa[tamanho] = Number(qtd);
    }
  });

  const data = new FormData();
  Object.keys(formData).forEach(key => {
    if (key === 'detalhes_tamanho') {
      // Enviamos a grade filtrada sem os zeros
      data.append(key, JSON.stringify(gradeLimpa));
    } else {
      data.append(key, formData[key]);
    }
  });
  
  data.append('layout', arquivo);

  try {
    await api.post('pedidos/', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    onSuccess();
    onClose();
  } catch (err: any) {
    console.error(err.response?.data);
    alert("Erro ao salvar. Verifique os campos.");
  } finally {
    setLoading(false);
  }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-left">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-300">
        
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800 uppercase italic">Novo Pedido Fábrica</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition active:scale-90"><X size={20} /></button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
          {/* Dados do Cliente e Entrega */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cliente</label>
              <select required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                value={formData.cliente} onChange={(e) => setFormData({...formData, cliente: e.target.value})}>
                <option value="">Selecione...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data de Entrega</label>
              <input type="date" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                value={formData.data_entrega} onChange={(e) => setFormData({...formData, data_entrega: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome do Pedido / Descrição Curta</label>
            <input required placeholder="Ex: Uniforme Escolar 2026" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              value={formData.nome_descricao} onChange={(e) => setFormData({...formData, nome_descricao: e.target.value})} />
          </div>

          {/* Material e Aplicação */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Material</label>
              <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Ex: Dry Fit"
                onChange={(e) => setFormData({...formData, material: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Aplicação</label>
              <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Ex: Bordado"
                onChange={(e) => setFormData({...formData, aplicacao_arte: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Observações da Fábrica</label>
            <textarea required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-16 text-sm" placeholder="Ex: Gola polo, cor azul marinho..."
              onChange={(e) => setFormData({...formData, descricao: e.target.value})} />
          </div>

          {/* Atalhos de Grade com Opção de Calça */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Atalhos de Grade</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => aplicarPreset('completo')} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black hover:bg-blue-700 transition">
                <Shirt size={14}/> CAMISARIA
              </button>
              <button type="button" onClick={() => aplicarPreset('calcas')} className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black hover:bg-black transition">
                <Scissors size={14}/> CALÇAS (34-60)
              </button>
              <button type="button" onClick={() => aplicarPreset('unico')} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold hover:bg-slate-50 transition">
                📦 QUANTIDADE ÚNICA
              </button>
            </div>
          </div>

          {/* Visualização da Grade */}
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            {Object.entries(formData.detalhes_tamanho).map(([chave, valor]: any) => (
              <div key={chave} className="bg-white p-2 rounded-xl border border-slate-100 text-center relative group">
                <span className="text-[12px] font-black text-slate-400 uppercase block mb-1">{chave}</span>
                <input type="number" value={valor} className="w-full text-center font-black text-blue-600 outline-none text-xs bg-transparent"
                  onChange={(e) => setFormData({...formData, detalhes_tamanho: {...formData.detalhes_tamanho, [chave]: Number(e.target.value)}})} />
                <button type="button" onClick={() => {
                    const newGrade = {...formData.detalhes_tamanho};
                    delete newGrade[chave];
                    setFormData({...formData, detalhes_tamanho: newGrade});
                }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"><X size={8}/></button>
              </div>
            ))}
          </div>

          {/* Upload / Drag / Paste */}
          <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-[2rem] p-8 transition-all duration-300 flex flex-col items-center justify-center text-center
              ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-slate-200 bg-slate-50/50 hover:border-blue-400'}
              ${arquivo ? 'border-green-500 bg-green-50' : ''}`}>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => setArquivo(e.target.files ? e.target.files[0] : null)} />
            <div className="pointer-events-none">
              {arquivo ? (
                <div className="flex flex-col items-center animate-in fade-in zoom-in">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2"><CheckCircle2 size={24} /></div>
                  <span className="text-xs font-bold text-slate-700">{arquivo.name}</span>
                </div>
              ) : (
                <div className="text-slate-400">
                  <Upload size={32} className={`mx-auto mb-2 text-blue-500 ${isDragging ? 'animate-bounce' : ''}`} />
                  <p className="text-[10px] font-black uppercase tracking-tighter">Arraste ou Ctrl+V para o Layout</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition">Descartar</button>
            <button type="submit" disabled={loading} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black uppercase shadow-xl shadow-blue-200 flex items-center justify-center gap-2 hover:bg-blue-700 transition active:scale-95">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20}/> CRIAR PEDIDO</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}