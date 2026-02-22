import React, { use, useEffect, useState } from 'react';
import { Search, Download, Eye, Plus, Edit } from 'lucide-react';
import { theme } from '../components/Theme';
import { formatarReal } from '../tools/formatReal';
import { api } from '../auth/useAuth';
import { formatarDataHora } from '../tools/dataHora';
import ModalNovoOrcamento from '../components/ModalNovoOrcamento';
import ModalEditarOrcamento from '../components/ModalEditarOrcamento';

export interface ItemOrcamento {
  id: number;
  produto: number;
  descricao: string;
  produto_nome: string;
  quantidade: number;
  preco_negociado: string; // Vem como string do DecimalField do Django
  subtotal: number;
}

export interface Orcamento {
  id: number;
  empresa: number;
  nome_empresa: string;
  cliente: number;
  nome_cliente: string;
  data_criacao: string; // Formato ISO 8601
  itens: ItemOrcamento[];
  valor_total: number;
}

const handleDownloadPDF = async (id: number, emp: string, cliente: string) => {
  try {
    const response = await api.get(`orcamentos/${id}/gerar_pdf/`, {
      responseType: 'blob', // ESSENCIAL para receber arquivos
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    // Aqui você define o nome que o arquivo terá ao ser baixado
    link.setAttribute('download', `${emp}-${cliente}-${id}.pdf`);

    document.body.appendChild(link);
    link.click();

    // Limpeza
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao baixar PDF:', error);
  }
};

const Orcamentos: React.FC = () => {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [busca, setBusca] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState<number | null>(
    null
  );

  const handleEditar = (id: number) => {
    setSelectedOrcamentoId(id);
    setIsEditModalOpen(true);
  };

  const carregarOrcamentos = () => {
    api.get('orcamentos/').then((res) => setOrcamentos(res.data));
  };

  useEffect(() => {
    carregarOrcamentos();
  }, [isEditModalOpen, isModalOpen]);

  const filtrados = orcamentos.filter((o) =>
    o.nome_cliente.toLowerCase().includes(busca.toLowerCase())
  );

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
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <button
          className={`${theme.colors.primaryButton} text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md transition-all active:scale-95`}
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={20} />
          Novo Orçamento
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
                  Cliente
                </th>
                <th className="p-4 font-black text-slate-600 uppercase text-xs">
                  Data
                </th>
                <th className="p-4 font-black text-slate-600 uppercase text-xs">
                  Total
                </th>
                <th className="p-4 font-black text-slate-600 uppercase text-xs text-center">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((orc) => (
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

                      <button
                        onClick={() => handleDownloadPDF(orc.id, orc.nome_empresa, orc.nome_cliente)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Visualizar PDF Seguro"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtrados.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-12 text-center text-slate-400 font-medium italic"
                  >
                    Nenhum orçamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ModalNovoOrcamento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => carregarOrcamentos} //
      />
      <ModalEditarOrcamento
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={carregarOrcamentos} // Chame sua função de fetch aqui para atualizar a lista
        orcamentoId={selectedOrcamentoId}
      />
    </div>
  );
};

export default Orcamentos;
