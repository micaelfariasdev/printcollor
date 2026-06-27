import React, { useState } from 'react';
import { Search, Eye, Plus } from 'lucide-react';
import { theme } from '../components/Theme';
import { usePaginatedList } from '../hooks/usePaginatedList';
import ModalNovoCliente from '../components/ModalNovoCliente';
import ModalEditarCliente from '../components/ModalEditarCliente';

export interface Client {
 cnpj: string | null;
 cpf: string;
 email: string;
 id: number;
 nome: string;
 telefone: string;
 numero: string | null;
 jid: string | null;
}

const Clients: React.FC = () => {
 const { items, loading, hasMore, loadMore, setSearch, refresh } = usePaginatedList<Client>({
 endpoint: 'clientes/',
 });
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isEditOpen, setIsEditOpen] = useState(false);
 const [selectedId, setSelectedId] = useState<number | null>(null);

 const handleEdit = (id: number) => {
 setSelectedId(id);
 setIsEditOpen(true);
 };

 return (
 <div className="space-y-6">
 {/* Cabeçalho da Página */}
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
 <Plus size={20} />
 Novo Cliente
 </button>
 </div>

 {/* Tabela de Orçamentos */}
 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead className="bg-slate-50 border-b border-slate-200">
 <tr>
 <th className="p-4 font-black text-slate-600 uppercase text-xs">
 ID
 </th>
 <th className="p-4 font-black text-slate-600 uppercase text-xs">
 Nome
 </th>
 <th className="p-4 font-black text-slate-600 uppercase text-xs">
 E-mail
 </th>
 <th className="p-4 font-black text-slate-600 uppercase text-xs">
 Número (WhatsApp)
 </th>
 <th className="p-4 font-black text-slate-600 uppercase text-xs">
 JID
 </th>
 <th className="p-4 font-black text-slate-600 uppercase text-xs text-center">
 Ações
 </th>
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
 <div className="font-bold text-slate-800">{orc.nome}</div>
 <div className="text-xs text-slate-400">
 {orc.cpf || orc.cnpj}
 </div>
 </td>
 <td className="p-4 text-slate-600 text-sm">{orc.email}</td>
 <td className="p-4 text-slate-600 text-sm">
 {orc.numero || orc.telefone || '-'}
 </td>
 <td className="p-4 text-slate-600 text-xs font-mono">
 {orc.jid || '-'}
 </td>
 <td className="p-4">
 <div className="flex items-center justify-center gap-2">
 <button
 title="Visualizar Detalhes"
 className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
 onClick={() => handleEdit(orc.id)}
 >
 <Eye size={18} />
 </button>
 </div>
 </td>
 </tr>
 ))}

 {items.length === 0 && !loading && (
 <tr>
 <td colSpan={6} className="p-12 text-center text-slate-400 font-medium italic">
 Nenhum cliente encontrado.
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
 {loading ? 'Carregando...' : 'Carregar mais'}
 </button>
 </div>
 )}
 </div>

 <ModalNovoCliente
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 onSuccess={refresh}
 />
 <ModalEditarCliente
 isOpen={isEditOpen}
 onClose={() => setIsEditOpen(false)}
 onSuccess={refresh}
 clienteId={selectedId}
 />
 </div>
 );
};

export default Clients;
