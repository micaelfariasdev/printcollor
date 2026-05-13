import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../auth/useAuth';

interface WhatsAppInstance {
  id: number;
  nome: string;
  instance_id: string;
  numero?: string;
  status: string;
  ativo: boolean;
  cor?: string;
}

const WhatsAppInstances: React.FC = () => {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditColorModal, setShowEditColorModal] = useState(false);
  const [editingInstance, setEditingInstance] = useState<WhatsAppInstance | null>(null);
  const [editColor, setEditColor] = useState('#25D366');
  const [statusMessage, setStatusMessage] = useState('');
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceColor, setNewInstanceColor] = useState('#25D366');
  const [instanceToDelete, setInstanceToDelete] = useState<WhatsAppInstance | null>(null);
  const [qrCode, setQRCode] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookInstance, setWebhookInstance] = useState<WhatsAppInstance | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);

  const addAlert = (message: string, type: 'success' | 'error' | 'warning') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  // Helper pra normalizar status (backend pode vir em pt ou en)
  const normalizeStatus = (s: string) => {
    const map: Record<string, string> = {
      'ativo': 'connected',
      'inativo': 'disconnected',
      'desconectado': 'disconnected',
      'conectando': 'connecting',
      'qrcode': 'connecting',
      'connected': 'connected',
      'disconnected': 'disconnected',
      'connecting': 'connecting',
      'open': 'connected',
    };
    return map[s?.toLowerCase()] || s;
  };

  const loadInstances = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp-instances/');
      setInstances(res.data.map((i: any) => ({ ...i, status: normalizeStatus(i.status) })));
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstances();

    // Polling a cada 5s pra atualizar status
    const interval = setInterval(() => {
      loadInstances();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadInstances]);

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) return;
    setShowCreateModal(false);

    try {
      const res = await api.post('/whatsapp-instances/', { nome: newInstanceName, cor: newInstanceColor });
      setNewInstanceName('');

      const qrCodeData = res.data.qr_code;
      if (qrCodeData) {
        setQRCode(qrCodeData);
        setShowQR(true);
      }

      addAlert('Instância criada! Escaneie o QR Code para conectar.', 'success');
      loadInstances();
    } catch (error: any) {
      addAlert(error.response?.data?.error || 'Erro ao criar instância', 'error');
    }
  };

  const handleSaveColor = async () => {
    if (!editingInstance) return;
    try {
      await api.patch(`/whatsapp-instances/${editingInstance.id}/`, { cor: editColor });
      setShowEditColorModal(false);
      setEditingInstance(null);
      addAlert('Cor atualizada com sucesso!', 'success');
      loadInstances();
    } catch (error: any) {
      addAlert(error.response?.data?.error || 'Erro ao atualizar cor', 'error');
    }
  };

  const handleRequestQRCode = async (instance: WhatsAppInstance) => {
    try {
      const res = await api.get(`/whatsapp-instances/${instance.id}/qrcode/`);
      const qrBase64 = res.data?.qr_code?.base64 || res.data?.base64 || '';
      if (qrBase64) {
        setQRCode(qrBase64);
        setShowQR(true);
        addAlert('QR Code carregado!', 'success');
      } else {
        addAlert('QR Code ainda não disponível. Tente novamente.', 'warning');
      }
    } catch (error: any) {
      addAlert(error.response?.data?.error || 'Erro ao obter QR Code', 'error');
    }
  };

  const confirmDeleteInstance = (instance: WhatsAppInstance) => {
    setInstanceToDelete(instance);
    setShowDeleteModal(true);
  };

  const handleDeleteInstance = async () => {
    if (!instanceToDelete) return;

    try {
      await api.delete(`/whatsapp-instances/${instanceToDelete.id}/deletar/`);
      addAlert('Instância excluída com sucesso!', 'success');
      setShowDeleteModal(false);
      setInstanceToDelete(null);
      loadInstances();
    } catch (error: any) {
      addAlert(error.response?.data?.error || 'Erro ao excluir instância', 'error');
    }
  };

  const handleCheckStatus = async (instance: WhatsAppInstance) => {
    try {
      const res = await api.get(`/whatsapp-instances/${instance.id}/status/`);
      const status = res.data?.instance?.state || res.data?.state || 'unknown';

      // Mapeia o status da Evolution API para o status do nosso backend
      let backendStatus = 'disconnected';
      if (status === 'open' || status === 'connected') {
        backendStatus = 'connected';
      } else if (status === 'qrcode') {
        backendStatus = 'qrcode';
      } else if (status === 'connecting') {
        backendStatus = 'connecting';
      }

      // Sempre atualiza o status no backend e no estado local
      await api.patch(`/whatsapp-instances/${instance.id}/`, { status: backendStatus });
      setInstances(prev => prev.map(i =>
        i.id === instance.id ? { ...i, status: backendStatus } : i
      ));

      setStatusMessage(`Instância "${instance.nome}": ${backendStatus === 'connected' ? 'Conectada' : backendStatus === 'qrcode' ? 'Aguardando QR Code' : backendStatus === 'connecting' ? 'Conectando' : 'Desconectada'}`);
      setShowStatusModal(true);
    } catch (error: any) {
      setStatusMessage(`Erro ao verificar status: ${error.response?.data?.error || error.message}`);
      setShowStatusModal(true);
    }
  };

  const handleOpenWebhookModal = async (instance: WhatsAppInstance) => {
    setWebhookInstance(instance);
    setShowWebhookModal(true);
    setWebhookLoading(true);
    try {
      const res = await api.get(`/webhook/configure/?instance=${instance.nome}`);
      const webhookData = res.data?.result?.webhook || res.data?.result || {};
      if (webhookData.url) {
        // Extrai a base URL (remove /api/whatsapp/webhook/ do final)
        const baseUrl = webhookData.url.replace(/\/api\/whatsapp\/webhook\/?$/, '');
        setWebhookUrl(baseUrl);
      } else {
        setWebhookUrl('');
      }
    } catch (error) {
      setWebhookUrl('');
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleConfigureWebhook = async () => {
    if (!webhookInstance) return;
    setWebhookLoading(true);
    try {
      const payload: any = { instance: webhookInstance.nome };
      if (webhookUrl.trim()) {
        payload.webhook_url = webhookUrl.trim();
      }
      await api.post('/whatsapp/webhook/configure/', payload);
      addAlert(`Webhook configurado com sucesso para "${webhookInstance.nome}"`, 'success');
      setShowWebhookModal(false);
      setWebhookInstance(null);
      setWebhookUrl('');
    } catch (error: any) {
      addAlert(error.response?.data?.error || 'Erro ao configurar webhook', 'error');
    } finally {
      setWebhookLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instâncias WhatsApp</h1>
          <p className="text-sm text-gray-500">{instances.filter(i => i.status === 'connected').length} conectado(s)</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#008069] text-white px-4 py-2 rounded-lg hover:bg-[#017561] transition flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nova Instância</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {instances.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="mb-2">Nenhuma instância conectada</p>
            <p className="text-sm">Clique em "Nova Instância" para conectar um WhatsApp</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {instances.map((instance) => (
              <div key={instance.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full border border-gray-300"
                      style={{ backgroundColor: instance.cor || '#6b7280' }}
                    ></div>
                    <div>
                      <p className="font-medium text-gray-900">{instance.nome}</p>
                      <p className="text-sm text-gray-500">
                        {instance.numero || 'Não conectado'} • {instance.instance_id}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    instance.status === 'connected' ? 'bg-green-100 text-green-700' :
                    instance.status === 'qrcode' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {instance.status === 'connected' ? 'Online' :
                     instance.status === 'qrcode' ? 'Aguardando QR' : 'Offline'}
                  </span>
                </div>
                <div className="flex space-x-2 mt-3 items-center">
                  {instance.status !== 'connected' && (
                    <button
                      onClick={() => handleRequestQRCode(instance)}
                      className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                    >
                      QR Code
                    </button>
                  )}
                  <button
                    onClick={() => handleCheckStatus(instance)}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                  >
                    Status
                  </button>
                  <button
                    onClick={() => {
                      setEditingInstance(instance);
                      setEditColor(instance.cor || '#25D366');
                      setShowEditColorModal(true);
                    }}
                    className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200"
                  >
                    Cor
                  </button>
                  <button
                    onClick={() => handleOpenWebhookModal(instance)}
                    className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded hover:bg-orange-200"
                  >
                    Webhook
                  </button>
                  <button
                    onClick={() => confirmDeleteInstance(instance)}
                    className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Conectar WhatsApp</h3>
              <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-center">
              {qrCode ? (
                <>
                  <img src={qrCode} alt="QR Code" className="mx-auto mb-4 max-w-xs" />
                  <p className="text-sm text-gray-600">
                    Abra o WhatsApp → Menu → Aparelhos conectados → Conectar um aparelho
                  </p>
                </>
              ) : (
                <p className="text-gray-500">Carregando QR Code...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nova Instância</h3>
              <button onClick={() => { setShowCreateModal(false); setNewInstanceName(''); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da instância</label>
                <input
                  type="text"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateInstance()}
                  placeholder="Ex: atendimento-1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008069]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor da instância</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newInstanceColor}
                    onChange={(e) => setNewInstanceColor(e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">{newInstanceColor}</span>
                </div>
              </div>
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => { setShowCreateModal(false); setNewInstanceName(''); }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateInstance}
                  disabled={!newInstanceName.trim()}
                  className="bg-[#008069] text-white px-6 py-2 rounded-lg hover:bg-[#017561] disabled:opacity-50 transition"
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Status da Instância</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-700 mb-4">{statusMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="bg-[#008069] text-white px-6 py-2 rounded-lg hover:bg-[#017561] transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && instanceToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
              <button onClick={() => { setShowDeleteModal(false); setInstanceToDelete(null); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-700 mb-6">
              Tem certeza que deseja excluir a instância <strong>"{instanceToDelete.nome}"</strong>?
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => { setShowDeleteModal(false); setInstanceToDelete(null); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteInstance}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Color Modal */}
      {showEditColorModal && editingInstance && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Editar Cor: {editingInstance.nome}
              </h3>
              <button
                onClick={() => { setShowEditColorModal(false); setEditingInstance(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor da instância</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-16 h-12 border border-gray-300 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">{editColor}</span>
                </div>
                <div
                  className="mt-3 h-10 rounded-lg border border-gray-300"
                  style={{ backgroundColor: editColor }}
                ></div>
              </div>
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => { setShowEditColorModal(false); setEditingInstance(null); }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveColor}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    {/* Webhook Modal */}
    {showWebhookModal && webhookInstance && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Configurar Webhook: {webhookInstance.nome}
            </h3>
            <button
              onClick={() => { setShowWebhookModal(false); setWebhookInstance(null); setWebhookUrl(''); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL do Webhook (deixe vazio para usar padrão)
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://seu-tunnel.ngrok.io ou https://seu-tunnel.trycloudflare.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                A URL padrão é configurada no backend (WEBHOOK_BASE_URL). Se estiver usando túnel, cole aqui a URL pública.
              </p>
            </div>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => { setShowWebhookModal(false); setWebhookInstance(null); setWebhookUrl(''); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfigureWebhook}
                disabled={webhookLoading}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
              >
                {webhookLoading ? 'Configurando...' : 'Configurar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

  </div>
  );
};

export default WhatsAppInstances;
