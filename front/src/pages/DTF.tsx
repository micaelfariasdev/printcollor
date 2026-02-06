import {
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Edit3,
  Trash2,
} from 'lucide-react';
import { theme } from '../components/Theme';
import React, { useState } from 'react';
import { api } from '../auth/useAuth';
import { formatarDataHora } from '../tools/dataHora';
import { formatarReal } from '../tools/formatReal';
import { FilterToggle } from '../components/FilterToggle';
import ModalNovoDTF from '../components/ModalNovoDTF';
import ModalEditarDTF from '../components/ModalEditarDTF';
import ModalDelete from '../components/ModalDelete';

const handleDownloadPDF = async (id: number) => {
  try {
    const response = await api.get(`dtf/${id}/gerar_pdf/`, {
      responseType: 'blob',
    });

    // Criamos o blob
    const blob = new Blob([response.data], { type: 'application/pdf' });
    
    // Criamos a URL
    const url = window.URL.createObjectURL(blob);

    // DICA: Para o nome aparecer melhor na aba em alguns navegadores,
    // você pode tentar anexar um "slug" ao final da URL do blob (truque técnico)
    // Mas o padrão mais limpo para visualização é apenas:
    window.open(url, '_blank');

    // Não revogue o objeto imediatamente, ou o PDF some da aba nova!
    // setTimeout(() => window.URL.revokeObjectURL(url), 5000); 
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
  }
};

export const DTFTable = () => {
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('recente');
  const [filtroPago, setFiltroPago] = useState(false);
  const [filtroImpresso, setFiltroImpresso] = useState(false);
  const [filtroEntregue, setFiltroEntregue] = useState(false);
  const [mockData, setData] = React.useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 2. Novos estados para Edição e Delete
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: number | null;
    nome: string;
  }>({ id: null, nome: '' });

  // Funções de gatilho
  const handleEdit = (id: number) => {
    setSelectedItem({ ...selectedItem, id });
    setIsEditOpen(true);
  };

  const handleDelete = (id: number, nome: string) => {
    setSelectedItem({ id, nome });
    setIsDeleteOpen(true);
  };

  const carregarDados = () => {
    api.get('dtf/').then((response) => {
      setData(response.data);
    });
  };

  React.useEffect(() => {
    api.get('dtf/').then((response) => {
      setData(response.data);
    });
    console.log(mockData);
  }, []);

  const filtrados = mockData
    .filter((o) => {
      const bateBusca = o.nome_cliente
        .toLowerCase()
        .includes(busca.toLowerCase());

      const batePago = !filtroPago || o.esta_pago === true;
      const bateImpresso = !filtroImpresso || o.foi_impresso === 'impresso';
      const bateEntregue = !filtroEntregue || o.foi_entregue === true;

      return bateBusca && batePago && bateImpresso && bateEntregue;
    })
    .sort((a, b) => {
      if (ordem === 'recente') {
        return (
          new Date(b.data_criacao).getTime() -
          new Date(a.data_criacao).getTime()
        );
      }
      if (ordem === 'valor_maior') {
        return b.valor_total - a.valor_total;
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <button
            className={`${theme.colors.primaryButton} text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md transition-all active:scale-95`}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={20} />
            Novo Pedido
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterToggle
            label="Pagos"
            active={filtroPago}
            onClick={() => setFiltroPago(!filtroPago)}
          />
          <FilterToggle
            label="Impressos"
            active={filtroImpresso}
            onClick={() => setFiltroImpresso(!filtroImpresso)}
          />
          <FilterToggle
            label="Entregues"
            active={filtroEntregue}
            onClick={() => setFiltroEntregue(!filtroEntregue)}
          />

          <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block" />

          <select
            className="bg-white border border-slate-200 text-slate-500 text-xs font-bold uppercase rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
            onChange={(e) => setOrdem(e.target.value)}
          >
            <option value="recente">Mais Recentes</option>
            <option value="valor_maior">Maior Valor</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtrados.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-2xl shadow-sm border ${theme.colors.borderDefault} p-5 hover:shadow-md transition-shadow flex flex-col justify-between`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-lg">
                  {item.nome_cliente}
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  Pedido #{item.id} • {formatarDataHora(item.data_criacao)}
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-[10px] uppercase font-black flex ${
                  item.foi_impresso === 'impresso'
                    ? theme.colors.statusImpresso
                    : theme.colors.statusPendente
                }`}
              >
                <Printer size={16} className="mr-2 text-slate-400" />

                {item.foi_impresso}
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center text-slate-600 bg-slate-50 p-2 rounded-lg">
                <span className="text-xs font-bold mr-2 text-slate-400">
                  Tamanho:
                </span>
                <span className="text-sm font-semibold">
                  {item.tamanho_cm} cm
                </span>
              </div>
              <div className="flex items-center text-slate-600 bg-slate-50 p-2 rounded-lg">
                <span className="text-xs font-bold mr-2 text-slate-400">
                  Valor:
                </span>
                <span className="text-sm font-semibold">
                  {formatarReal(item.valor_total)}
                </span>
                <div className="flex items-center space-x-2 pl-3">
                  {item.esta_pago ? (
                    <div className="flex items-center text-blue-600 text-xs font-bold">
                      <CheckCircle2 size={16} className="mr-1" /> PAGO
                    </div>
                  ) : (
                    <div className="flex items-center text-slate-400 text-xs font-bold">
                      <Clock size={16} className="mr-1" /> PENDENTE
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-2">
                {item.foi_entregue ? (
                  <div className="flex items-center text-blue-600 text-xs font-bold">
                    <CheckCircle2 size={16} className="mr-1" /> ENTREGUE
                  </div>
                ) : (
                  <div className="flex items-center text-slate-400 text-xs font-bold">
                    <Clock size={16} className="mr-1" /> PENDENTE
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(item.id)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.nome_cliente)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                >
                  <Trash2 size={16} />
                </button>
                <div className="flex gap-3">
                  {item.comprovante_pagamento && (
                    <a
                      href={item.comprovante_pagamento}
                      target="_blank"
                      className="text-green-600 text-sm font-bold flex items-center"
                    >
                      <CheckCircle2 size={16} className="mr-1" /> PIX
                    </a>
                  )}
                  <a
                    onClick={() => handleDownloadPDF(item.id)}
                    // target="_blank"
                    className="text-blue-600 text-sm font-bold flex items-center"
                  >
                    <FileText size={16} className="mr-1" /> PDF
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ModalNovoDTF
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={carregarDados}
      />

      <ModalEditarDTF
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={carregarDados}
        dtfId={selectedItem.id}
      />

      <ModalDelete
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={carregarDados}
        endpoint="dtf" // Nome da sua rota no Django
        itemId={selectedItem.id}
        itemName={selectedItem.nome}
      />
    </div>
  );
};
