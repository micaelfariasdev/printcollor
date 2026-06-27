import React, { useEffect, useState } from 'react';
import { Search, Plus, UserCog, ShieldCheck, Trash2, Mail } from 'lucide-react';
import { theme } from '../components/Theme';
import { usePaginatedList } from '../hooks/usePaginatedList';
import ModalDelete from '../components/ModalDelete';
import ModalEditarUsuario from '../components/ModalEditarUsuario';
import ModalNovoUsuario from '../components/ModalNovoUsuario';
import { api } from '../auth/useAuth';

const Usuarios: React.FC = () => {
 const { items, hasMore, setSearch, refresh } = usePaginatedList({
 endpoint: 'usuarios/',
 });
 const [modalNovo, setModalNovo] = useState(false);
 const [modalEdit, setModalEdit] = useState(false);
 const [modalDelete, setModalDelete] = useState(false);
 const [selected, setSelected] = useState({ id: null, nome: '' });
 const [meData, setMeData] = useState<any>(null);

 useEffect(() => {
 api.get('/me/').then((response) => {
 setMeData(response.data);
 });
 }, []);

 const usuariosSemMe = items.filter((u: any) => u.id !== meData?.id);

 return (
 <div className="space-y-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="relative flex-1 max-w-md">
 <Search className="absolute left-3 top-3 text-slate-400" size={20} />
 <input
 type="text"
 placeholder="Buscar usuária..."
 className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 <button
 onClick={() => setModalNovo(true)}
 className={`${theme.colors.primaryButton} text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md`}
 >
 <Plus size={20} /> Nova Usuária
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {usuariosSemMe.map((u) => (
 <div
 key={u.id}
 className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative"
 >
 <div className="flex items-center gap-4 mb-4">
 <div
 className={`p-3 rounded-2xl ${u.is_staff ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}
 >
 {u.is_staff ? <ShieldCheck size={24} /> : <UserCog size={24} />}
 </div>
 <div>
 <h3 className="font-black text-slate-800 uppercase italic leading-none">
 {u.username}
 </h3>
 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
 {u.nivel_acesso}
 </span>
 </div>
 </div>

 <div className="space-y-2 mb-4">
 <div className="flex items-center gap-2 text-sm text-slate-500">
 <Mail size={14} /> {u.email}
 </div>
 </div>

 <div className="flex gap-2 pt-4 border-t border-slate-50">
 <button
 onClick={() => {
 setSelected({ id: u.id, nome: u.username });
 setModalEdit(true);
 }}
 className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
 >
 Editar Cargo
 </button>
 <button
 onClick={() => {
 setSelected({ id: u.id, nome: u.username });
 setModalDelete(true);
 }}
 className="p-2 text-red-400 hover:text-red-600 transition-colors"
 >
 <Trash2 size={18} />
 </button>
 </div>
 </div>
 ))}
 </div>

 {/* Carregar mais */}
 {hasMore && (
 <div className="flex justify-center">
 <button
 onClick={() => {}}
 disabled
 className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100"
 >
 Carregar mais
 </button>
 </div>
 )}

 <ModalNovoUsuario
 isOpen={modalNovo}
 onClose={() => setModalNovo(false)}
 onSuccess={refresh}
 />
 <ModalEditarUsuario
 isOpen={modalEdit}
 onClose={() => setModalEdit(false)}
 onSuccess={refresh}
 userId={selected.id}
 />
 <ModalDelete
 isOpen={modalDelete}
 onClose={() => setModalDelete(false)}
 onSuccess={refresh}
 endpoint="usuarios"
 itemId={selected.id}
 itemName={selected.nome}
 />
 </div>
 );
};

export default Usuarios;
