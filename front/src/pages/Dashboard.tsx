import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Printer,
  Users,
  LogOut,
  PlusCircle,
} from 'lucide-react';
import { theme } from '../components/Theme';
import { DTFTable } from '../components/DTF';
import { api } from '../auth/useAuth';
import Orcamentos from '../components/Orcamentos';

type View = 'dashboard' | 'orcamentos' | 'dtf' | 'clientes';

// --- COMPONENTES DE APOIO ---

const SummaryCards = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <Card
      label="Total em Orçamentos"
      value="R$ 12.450,00"
      color="border-blue-600"
    />
    <Card label="Metros DTF (Mês)" value="45.2 m" color="border-green-600" />
    <Card
      label="Aguardando Impressão"
      value="08 Pedidos"
      color="border-purple-600"
    />
  </div>
);

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

  useEffect(() => {
    api.get('/me/').then((response) => {
      setMeData(response.data);
    });
    console.log(meData);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside
        className={`w-64 ${theme.colors.sidebarBg} text-white flex flex-col`}
      >
        <div className="p-6 text-2xl font-bold border-b border-slate-800">
          {theme.appName}{' '}
          <span className={theme.colors.accentText}>
            {meData?.nivel_acesso || 'Admin'}
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active={activeView === 'dashboard'}
            onClick={() => setActiveView('dashboard')}
          />
          <NavItem
            icon={<FileText size={20} />}
            label="Orçamentos"
            active={activeView === 'orcamentos'}
            onClick={() => setActiveView('orcamentos')}
          />
          <NavItem
            icon={<Printer size={20} />}
            label="Vendas DTF"
            active={activeView === 'dtf'}
            onClick={() => setActiveView('dtf')}
          />
          <NavItem
            icon={<Users size={20} />}
            label="Clientes"
            active={activeView === 'clientes'}
            onClick={() => setActiveView('clientes')}
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center space-x-3 text-slate-400 hover:text-white transition">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800 capitalize">
            {activeView}
          </h2>
        </header>

        {activeView === 'dashboard' && <SummaryCards />}
        {activeView === 'orcamentos' && <Orcamentos />}
        {activeView === 'dtf' && <DTFTable />}
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
