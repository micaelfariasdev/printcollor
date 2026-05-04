import React, { useState } from 'react';
import { api } from '../auth/useAuth';
import { Download, Upload, ShieldAlert, Loader2, Database, HardDrive } from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';

export const ConfiguracoesBackup = () => {
  const [loading, setLoading] = useState(false);
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

  const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("ATENÇÃO: Restaurar um backup irá sobrescrever dados atuais. Continuar?")) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('backup_file', file);

    try {
      await api.post('backup/importar/', formData);
      addAlert('Sistema restaurado! Recarregando...', 'success');
      setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
      addAlert('Erro ao restaurar arquivo.', 'error');
    } finally {
      setLoading(false);
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
              Suba um arquivo .zip de backup para atualizar o servidor. Cuidado: isso substitui os dados atuais!
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
    </div>
  );
};