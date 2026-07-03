import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NotificationContextType {
  silenciado: boolean;
  toggle: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  silenciado: false,
  toggle: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [silenciado, setSilenciado] = useState(() => {
    return localStorage.getItem('notificacoes_silenciadas') === 'true';
  });

  const toggle = () => {
    const next = !silenciado;
    setSilenciado(next);
    localStorage.setItem('notificacoes_silenciadas', String(next));
  };

  return (
    <NotificationContext.Provider value={{ silenciado, toggle }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}