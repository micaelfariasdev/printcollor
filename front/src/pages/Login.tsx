import React, { useState } from 'react';
import { Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { theme } from '../components/Theme';
import { useAuth } from '../auth/useAuth';
import { useAlert } from '../contexts/AlertContext';
import { useNavigate } from 'react-router';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addAlert } = useAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData);
      // Correção: acessando o username diretamente do formData
      addAlert(`Bem-vinda de volta, ${formData.username}!`, 'success');
      navigate('/');
    } catch (err) {
      // Feedback visual via sistema de alertas animado
      addAlert(
        'Credenciais inválidas. Verifique seu usuário e senha.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className={`p-8 ${theme.colors.sidebarBg} text-center`}>
          <h1 className="text-3xl font-black text-white italic">
            {theme.appName}{' '}
            <span className={theme.colors.accentText}>{theme.appTag}</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Acesse o painel administrativo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500 uppercase">
              Usuário
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-3 text-slate-400"
                size={18}
              />
              <input
                required
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500 uppercase">
              Senha
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-3 text-slate-400"
                size={18}
              />
              <input
                required
                type="password"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
          </div>

          <button
            disabled={loading}
            className={`w-full ${theme.colors.primaryButton} text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50`}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span>Entrar no Sistema</span> <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
