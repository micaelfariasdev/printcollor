import { useEffect, useRef } from 'react';
import { useAlert } from '../contexts/AlertContext';

interface DTFNotification {
  event: string;
  id: number;
  nome_cliente: string;
}

export function useDTFWebSocket() {
  const { addAlert } = useAlert();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const connect = () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/dtf/?token=${token}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS-DTF] Conectado');
      };

      ws.onmessage = (event) => {
        try {
          const data: DTFNotification = JSON.parse(event.data);
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
  }, [addAlert]);
}