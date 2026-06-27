import React, { useState, useEffect, useMemo } from 'react';
import { X, Upload, Save, Loader2, Ruler, DollarSign } from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';
import { formatarReal } from '../tools/formatReal';
import { useAlert } from '../contexts/AlertContext';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';

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
  { value: 'estampa', label: 'Estampa', unit: 'un' },
];

const ModalNovoDTF: React.FC<Props> = ({ isOpen, onClose, onSuccess, clienteId: propClienteId }) => {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { addAlert } = useAlert();
  const clientSearch = useDebouncedSearch('clientes/', 300);

  // Combina clientes carregados com resultados da busca server-side (sem duplicatas)
  const allClientes = useMemo(() => {
    const seen = new Set(clientes.map((c) => c.id));
    const extra = clientSearch.results.filter((c: any) => !seen.has(c.id));
    return [...clientes, ...extra];
  }, [clientes, clientSearch.results]);

  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [tipoProduto, setTipoProduto] = useState('dtf_textil');
  const [tamanhoCm, setTamanhoCm] = useState<string>('');
  const [largura, setLargura] = useState<string>('');
  const [comprimento, setComprimento] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [usarPrecoCustom, setUsarPrecoCustom] = useState(false);
  const [precoCustom, setPrecoCustom] = useState('');
  const [status, setStatus] = useState<'orcamento' | 'aprovado' | 'em_producao' | 'finalizado'>('orcamento');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [configs, setConfigs] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);

  // Limpar tudo ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setClienteId('');
      setClienteNome('');
      setTipoProduto('dtf_textil');
      setTamanhoCm('');
      setLargura('');
      setComprimento('');
      setQuantidade(1);
      setUsarPrecoCustom(false);
      setPrecoCustom('');
      setArquivo(null);
      setIsDragging(false);
      setLoading(false);

      Promise.all([
        api.get('dtf-config/'),
        api.get('clientes/'),
      ]).then(([resCfg, resCli]) => {
        setConfigs(resCfg.data.results || []);
        const found = (resCfg.data.results || []).find((c: any) => c.tipo_produto === 'dtf_textil');
        setConfig(found);
        setClientes(resCli.data.results || []);

        // Preenche o nome do cliente se vier via prop
        if (propClienteId) {
          const cliente = (resCli.data.results || []).find((c: any) => c.id === propClienteId);
          if (cliente) {
            setClienteId(String(cliente.id));
            setClienteNome(cliente.nome);
          }
        }
      });
    }
  }, [isOpen, propClienteId]);

  useEffect(() => {
    const found = configs.find((c) => c.tipo_produto === tipoProduto);
    setConfig(found || null);
  }, [tipoProduto, configs]);

  const calcularTotal = () => {
    // Override manual tem prioridade absoluta
    if (usarPrecoCustom && precoCustom !== '' && Number(precoCustom) > 0) {
      // Para o override, multiplicamos pela unidade escolhida
      if (tipoProduto === 'sublimacao') {
        if (!largura || !comprimento || Number(largura) <= 0 || Number(comprimento) <= 0) {
          return Number(precoCustom); // mostra o valor, mas validação fica no submit
        }
        const areaM2 = (Number(largura) * Number(comprimento)) / 10000;
        return areaM2 * Number(precoCustom);
      }
      if (tipoProduto === 'estampa') {
        return Number(precoCustom) * (quantidade || 1);
      }
      // DTF Têxtil / UV: precoCustom = valor por metro
      if (!tamanhoCm || Number(tamanhoCm) <= 0) return Number(precoCustom);
      return (Number(tamanhoCm) / 100) * Number(precoCustom);
    }

    if (!config) return 0;
    const precoPorMetro = Number(config.valor_metro);
    const precoMinimo = Number(config.preco_minimo);

    // Para sublimação, calcular área em m²
    if (tipoProduto === 'sublimacao') {
      if (!largura || !comprimento || Number(largura) <= 0 || Number(comprimento) <= 0) {
        return 0;
      }
      const areaCm2 = Number(largura) * Number(comprimento);
      const areaM2 = areaCm2 / 10000;
      const valorCalculado = areaM2 * precoPorMetro;
      return valorCalculado < precoMinimo ? precoMinimo : valorCalculado;
    }

    // Para estampa: precoPorMetro aqui representa precoUnitário × quantidade
    if (tipoProduto === 'estampa') {
      const qtd = quantidade || 1;
      return precoPorMetro * qtd;
    }

    // Para DTF Têxtil/UV, calcular em metros lineares
    if (!tamanhoCm || Number(tamanhoCm) <= 0) return 0;
    const valorCalculado = (Number(tamanhoCm) / 100) * precoPorMetro;
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

    // Validação específica por tipo de produto
    if (tipoProduto === 'sublimacao') {
      if (!largura || !comprimento || Number(largura) <= 0 || Number(comprimento) <= 0) {
        addAlert('Informe a largura e comprimento para sublimação.', 'error');
        return;
      }
    } else if (tipoProduto === 'estampa') {
      if (!quantidade || quantidade <= 0) {
        addAlert('Informe a quantidade (>=1) de unidades da estampa.', 'error');
        return;
      }
    } else {
      if (!tamanhoCm || Number(tamanhoCm) <= 0) {
        addAlert('Informe a metragem linear.', 'error');
        return;
      }
    }

    if (!clienteId) {
      addAlert('Selecione um cliente.', 'error');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('cliente', clienteId);

    // Define tamanho_cm conforme tipo
    if (tipoProduto === 'sublimacao') {
      const areaCm2 = Number(largura) * Number(comprimento);
      formData.append('tamanho_cm', areaCm2.toString());
    } else if (tipoProduto === 'estampa') {
      // Estampa não usa tamanho_cm significativo — envia 0 para satisfazer o backend
      formData.append('tamanho_cm', '0');
    } else {
      formData.append('tamanho_cm', tamanhoCm.toString());
    }

    formData.append('tipo_produto', tipoProduto);
    formData.append('quantidade', String(quantidade));
    formData.append('layout_arquivo', arquivo);
    formData.append('status', status);

    // Override de preço: envia valor convertido ou vazio ('') pra não persistir override
    const precoOverrideNum = Number(precoCustom);
    if (usarPrecoCustom && precoCustom !== '' && precoOverrideNum > 0) {
      formData.append('preco_unit_override', precoCustom.replace(',', '.'));
    } else if (!usarPrecoCustom) {
      formData.append('preco_unit_override', '');
    }

    try {
      await api.post('dtf/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addAlert('Pedido DTF criado! Valor: ' + formatarReal(calcularTotal()), 'success');
      onSuccess();
      onClose();
      setClienteId('');
      setClienteNome('');
      setTipoProduto('dtf_textil');
      setTamanhoCm('');
      setLargura('');
      setComprimento('');
      setQuantidade(1);
      setUsarPrecoCustom(false);
      setPrecoCustom('');
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
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">
            Novo Pedido <span className={theme.colors.accentText}>DTF</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* Cliente */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase ml-1">
              Cliente Destino
            </label>
            <input
              list="clientes-list"
              placeholder="Digite para buscar cliente..."
              value={clienteNome}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 transition-all"
              disabled={!!propClienteId}
              onChange={(e) => {
                const val = e.target.value;
                setClienteNome(val);
                clientSearch.setQuery(val);
                const found = allClientes.find((c: any) => c.nome === val);
                if (found) {
                  setClienteId(String(found.id));
                } else {
                  setClienteId('');
                }
              }}
            />
            <datalist id="clientes-list">
              {allClientes.map((c) => (
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

          {/* Status do Orçamento */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase ml-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'orcamento' | 'aprovado' | 'em_producao' | 'finalizado')}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
            >
              <option value="orcamento">💰 Orçamento</option>
              <option value="aprovado">✅ Aprovado</option>
              <option value="em_producao">⚙️ Em Produção</option>
              <option value="finalizado">🏁 Finalizado</option>
            </select>
          </div>

          {/* Tamanho - DTF / Sublimação / Estampa */}
          {tipoProduto === 'sublimacao' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                  <Ruler size={14} /> Largura (cm)
                </label>
                <input
                  required
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
                  <Ruler size={14} /> Comprimento (cm)
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  placeholder="Ex: 40"
                  value={comprimento}
                  onChange={(e) => setComprimento(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
            </div>
          ) : tipoProduto === 'estampa' ? (
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                <DollarSign size={14} /> Quantidade de Unidades
              </label>
              <input
                type="number"
                min={1}
                step="1"
                placeholder="Ex: 12"
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                <Ruler size={14} /> Tamanho Linear (cm)
              </label>
              <input
                required
                type="number"
                step="0.01"
                placeholder="Ex: 150"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                value={tamanhoCm}
                onChange={(e) => setTamanhoCm(e.target.value)}
              />
            </div>
          )}

          {/* Override de Preço Unitário (checkbox + input) */}
          <div className="space-y-2 bg-amber-50/60 border border-amber-200 rounded-2xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={usarPrecoCustom}
                onChange={(e) => {
                  setUsarPrecoCustom(e.target.checked);
                  if (!e.target.checked) setPrecoCustom('');
                }}
                className="w-5 h-5 rounded accent-amber-500"
              />
              <div className="flex items-center gap-2 flex-1">
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-slate-700">
                  {tipoProduto === 'sublimacao'
                    ? 'Customizar valor por m²'
                    : tipoProduto === 'estampa'
                    ? 'Customizar valor por unidade'
                    : 'Customizar valor por metro'}
                </span>
              </div>
            </label>
            {usarPrecoCustom && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">R$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  value={precoCustom}
                  onChange={(e) => setPrecoCustom(e.target.value)}
                  className="flex-1 bg-white border border-amber-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-base text-slate-800"
                />
                <span className="text-[10px] text-amber-700 font-bold whitespace-nowrap">
                  (sobrescreve só este pedido)
                </span>
              </div>
            )}
          </div>

          {/* Mostrar valor estimado apenas para sublimação quando tiver as dimensões */}
          {tipoProduto === 'sublimacao' && largura && comprimento && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="text-xs font-black text-green-600 uppercase mb-1">
                Área e Valor Estimado
              </div>
              <div className="text-green-700 font-black text-lg">
                {formatarReal(calcularTotal())}
                <span className="text-sm font-normal ml-2 text-green-600">
                  (Área: {(Number(largura) * Number(comprimento) / 10000).toFixed(2)} m²)
                </span>
              </div>
            </div>
          )}

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
