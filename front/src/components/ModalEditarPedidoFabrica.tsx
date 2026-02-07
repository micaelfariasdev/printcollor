import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { api } from '../auth/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pedidoId: number | null;
}

export default function ModalEditarPedidoFabrica({
  isOpen,
  onClose,
  onSuccess,
  pedidoId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({
    nome_descricao: '',
    status: 'pendente',
    material: '',
    aplicacao_arte: '',
    detalhes_tamanho: {},
  });
  const [novaChave, setNovaChave] = useState('');
  // Carregar dados do pedido ao abrir o modal
  useEffect(() => {
    if (isOpen && pedidoId) {
      api.get(`pedidos/${pedidoId}/`).then((res) => {
        setFormData(res.data);
      });
    }
  }, [isOpen, pedidoId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Lógica para atualizar valores da grade JSON
  const updateGrade = (chave: string, valor: string) => {
    setFormData({
      ...formData,
      detalhes_tamanho: {
        ...formData.detalhes_tamanho,
        [chave]: Number(valor),
      },
    });
  };

  const addNovoCampo = () => {
    if (!novaChave) return;
    setFormData({
      ...formData,
      detalhes_tamanho: {
        ...formData.detalhes_tamanho,
        [novaChave.toLowerCase()]: 0,
      },
    });
    setNovaChave('');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Filtrar a grade para remover valores zerados
      const gradeLimpa: any = {};
      Object.entries(formData.detalhes_tamanho).forEach(([tamanho, qtd]) => {
        if (Number(qtd) > 0) {
          gradeLimpa[tamanho] = Number(qtd);
        }
      });

      // 2. Preparar os dados para envio (Objeto simples para PATCH JSON)
      const dataToSend = {
        ...formData,
        detalhes_tamanho: gradeLimpa, // Substitui pela grade sem zeros
      };

      // 3. Limpeza de campos que o Django não aceita no PATCH
      delete dataToSend.layout; // Remove a URL da imagem (string)
      delete dataToSend.data_criacao; // Campo read-only
      delete dataToSend.total_pecas; // Campo calculado pelo serializer

      // Garante que enviamos apenas o ID do cliente
      if (dataToSend.cliente && typeof dataToSend.cliente === 'object') {
        dataToSend.cliente = dataToSend.cliente.id;
      }

      // 4. Envio via PATCH (JSON padrão)
      await api.patch(`pedidos/${pedidoId}/`, dataToSend);

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(
        'Erro ao atualizar pedido:',
        error.response?.data || error.message
      );
      alert(
        'Erro ao salvar. Verifique se todos os campos obrigatórios estão preenchidos.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Editar Pedido Fábrica
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase">
              ID: #{pedidoId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition shadow-sm"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Descrição do Pedido
              </label>
              <input
                name="nome_descricao"
                value={formData.nome_descricao}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Status de Produção
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600"
              >
                <option value="pendente">PENDENTE</option>
                <option value="em_producao">EM PRODUÇÃO</option>
                <option value="finalizado">FINALIZADO</option>
              </select>
            </div>
          </div>

          {/* Seção da Grade (JSON) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Grade de Tamanhos / Qtd
              </label>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                value={novaChave}
                onChange={(e) => setNovaChave(e.target.value)}
                placeholder="Add novo tamanho (ex: XG)"
                className="flex-1 p-2 bg-slate-50 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addNovoCampo}
                className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold"
              >
                ADICIONAR
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(formData.detalhes_tamanho).map(
                ([chave, valor]: any) => (
                  <div
                    key={chave}
                    className="bg-slate-50 p-3 rounded-2xl border border-slate-100 relative group"
                  >
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                      {chave}
                    </label>
                    <input
                      type="number"
                      value={valor}
                      onChange={(e) => updateGrade(chave, e.target.value)}
                      className="w-full bg-transparent text-lg font-black text-blue-600 outline-none"
                    />
                  </div>
                )
              )}
            </div>
          </div>

          {/* Material e Arte */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Material
              </label>
              <input
                name="material"
                value={formData.material}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                Aplicação
              </label>
              <input
                name="aplicacao_arte"
                value={formData.aplicacao_arte}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
