import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';
import Register from '../pages/Register';

// Visualização externa
import VisualizarPedidoPage from '../pages/VisualizarPedidoPage';
import VisualizarDTFPage from '../pages/VisualizarDTFPage';

// Páginas internas
import SummaryCards from '../components/SummaryCards';
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

interface UsuarioData {
  nivel_acesso?: string;
  is_staff?: boolean;
  [key: string]: any;
}

interface AppRouterProps {
  meData: UsuarioData | null;
}

export const AppRouter = ({ meData }: AppRouterProps) => {
  const isMaquina = meData?.nivel_acesso === 'maquina';
  const isAdminOrFinanceiro = meData?.is_staff || meData?.nivel_acesso === 'financeiro';

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

      {/* Painel Interno */}
      <Route path="/painel" element={<Dashboard meData={meData} />}>
        <Route
          index
          element={<Navigate to={isMaquina ? 'dtf' : 'dashboard'} replace />}
        />

        <Route path="dtf" element={<DTFTable />} />
        <Route path="pedidos" element={<PedidosFabrica />} />
        <Route path="configuracoes" element={<Configuracoes />} />

        {!isMaquina && (
          <>
            <Route path="dashboard" element={<SummaryCards />} />
            <Route path="orcamentos" element={<Orcamentos />} />
            <Route path="clientes" element={<Clients />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="orcamentos-clientes" element={<AdminOrcamentosClientes />} />
            <Route path="backup" element={<ConfiguracoesBackup />} />
          </>
        )}

        {isAdminOrFinanceiro && (
          <>
            <Route path="empresas" element={<Empresas />} />
            <Route path="usuarios" element={<Usuarios />} />
          </>
        )}

        <Route path="whatsapp" element={<WhatsAppUnified />} />
        <Route path="whatsapp-instances" element={<WhatsAppInstances />} />
      </Route>

      {/* Fallbacks */}
      <Route path="/" element={<Navigate to="/painel" replace />} />
      <Route path="*" element={<Navigate to="/painel" replace />} />
    </Routes>
  );
};
