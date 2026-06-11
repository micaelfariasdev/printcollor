import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Loader2,
  CheckCircle2,
  DollarSign,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';
import { useAlert } from '../contexts/AlertContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dtfId: number | null;
}

const ModalEditarDTF: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  dtfId,
}) => {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const { addAlert } = useAlert();
  // Estados para feedback visual de arrastar
  const [isDraggingLayout, setIsDraggingLayout] = useState(false);
  const [isDraggingComprovante, setIsDraggingComprovante] = useState(false);

  // Estados do Formulário
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clienteNome, setClienteNome] = useState('');
  const [tipoProduto, setTipoProduto] = useState('dtf_textil');
  const [tipoProdutoDisplay, setTipoProdutoDisplay] = useState('');
  const [tamanhoCm, setTamanhoCm] = useState('');
  const [largura, setLargura] = useState('');
  const [comprimento, setComprimento] = useState('');
  const [foiImpresso, setFoiImpresso] = useState('pendente');
  const [estaPago, setEstaPago] = useState(false);
  const [foiEntregue, setFoiEntregue] = useState(false);
  const [status, setStatus] = useState<'orcamento' | 'aprovado' | 'em_producao' | 'finalizado'>('orcamento');

  // Arquivos
  const [novoLayout, setNovoLayout] = useState<File | null>(null);
  const [novoComprovante, setNovoComprovante] = useState<File | null>(null);
  const [urlsAtuais, setUrlsAtuais] = useState({ layout: '', comprovante: '' });

  // Limpar tudo ao abrir e carregar dados do DTF
  useEffect(() => {
    if (isOpen && dtfId) {
      // Limpa todos os states antes de carregar
      setClienteId(null);
      setClienteNome('');
      setTipoProduto('dtf_textil');
      setTipoProdutoDisplay('');
      setTamanhoCm('');
      setLargura('');
      setComprimento('');
      setFoiImpresso('pendente');
      setEstaPago(false);
      setFoiEntregue(false);
      setStatus('orcamento');
      setNovoLayout(null);
      setNovoComprovante(null);
      setUrlsAtuais({ layout: '', comprovante: '' });
      setIsDraggingLayout(false);
      setIsDraggingComprovante(false);
      setLoading(false);

      setLoading(true);
      Promise.all([api.get('clientes/'), api.get(`dtf/${dtfId}/`)])
        .then(([resCli, resDtf]) => {
          setClientes(resCli.data);
          const d = resDtf.data;
          setClienteId(d.cliente);
          setStatus(d.status || 'orcamento');
          const cli = resCli.data.find((c: any) => c.id === d.cliente);
          setClienteNome(cli ? cli.nome : '');
          setTipoProduto(d.tipo_produto || 'dtf_textil');
          setTipoProdutoDisplay(d.tipo_produto_display || '');
          setFoiImpresso(d.foi_impresso);
          setEstaPago(d.esta_pago);
          setFoiEntregue(d.foi_entregue);

          // Para sublimação, extrair largura e comprimento do tamanho_cm (que é área em cm²)
          if (d.tipo_produto === 'sublimacao') {
            // Como não temos os valores originais de largura/comprimento,
            // vamos deixar os campos em branco para o usuário preencher
            setLargura('');
            setComprimento('');
            setTamanhoCm(d.tamanho_cm.toString()); // guardamos a área original
          } else {
            setTamanhoCm(d.tamanho_cm.toString());
            setLargura('');
            setComprimento('');
          }

          setUrlsAtuais({
            layout: d.layout_arquivo,
            comprovante: d.comprovante_pagamento,
          });
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, dtfId]);

  // Suporte a Ctrl+V para o Layout
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const item = e.clipboardData?.items[0];
      if (item?.type.includes('image')) {
        const blob = item.getAsFile();
        if (blob)
          setNovoLayout(
            new File([blob], `update_layout_${Date.now()}.png`, {
              type: blob.type,
            })
          );
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Lógica automática de status
  const atualizarStatusAuto = () => {
    if (foiEntregue) {
      setStatus('finalizado');
    } else if (foiImpresso === 'impresso') {
      setStatus('finalizado'); // Impresso = Finalizado
    } else if (estaPago) {
      setStatus('aprovado'); // Aprovado = apenas Pago
    } else if (!estaPago) {
      setStatus('orcamento');
    }
  };

  // Handlers genéricos para Drag and Drop
  const onDragOver = (e: React.DragEvent, setter: (val: boolean) => void) => {
    e.preventDefault();
    setter(true);
  };
  const onDragLeave = (setter: (val: boolean) => void) => {
    setter(false);
  };
  const onDropFile = (
    e: React.DragEvent,
    setterFile: (file: File) => void,
    setterDrag: (val: boolean) => void
  ) => {
    e.preventDefault();
    setterDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setterFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let tamanhoCmFinal = null;

    // Validação específica por tipo de produto
    if (tipoProduto === 'sublimacao') {
      // Se o usuário preencheu largura ou comprimento, ambos são obrigatórios
      if ((largura && !comprimento) || (!largura && comprimento)) {
        addAlert('Informe tanto a largura quanto o comprimento para sublimação.', 'error');
        setLoading(false);
        return;
      }
      // Se ambos estão preenchidos, recalcular a área
      if (largura && comprimento && Number(largura) > 0 && Number(comprimento) > 0) {
        const areaCm2 = Number(largura) * Number(comprimento);
        tamanhoCmFinal = areaCm2.toString();
      } else {
        // Se ambos estão vazios, mantém o valor atual (não envia tamanho_cm)
        // O backend vai manter o valor existente
        tamanhoCmFinal = null;
      }
    } else {
      // Para DTF, tamanhoCm é obrigatório
      if (!tamanhoCm || Number(tamanhoCm) <= 0) {
        addAlert('Informe a metragem linear.', 'error');
        return;
      }
      tamanhoCmFinal = tamanhoCm;
    }

    if (!clienteId) {
      addAlert('Selecione um cliente.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('cliente', String(clienteId));
    if (tamanhoCmFinal !== null) {
      formData.append('tamanho_cm', tamanhoCmFinal);
    }
    formData.append('tipo_produto', tipoProduto);
    formData.append('foi_impresso', foiImpresso);
    formData.append('esta_pago', String(estaPago));
    formData.append('foi_entregue', String(foiEntregue));
    formData.append('status', status);
    if (novoLayout) formData.append('layout_arquivo', novoLayout);
    if (novoComprovante)
      formData.append('comprovante_pagamento', novoComprovante);

    try {
      await api.patch(`dtf/${dtfId}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addAlert('Pedido DTF atualizado!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addAlert(err?.response?.data?.detail || 'Erro ao atualizar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">
            Editar Pedido <span className={theme.colors.accentText}>DTF</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center items-center h-40">
            <Loader2 size={48} className="animate-spin text-blue-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Tipo de Produto (Read-only) */}
            <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase ml-1">
                  Tipo de Produto
                </label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-3.5 font-medium text-slate-600">
                  {tipoProdutoDisplay || 'DTF Têxtil'}
                </div>
              </div>

            {/* Cliente */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase ml-1">
                Cliente
              </label>
              <input
                list="edit-clientes-list"
                placeholder="Digite para buscar..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                value={clienteNome}
                onChange={(e) => {
                  const cli = clientes.find(
                    (c) => c.nome === e.target.value
                  );
                  if (cli) {
                    setClienteId(cli.id);
                    setClienteNome(cli.nome);
                  } else {
                    setClienteNome(e.target.value);
                  }
                }}
              />
              <datalist id="edit-clientes-list">
                {clientes.map((c) => (
                  <option key={c.id} value={c.nome} />
                ))}
              </datalist>
            </div>

            {/* Tamanho - DTF ou Sublimação */}
            {tipoProduto === 'sublimacao' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                    <DollarSign size={14} /> Largura (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 30"
                    value={largura}
                    onChange={(e) => setLargura(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                    <DollarSign size={14} /> Comprimento (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 40"
                    value={comprimento}
                    onChange={(e) => setComprimento(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                  <DollarSign size={14} /> Tamanho Linear (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 150"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  value={tamanhoCm}
                  onChange={(e) => setTamanhoCm(e.target.value)}
                />
              </div>
            )}

            {/* Status Toggles */}
            <div className="grid grid-cols-3 gap-4">
              <StatusToggle
                label="Impresso"
                checked={foiImpresso === 'impresso'}
                onChange={(e) => {
                  setFoiImpresso(e.target.checked ? 'impresso' : 'pendente');
                  // Atualizar status automaticamente
                  setTimeout(() => atualizarStatusAuto(), 0);
                }}
                icon={<CheckCircle2 size={18} />}
              />
              <StatusToggle
                label="Pago"
                checked={estaPago}
                onChange={(e) => {
                  setEstaPago(e.target.checked);
                  // Atualizar status automaticamente
                  setTimeout(() => atualizarStatusAuto(), 0);
                }}
                icon={<DollarSign size={18} />}
              />
              <StatusToggle
                label="Entregue"
                checked={foiEntregue}
                onChange={(e) => {
                  setFoiEntregue(e.target.checked);
                  // Atualizar status automaticamente
                  setTimeout(() => atualizarStatusAuto(), 0);
                }}
                icon={<CheckCircle2 size={18} />}
              />
            </div>

            {/* Status do Orçamento */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase ml-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const novoStatus = e.target.value as 'orcamento' | 'aprovado' | 'em_producao' | 'finalizado';
                  setStatus(novoStatus);
                  // Lógica inversa: ao mudar status manual, atualiza toggles
                  if (novoStatus === 'finalizado') {
                    setFoiEntregue(true);
                    setEstaPago(true);
                    setFoiImpresso('impresso');
                  } else if (novoStatus === 'aprovado') {
                    setEstaPago(true);
                    setFoiImpresso('pendente'); // Aprovado = Pago, não impresso
                  } else if (novoStatus === 'em_producao') {
                    setEstaPago(true);
                    setFoiImpresso('pendente');
                  } else if (novoStatus === 'orcamento') {
                    setEstaPago(false);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
              >
                <option value="orcamento">💰 Orçamento</option>
                <option value="aprovado">✅ Aprovado</option>
                <option value="em_producao">⚙️ Em Produção</option>
                <option value="finalizado">🏁 Finalizado</option>
              </select>
            </div>

            {/* Uploads */}
            <div className="grid grid-cols-2 gap-4">
              {/* Layout */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                  <ImageIcon size={14} /> Layout Atual
                </label>
                <div
                  onDragOver={(e) => onDragOver(e, setIsDraggingLayout)}
                  onDragLeave={() => onDragLeave(setIsDraggingLayout)}
                  onDrop={(e) =>
                    onDropFile(e, setNovoLayout, setIsDraggingLayout)
                  }
                  className={`relative border-2 border-dashed rounded-2xl p-4 transition-all duration-200 text-center ${
                    isDraggingLayout
                      ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                      : 'border-slate-200 bg-slate-50/50 hover:border-blue-400'
                  }`}
                >
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) =>
                      setNovoLayout(
                        e.target.files ? e.target.files[0] : null
                      )
                    }
                  />
                  {novoLayout ? (
                    <div className="text-green-500 text-sm font-bold">
                      ✔ Novo arquivo: {novoLayout.name}
                    </div>
                  ) : urlsAtuais.layout ? (
                    <img
                      src={urlsAtuais.layout}
                      alt="Layout"
                      className="h-32 object-contain mx-auto rounded-lg"
                    />
                  ) : (
                    <div className="text-slate-400 font-bold text-xs uppercase py-4">
                      Arraste ou selecione
                    </div>
                  )}
                </div>
              </div>

              {/* Comprovante */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                  <FileText size={14} /> Comprovante
                </label>
                <div
                  onDragOver={(e) => onDragOver(e, setIsDraggingComprovante)}
                  onDragLeave={() => onDragLeave(setIsDraggingComprovante)}
                  onDrop={(e) =>
                    onDropFile(
                      e,
                      setNovoComprovante,
                      setIsDraggingComprovante
                    )
                  }
                  className={`relative border-2 border-dashed rounded-2xl p-4 transition-all duration-200 text-center ${
                    isDraggingComprovante
                      ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                      : 'border-slate-200 bg-slate-50/50 hover:border-blue-400'
                  }`}
                >
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) =>
                      setNovoComprovante(
                        e.target.files ? e.target.files[0] : null
                      )
                    }
                  />
                  {novoComprovante ? (
                    <div className="text-green-500 text-sm font-bold">
                      ✔ Novo: {novoComprovante.name}
                    </div>
                  ) : urlsAtuais.comprovante ? (
                    <img
                      src={urlsAtuais.comprovante}
                      alt="Comprovante"
                      className="h-32 object-contain mx-auto rounded-lg"
                    />
                  ) : (
                    <div className="text-slate-400 font-bold text-xs uppercase py-4">
                      Arraste ou selecione
                    </div>
                  )}
                </div>
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
                    <Save size={20} /> Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const StatusToggle: React.FC<{
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
}> = ({ label, checked, onChange, icon }) => (
  <label className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:border-blue-300 transition-all">
    <div
      className={`p-2 rounded-full ${checked ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}
    >
      {icon}
    </div>
    <span className="text-[10px] font-black uppercase text-slate-500">
      {label}
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="hidden"
    />
  </label>
);

export default ModalEditarDTF;
