import React from 'react';
import { UserPlus, ShieldCheck, Lock } from 'lucide-react';
import { theme } from '../components/Theme';

const Register: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="p-8 text-center border-b border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Novo Cadastro</h2>
          <p className="text-slate-500 text-sm">Crie sua conta no {theme.appName}.</p>
        </div>

        <form className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Usuário */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Username</label>
            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Cargo/Nível de Acesso */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Cargo</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="vendedor">Vendedor</option>
              <option value="financeiro">Financeiro</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Confirmar Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          </div>

          {/* Código de Convite */}
          <div className="space-y-2 md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <label className="text-sm font-bold text-blue-800 flex items-center">
              <ShieldCheck size={16} className="mr-2" /> Código de Convite
            </label>
            <input 
              type="text" 
              placeholder="Digite o código obrigatório"
              className="w-full bg-white border border-blue-200 rounded-lg p-2.5 mt-2 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Botão de Ação */}
          <button className={`md:col-span-2 ${theme.colors.primaryButton} text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 shadow-md transition-all active:scale-95`}>
            <UserPlus size={18} />
            <span>Criar Minha Conta</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;