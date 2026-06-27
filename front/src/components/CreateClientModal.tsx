import { useState, useEffect, useMemo } from 'react';
import { api } from '../auth/useAuth';
import { useAlert } from '../contexts/AlertContext';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';

interface Chat {
  jid: string;
  name: string;
  instanceName: string;
}

interface CreateClientModalProps {
  chat: Chat;
  onClose: () => void;
  onSuccess: (clienteId: number) => void;
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({ chat, onClose, onSuccess }) => {
  const { addAlert } = useAlert();
  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [nome, setNome] = useState(chat.name || '');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const clientSearch = useDebouncedSearch('clientes/', 300);

  // Combina clientes carregados com resultados da busca server-side
  const allClientes = useMemo(() => {
    const seen = new Set(clientes.map((c) => c.id));
    const extra = clientSearch.results.filter((c: any) => !seen.has(c.id));
    return [...clientes, ...extra];
  }, [clientes, clientSearch.results]);

  useEffect(() => {
    if (chat.jid) {
      // Extrai número do JID
      const num = chat.jid.split('@')[0];
      setTelefone(num);
    }
    // Carrega lista de clientes
    api.get('clientes/').then(res => {
      setClientes(res.data.results || []);
    });
  }, [chat.jid]);

  const handleSelectClient = (value: string) => {
    const cliente = clientes.find(c => c.nome === value);
    if (cliente) {
      setSelectedClient(cliente);
      setNome(cliente.nome);
      setTelefone(cliente.telefone || '');
    } else {
      setSelectedClient(null);
      setNome(value);
    }
  };

  const handleLinkClient = async () => {
    if (!selectedClient) return;
    setLoading(true);
    try {
      // Extrai apenas números do JID
      const numero = chat.jid ? chat.jid.split('@')[0] : '';
      await api.patch(`clientes/${selectedClient.id}/`, {
        jid: chat.jid,  // JID completo
        numero: numero,  // apenas números
        telefone: selectedClient.telefone || numero  // atualiza telefone se vazio
      });
      addAlert(`Cliente "${selectedClient.nome}" vinculado com sucesso!`, 'success');
      onSuccess(selectedClient.id);
    } catch (error: any) {
      addAlert('Erro ao vincular cliente: ' + (error.response?.data?.detail || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setLoading(true);
    try {
      // Extrai apenas números do JID para o campo 'numero'
      const numero = chat.jid ? chat.jid.split('@')[0] : '';
      const { data } = await api.post('clientes/', {
        nome,
        telefone: telefone || numero,  // usa telefone se preenchido, senão o número do JID
        numero: numero,  // apenas números
        jid: chat.jid,  // JID completo (ex: 551199999@s.whatsapp.net)
      });
      addAlert('Cliente criado com sucesso!', 'success');
      onSuccess(data.id);
    } catch (error: any) {
      addAlert('Erro ao criar cliente: ' + (error.response?.data?.detail || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Vincular Cliente</h3>
        <p className="text-sm text-gray-600 mb-4">
          Chat: {chat.name || chat.jid} ({chat.instanceName})
        </p>

        {/* Busca cliente existente - padrão igual ModalNovoDTF */}
        <div className="mb-4">
          <label className="block text-xs font-black text-slate-500 uppercase ml-1 mb-2">
            Buscar cliente existente
          </label>
          <input
            list="clientes-modal-list"
            placeholder="Digite para buscar cliente..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
            onChange={(e) => {
              const val = e.target.value;
              clientSearch.setQuery(val);
              handleSelectClient(val);
            }}
          />
          <datalist id="clientes-modal-list">
            {allClientes.map((c: any) => (
              <option key={c.id} value={c.nome} />
            ))}
          </datalist>
        </div>

        {/* Formulário */}
        <form onSubmit={handleCreateClient}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase ml-1 mb-2">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase ml-1 mb-2">Telefone</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
              />
            </div>
            <input type="hidden" value={chat.jid} />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            {selectedClient ? (
              <button
                type="button"
                disabled={loading}
                onClick={handleLinkClient}
                className="flex-[2] bg-green-600 text-white py-2 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-green-500/20 disabled:opacity-50"
              >
                {loading ? 'Vinculando...' : `Vincular ${selectedClient.nome}`}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !nome.trim()}
                className="flex-[2] bg-blue-600 text-white py-2 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar Novo'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClientModal;
