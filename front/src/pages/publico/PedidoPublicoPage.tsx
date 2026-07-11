import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { publicApi } from '../../utils/publicApi';
import { buildPixBRCode, buildPixQRDataURL } from '../../utils/pix';
import { formatarReal } from '../../tools/formatReal';
import { useAlert } from '../../contexts/AlertContext';
import { Skeleton } from '../../components/Skeleton';
import logo from '../../assets/logo-printcollor-blk.png';
import { CreditCard, Copy, Check, RefreshCcw, QrCode, AlertCircle, CheckCircle } from 'lucide-react';

interface PedidoPublicoData {
  codigo_publico: string;
  status: string;
  status_display: string;
  esta_pago: boolean;
  tipo_produto_display: string;
  tamanho_cm: string;
  unidade: string;
  quantidade: number;
  valor_total: number;
  cliente_nome: string;
  data_criacao: string;
  data_entrega: string | null;
  foi_impresso: string;
  foi_entregue: boolean;
  pix: {
    chave: string;
    beneficiario: string;
    cidade: string;
    valor: number;
    txid: string;
  } | null;
  pode_pagar_cartao: boolean;
  valor_cartao: number | null;
  comprovante_mp_data: {
    payment_id: string;
    metodo: string;
    nome: string;
    email: string;
    cpf: string;
    ultimos4: string;
    valor: number;
    data: string;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  orcamento: 'bg-yellow-100 text-yellow-800',
  aprovado: 'bg-blue-100 text-blue-800',
  em_producao: 'bg-orange-100 text-orange-800',
  impresso: 'bg-green-100 text-green-800',
  finalizado: 'bg-slate-100 text-slate-800',
};

export default function PedidoPublicoPage() {
  const { codigo_publico } = useParams<{ codigo_publico: string }>();
  const { addAlert } = useAlert();
  const [pedido, setPedido] = useState<PedidoPublicoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPix, setShowPix] = useState(false);
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixBrCode, setPixBrCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paying, setPaying] = useState(false);

  const fetchPedido = () => {
    setLoading(true);
    setError(null);
    publicApi.get(`/pedido-publico/${codigo_publico}/`)
      .then(res => {
        setPedido(res.data);
        setLoading(false);
      })
      .catch(err => {
        if (err.response?.status === 404) {
          setError('Pedido não encontrado. Verifique o link e tente novamente.');
        } else {
          setError('Erro ao carregar o pedido. Tente novamente.');
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPedido();
  }, [codigo_publico]);

  // Gerar QR PIX quando mostrar
  useEffect(() => {
    if (!showPix || !pedido?.pix) return;
    try {
      const brCode = buildPixBRCode({
        chave: pedido.pix!.chave,
        valor: pedido.pix!.valor,
        txid: pedido.pix!.txid,
        beneficiario: pedido.pix!.beneficiario,
        cidade: pedido.pix!.cidade,
      });
      setPixBrCode(brCode);
      buildPixQRDataURL(brCode).then(url => setPixQr(url));
    } catch (e: any) {
      addAlert('Erro ao gerar QR PIX: ' + (e.message || ''), 'error');
    }
  }, [showPix, pedido?.pix]);

  const handleCopiarPix = async () => {
    if (!pixBrCode) return;
    try {
      await navigator.clipboard.writeText(pixBrCode);
      setCopied(true);
      addAlert('Código PIX copiado!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addAlert('Erro ao copiar. Tente novamente.', 'error');
    }
  };

  const handlePagarCartao = async () => {
    if (!pedido) return;
    setPaying(true);
    try {
      const res = await publicApi.post(`/pedido-publico/${codigo_publico}/`, {});
      const initPoint = res.data.init_point || res.data.sandbox_init_point;
      if (initPoint) {
        window.open(initPoint, '_blank');
      } else {
        addAlert('Link de pagamento não disponível.', 'error');
      }
    } catch (e: any) {
      const msg = e.response?.data?.error || 'Erro ao gerar link de pagamento.';
      addAlert(msg, 'error');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={logo} alt="PrintCollor" className="h-16" />
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-4">
            <Skeleton className="h-6 w-40 mx-auto" />
            <Skeleton className="h-4 w-56 mx-auto" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-sm w-full">
          <img src={logo} alt="PrintCollor" className="h-14 mx-auto mb-6" />
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Ops!</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <a href="/" className="text-blue-600 hover:underline text-sm">
            Voltar para home
          </a>
        </div>
      </div>
    );
  }

  if (!pedido) return null;

  const statusColor = STATUS_COLORS[pedido.status] || 'bg-slate-100 text-slate-700';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <img src={logo} alt="PrintCollor" className="h-14 mx-auto mb-2" />
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
            {pedido.status_display}
          </span>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
          {/* Cliente */}
          <div className="text-center pb-4 border-b border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Cliente</p>
            <p className="text-lg font-bold text-slate-800">{pedido.cliente_nome}</p>
          </div>

          {/* Dados do pedido */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Produto</span>
              <span className="font-medium text-slate-800">{pedido.tipo_produto_display}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Tamanho</span>
              <span className="font-medium text-slate-800">
                {pedido.tamanho_cm} {pedido.unidade}
                {pedido.quantidade > 1 ? ` × ${pedido.quantidade}` : ''}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Criado em</span>
              <span className="font-medium text-slate-800">{pedido.data_criacao}</span>
            </div>
            {pedido.data_entrega && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Entrega</span>
                <span className="font-medium text-slate-800">{pedido.data_entrega}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Valor</span>
              <span className="font-bold text-xl text-slate-900">{formatarReal(pedido.valor_total)}</span>
            </div>
          </div>

          {/* Status pago */}
          {pedido.esta_pago && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-700 font-semibold text-sm">✅ Pagamento confirmado</p>
              <p className="text-green-600 text-xs mt-1">Obrigado! Seu pedido está em processamento.</p>
            </div>
          )}

          {/* Comprovante Cartão MP */}
          {pedido.esta_pago && pedido.comprovante_mp_data && (
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-white rounded-lg px-2 py-1">
                    <span className="text-blue-600 font-black text-xs">Mercado</span>
                    <span className="text-blue-500 font-black text-xs">Pago</span>
                  </div>
                  <CheckCircle size={16} className="text-green-300" />
                  <span className="text-blue-200 text-xs font-medium">Aprovado</span>
                </div>
                <CreditCard size={20} className="text-blue-200" />
              </div>
              <div className="bg-white/10 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-200">Valor</span>
                  <span className="font-black text-lg">{formatarReal(pedido.comprovante_mp_data.valor)}</span>
                </div>
                {pedido.comprovante_mp_data.metodo && (
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-200">Forma</span>
                    <span className="text-white font-semibold uppercase">{pedido.comprovante_mp_data.metodo}</span>
                  </div>
                )}
                {pedido.comprovante_mp_data.ultimos4 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-200">Cartão</span>
                    <span className="text-white font-semibold">•••• {pedido.comprovante_mp_data.ultimos4}</span>
                  </div>
                )}
                {pedido.comprovante_mp_data.nome && (
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-200">Titular</span>
                    <span className="text-white font-semibold">{pedido.comprovante_mp_data.nome}</span>
                  </div>
                )}
                {pedido.comprovante_mp_data.email && (
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-200">E-mail</span>
                    <span className="text-white font-semibold text-xs">{pedido.comprovante_mp_data.email}</span>
                  </div>
                )}
                {pedido.comprovante_mp_data.data && (
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-200">Data</span>
                    <span className="text-white font-semibold">{new Date(pedido.comprovante_mp_data.data).toLocaleString('pt-BR')}</span>
                  </div>
                )}
                {pedido.comprovante_mp_data.payment_id && (
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-200">ID</span>
                    <span className="text-white font-semibold text-xs">{pedido.comprovante_mp_data.payment_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botão Pagar Cartão */}
          {!pedido.esta_pago && (
            <>
              {pedido.pode_pagar_cartao && (
                <button
                  onClick={handlePagarCartao}
                  disabled={paying}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <>
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                      Gerando link...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Pagar com cartão
                      {pedido.valor_cartao != null && (
                        <span className="ml-auto text-sm opacity-80">
                          {formatarReal(pedido.valor_cartao)}
                        </span>
                      )}
                    </>
                  )}
                </button>
              )}
              {!pedido.pode_pagar_cartao && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500">
                  Pagamento via cartão indisponível —店主 não conectou ao Mercado Pago
                </div>
              )}
            </>
          )}

          {/* PIX */}
          {pedido.pix && !pedido.esta_pago && (
            <div className="space-y-3">
              <button
                onClick={() => setShowPix(p => !p)}
                className="w-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <QrCode className="w-4 h-4" />
                {showPix ? 'Ocultar PIX' : 'Mostrar PIX'}
                {!showPix && (
                  <span className="ml-auto text-slate-500">{formatarReal(pedido.pix.valor)}</span>
                )}
              </button>

              {showPix && pixQr && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <img src={pixQr} alt="QR Code PIX" className="w-48 h-48 mx-auto rounded-lg" />
                  <button
                    onClick={handleCopiarPix}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar código PIX'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Aviso pós-pagamento */}
          {!pedido.esta_pago && (
            <p className="text-xs text-slate-400 text-center">
              Após pagar, aguarde alguns instantes e clique em Atualizar para ver o status.
            </p>
          )}
        </div>

        {/* Refresh */}
        <div className="text-center mt-4">
          <button
            onClick={fetchPedido}
            className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 mx-auto"
          >
            <RefreshCcw className="w-3 h-3" />
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}