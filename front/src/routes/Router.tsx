import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import { Layout } from '../components/Layout';

// Visualização externa
import VisualizarPedidoPage from '../pages/VisualizarPedidoPage';
import VisualizarDTFPage from '../pages/VisualizarDTFPage';

// Páginas internas
import Orcamentos from '../pages/Orcamentos';
import Clients from '../pages/Clients';
import Produtos from '../pages/Produtos';
import Empresas from '../pages/Empresas';
import Usuarios from '../pages/Usuarios';
import Configuracoes from '../pages/Configuracoes';
import { AdminOrcamentosClientes } from '../pages/AdminOrcamentosClientes';
import { ConfiguracoesBackup } from '../pages/ConfiguracoesBackup';
import WhatsAppUnified from '../pages/WhatsAppUnified';
import WhatsAppInstances from '../pages/WhatsAppInstances';
import { LandingPage } from '../pages/LandingPage';
import { PedidosCarrosselMobile } from '../pages/PedidosCarrosselMobile';
import { DTFTable } from '../pages/DTF';
import { PedidosFabrica } from '../pages/PedidosFabrica';
import Relatorios from '../pages/Relatorios';
// useState e useEffect removidos - não utilizados
import { useState, useEffect } from 'react';

// Componente para verificar se o usuário é admin ou financeiro
const AdminFinanceiroRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meData, setMeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/login'; return; }
    import('../auth/useAuth').then(module => {
      module.api.get('/me/')
        .then(res => { setMeData(res.data); setLoading(false); })
        .catch(() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); window.location.href = '/login'; });
    });
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Carregando...</div>;
  if (meData?.is_staff || meData?.nivel_acesso === 'financeiro') {
    return <>{children}</>;
  }
  return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Acesso restrito.</div>;
};

export const AppRouter = () => {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Visualização Externa */}
      <Route path="/pedido/:id/visualizar" element={<VisualizarPedidoPage />} />
      <Route path="/dtf/:id/visualizar" element={<VisualizarDTFPage />} />
      <Route path="/pedidos-carrossel" element={<PedidosCarrosselMobile />} />

      {/* Painel Interno com Layout sidebar */}
      <Route element={<Layout />}>
        <Route path="/painel">
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dtf" element={<DTFTable />} />
          <Route path="dashboard" element={<div className="p-6"><h1 className="text-2xl font-bold">Dashboard</h1><p>Bem-vindo ao painel.</p></div>} />
          <Route path="orcamentos" element={<AdminFinanceiroRoute><Orcamentos /></AdminFinanceiroRoute>} />
          <Route path="clientes" element={<AdminFinanceiroRoute><Clients /></AdminFinanceiroRoute>} />
          <Route path="produtos" element={<AdminFinanceiroRoute><Produtos /></AdminFinanceiroRoute>} />
          <Route path="empresas" element={<AdminFinanceiroRoute><Empresas /></AdminFinanceiroRoute>} />
          <Route path="usuarios" element={<AdminFinanceiroRoute><Usuarios /></AdminFinanceiroRoute>} />
          <Route path="pedidos" element={<PedidosFabrica />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="whatsapp" element={<WhatsAppUnified />} />
          <Route path="whatsapp-instances" element={<WhatsAppInstances />} />
          <Route path="orcamentos-clientes" element={<AdminFinanceiroRoute><AdminOrcamentosClientes /></AdminFinanceiroRoute>} />
          <Route path="backup" element={<AdminFinanceiroRoute><ConfiguracoesBackup /></AdminFinanceiroRoute>} />
          <Route path="relatorios" element={<AdminFinanceiroRoute><Relatorios /></AdminFinanceiroRoute>} />
        </Route>
      </Route>

      {/* Fallbacks */}
      <Route path="*" element={<Navigate to="/painel" replace />} />
    </Routes>
  );
};
