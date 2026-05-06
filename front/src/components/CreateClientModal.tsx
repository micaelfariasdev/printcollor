import { useState, useEffect, useCallback } from 'react';
import { api } from '../auth/useAuth';
import { useAlert } from '../contexts/AlertContext';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [nome, setNome] = useState(chat.name || '');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);

  const getNumberFromJid = (jid: string) => {
    if (!jid) return '';
    return jid.split('@')[0];
  };

  useEffect(() => {
    if (!selectedClient) {
      setTelefone(getNumberFromJid(chat.jid));
    }
  }, [chat.jid, selectedClient]);

  const searchClients = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get('/clientes/', { params: { search: term } });
      setSearchResults(data.results || data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) searchClients(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchClients]);

  const handleLinkClient = async (cliente: any) => {
    setLoading(true);
    try {
      await api.patch(`/clientes/${cliente.id}/`, { jid: chat.jid });
      addAlert(`Cliente "${cliente.nome}" vinculado com sucesso!`, 'success');
      onSuccess(cliente.id);
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
      const { data } = await api.post('/clientes/', {
        nome,
        telefone,
        jid: chat.jid,
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
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Vincular Cliente</h3>
        <p className="text-sm text-gray-600 mb-4">
          Chat: {chat.name || chat.jid} ({chat.instanceName})
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar cliente existente
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedClient(null);
            }}
            placeholder="Digite o nome do cliente..."
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
          />
          {searching && <p className="text-xs text-gray-500 mt-1">Buscando...</p>}
          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
              {searchResults.map(cliente => (
                <div
                  key={cliente.id}
                  onClick={() => {
                    setSelectedClient(cliente);
                    setSearchTerm(cliente.nome);
                    setSearchResults([]);
                    setNome(cliente.nome);
                    setTelefone(cliente.telefone || '');
                  }}
                  className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                >
                  <div className="font-medium text-sm">{cliente.nome}</div>
                  <div className="text-xs text-gray-500">{cliente.telefone}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={selectedClient ? (e: React.FormEvent) => { e.preventDefault(); handleLinkClient(selectedClient); } : handleCreateClient}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
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
                type="submit"
                disabled={loading}
                className="flex-1 p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Vinculando...' : `Vincular ${selectedClient.nome}`}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !nome.trim()}
                className="flex-1 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
