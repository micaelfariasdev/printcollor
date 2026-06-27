import { useState } from 'react';
import { Search, Download, Plus, Edit } from 'lucide-react';
import { theme } from '../components/Theme';
import { formatarReal } from '../tools/formatReal';
import { formatarDataHora } from '../tools/dataHora';
import { usePaginatedList } from '../hooks/usePaginatedList';
import ModalNovoOrcamento from '../components/ModalNovoOrcamento';
import ModalEditarOrcamento from '../components/ModalEditarOrcamento';

export interface ItemOrcamento {
 id: number;
 produto: number;
 descricao: string;
 produto_nome: string;
 quantidade: number;
 preco_negociado: string;
 subtotal: number;
}

export interface Orcamento {
 id: number;
 empresa: number;
 nome_empresa: string;
 cliente: number;
 nome_cliente: string;
 data_criacao: string;
 itens: ItemOrcamento[];
 valor_total: number;
}

const Orcamentos: React.FC = () => {
  const { items, loading, hasMore, setSearch, refresh } = usePaginatedList<Orcamento>({
 endpoint: 'orcamentos/',
 });
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [selectedOrcamentoId, setSelectedOrcamentoId] = useState<number | null>(null);

 const handleEditar = (id: number) => {
 setSelectedOrcamentoId(id);
 setIsEditModalOpen(true);
 };

 return (
 <div className="space-y-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="relative flex-1 max-w-md">
 <Search className="absolute left-3 top-3 text-slate-400" size={20} />
 <input
 type="text"
 placeholder="Buscar por cliente..."
 className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>

 <button
 className={`${theme.colors.primaryButton} text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md transition-all active:scale-95`}
 onClick={() => setIsModalOpen(true)}
 >
 <Plus size={20} /> Novo Orçamento
 </button>
 </div>

 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead className="bg-slate-50 border-b border-slate-200">
 <tr>
 <th className="p-4 font-black text-slate-600 uppercase text-xs">ID</th>
 <th className="p-4 font-black text-slate-600 uppercase text-xs">Cliente</th>
 <th className="p-4 font-black text-slate-600 uppercase text-xs">Data</th>
 <th className="p-4 font-black text-slate-600 uppercase text-xs">Total</th>
 <th className="p-4 font-black text-slate-600 uppercase text-xs text-center">Ações</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {items.map((orc) => (
 <tr
 key={orc.id}
 className="hover:bg-slate-50 transition-colors"
 >
 <td className="p-4 font-bold text-slate-400">#{orc.id}</td>
 <td className="p-4">
 <div className="font-bold text-slate-800">
 {orc.nome_cliente}
 </div>
 <div className="text-xs text-slate-400">
 {orc.nome_empresa}
 </div>
 </td>
 <td className="p-4 text-slate-600 text-sm">
 {formatarDataHora(orc.data_criacao)}
 </td>
 <td className="p-4">
 <span className="font-black text-slate-800">
 {formatarReal(orc.valor_total)}
 </span>
 </td>
 <td className="p-4">
 <div className="flex items-center justify-center gap-2">
 <button
 title="Visualizar Detalhes"
 className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
 onClick={() => handleEditar(orc.id)}
 >
 <Edit size={18} />
 </button>
 {(orc as any).pdf_url && (
 <a
 href={(orc as any).pdf_url}
 target="_blank"
 rel="noopener noreferrer"
 className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
 >
 <Download size={18} />
 </a>
 )}
 </div>
 </td>
 </tr>
 ))}

 {items.length === 0 && !loading && (
 <tr>
 <td colSpan={5} className="p-12 text-center text-slate-400 font-medium italic">
 Nenhum orçamento encontrado.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Carregar mais */}
 {hasMore && (
 <div className="p-4 flex justify-center border-t border-slate-100">
 <button
 onClick={() => {}}
 disabled
 className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100"
 >
 Carregar mais
 </button>
 </div>
 )}
 </div>

 <ModalNovoOrcamento
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 onSuccess={refresh}
 />
 <ModalEditarOrcamento
 isOpen={isEditModalOpen}
 onClose={() => setIsEditModalOpen(false)}
 onSuccess={refresh}
 orcamentoId={selectedOrcamentoId}
 />
 </div>
 );
};

export default Orcamentos;
