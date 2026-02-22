import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader2, Info } from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';
import { formatarReal } from '../tools/formatReal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ModalNovoOrcamento: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<any[]>([]);

  // Estados do Formulário
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [agencia, setAgencia] = useState(''); // Novo
  const [campanha, setCampanha] = useState(''); // Novo
  const [itens, setItens] = useState([
    { produto: '', descricao: '', quantidade: 1, preco_negociado: 0 },
  ]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        api.get('clientes/'),
        api.get('empresas/'),
        api.get('produtos/'),
      ])
        .then(([resCli, resEmp, resProd]) => {
          setClientes(resCli.data);
          setEmpresas(resEmp.data);
          setProdutosDisponiveis(resProd.data);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const adicionarItem = () => {
    setItens([
      ...itens,
      { produto: '', descricao: '', quantidade: 1, preco_negociado: 0 },
    ]);
  };

  const removerItem = (index: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const atualizarItem = (index: number, campo: string, valor: any) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };

    // Auto-preenchimento do preço base ao selecionar produto
    if (campo === 'produto') {
      const prod = produtosDisponiveis.find((p) => p.id === parseInt(valor));
      if (prod) novosItens[index].preco_negociado = parseFloat(prod.preco_base);
    }
    setItens(novosItens);
  };

  const totalGeral = itens.reduce(
    (acc, curr) => acc + curr.quantidade * curr.preco_negociado,
    0
  );

  const salvarOrcamento = async () => {
    if (!selectedCliente || !selectedEmpresa)
      return alert('Selecione cliente e empresa.');

    setLoading(true);
    try {
      await api.post('orcamentos/', {
        cliente: selectedCliente,
        empresa: selectedEmpresa,
        agencia: agencia, // Enviando agência
        campanha: campanha, // Enviando campanha
        itens: itens,
      });
      onSuccess();
      onClose();
      // Reset form
      setItens([
        { produto: '', descricao: '', quantidade: 1, preco_negociado: 0 },
      ]);
      setAgencia('');
      setCampanha('');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar. Verifique as informações.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">
              Gerar <span className={theme.colors.accentText}>Orçamento</span>
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              Painel Administrativo {theme.appName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-full transition-all active:scale-90"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          {/* Seleção de Entidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Empresa e Cliente (já existentes) */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase ml-1">
                Empresa Emissora
              </label>
              <select
                value={selectedEmpresa}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 transition-all"
                onChange={(e) => setSelectedEmpresa(e.target.value)}
              >
                <option value="">Selecione quem está vendendo...</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase ml-1">
                Cliente Destino
              </label>

              {/* Input de texto que aceita busca */}
              <input
                list="clientes-list"
                placeholder="Digite para buscar cliente..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 transition-all"
                onChange={(e) => {
                  // Encontra o ID do cliente baseado no nome escrito
                  const cliente = clientes.find(
                    (c) => c.nome === e.target.value
                  );
                  if (cliente) setSelectedCliente(cliente.id);
                }}
              />

              {/* A lista de sugestões que aparece ao digitar */}
              <datalist id="clientes-list">
                {clientes.map((c) => (
                  <option key={c.id} value={c.nome} />
                ))}
              </datalist>
            </div>

            {/* NOVOS CAMPOS: AGÊNCIA E CAMPANHA */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase ml-1">
                Agência / Intermediário
              </label>
              <input
                type="text"
                placeholder="Opcional: Nome da agência..."
                value={agencia}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 transition-all"
                onChange={(e) => setAgencia(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase ml-1">
                Campanha / Projeto
              </label>
              <input
                type="text"
                placeholder="Opcional: Ex: Black Friday"
                value={campanha}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 transition-all"
                onChange={(e) => setCampanha(e.target.value)}
              />
            </div>
          </div>

          {/* Listagem de Itens */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-black text-slate-800 uppercase text-sm flex items-center gap-2">
                <Info size={16} className="text-blue-500" /> Itens do Orçamento
              </h3>
              <button
                onClick={adicionarItem}
                className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black uppercase hover:bg-blue-100 transition-all"
              >
                <Plus size={16} /> Adicionar Item
              </button>
            </div>

            <div className="space-y-4">
              {itens.map((item, index) => (
                <div
                  key={index}
                  className="group relative flex flex-col gap-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 hover:border-blue-200 transition-all"
                >
                  <div className="grid grid-cols-12 gap-4">
                    {/* Produto */}
                    <div className="col-span-12 md:col-span-6 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                        Produto
                      </label>
                      <select
                        value={item.produto}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400"
                        onChange={(e) =>
                          atualizarItem(index, 'produto', e.target.value)
                        }
                      >
                        <option value="">Selecione o produto...</option>
                        {produtosDisponiveis.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantidade */}
                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                        Qtd
                      </label>
                      <input
                        type="number"
                        value={item.quantidade}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"
                        onChange={(e) =>
                          atualizarItem(
                            index,
                            'quantidade',
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>

                    {/* Preço Unitário */}
                    <div className="col-span-6 md:col-span-3 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                        Preço Negociado
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-slate-400 text-xs font-bold">
                          R$
                        </span>
                        <input
                          type="number"
                          value={item.preco_negociado}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 pl-9 text-sm font-bold outline-none"
                          onChange={(e) =>
                            atualizarItem(
                              index,
                              'preco_negociado',
                              parseFloat(e.target.value)
                            )
                          }
                        />
                      </div>
                    </div>

                    {/* Botão Remover */}
                    <div className="col-span-2 md:col-span-1 flex items-end justify-end pb-1">
                      <button
                        onClick={() => removerItem(index)}
                        className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Descrição do Item */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                      Descrição / Observações Técnicas
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Impressão em lona fosca com acabamento em ilhós nas pontas..."
                      value={item.descricao}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-blue-300"
                      onChange={(e) =>
                        atualizarItem(index, 'descricao', e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-white">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Valor Total Líquido
            </span>
            <span className="text-3xl font-black text-slate-800 leading-none">
              {formatarReal(totalGeral)}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={salvarOrcamento}
              disabled={
                loading || !selectedCliente || itens.some((i) => !i.produto)
              }
              className={`${theme.colors.primaryButton} text-white px-10 py-4 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Save size={20} /> Gerar Pedido
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalNovoOrcamento;
