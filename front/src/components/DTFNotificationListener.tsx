import { useEffect, useRef } from 'react';
import { useAlert } from '../contexts/AlertContext';
import { useNotifications } from '../contexts/NotificationContext';

/**
 * Componente de nível app que mantém o WebSocket DTF conectado.
 * Renderize uma vez em main.tsx, dentro do AlertProvider.
 */
export function DTFNotificationListener() {
  const { addAlert } = useAlert();
  const { silenciado } = useNotifications();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const connect = () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        // Tenta novamente em 2s se não tiver token (pode ser que ainda não carregou)
        reconnectTimerRef.current = setTimeout(connect, 2000);
        return;
      }

      // Monta URL do WS: extrai host:port do VITE_API_URL (http://localhost:8000/api -> ws://localhost:8000)
      const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api';
      try {
        const parsed = new URL(apiUrl);
        var wsBase = `ws://${parsed.host}`;
      } catch {
        var wsBase = 'ws://localhost:8000';
      }
      const wsUrl = `${wsBase}/ws/dtf/?token=${token}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS-DTF] Conectado');
      };

      ws.onmessage = (event) => {
        if (silenciado) return;
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'impresso') {
            const message = `Pedido ${data.id} de ${data.nome_cliente} está impresso`;
            addAlert(message, 'info');

            // TTS em português brasileiro
            const utter = new SpeechSynthesisUtterance(message);
            utter.lang = 'pt-BR';
            utter.volume = 1;
            speechSynthesis.speak(utter);
          }
        } catch {
          console.error('[WS-DTF] Erro ao parsear mensagem:', event.data);
        }
      };

      ws.onclose = () => {
        console.log('[WS-DTF] Desconectado, tentando reconectar em 3s...');
        wsRef.current = null;
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [addAlert, silenciado]);

  return null;
}