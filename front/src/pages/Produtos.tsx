import React, { useState } from 'react';
import { Search, Plus, Package, Edit3, Trash2 } from 'lucide-react';
import { theme } from '../components/Theme';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { formatarReal } from '../tools/formatReal';
import ModalNovoProduto from '../components/ModalNovoProduto';
import ModalDelete from '../components/ModalDelete';
import ModalEditarProduto from '../components/ModalEditarProduto';

const Produtos: React.FC = () => {
 const { items, loading, hasMore, loadMore, totalCount, setSearch, refresh } = usePaginatedList({
 endpoint: 'produtos/',
 });
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isEditOpen, setIsEditOpen] = useState(false);
 const [selectedId, setSelectedId] = useState<number | null>(null);

 const handleEdit = (id: number) => {
 setSelectedId(id);
 setIsEditOpen(true);
 };

 const [deleteConfig, setDeleteConfig] = useState<{
 id: number | null;
 name: string;
 }>({ id: null, name: '' });
 const [isDeleteOpen, setIsDeleteOpen] = useState(false);

 const confirmarDelete = (id: number, nome: string) => {
 setDeleteConfig({ id, name: nome });
 setIsDeleteOpen(true);
 };

 return (
 <div className="space-y-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="relative flex-1 max-w-md">
 <Search className="absolute left-3 top-3 text-slate-400" size={20} />
 <input
 type="text"
 placeholder="Buscar produto..."
 className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>

 <button
 onClick={() => setIsModalOpen(true)}
 className={`${theme.colors.primaryButton} text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md transition-all active:scale-95`}
 >
 <Plus size={20} /> Novo Produto
 </button>
 </div>

 <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead className="bg-slate-50 border-b border-slate-200">
 <tr>
 <th className="p-5 font-black text-slate-600 uppercase text-xs">
 Produto
 </th>
 <th className="p-5 font-black text-slate-600 uppercase text-xs">
 Preço Base
 </th>
 <th className="p-5 font-black text-slate-600 uppercase text-xs text-center">
 Ações
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {items.map((prod) => (
 <tr
 key={prod.id}
 className="hover:bg-slate-50 transition-colors"
 >
 <td className="p-5">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
 <Package size={18} />
 </div>
 <span className="font-bold text-slate-800">
 {prod.nome}
 </span>
 </div>
 </td>
 <td className="p-5 font-black text-slate-700">
 {formatarReal(prod.preco_base)}
 </td>
 <td className="p-5">
 <div className="flex items-center justify-center gap-2">
 <button
 onClick={() => handleEdit(prod.id)}
 className="p-2 text-slate-400 hover:text-blue-600 transition"
 >
 <Edit3 size={18} />
 </button>
 <button
 className="p-2 text-slate-400 hover:text-red-500 transition"
 onClick={() => confirmarDelete(prod.id, prod.nome)}
 >
 <Trash2 size={18} />
 </button>
 </div>
 </td>
 </tr>
 ))}

 {items.length === 0 && !loading && (
 <tr>
 <td colSpan={3} className="p-12 text-center text-slate-400 font-medium italic">
 Nenhum produto encontrado.
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
 onClick={loadMore}
 disabled={loading}
 className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-all"
 >
 {loading ? 'Carregando...' : `Carregar mais (${items.length} de ${totalCount})`}
 </button>
 </div>
 )}
 </div>

 <ModalDelete
 isOpen={isDeleteOpen}
 onClose={() => setIsDeleteOpen(false)}
 onSuccess={refresh}
 endpoint="produtos"
 itemId={deleteConfig.id}
 itemName={deleteConfig.name}
 />
 <ModalNovoProduto
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 onSuccess={refresh}
 />
 <ModalEditarProduto
 isOpen={isEditOpen}
 onClose={() => setIsEditOpen(false)}
 onSuccess={refresh}
 produtoId={selectedId}
 />
 </div>
 );
};

export default Produtos;
