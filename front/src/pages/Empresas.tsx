import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  MapPin,
  Trash2,
  Edit3,
} from 'lucide-react';
import { theme } from '../components/Theme';
import { api } from '../auth/useAuth';
import ModalNovaEmpresa from '../components/ModalNovaEmpresa';
import ModalDelete from '../components/ModalDelete';
import ModalEditarEmpresa from '../components/ModalEditarEmpresa';

const Empresas: React.FC = () => {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
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

  const carregarEmpresas = () => {
    api
      .get('empresas/')
      .then((res) => setEmpresas(res.data))
      .catch((err) => console.error('Erro ao carregar empresas', err));

    console.log(empresas);
  };

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const filtradas = empresas.filter(
    (e) =>
      e.nome.toLowerCase().includes(busca.toLowerCase()) ||
      e.cnpj.includes(busca)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou CNPJ..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className={`${theme.colors.primaryButton} text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md transition-all active:scale-95`}
        >
          <Plus size={20} /> Nova Empresa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtradas.map((emp) => (
          <div
            key={emp.id}
            className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-slate-900 text-white rounded-2xl">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg uppercase italic leading-tight">
                    {emp.nome}
                  </h3>
                  <p className="text-xs font-bold text-slate-400">{emp.cnpj}</p>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(emp.id)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg">
                  <Edit3 size={18} />
                </button>
                <button
                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg"
                  onClick={() => confirmarDelete(emp.id, emp.nome)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl">
                <Mail size={16} className="text-slate-400" />
                <span className="font-medium">{emp.email || 'Sem e-mail'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl">
                <Phone size={16} className="text-slate-400" />
                <span className="font-medium">
                  {emp.telefone || 'Sem telefone'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl">
                <MapPin size={16} className="text-slate-400" />
                <span className="font-medium truncate">
                  {emp.endereco || 'Sem endereço'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ModalDelete
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={carregarEmpresas} // Sua função de refresh da lista
        endpoint="empresas" // Nome da sua rota no Django
        itemId={deleteConfig.id}
        itemName={deleteConfig.name}
      />
      <ModalNovaEmpresa
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={carregarEmpresas}
      />
      <ModalEditarEmpresa 
  isOpen={isEditOpen} 
  onClose={() => setIsEditOpen(false)} 
  onSuccess={carregarEmpresas} 
  empresaId={selectedId} 
/>
    </div>
  );
};

export default Empresas;
