import React, { useEffect, useState } from 'react';
import { api } from './auth/useAuth';
import { AppRouter } from './routes/Router';
import { DashboardSkeleton } from './components/Skeleton';

interface UsuarioData {
  nivel_acesso?: string;
  is_staff?: boolean;
  [key: string]: any;
}

const App = () => {
  const [meData, setMeData] = useState<UsuarioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const path = window.location.pathname;

    // Se não tem token ou está na página de login/register, não busca /me/
    if (!token || path === '/login' || path === '/register') {
      setMeData(null);
      setIsLoading(false);
      return;
    }

    api.get('/me/')
      .then((res) => setMeData(res.data))
      .catch(() => {
        // Token inválido ou expirado, limpa e não fica em loop
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setMeData(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return <AppRouter meData={meData} />;
};

export default App;
