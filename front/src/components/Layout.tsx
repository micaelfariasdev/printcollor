import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Printer, Users, LogOut,
  Package, Building2, ChevronUp, UserCog, Menu, X,
  MessageCircle,
  DatabaseBackup,
  Monitor,
  Activity,
  MessageSquare,
} from 'lucide-react';
import { theme } from './Theme';
import { api, useAuth } from '../auth/useAuth';
import logo from '../assets/logo-printcollor.png';

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all duration-200 ${active
        ? `${theme.colors.sidebarActive} text-white shadow-lg scale-[1.02]`
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
      }`}
  >
    {icon}
    <span className="font-black text-xs uppercase tracking-tight">{label}</span>
  </button>
);

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [meData, setMeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/login'; return; }
    api.get('/me/')
      .then(res => { setMeData(res.data); setLoading(false); })
      .catch(() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); window.location.href = '/login'; });
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Carregando...</div>;

  const activeView = location.pathname.split('/').pop() || 'dashboard';
  const isAdmin = meData?.is_staff;
  const isFinanceiro = meData?.nivel_acesso === 'financeiro';

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: <LayoutDashboard size={22} />, roles: ['admin', 'financeiro'] },
    { id: 'pedidos', label: 'Produção', icon: <Package size={22} />, roles: ['all'] },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={22} />, roles: ['all'] },
    { id: 'orcamentos', label: 'Orçamentos', icon: <FileText size={22} />, roles: ['admin', 'financeiro'] },
    { id: 'dtf', label: 'DTF / UV', icon: <Printer size={22} />, roles: ['all'] },
    { id: 'clientes', label: 'Clientes', icon: <Users size={22} />, roles: ['admin', 'financeiro'] },
    { id: 'produtos', label: 'Produtos', icon: <Package size={22} />, roles: ['admin', 'financeiro'] },
    { id: 'empresas', label: 'Unidades', icon: <Building2 size={22} />, roles: ['admin', 'financeiro'] },
    { id: 'usuarios', label: 'Equipe', icon: <Users size={22} />, roles: ['admin'] },
    { id: 'orcamentos-clientes', label: 'Pedidos Site', icon: <MessageCircle size={22} />, roles: ['admin', 'financeiro'] },
    { id: 'backup', label: 'Backup', icon: <DatabaseBackup size={22} />, roles: ['admin', 'financeiro'] },
    { id: 'whatsapp-instances', label: 'Instâncias', icon: <MessageCircle size={22} />, roles: ['all'] },
    { id: 'monitor', label: 'Fila de Produção', icon: <Monitor size={22} className="text-blue-500" />, roles: ['all'], isExternal: true },
  ];

  const handleNav = (id: string, isExternal?: boolean) => {
    if (isExternal) {
      navigate('/pedidos-carrossel'); // Rota fora do layout admin
    } else {
      navigate(`/painel/${id}`);
    }
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">

      {/* BOTÃO FLUTUANTE (FAB) - ACESSO RÁPIDO AO CARROSSEL */}
      <Link
        to='/pedidos-carrossel'
        className="md:hidden fixed bottom-24 md:bottom-10 right-6 z-[120] bg-blue-600 text-white w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all border-4 border-[#0f172a]"
        title="Modo Produção Live"
      >
        <Activity size={28} className="animate-pulse" />
      </Link>

      {/* Botão Flutuante - Mobile Menu */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed bottom-6 right-6 z-[110] bg-slate-900 text-white p-4 rounded-full shadow-2xl active:scale-90 transition-all border border-slate-800"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[100] w-72 bg-[#0f172a] text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 border-b border-slate-800/50">
          <img src={logo} alt="Logo" className="w-full h-30 mb-4 object-contain mx-auto" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-500 uppercase italic">V {theme.appVersion}</span>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {isAdmin ? 'Diretoria' : meData?.nivel_acesso}
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          {menuItems
            .filter(item => {
              if (isAdmin) return true;
              if (isFinanceiro) return item.roles.includes('all') || item.roles.includes('financeiro');
              return item.roles.includes('all');
            })
            .map(item => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeView === item.id}
                onClick={() => handleNav(item.id, item.isExternal)}
              />
            ))}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800/50 relative">
          {showProfileMenu && (
            <div className="absolute bottom-24 left-4 right-4 bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
              <button onClick={() => handleNav('configuracoes')} className="w-full flex items-center gap-3 p-4 text-slate-300 hover:bg-slate-700 transition-all text-[10px] font-black uppercase">
                <UserCog size={18} className="text-blue-400" /> Configurações
              </button>
              <button onClick={logout} className="w-full flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 transition-all text-[10px] font-black uppercase border-t border-slate-700">
                <LogOut size={18} /> Sair do Sistema
              </button>
            </div>
          )}
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${showProfileMenu ? 'bg-slate-800 ring-1 ring-slate-700' : 'hover:bg-slate-800/40'}`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg uppercase">
              {meData?.username?.charAt(0)}
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-black truncate uppercase italic">{meData?.first_name || meData?.username}</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ativo Agora</p>
              </div>
            </div>
            <ChevronUp size={16} className={`text-slate-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar pb-24 md:pb-0">
        <div className="p-4 md:p-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
};