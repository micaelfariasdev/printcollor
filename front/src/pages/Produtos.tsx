import React, { useEffect, useState } from 'react';
import { Search, Plus, Package, Edit3, Trash2 } from 'lucide-react';
import { theme } from '../components/Theme';
import { api } from '../auth/useAuth';
import { formatarReal } from '../tools/formatReal';
import ModalNovoProduto from '../components/ModalNovoProduto';
import ModalDelete from '../components/ModalDelete';

const Produtos: React.FC = () => {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [deleteConfig, setDeleteConfig] = useState<{
    id: number | null;
    name: string;
  }>({ id: null, name: '' });
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const confirmarDelete = (id: number, nome: string) => {
    setDeleteConfig({ id, name: nome });
    setIsDeleteOpen(true);
  };

  const carregarProdutos = () => {
    api
      .get('produtos/')
      .then((res) => setProdutos(res.data))
      .catch((err) => console.error('Erro ao carregar produtos', err));
  };

  useEffect(() => {
    carregarProdutos();
  }, []);

  const filtrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar produto..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
            onChange={(e) => setBusca(e.target.value)}
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
              {filtrados.map((prod) => (
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
                      <button className="p-2 text-slate-400 hover:text-blue-600 transition">
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
            </tbody>
          </table>
        </div>
      </div>
      <ModalDelete
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={carregarProdutos} // Sua função de refresh da lista
        endpoint="produtos" // Nome da sua rota no Django
        itemId={deleteConfig.id}
        itemName={deleteConfig.name}
      />
      <ModalNovoProduto
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={carregarProdutos}
      />
    </div>
  );
};

export default Produtos;
