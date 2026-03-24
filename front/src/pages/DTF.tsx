import {
  Printer,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Edit3,
  Trash2,
  MessageCircle,
  Wallet,
  Eye,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { api } from '../auth/useAuth';
import { formatarDataHora } from '../tools/dataHora';
import { formatarReal } from '../tools/formatReal';
import ModalNovoDTF from '../components/ModalNovoDTF';
import ModalEditarDTF from '../components/ModalEditarDTF';
import ModalDelete from '../components/ModalDelete';
import { TriStateFilter } from '../components/TriStateFilter';
import { useAlert } from '../contexts/AlertContext'; // Importando o sistema de alertas

export const DTFTable = () => {
  const [busca, setBusca] = useState('');
  const [mockData, setData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { addAlert } = useAlert(); // Inicializando o alerta

  const [selectedItem, setSelectedItem] = useState<{
    id: number | null;
    nome: string;
  }>({
    id: null,
    nome: '',
  });

  const [filtroPago, setFiltroPago] = useState<'todos' | 'sim' | 'nao'>(
    'todos'
  );
  const [filtroImpresso, setFiltroImpresso] = useState<'todos' | 'sim' | 'nao'>(
    'todos'
  );
  const [filtroEntregue, setFiltroEntregue] = useState<'todos' | 'sim' | 'nao'>(
    'todos'
  );

  const carregarDados = () => {
    api.get('dtf/').then((response) => {
      setData(response.data);
    });
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleToggleBooleanStatus = async (
    id: number,
    campo: string,
    valorAtual: boolean
  ) => {
    try {
      await api.patch(`dtf/${id}/`, { [campo]: !valorAtual });
      const msg =
        campo === 'esta_pago'
          ? !valorAtual
            ? 'Pagamento confirmado!'
            : 'Status revertido para Pendente.'
          : !valorAtual
            ? 'Pedido entregue ao cliente!'
            : 'Retornado para expedição.';
      addAlert(msg, 'success');
      carregarDados();
    } catch (error) {
      addAlert('Erro ao sincronizar status com o servidor.', 'error');
    }
  };

  const handleToggleImpressao = async (id: number, statusAtual: string) => {
    const novoStatus = statusAtual === 'impresso' ? 'pendente' : 'impresso';
    try {
      await api.patch(`dtf/${id}/`, { foi_impresso: novoStatus });
      addAlert(`DTF #${id} marcado como ${novoStatus.toUpperCase()}`, 'info');
      carregarDados();
    } catch (error) {
      addAlert('Erro ao atualizar impressão.', 'error');
    }
  };

  const handleEdit = (id: number) => {
    setSelectedItem({ ...selectedItem, id });
    setIsEditOpen(true);
  };

  const handleDelete = (id: number, nome: string) => {
    setSelectedItem({ id, nome });
    setIsDeleteOpen(true);
  };

  const handleCopiarMensagem = (item: any) => {
    const saudacao = 'Olá! Seguem os detalhes do seu pedido:';
    const detalhes = `\n\n📌 *Pedido #* ${item.id}\n📏 *Tamanho:* ${item.tamanho_cm}cm\n💰 *Valor:* ${formatarReal(item.valor_total)}`;
    let statusMensagem = '';

    if (item.esta_pago && item.foi_impresso !== 'impresso') {
      statusMensagem = `\n\n⏳ *PEDIDO EM PRODUÇÃO*\nEstamos cuidando do seu pedido!`;
    } else if (item.foi_impresso === 'impresso' && !item.foi_entregue) {
      statusMensagem = `\n\n🚚 *PEDIDO IMPRESSO*\nPronto para retirada!`;
    } else if (item.foi_entregue) {
      statusMensagem = `\n\n✅ *PEDIDO ENTREGUE*\nAgradecemos a preferência!`;
    } else if (!item.esta_pago) {
      statusMensagem = `\n\n⚠️ *PAGAMENTO PENDENTE*\nPIX: 04.811.720/0001-98\nFavorecido: D. R. OS SANTOS NETO`;
    }

    navigator.clipboard.writeText(saudacao + detalhes + statusMensagem);
    addAlert('Mensagem de WhatsApp copiada!', 'success');
  };

  const filtrados = mockData
    .filter((o) => {
      const bateBusca = o.nome_cliente
        .toLowerCase()
        .includes(busca.toLowerCase());
      const batePago =
        filtroPago === 'todos'
          ? true
          : filtroPago === 'sim'
            ? o.esta_pago === true
            : o.esta_pago === false;
      const bateImpresso =
        filtroImpresso === 'todos'
          ? true
          : filtroImpresso === 'sim'
            ? o.foi_impresso === 'impresso'
            : o.foi_impresso !== 'impresso';
      const bateEntregue =
        filtroEntregue === 'todos'
          ? true
          : filtroEntregue === 'sim'
            ? o.foi_entregue === true
            : o.foi_entregue === false;

      return bateBusca && batePago && bateImpresso && bateEntregue;
    })
    .sort((a, b) => {
      return (
        new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
      );
    });

  const totalAReceber = mockData
    .filter((i) => !i.esta_pago)
    .reduce((acc, curr) => acc + curr.valor_total, 0);
  const totalFilaImpressao = mockData.filter(
    (i) => i.foi_impresso !== 'impresso'
  ).length;

  function toggleStatus(
    currentStatus: 'todos' | 'sim' | 'nao',
    setStatus: React.Dispatch<React.SetStateAction<'todos' | 'sim' | 'nao'>>
  ) {
    const nextStatus =
      currentStatus === 'todos'
        ? 'sim'
        : currentStatus === 'sim'
          ? 'nao'
          : 'todos';
    setStatus(nextStatus);
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-xl text-red-600 font-black italic">
            <Wallet size={24} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase">
              A Receber (Devedores)
            </p>
            <p className="text-lg font-black text-slate-800">
              {formatarReal(totalAReceber)}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
            <Printer size={24} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase">
              Fila de Produção
            </p>
            <p className="text-lg font-black text-slate-800">
              {totalFilaImpressao} DTFs
            </p>
          </div>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl shadow-md flex items-center gap-4 text-white">
          <div className="bg-white/10 p-3 rounded-xl text-blue-400">
            <Search size={24} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase opacity-60">
              Filtrados agora
            </p>
            <p className="text-lg font-black">{filtrados.length} Registros</p>
          </div>
        </div>
      </div>

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
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg transition-all active:scale-95"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={20} /> Novo DTF
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase mr-1">
            Filtros:
          </span>
          <TriStateFilter
            label="Pago"
            state={filtroPago}
            onClick={() => toggleStatus(filtroPago, setFiltroPago)}
          />
          <TriStateFilter
            label="Impresso"
            state={filtroImpresso}
            onClick={() => toggleStatus(filtroImpresso, setFiltroImpresso)}
          />
          <TriStateFilter
            label="Entregue"
            state={filtroEntregue}
            onClick={() => toggleStatus(filtroEntregue, setFiltroEntregue)}
          />
          <button
            onClick={() => {
              setFiltroPago('todos');
              setFiltroImpresso('todos');
              setFiltroEntregue('todos');
            }}
            className="ml-auto text-[10px] font-black text-blue-600 uppercase hover:bg-blue-50 px-3 py-1 rounded-lg transition"
          >
            Limpar tudo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtrados.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-xl transition-all flex flex-col justify-between border-b-4 border-b-slate-200 text-left"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="font-black text-slate-800 text-xl italic uppercase leading-none">
                  {item.nome_cliente}
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 italic">
                  OS #{item.id} • {formatarDataHora(item.data_criacao)}
                </p>
              </div>

              {/* INDICADOR VISUAL SUPERIOR (Apenas leitura) */}
              <div
                className={`p-2 rounded-xl transition-all ${
                  item.foi_entregue
                    ? 'bg-green-500 text-white shadow-lg scale-110'
                    : 'bg-slate-100 text-slate-300'
                }`}
              >
                <CheckCircle2 size={20} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-50 p-3 rounded-2xl border border-transparent">
                <p className="text-[9px] font-black text-slate-400 uppercase">
                  Tamanho
                </p>
                <p className="text-sm font-black text-slate-700">
                  {item.tamanho_cm} cm
                </p>
              </div>

              {/* CLIQUE RÁPIDO: PAGAMENTO (No card do Valor) */}
              <button
                onClick={() =>
                  handleToggleBooleanStatus(
                    item.id,
                    'esta_pago',
                    item.esta_pago
                  )
                }
                className="bg-slate-50 p-3 rounded-2xl text-left hover:bg-slate-100 transition-colors border border-transparent hover:border-blue-100 group"
              >
                <p className="text-[9px] font-black text-slate-400 uppercase group-hover:text-blue-500 transition-colors">
                  Valor Total
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-blue-600">
                    {formatarReal(item.valor_total)}
                  </p>
                  {item.esta_pago ? (
                    <CheckCircle2 size={14} className="text-green-500" />
                  ) : (
                    <Clock size={14} className="text-red-500 animate-pulse" />
                  )}
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex gap-2">
                {/* AÇÃO: IMPRESSÃO */}
                <button
                  onClick={() =>
                    handleToggleImpressao(item.id, item.foi_impresso)
                  }
                  className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
                    item.foi_impresso === 'impresso'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                  }`}
                >
                  {item.foi_impresso === 'impresso' ? '✓ IMPRESSO' : '⚡ FILA'}
                </button>

                {/* AÇÃO: ENTREGA (Agora ao lado da Impressão) */}
                <button
                  onClick={() =>
                    handleToggleBooleanStatus(
                      item.id,
                      'foi_entregue',
                      item.foi_entregue
                    )
                  }
                  className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
                    item.foi_entregue
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {item.foi_entregue ? '📦 ENTREGUE' : '⏳ ENTREGAR'}
                </button>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => handleCopiarMensagem(item)}
                  className="p-2 text-slate-400 hover:text-green-600 transition-colors"
                >
                  <MessageCircle size={18} />
                </button>
                <button
                  onClick={() =>
                    window.open(`/dtf/${item.id}/visualizar`, '_blank')
                  }
                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => handleEdit(item.id)}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <Edit3 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.nome_cliente)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
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
        endpoint="dtf"
        itemId={selectedItem.id}
        itemName={selectedItem.nome}
      />
    </div>
  );
};
