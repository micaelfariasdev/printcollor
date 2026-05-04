import React, { useEffect, useState } from 'react';
import { api } from '../auth/useAuth';
import { 
  MessageCircle, 
  FileText, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Download,
  User
} from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import { formatarDataHora } from '../tools/dataHora';

export const AdminOrcamentosClientes = () => {
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const { addAlert } = useAlert();

  const carregar = () => {
    api.get('solicitar-orcamento/').then(res => setSolicitacoes(res.data));
  };

  useEffect(() => { carregar(); }, []);

  const handleResolver = async (id: number) => {
    try {
      await api.post(`solicitar-orcamento/${id}/resolver/`);
      addAlert('Orçamento finalizado e arquivo removido do servidor.', 'success');
      carregar();
    } catch (e) {
      addAlert('Erro ao processar.', 'error');
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black uppercase italic text-slate-800">Solicitações de Orçamento</h2>
        <span className="bg-blue-100 text-blue-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
          {solicitacoes.filter(s => !s.resolvido).length} Pendentes
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {solicitacoes.map((s) => (
          <div key={s.id} className={`bg-white rounded-[2rem] border-2 transition-all overflow-hidden ${s.resolvido ? 'opacity-60 border-slate-100' : 'border-white shadow-xl shadow-slate-200/50'}`}>
            <div className="p-6 space-y-4">
              {/* Header do Card */}
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                  <User size={20} />
                </div>
                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg ${
                  s.tipo_servico === 'dtf' ? 'bg-orange-100 text-orange-600' : 
                  s.tipo_servico === 'uv' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {s.tipo_servico}
                </span>
              </div>

              {/* Info Cliente */}
              <div>
                <h4 className="font-black text-lg uppercase italic leading-none">{s.cliente_nome}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{formatarDataHora(s.data_solicitacao)}</p>
              </div>

              {/* Descrição */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[80px]">
                <p className="text-xs font-medium text-slate-600 leading-relaxed italic">"{s.descricao}"</p>
              </div>

              {/* Arquivo */}
              {s.arquivo ? (
                <a 
                  href={s.arquivo} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <Download size={18} />
                  <span className="text-[10px] font-black uppercase truncate">Baixar Arte Anexada</span>
                </a>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl text-slate-400 flex items-center gap-3 border border-dashed">
                  <FileText size={18} />
                  <span className="text-[10px] font-black uppercase">{s.resolvido ? 'Arquivo Apagado' : 'Sem Anexo'}</span>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 pt-2">
                <a 
                  href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`} 
                  target="_blank"
                  className="flex-1 bg-green-500 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase hover:bg-green-600 transition-all active:scale-95"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
                
                {!s.resolvido && (
                  <button 
                    onClick={() => handleResolver(s.id)}
                    className="flex-1 bg-slate-900 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase hover:bg-black transition-all active:scale-95"
                  >
                    <CheckCircle size={16} /> Resolver
                  </button>
                )}
              </div>
            </div>
            
            {s.resolvido && (
              <div className="bg-slate-100 py-2 text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Solicitação Finalizada</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};