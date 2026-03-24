import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

type AlertType = 'success' | 'error' | 'info';

interface Alert {
  id: number;
  message: string;
  type: AlertType;
}

interface AlertContextData {
  addAlert: (message: string, type: AlertType) => void;
}

const AlertContext = createContext<AlertContextData>({} as AlertContextData);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = useCallback((message: string, type: AlertType) => {
    const id = Date.now();
    setAlerts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }, 4000);
  }, []);

  return (
    <AlertContext.Provider value={{ addAlert }}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`
              pointer-events-auto flex flex-col overflow-hidden rounded-2xl shadow-2xl border min-w-[320px] max-w-[400px]
              bg-white animate-in slide-in-from-right-full duration-500
              ${alert.type === 'success' ? 'border-green-100' : ''}
              ${alert.type === 'error' ? 'border-red-100' : ''}
              ${alert.type === 'info' ? 'border-blue-100' : ''}
            `}
          >
            <div className="flex items-center gap-3 p-4">
              {alert.type === 'success' && <CheckCircle2 className="text-green-500" size={22} />}
              {alert.type === 'error' && <AlertCircle className="text-red-500" size={22} />}
              {alert.type === 'info' && <Info className="text-blue-500" size={22} />}
              
              <span className="flex-1 font-black text-[11px] uppercase tracking-tight text-slate-700">
                {alert.message}
              </span>
              
              <button 
                onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={16} className="text-slate-300" />
              </button>
            </div>

            {/* BARRA DE PROGRESSO ANIMADA */}
            <div className="h-1 w-full bg-slate-50 relative">
              <div 
                className={`h-full absolute left-0 top-0 transition-all linear duration-[4000ms] w-0
                  ${alert.type === 'success' ? 'bg-green-500' : ''}
                  ${alert.type === 'error' ? 'bg-red-500' : ''}
                  ${alert.type === 'info' ? 'bg-blue-500' : ''}
                `}
                style={{ animation: 'progress-timer 4s linear forwards' }}
              />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes progress-timer {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);