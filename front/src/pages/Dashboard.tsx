import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Printer,
  Users,
  LogOut,
  Package,
  Building2,
  ChevronUp,
  UserCog,
} from 'lucide-react';
import { theme } from '../components/Theme';
import { DTFTable } from './DTF';
import { api, useAuth } from '../auth/useAuth';
import Orcamentos from './Orcamentos';
import Clients from './Clients';
import { formatarReal } from '../tools/formatReal';
import Produtos from './Produtos';
import Empresas from './Empresas';
import Usuarios from './Usuarios';
import { DashboardSkeleton } from '../components/Skeleton';
import Configuracoes from './Configuracoes';
import { PedidosFabrica } from './PedidosFabrica';

export type View =
  | 'dashboard'
  | 'orcamentos'
  | 'dtf'
  | 'clientes'
  | 'produtos'
  | 'empresas'
  | 'usuarios'
  | 'pedidos'
  | 'configuracoes';

// --- COMPONENTES DE APOIO ---

const Card = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${color}`}>
    <p className="text-slate-500 text-sm font-bold uppercase">{label}</p>
    <h3 className="text-2xl font-black text-slate-800">{value}</h3>
  </div>
);

// --- COMPONENTE PRINCIPAL ---

const Dashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [meData, setMeData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isMaquina, setIsMaquina] = useState<boolean>(false);
  const [isFinanceiro, setIsFinanceiro] = useState<boolean>(false);

  const titles: Record<View, string> = {
    dashboard: 'Painel de Controle',
    orcamentos: 'Gestão de Orçamentos',
    dtf: 'Pedidos de DTF',
    clientes: 'Carteira de Clientes',
    produtos: 'Catálogo de Produtos',
    empresas: 'Minhas Unidades',
    usuarios: 'Equipe PrintCollor',
    configuracoes: 'Configurações da Conta',
    pedidos: 'Pedidos',
  };

  useEffect(() => {
    const currentTitle = titles[activeView] || activeView;
    document.title = `${currentTitle} | ${theme.appName}`;
  }, [activeView]);

  const { logout } = useAuth();
  useEffect(() => {
    api
      .get('/me/')
      .then((response) => {
        setMeData(response.data);
        setIsAdmin(response.data.is_staff);
        setIsFinanceiro(response.data.nivel_acesso === 'financeiro');
        setIsMaquina(response.data.nivel_acesso === 'maquina');
        if (response.data.nivel_acesso === 'maquina') {
          setActiveView('dtf');
        }
      })
      .catch(() => {
        window.location.href = '/login';
      });
    api.get('/dashboard/').then((response) => {
      setStats(response.data);
    });
    console.log(meData);
  }, []);

  const SummaryCards = () => (
    <div>
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          Resumo do Mês -{' '}
          {new Date().toLocaleString('default', { month: 'long' })}{' '}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card
          label="Total de Orçamentos"
          value={`${stats?.total_orcamento || 0}`}
          color="border-blue-600"
        />
        <Card
          label="Metros DTF (Mês)"
          value={`${stats?.metragem_dtf || 0} cm`}
          color="border-green-600"
        />
        <Card
          label="Total de vendas DTF"
          value={`${stats?.total_vendas_dtf || 0} Pedidos`}
          color="border-purple-600"
        />
        <Card
          label="Total em vendas DTF"
          value={`${formatarReal(stats?.total_dtf_valor || 0)}`}
          color="border-purple-600"
        />
      </div>
    </div>
  );

  if (!meData) {
    return <DashboardSkeleton />;
  }

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      roles: ['admin', 'financeiro'], // Removido 'all' para esconder da máquina
    },  {
      id: 'pedidos',
      label: 'Pedidos',
      icon: <Package size={20} />,
      roles: ['all'],
    },
    {
      id: 'orcamentos',
      label: 'Orçamentos',
      icon: <FileText size={20} />,
      roles: ['admin', 'financeiro'], // Removido 'all'
    },
    {
      id: 'dtf',
      label: 'Vendas DTF',
      icon: <Printer size={20} />,
      roles: ['all'], // 'all' inclui a máquina
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: <Users size={20} />,
      roles: ['admin', 'financeiro'], // Removido 'all'
    },
    {
      id: 'produtos',
      label: 'Produtos',
      icon: <Package size={20} />,
      roles: ['admin', 'financeiro'], // Removido 'all'
    },
    {
      id: 'empresas',
      label: 'Empresas',
      icon: <Building2 size={20} />,
      roles: ['admin', 'financeiro'],
    },
    {
      id: 'usuarios',
      label: 'Usuários',
      icon: <Users size={20} />,
      roles: ['admin'],
    },
  
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside
        className={`w-64 ${theme.colors.sidebarBg} text-white flex flex-col`}
      >
        <div className="p-6 text-2xl font-bold border-b border-slate-800">
          {theme.appName}{' '}
          <span className={theme.colors.accentText}>
            {meData?.is_staff ? 'Administradora' : meData?.nivel_acesso}
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems
            .filter(
              (item) =>
                item.roles.includes('all') ||
                (item.roles.includes('admin') && isAdmin) ||
                (item.roles.includes('financeiro') && isFinanceiro) ||
                (item.roles.includes('maquina') && isMaquina) // Adicionado cargo maquina aqui
            )
            .map((item) => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeView === item.id}
                onClick={() => setActiveView(item.id as View)}
              />
            ))}
        </nav>

        <div className="p-4 border-t border-slate-800 relative">
          {/* Dropdown de Opções */}
          {showProfileMenu && (
            <div className="absolute bottom-20 left-4 right-4 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setActiveView('configuracoes');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-all text-sm font-bold"
                >
                  <UserCog size={18} className="text-blue-400" />
                  Configurações
                </button>

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-sm font-bold"
                >
                  <LogOut size={18} />
                  Sair do Sistema
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`w-full flex items-center gap-3 p-2 rounded-2xl transition-all border ${
              showProfileMenu
                ? 'bg-slate-800 border-slate-700'
                : 'border-transparent hover:bg-slate-800/50'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg">
              {meData?.username?.charAt(0).toUpperCase() || 'A'}
            </div>

            <div className="flex-1 text-left overflow-hidden">
              <p className="text-sm font-black text-white truncate uppercase italic">
                {(meData?.first_name && meData?.last_name
                  ? `${meData?.first_name} ${meData?.last_name}`
                  : meData?.username) || 'Usuária'}
              </p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                {meData?.is_staff ? 'Administradora' : meData?.nivel_acesso}
              </p>
            </div>

            <div
              className={`text-slate-500 transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`}
            >
              <ChevronUp size={16} />
            </div>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800 capitalize">
            {activeView}
          </h2>
        </header>

        {/* Apenas DTF e Configurações são permitidos para Máquina */}
        {activeView === 'dtf' && <DTFTable />}
        {activeView === 'pedidos' && <PedidosFabrica />}
        {activeView === 'configuracoes' && <Configuracoes />}

        {/* Abas restritas: Só renderizam se NÃO for máquina */}
        {!isMaquina && (
          <>
            {activeView === 'dashboard' && <SummaryCards />}
            {activeView === 'orcamentos' && <Orcamentos />}
            {activeView === 'clientes' && <Clients />}
            {activeView === 'produtos' && <Produtos />}
          </>
        )}

        {/* Abas exclusivas de Admin/Financeiro */}
        {isAdmin || isFinanceiro ? (
          <>
            {activeView === 'empresas' && <Empresas />}
            {activeView === 'usuarios' && <Usuarios />}
          </>
        ) : null}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition ${
      active
        ? `${theme.colors.sidebarActive} text-white shadow-lg`
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

export default Dashboard;
