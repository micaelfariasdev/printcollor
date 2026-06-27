import { Search, Plus, Edit3, Trash2, Package, Layers, Calendar, Eye } from 'lucide-react';
import { theme } from '../components/Theme';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { useAlert } from '../contexts/AlertContext';
import { formatarDataHora } from '../tools/dataHora';
import ModalDelete from '../components/ModalDelete';
import ModalNovoPedidoFabrica from '../components/ModalNovoPedidoFabrica';
import ModalEditarPedidoFabrica from '../components/ModalEditarPedidoFabrica';
import { FilterToggle } from '../components/FilterToggle';
import { api } from '../auth/useAuth';
import { useState } from 'react';

export const PedidosFabrica = () => {
 const { items, loading, hasMore, loadMore, totalCount, setSearch, refresh } = usePaginatedList({
 endpoint: 'pedidos/',
 });
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isEditOpen, setIsEditOpen] = useState(false);
 const [isDeleteOpen, setIsDeleteOpen] = useState(false);
 const [filtroPendente, setFiltroPendente] = useState(true);
 const [filtroProducao, setFiltroProducao] = useState(true);
 const [filtroFinalizado, setFiltroFinalizado] = useState(true);
 const { addAlert } = useAlert();

 const [selectedItem, setSelectedItem] = useState<{
 id: number | null;
 nome_descricao: string;
 }>({ id: null, nome_descricao: '' });

 const handleEdit = (id: number) => {
 setSelectedItem({ ...selectedItem, id });
 setIsEditOpen(true);
 };

 const handleTrocarStatusRapido = async (id: number, statusAtual: string) => {
 const proximosStatus: { [key: string]: string } = {
 pendente: 'em_producao',
 em_producao: 'finalizado',
 finalizado: 'pendente',
 };
 const novoStatus = proximosStatus[statusAtual] || 'pendente';
 try {
 await api.patch(`pedidos/${id}/`, { status: novoStatus });
 addAlert(`Pedido #${id} movido para ${novoStatus.replace('_', ' ')}`, 'info');
 refresh();
 } catch (error) {
 console.error('Erro ao trocar status:', error);
 addAlert('Não foi possível atualizar o status agora.', 'error');
 }
 };

 const handleDelete = (id: number, nome_descricao: string) => {
 setSelectedItem({ id, nome_descricao });
 setIsDeleteOpen(true);
 };

 const filtrados = items
 .filter((p) => {
 const bateBusca = true; // busca já é server-side via setSearch
 const bateStatus =
 (p.status === 'pendente' && filtroPendente) ||
 (p.status === 'em_producao' && filtroProducao) ||
 (p.status === 'finalizado' && filtroFinalizado);
 return bateBusca && bateStatus;
 })
 .sort((a: any, b: any) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime());

 return (
 <div className="space-y-6 p-4 md:p-0">
 {/* Cabeçalho e Busca */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="relative flex-1 max-w-md">
 <Search className="absolute left-3 top-3 text-slate-400" size={20} />
 <input
 type="text"
 placeholder="Buscar por cliente ou descrição..."
 className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 <div className="flex flex-wrap items-center gap-2 mt-4">
 <FilterToggle label="Pendentes" active={filtroPendente} onClick={() => setFiltroPendente(!filtroPendente)} />
 <FilterToggle label="Em Produção" active={filtroProducao} onClick={() => setFiltroProducao(!filtroProducao)} />
 <FilterToggle label="Finalizados" active={filtroFinalizado} onClick={() => setFiltroFinalizado(!filtroFinalizado)} />

 <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block" />

 <span className="text-[10px] font-black text-slate-400 uppercase italic">
 {filtrados.length} Pedidos encontrados
 </span>
 </div>
 <button
 className={`${theme.colors.primaryButton} text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md transition-all active:scale-95`}
 onClick={() => setIsModalOpen(true)}
 >
 <Plus size={20} />
 Novo Pedido Fábrica
 </button>
 </div>

 {/* Grid de Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
 {(filtrados as any[]).map((item) => (
 <div
 key={item.id}
 className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col"
 >
 {/* Imagem do Layout */}
 <div className="h-44 bg-slate-100 relative group">
 {item.layout ? (
 <img
 src={item.layout}
 className="w-full h-full object-contain"
 alt="Layout do Pedido"
 />
 ) : (
 <div className="flex flex-col items-center justify-center h-full text-slate-400">
 <Layers size={32} />
 <span className="text-[10px] font-bold uppercase mt-2">Sem imagem</span>
 </div>
 )}
 <button
 onClick={() => handleTrocarStatusRapido(item.id, item.status)}
 title="Clique para mudar o status"
 className="absolute top-3 right-3 z-10"
 >
 <span
 className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-md transition-all active:scale-90 hover:brightness-110 cursor-pointer ${
 item.status === 'finalizado'
 ? 'bg-green-500 text-white'
 : item.status === 'em_producao'
 ? 'bg-blue-500 text-white'
 : 'bg-amber-500 text-white'
 }`}
 >
 {item.status.replace('_', ' ')}
 </span>
 </button>
 </div>

 {/* Conteúdo do Card */}
 <div className="p-5 flex-1 text-left">
 <div className="mb-4 flex justify-between">
 <div>
 <h4 className="font-bold text-slate-900 text-lg leading-tight">
 {item.cliente_nome}
 </h4>
 <p className="text-sm text-blue-600 font-semibold mt-1">
 {item.nome_descricao}
 </p>
 </div>
 <div className="text-right">
 <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-tighter">
 Qtd Total
 </h4>
 <p className="text-sm text-slate-900 font-black">
 {String(item.total_pecas).padStart(2, '0')} Unid.
 </p>
 </div>
 </div>

 <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
 <span className="text-[10px] uppercase font-black text-slate-400 block mb-2 tracking-wider">
 Grade / Quantidades
 </span>
 <div className="flex flex-wrap gap-2">
 {Object.entries(item.detalhes_tamanho).map(([key, val]: any) => (
 <div
 key={key}
 className="bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm"
 >
 <span className="text-[10px] font-bold text-slate-500 uppercase">{key}: </span>
 <span className="text-xs ml-1 text-blue-600 font-black">
 {String(val).padStart(2, '0')}
 </span>
 </div>
 ))}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500 uppercase">
 <div className="flex items-center gap-1.5">
 <Package size={14} className="text-slate-400" />
 {item.material}
 </div>
 <div className="flex items-center gap-1.5 justify-end">
 <Calendar size={14} className="text-slate-400" />
 {new Date(item.data_entrega).toLocaleDateString('pt-BR')}
 </div>
 </div>
 </div>

 {/* Ações */}
 <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
 <p className="text-[10px] text-slate-400 font-medium italic">
 CRIADO EM {formatarDataHora(item.data_criacao)}
 </p>
 <div className="flex gap-1">
 <button
 onClick={() => window.open(`/pedido/${item.id}/visualizar`, '_blank')}
 className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
 title="Visualizar para Impressão"
 >
 <Eye size={18} />
 </button>
 <button onClick={() => handleEdit(item.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200">
 <Edit3 size={16} />
 </button>
 <button
 onClick={() => handleDelete(item.id, item.nome_descricao)}
 className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200"
 >
 <Trash2 size={16} />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Carregar mais */}
 {hasMore && (
 <div className="flex justify-center">
 <button
 onClick={loadMore}
 disabled={loading}
 className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-all"
 >
 {loading ? 'Carregando...' : `Carregar mais (${items.length} de ${totalCount})`}
 </button>
 </div>
 )}

 {/* Modais */}
 <ModalEditarPedidoFabrica
 isOpen={isEditOpen}
 onClose={() => setIsEditOpen(false)}
 onSuccess={refresh}
 pedidoId={selectedItem.id}
 />
 <ModalNovoPedidoFabrica
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 onSuccess={refresh}
 />
 <ModalDelete
 isOpen={isDeleteOpen}
 onClose={() => setIsDeleteOpen(false)}
 onSuccess={refresh}
 endpoint="pedidos"
 itemId={selectedItem.id}
 itemName={selectedItem.nome_descricao}
 />
 </div>
 );
};
