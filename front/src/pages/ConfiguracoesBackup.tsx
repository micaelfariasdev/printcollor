import React, { useState } from 'react';
import { api } from '../auth/useAuth';
import { Download, Upload, ShieldAlert, Loader2, Database, HardDrive, Lock, X } from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';

export const ConfiguracoesBackup = () => {
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [passwordError, setPasswordError] = useState('');
  const { addAlert } = useAlert();

  const handleDownloadBackup = async () => {
    setLoading(true);
    try {
      const response = await api.get('backup/exportar/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_printcollor_${new Date().toLocaleDateString('pt-BR')}.zip`);
      document.body.appendChild(link);
      link.click();
      addAlert('Backup gerado com sucesso!', 'success');
    } catch (e) {
      addAlert('Erro ao gerar backup.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const confirmRestore = async () => {
    if (!pendingFile || !password) {
      setPasswordError('Senha é obrigatória.');
      return;
    }
    setShowPasswordModal(false);
    setLoading(true);
    const formData = new FormData();
    formData.append('backup', pendingFile);
    formData.append('password', password);

    try {
      await api.post('backup/importar/', formData);
      addAlert('Sistema restaurado! Recarregando...', 'success');
      setTimeout(() => window.location.reload(), 2000);
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Erro ao restaurar arquivo.';
      addAlert(msg, 'error');
    } finally {
      setLoading(false);
      setPendingFile(null);
      setPassword('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-left">
      <header>
        <h2 className="text-3xl font-black uppercase italic text-slate-800">Segurança do Sistema</h2>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Gerencie backups do banco e arquivos de mídia</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Card Exportar */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Download size={28} />
            </div>
            <h3 className="text-xl font-black uppercase italic">Gerar Backup</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              Cria um arquivo .zip contendo todo o banco de dados e as fotos de layouts e comprovantes.
            </p>
          </div>
          <button
            onClick={handleDownloadBackup}
            disabled={loading}
            className="mt-8 w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase italic flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><HardDrive size={20} /> Baixar Tudo</>}
          </button>
        </div>

        {/* Card Importar */}
        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Database size={100} /></div>
          <div className="space-y-4 relative z-10">
            <div className="w-14 h-14 bg-white/10 text-blue-400 rounded-2xl flex items-center justify-center">
              <Upload size={28} />
            </div>
            <h3 className="text-xl font-black uppercase italic">Restaurar</h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Suba um arquivo .zip de backup para atualizar o servidor. Cuidado: isso substituirá os dados atuais!
            </p>
          </div>

          <label className="mt-8 cursor-pointer group">
            <input type="file" accept=".zip" className="hidden" onChange={handleUploadBackup} disabled={loading} />
            <div className="w-full bg-white/10 border border-white/20 text-white py-4 rounded-2xl font-black uppercase italic flex items-center justify-center gap-3 group-hover:bg-white/20 transition-all">
              {loading ? <Loader2 className="animate-spin" /> : <><ShieldAlert size={20} className="text-orange-400" /> Subir Arquivo</>}
            </div>
          </label>
        </div>
      </div>

      {/* Modal de Senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
              <h2 className="text-2xl font-black text-slate-800 uppercase italic flex items-center gap-3">
                <Lock size={24} className="text-blue-500" /> Confirmar Restauração
              </h2>
              <button onClick={() => { setShowPasswordModal(false); setPendingFile(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Digite sua senha para confirmar a restauração do backup. <strong className="text-slate-700">Atenção:</strong> isso substituirá todos os dados atuais.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase ml-1">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  placeholder="Sua senha de acesso"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmRestore(); }}
                />
                {passwordError && <span className="text-xs text-red-500 font-bold">{passwordError}</span>}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => { setShowPasswordModal(false); setPendingFile(null); }}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRestore}
                disabled={loading}
                className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-black transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
