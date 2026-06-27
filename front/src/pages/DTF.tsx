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
import { buildPixBRCode } from '../utils/pix';

// Endereço da loja (constante — mover para Configuracoes quando virar configurável)
const LOJA_ENDERECO = {
  nome: 'Print Collor - Teresina',
  rua: 'Rua Coelho de Resende, 540 - Centro/SUL',
  mapsUrl: 'https://maps.app.goo.gl/bu6RJpJroQmui9j97',
};

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
  const [pixConfig, setPixConfig] = useState<{
    pix_chave_telefone?: string;
    pix_beneficiario?: string;
    pix_cidade?: string;
  }>({});
  const [copiando, setCopiando] = useState<number | null>(null);

  const carregarDados = () => {
    api.get('dtf/').then((response) => {
      setData(response.data);
    });
    api.get('configuracao-loja/').then((r) => setPixConfig(r.data || {})).catch(() => {});
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Lógica automática de status: atualiza status baseado nos toggles
  const calcularStatusAuto = (foiEntregue: boolean, estaPago: boolean, foiImpresso: string) => {
    if (foiEntregue) return 'finalizado';
    if (foiImpresso === 'impresso') return 'finalizado'; // Impresso = Finalizado
    if (estaPago) return 'aprovado'; // Aprovado = apenas Pago
    return 'orcamento';
  };

  // Lógica inversa: atualiza toggles baseado no status
  const calcularTogglesDoStatus = (status: string) => {
    if (status === 'finalizado') return { foiEntregue: true, estaPago: true, foiImpresso: 'impresso' };
    if (status === 'aprovado') return { foiEntregue: false, estaPago: true, foiImpresso: 'pendente' }; // Aprovado = Pago, não impresso
    if (status === 'em_producao') return { foiEntregue: false, estaPago: true, foiImpresso: 'pendente' };
    return { foiEntregue: false, estaPago: false, foiImpresso: 'pendente' };
  };

  const handleToggleBooleanStatus = async (
    id: number,
    campo: string,
    valorAtual: boolean,
    item: any
  ) => {
    try {
      const novoValor = !valorAtual;

      // Calcular novo status automático
      const novosToggles = {
        foiEntregue: campo === 'foi_entregue' ? novoValor : item.foi_entregue,
        estaPago: campo === 'esta_pago' ? novoValor : item.esta_pago,
        foiImpresso: campo === 'foi_impresso' ? (novoValor ? 'impresso' : 'pendente') : item.foi_impresso,
      };
      const novoStatus = calcularStatusAuto(novosToggles.foiEntregue, novosToggles.estaPago, novosToggles.foiImpresso);

      await api.patch(`dtf/${id}/`, { [campo]: novoValor, status: novoStatus });

      const msg =
        campo === 'esta_pago'
          ? novoValor
            ? 'Pagamento confirmado!'
            : 'Status revertido para Pendente.'
          : novoValor
            ? 'Pedido entregue ao cliente!'
            : 'Retornado para expedição.';
      addAlert(msg, 'success');
      carregarDados();
    } catch (error) {
      addAlert('Erro ao sincronizar status com o servidor.', 'error');
    }
  };

  const handleToggleImpressao = async (id: number, statusAtual: string, item: any) => {
    const novoStatusImpressao = statusAtual === 'impresso' ? 'pendente' : 'impresso';
    try {
      // Calcular novo status automático
      const novoStatus = calcularStatusAuto(item.foi_entregue, item.esta_pago, novoStatusImpressao);

      await api.patch(`dtf/${id}/`, { foi_impresso: novoStatusImpressao, status: novoStatus });
      addAlert(`DTF #${id} marcado como ${novoStatusImpressao.toUpperCase()}`, 'info');
      carregarDados();
    } catch (error) {
      addAlert('Erro ao atualizar impressão.', 'error');
    }
  };

  const handleUpdateStatus = async (id: number, campo: string, novoValor: string) => {
    try {
      let payload: any = { [campo]: novoValor };

      // Se mudou o status manual, atualiza os toggles também
      if (campo === 'status') {
        const toggles = calcularTogglesDoStatus(novoValor);
        payload.foi_entregue = toggles.foiEntregue;
        payload.esta_pago = toggles.estaPago;
        payload.foi_impresso = toggles.foiImpresso;
      }

      await api.patch(`dtf/${id}/`, payload);
      addAlert('Status atualizado!', 'success');
      carregarDados();
    } catch (error) {
      addAlert('Erro ao atualizar status.', 'error');
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

  /** Monta o texto-base do pedido com base no status (modelo padrão). */
  const montarMensagem = (item: any): string => {
    const clienteNome = item.cliente_nome || item.cliente?.nome || 'cliente';
    const saudacao = `Olá! Seguem os detalhes do seu pedido:`;

    const tamanhoTexto =
      item.tipo_produto === 'estampa'
        ? `🎨 Quantidade: ${item.quantidade || 1} un.`
        : item.tipo_produto === 'sublimacao'
        ? `📏 Área: ${(item.tamanho_cm / 10000).toFixed(2)} m²`
        : `📏 Tamanho: ${item.tamanho_cm}cm`;

    const detalhes =
      `\n\n📌 Pedido #${item.id}` +
      `\n${tamanhoTexto}` +
      `\n💰 Valor: ${formatarReal(item.valor_total)}`;

    // Endereço da loja — sempre aparece em todos os status
    const enderecoTexto =
      `\n\n📍 Nosso Endereço: ${LOJA_ENDERECO.nome}` +
      `\n${LOJA_ENDERECO.rua}` +
      `\nComo chegar (Google Maps): ${LOJA_ENDERECO.mapsUrl}`;

    // Status
    let statusTexto = '';
    if (item.esta_pago && item.foi_impresso !== 'impresso') {
      statusTexto = `\n\n⚡ EM PRODUÇÃO\nEstamos cuidando do seu pedido!`;
    } else if (item.foi_impresso === 'impresso' && !item.foi_entregue) {
      statusTexto = `\n\n🚚 PRONTO PARA RETIRADA`;
    } else if (item.foi_entregue) {
      statusTexto = `\n\n✅ ENTREGUE\nAgradecemos a preferência!`;
    } else if (!item.esta_pago) {
      const chave = pixConfig.pix_chave_telefone || '86999749492';
      const bene = pixConfig.pix_beneficiario || 'D. R. DOS SANTOS NETO';
      // Gera o PIX copia-e-cola aqui também (string BR Code vai direto na msg)
      let brCodeTexto = '';
      try {
        const txid = String(item.id).padStart(4, '0').slice(-25);
        brCodeTexto = buildPixBRCode({
          chave,
          valor: Number(item.valor_total) || 0,
          txid,
          beneficiario: bene,
          cidade: pixConfig.pix_cidade || 'TERESINA',
        });
      } catch {
        brCodeTexto = '';
      }
      statusTexto =
        `\n\nSeguem os nossos dados para pagamento e o endereço.` +
        `\n\n💳 Pagamento via PIX` +
        `\nChave (Celular): ${chave}` +
        `\nTitular: ${bene}` +
        (brCodeTexto ? `\n\nCopie seu código abaixo no app do seu banco (PIX Copia-Cola):\n\n\`\`\`\n${brCodeTexto}\n\`\`\`` : '') +
        `\n\nImportante: O seu material entra na nossa fila de impressão logo após o envio do comprovante por aqui.`;
    }
    const assinaturaFinal = `\n\nQualquer dúvida, estamos à disposição!`;
    return saudacao + detalhes + statusTexto + enderecoTexto + assinaturaFinal;
  };

  const handleCopiarMensagem = async (item: any) => {
    setCopiando(item.id);
    try {
      const texto = montarMensagem(item);
      await navigator.clipboard.writeText(texto);
      addAlert('Mensagem de WhatsApp copiada!', 'success');
    } catch (err) {
      addAlert('Não foi possível acessar a área de transferência.', 'error');
    } finally {
      setCopiando(null);
    }
  };

  const handleCopiarPix = async (item: any) => {
    if (!pixConfig.pix_chave_telefone) {
      addAlert('Configure a chave PIX nas Configurações da Loja.', 'error');
      return;
    }
    setCopiando(item.id);
    try {
      const txid = String(item.id).padStart(4, '0').slice(-25); // 25 chars max EMV
      const brCode = buildPixBRCode({
        chave: pixConfig.pix_chave_telefone,
        valor: Number(item.valor_total) || 0,
        txid,
        beneficiario: pixConfig.pix_beneficiario || 'LOJA',
        cidade: pixConfig.pix_cidade || 'TERESINA',
      });
      await navigator.clipboard.writeText(brCode);
      addAlert('PIX Copia-Cola copiado! Cole no app do banco do cliente.', 'success');
    } catch (err: any) {
      console.error('[PIX]', err);
      const msg =
        err?.message ||
        err?.response?.data?.detail ||
        'Falha ao gerar PIX copia-e-cola.';
      addAlert(`Falha PIX: ${msg}`, 'error');
    } finally {
      setCopiando(null);
    }
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
            className={`bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-xl transition-all flex flex-col justify-between border-b-4 text-left ${
 item.tipo_produto === 'sublimacao'
 ? 'border-b-purple-400'
 : item.tipo_produto === 'dtf_uv'
 ? 'border-b-cyan-400'
 : item.tipo_produto === 'estampa'
 ? 'border-b-emerald-400'
 : 'border-b-blue-400'
 }`}
          >
            {/* Preview do Layout */}
            {item.layout_arquivo && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                <img
                  src={item.layout_arquivo}
                  alt="Layout"
                  className="w-full h-32 object-contain"
                />
              </div>
            )}

            <div className="flex justify-between items-start mb-2">
              <div className="min-w-0">
                <h4 className="font-black text-slate-800 text-xl italic uppercase leading-none truncate">
                  {item.nome_cliente}
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 italic">
                  OS #{item.id} • {formatarDataHora(item.data_criacao)}
                </p>
                <span
                  className={`inline-block mt-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg ${
                    item.tipo_produto === 'sublimacao'
                      ? 'bg-purple-100 text-purple-700'
                      : item.tipo_produto === 'dtf_uv'
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {item.tipo_produto === 'sublimacao'
                    ? '🔥 Sublimação'
                    : item.tipo_produto === 'dtf_uv'
                    ? '🔷 DTF UV'
                    : item.tipo_produto === 'estampa'
                    ? '🎨 Estampa'
                    : '🖨️ DTF Têxtil'}
                </span>
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
                  {item.tipo_produto === 'estampa' ? 'Quantidade' : item.tipo_produto === 'sublimacao' ? 'Área' : 'Tamanho'}
                </p>
                <p className="text-sm font-black text-slate-700">
                  {item.tipo_produto === 'estampa'
                    ? `${item.quantidade || 1} un.`
                    : item.tipo_produto === 'sublimacao'
                    ? `${(item.tamanho_cm / 10000).toFixed(2)} m²`
                    : `${item.tamanho_cm} cm`}
                </p>
              </div>

              {/* CLIQUE RÁPIDO: PAGAMENTO (No card do Valor) */}
              <button
                onClick={() =>
                  handleToggleBooleanStatus(
                    item.id,
                    'esta_pago',
                    item.esta_pago,
                    item
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

            <div className="space-y-3 pt-4 border-t border-slate-50">
              {/* Status do Orçamento */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={item.status || 'orcamento'}
                  onChange={(e) => handleUpdateStatus(item.id, 'status', e.target.value)}
                  className="flex-1 min-w-[100px] text-[10px] font-black px-3 py-2 rounded-xl border transition-all ${
                    item.status === 'orcamento'
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      : item.status === 'aprovado'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : item.status === 'em_producao'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-green-50 text-green-700 border-green-200'
                  }"
                >
                  <option value="orcamento">💰 Orçamento</option>
                  <option value="aprovado">✅ Aprovado</option>
                  <option value="em_producao">⚙️ Em Produção</option>
                  <option value="finalizado">🏁 Finalizado</option>
                </select>
              </div>

              {/* Primeira linha: Botões de status e ação */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    handleToggleImpressao(item.id, item.foi_impresso, item)
                  }
                  className={`flex-1 min-w-[100px] text-[10px] font-black px-3 py-2 rounded-xl transition-all active:scale-95 ${
                    item.foi_impresso === 'impresso'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                  }`}
                >
                  {item.foi_impresso === 'impresso' ? '✓ IMPRESSO' : '⚡ FILA'}
                </button>

                <button
                  onClick={() =>
                    handleToggleBooleanStatus(
                      item.id,
                      'foi_entregue',
                      item.foi_entregue,
                      item
                    )
                  }
                  className={`flex-1 min-w-[100px] text-[10px] font-black px-3 py-2 rounded-xl transition-all active:scale-95 ${
                    item.foi_entregue
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {item.foi_entregue ? '📦 ENTREGUE' : '⏳ ENTREGAR'}
                </button>
              </div>

              {/* Segunda linha: Botões secundários */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCopiarMensagem(item)}
                  disabled={copiando === item.id}
                  className="flex-1 min-w-[80px] bg-green-50 hover:bg-green-100 text-green-600 p-2 rounded-xl transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-wait"
                  title="Copiar mensagem WhatsApp"
                >
                  <MessageCircle size={16} />
                  <span className="text-xs font-bold">{copiando === item.id ? 'Copiando…' : 'WhatsApp'}</span>
                </button>
                {!item.esta_pago && pixConfig.pix_chave_telefone && (
                  <button
                    onClick={() => handleCopiarPix(item)}
                    disabled={copiando === item.id}
                    className="flex-1 min-w-[80px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-2 rounded-xl transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-wait"
                    title="Copiar PIX Copia-Cola (string BR Code)"
                  >
                    <Wallet size={16} />
                    <span className="text-xs font-bold">PIX</span>
                  </button>
                )}
                <button
                  onClick={() =>
                    window.open(`/dtf/${item.id}/visualizar`, '_blank')
                  }
                  className="flex-1 min-w-[80px] bg-slate-50 hover:bg-slate-100 text-slate-600 p-2 rounded-xl transition-all flex items-center justify-center gap-1"
                  title="Visualizar"
                >
                  <Eye size={16} />
                  <span className="text-xs font-bold">Ver</span>
                </button>
                <button
                  onClick={() => handleEdit(item.id)}
                  className="flex-1 min-w-[80px] bg-slate-50 hover:bg-slate-100 text-slate-600 p-2 rounded-xl transition-all flex items-center justify-center gap-1"
                  title="Editar"
                >
                  <Edit3 size={16} />
                  <span className="text-xs font-bold">Editar</span>
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.nome_cliente)}
                  className="flex-1 min-w-[80px] bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl transition-all flex items-center justify-center gap-1"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                  <span className="text-xs font-bold">Excluir</span>
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
    </div >
  );
};
