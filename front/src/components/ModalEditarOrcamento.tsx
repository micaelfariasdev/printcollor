import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { theme } from './Theme';
import { api } from '../auth/useAuth';
import { formatarReal } from '../tools/formatReal';
import type { Orcamento } from '../pages/Orcamentos';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orcamentoId: number | null; // Recebe o ID do orçamento selecionado para edição
}

const ModalEditarOrcamento: React.FC<Props> = ({ isOpen, onClose, onSuccess, orcamentoId }) => {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<any[]>([]);

  // Estados do Formulário
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [itens, setItens] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && orcamentoId) {
      setLoading(true);
      // Carrega dados auxiliares e os dados do orçamento específico
      Promise.all([
        api.get('clientes/'),
        api.get('empresas/'),
        api.get('produtos/'),
        api.get(`orcamentos/${orcamentoId}/`)
      ]).then(([resCli, resEmp, resProd, resOrc]) => {
        setClientes(resCli.data);
        setEmpresas(resEmp.data);
        setProdutosDisponiveis(resProd.data);
        
        // Preenche o formulário com os dados vindos do JSON
        const orc: Orcamento = resOrc.data;
        setSelectedCliente(orc.cliente.toString());
        setSelectedEmpresa(orc.empresa.toString());
        setItens(orc.itens.map(item => ({
          id: item.id, // Mantemos o ID para o Django saber o que editar vs criar
          produto: item.produto,
          descricao: item.descricao || '',
          quantidade: item.quantidade,
          preco_negociado: parseFloat(item.preco_negociado)
        })));
      }).finally(() => setLoading(false));
    }
  }, [isOpen, orcamentoId]);

  const atualizarItem = (index: number, campo: string, valor: any) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    
    if (campo === 'produto') {
      const prod = produtosDisponiveis.find(p => p.id === parseInt(valor));
      if (prod) novosItens[index].preco_negociado = parseFloat(prod.preco_base);
    }
    setItens(novosItens);
  };

  const totalGeral = itens.reduce((acc, curr) => acc + (curr.quantidade * curr.preco_negociado), 0);

  const salvarEdicao = async () => {
    setLoading(true);
    try {
      // Enviamos para a rota de detalhe com PATCH para atualizar parcialmente
      await api.patch(`orcamentos/${orcamentoId}/`, {
        cliente: selectedCliente,
        empresa: selectedEmpresa,
        itens: itens
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert("Erro ao atualizar orçamento.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-100">
        
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">
            Editar Orçamento <span className={theme.colors.accentText}>#{orcamentoId}</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={24} /></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          {/* Inputs de Cliente/Empresa - Mesma lógica do Modal Novo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Empresa</label>
              <select 
                value={selectedEmpresa}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setSelectedEmpresa(e.target.value)}
              >
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cliente</label>
              <select 
                value={selectedCliente}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setSelectedCliente(e.target.value)}
              >
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Lista de Itens com campo Descrição */}
          <div className="space-y-4">
             {itens.map((item, index) => (
                <div key={index} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                   <div className="flex gap-4 items-end">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Produto</label>
                        <select 
                          value={item.produto}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"
                          onChange={(e) => atualizarItem(index, 'produto', e.target.value)}
                        >
                          {produtosDisponiveis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                      </div>
                      <div className="w-20 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Qtd</label>
                        <input 
                          type="number" 
                          value={item.quantidade}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold"
                          onChange={(e) => atualizarItem(index, 'quantidade', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="w-32 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase text-xs">Preço (R$)</label>
                        <input 
                          type="number" 
                          value={item.preco_negociado}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold"
                          onChange={(e) => atualizarItem(index, 'preco_negociado', parseFloat(e.target.value))}
                        />
                      </div>
                      <button 
                        onClick={() => setItens(itens.filter((_, i) => i !== index))}
                        className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={20}/>
                      </button>
                   </div>
                   <input 
                      type="text"
                      placeholder="Descrição técnica do item..."
                      value={item.descricao}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none"
                      onChange={(e) => atualizarItem(index, 'descricao', e.target.value)}
                   />
                </div>
             ))}
             <button 
                onClick={() => setItens([...itens, { produto: '', descricao: '', quantidade: 1, preco_negociado: 0 }])}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18}/> Adicionar Novo Item
              </button>
          </div>
        </div>

        {/* Footer com Total Geral Atualizado */}
        <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-white">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Atualizado</span>
            <span className="text-3xl font-black text-slate-800 leading-none">{formatarReal(totalGeral)}</span>
          </div>
          <button 
            onClick={salvarEdicao}
            disabled={loading}
            className={`${theme.colors.primaryButton} text-white px-10 py-4 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl disabled:opacity-50`}
          >
            {loading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Salvar Alterações</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEditarOrcamento;