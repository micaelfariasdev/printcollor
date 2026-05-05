import { api } from '../auth/useAuth';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAlert } from '../contexts/AlertContext';
import CachedImage from '../components/CachedImage';
import ModalNovoDTF from '../components/ModalNovoDTF';

interface Chat {
  jid: string;
  name: string;
  lastMessage: string;
  profilePicUrl: string | null;
  lastMessageTimestamp: number;
  instanceName: string;
  instanceId?: number;
  instanceCor?: string;
  unreadCount: number;
  has_client?: boolean;
  cliente_nome?: string;
  cliente_id?: number;
}

interface Message {
  id: string;
  body: string;
  from_me: boolean;
  instanceId: number;
  instance_nome: string;
  numero: string;
  timestamp: number;
  messageType: string;
  media_url?: string;
  fileName?: string;
  pushName?: string;
  profilePicUrl?: string | null;
  isGroup?: boolean;
  read?: boolean;
}

const WhatsAppUnified: React.FC = () => {
  const { addAlert } = useAlert();
  const [chats, setChats] = useState<Chat[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [creatingClientFromChat, setCreatingClientFromChat] = useState<Chat | null>(null);
  const [showNovoPedidoModal, setShowNovoPedidoModal] = useState(false);
  const [selectedChatClienteId, setSelectedChatClienteId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView();
      });
    });
  };

  // Scroll pro fim quando mensagens carregam (não apenas na troca de chat)
  const prevChatRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedChat?.jid !== prevChatRef.current) {
      // Trocou de chat: só scrolla quando as mensagens carregarem
      prevChatRef.current = selectedChat?.jid || null;
      return;
    }
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, selectedChat]);

  useEffect(() => {
    if (selectedChat?.has_client && selectedChat?.cliente_id) {
      setSelectedChatClienteId(selectedChat.cliente_id.toString());
    } else {
      setSelectedChatClienteId('');
    }
  }, [selectedChat?.jid]);

  const downloadFile = (base64String, fileName) => {
    try {
      const cleanBase64 = base64String.includes(',')
        ? base64String.split(',')[1]
        : base64String;

      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "arquivo.pdf";

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao processar download:", error);
    }
  };

  const loadInstances = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp-instances/');
      setInstances(res.data || []);
    } catch (error) {
      console.error('[loadInstances] Erro:', error);
    }
  }, []);

  const loadChats = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/unificado/');
      const chatsData: Chat[] = res.data.chats || [];
      const instancesRes = await api.get('/whatsapp-instances/');
      const insts = instancesRes.data || [];
      const enriched = chatsData.map((chat: Chat) => {
        const inst = insts.find((i: any) => i.nome === chat.instanceName);
        return {
          ...chat,
          instanceId: inst?.id,
          instanceCor: inst?.cor || '#25D366',
        };
      });
      setChats(enriched);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        addAlert('Sessão expirada. Faça login novamente.', 'error');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstances();
    loadChats();
  }, [loadInstances, loadChats]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('access_token') || '';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/whatsapp/?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Conectado ao WebSocket WhatsApp');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WS] Mensagem recebida:', data);

        // Normaliza timestamp: aceita string de data ou epoch
        let ts: number;
        if (typeof data.timestamp === 'string' && isNaN(Number(data.timestamp))) {
          ts = new Date(data.timestamp).getTime();
        } else {
          const parsed = Number(data.timestamp || data.messageTimestamp || Date.now());
          ts = parsed > 9999999999 ? parsed : parsed * 1000;
        }

        // Extrai o número limpo (sem @s.whatsapp.net, @lid, etc)
        const remoteJid = data.jid || data.numero || data.from_number || '';
        const fromNumber = extractNumberFromJid(remoteJid);
        const instanceName = data.instance_nome || data.instanceName || '';
        const pushName = data.pushName || data.push_name || '';

        const msg: Message = {
          id: data.message_id || data.id || '',
          body: data.body || '',
          from_me: data.from_me || false,
          instanceId: data.instance_id || data.instanceId || 0,
          instance_nome: instanceName,
          numero: remoteJid,
          timestamp: ts,
          messageType: normalizeMessageType(data.messageType || 'text'),
          media_url: data.media_url || '',
          pushName: pushName,
          profilePicUrl: data.profilePicUrl || null,
          isGroup: data.isGroup || false,
          read: data.read || false,
        };

        // Atualiza mensagens se for do chat selecionado (match por pushName ou jid)
        if (selectedChat && remoteJid && instanceName) {
          const isFromSelectedChat =
            (remoteJid === selectedChat.jid || pushName === selectedChat.name) &&
            instanceName === selectedChat.instanceName;

          if (isFromSelectedChat) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }

        // Atualiza a lista de conversas quando recebe mensagem via WS
        // Match por pushName (JID pode variar entre @s.whatsapp.net e @lid)
        if (pushName && instanceName) {
          setChats(prev => {
            const existing = prev.find(c =>
              c.name === pushName &&
              c.instanceName === instanceName
            );

            // Verifica se é o chat selecionado
            const isSelectedChat = selectedChat &&
              selectedChat.name === pushName &&
              selectedChat.instanceName === instanceName;

            if (existing) {
              // Atualiza a última mensagem do chat existente
              return prev.map(c =>
                (c.name === pushName && c.instanceName === instanceName)
                  ? {
                      ...c,
                      lastMessage: msg.body,
                      lastMessageTimestamp: msg.timestamp,
                      // Só incrementa se não for o chat selecionado e msg não for do usuário
                      unreadCount: (!isSelectedChat && !msg.from_me)
                        ? (c.unreadCount || 0) + 1
                        : (isSelectedChat ? 0 : c.unreadCount)
                    }
                  : c
              );
            } else {
              // Adiciona novo chat na lista
              return [...prev, {
                jid: remoteJid,
                name: pushName,
                instanceName: instanceName,
                instanceId: msg.instanceId,
                instanceCor: '#25D366',
                lastMessage: msg.body,
                lastMessageTimestamp: msg.timestamp,
                unreadCount: (!isSelectedChat && !msg.from_me) ? 1 : 0,
              }];
            }
          });
        }
      } catch (err) {
        console.error('[WS] Erro ao processar mensagem:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] Erro no WebSocket:', error);
    };

    ws.onclose = () => {
      console.log('[WS] Desconectado');
    };

    return () => {
      ws.close();
    };
  }, []);

  const extractMessageBody = (msg: any): string => {
    if (msg.message?.conversation) return msg.message.conversation;
    if (msg.message?.extendedTextMessage?.text) return msg.message.extendedTextMessage.text;
    if (msg.message?.imageMessage?.caption) return msg.message.imageMessage.caption;
    if (msg.message?.videoMessage?.caption) return msg.message.videoMessage.caption;
    if (msg.message?.documentMessage) return msg.message.documentMessage.fileName || 'Documento';
    if (msg.message?.stickerMessage) return 'Sticker';
    if (msg.message?.contactMessage) return 'Contato';
    if (msg.message?.locationMessage) return 'Localização';
    if (msg.message?.audioMessage) return 'Áudio';
    return '';
  };

  const loadMessages = useCallback(async (chat: Chat) => {
    setMessagesLoading(true);
    try {
      const instanceRes = await api.get('/whatsapp-instances/');
      const instance = instanceRes.data.find((i: any) => i.nome === chat.instanceName);
      if (!instance) {
        setMessages([]);
        return;
      }

      const numero = chat.jid;
      const res = await api.post(`/whatsapp-instances/${instance.id}/mensagens/`, {
        numero,
         limite: 50
      });

      let msgs: any[] = [];
      if (Array.isArray(res.data)) {
        msgs = res.data;
      } else if (res.data?.messages?.records && Array.isArray(res.data.messages.records)) {
        // Estrutura: { messages: { records: [...] } }
        msgs = res.data.messages.records;
      } else if (res.data?.records && Array.isArray(res.data.records)) {
        msgs = res.data.records;
      } else if (res.data?.messages && Array.isArray(res.data.messages)) {
        msgs = res.data.messages;
      }

      setMessages(msgs.map((m: any) => {
        // Histórico já vem processado no formato plano (flat)
        const isFromMe = m.from_me ?? false;
        const msgBody = m.body || '';

        // Timestamp: aceita string de data "2026-05-01 14:16:54" ou epoch
        let ts: number;
        if (m.timestamp) {
          if (typeof m.timestamp === 'number') {
            ts = m.timestamp > 9999999999 ? m.timestamp : m.timestamp * 1000;
          } else {
            ts = new Date(m.timestamp).getTime();
          }
        } else {
          ts = Date.now();
        }

        // Normalizar tipo de mensagem
        const msgType = normalizeMessageType(m.messageType || 'text');

        // URL de mídia
        const mediaUrl = m.media_url || '';

        // Nome do arquivo para download
        const fileName = m.body || 'arquivo';

        return {
          id: m.id || '',
          body: msgBody,
          from_me: isFromMe,
          instanceId: m.instanceId || instance.id,
          instance_nome: m.instance_nome || chat.instanceName,
          numero: m.numero || chat.jid,
          timestamp: ts,
          messageType: msgType,
          media_url: mediaUrl,
          pushName: m.pushName || '',
          read: m.read || false,
          fileName: fileName,
        };
      }).sort((a: Message, b: Message) => a.timestamp - b.timestamp));

      // Pré-carrega imagens no cache
      const { mediaCache } = await import('../tools/mediaCache');
      msgs.forEach((m: any) => {
        if (m.media_url && m.id) {
          const url = m.media_url.startsWith('data:')
            ? m.media_url
            : `data:image/jpeg;base64,${m.media_url}`;
          mediaCache.set(m.id, url).catch(() => {});
        }
      });
    } catch (error) {
      console.error('[loadMessages] Erro:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setShowMobileChat(true);
    loadMessages(chat);

    // Zera o contador de não lidas ao selecionar o chat
    setChats(prev => prev.map(c =>
      c.jid === chat.jid && c.instanceName === chat.instanceName
        ? { ...c, unreadCount: 0 }
        : c
    ));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const sendImage = async (file: File) => {
    if (!selectedChat || !wsRef.current) return;
    const instance = instances.find(i => i.nome === selectedChat.instanceName);
    if (!instance) return;
    const numero = selectedChat.jid;
    try {
      const base64WithPrefix = await fileToBase64(file);
      // Remove prefixo data:image/jpeg;base64,
      const base64 = base64WithPrefix.replace(/^data:.*;base64,/, '');
      wsRef.current.send(JSON.stringify({
        type: 'send_image',
        instance_id: instance.instance_id,
        numero,
        image: base64,
        caption: inputText || '',
        timestamp: Date.now(),
      }));
      const newMsg: Message = {
        id: `temp_${Date.now()}`,
        body: inputText || '[Imagem]',
        from_me: true,
        instanceId: instance.id,
        instance_nome: instance.nome,
        numero,
        timestamp: Date.now(),
        messageType: 'image',
        media_url: base64,
        pushName: 'Você',
        read: false,
      };
      setMessages(prev => [...prev, newMsg]);
      setInputText('');
      setShowAttachmentMenu(false);
    } catch (err) {
      console.error('[sendImage] Erro:', err);
      addAlert('Erro ao enviar imagem', 'error');
    }
  };

  const sendDocument = async (file: File) => {
    if (!selectedChat || !wsRef.current) return;
    const instance = instances.find(i => i.nome === selectedChat.instanceName);
    if (!instance) return;
    const numero = selectedChat.jid;
    try {
      const base64 = await fileToBase64(file);
      wsRef.current.send(JSON.stringify({
        type: 'send_document',
        instance_id: instance.instance_id,
        numero,
        file: base64,
        fileName: file.name,
        timestamp: Date.now(),
      }));
      const newMsg: Message = {
        id: `temp_${Date.now()}`,
        body: file.name,
        from_me: true,
        instanceId: instance.id,
        instance_nome: instance.nome,
        numero,
        timestamp: Date.now(),
        messageType: 'document',
        media_url: base64,
        pushName: 'Você',
        read: false,
      };
      setMessages(prev => [...prev, newMsg]);
      setShowAttachmentMenu(false);
    } catch (err) {
      console.error('[sendDocument] Erro:', err);
      addAlert('Erro ao enviar documento', 'error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      sendImage(file);
    } else {
      sendDocument(file);
    }
    e.target.value = '';
  };

  const sendMessage = () => {
    if (!inputText.trim() || !selectedChat || !wsRef.current) {
      console.error('[WS] Cannot send: missing input, chat, or ws');
      return;
    }
    const instance = instances.find(i => i.nome === selectedChat.instanceName);
    if (!instance) {
      console.error('[WS] Cannot send: instance not found');
      return;
    }

    const numero = selectedChat.jid;
    const payload = replyTo
      ? {
          type: 'reply_message',
          instance_id: instance.instance_id,
          numero,
          mensagem: inputText,
          reply_to: replyTo.id,
          timestamp: Date.now(),
        }
      : {
          type: 'send_message',
          instance_id: instance.instance_id,
          numero,
          mensagem: inputText,
          timestamp: Date.now(),
        };

    try {
      wsRef.current.send(JSON.stringify(payload));
      console.log('[WS] Message sent:', payload);
    } catch (e) {
      console.error('[WS] Send error:', e);
      addAlert('Erro ao enviar mensagem via WebSocket', 'error');
    }

    const newMsg: Message = {
      id: `temp_${Date.now()}`,
      body: inputText,
      from_me: true,
      instanceId: instance.id,
      instance_nome: instance.nome,
      numero,
      timestamp: Date.now(),
      messageType: 'text',
      pushName: 'Você',
      read: false,
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const normalizeMessageType = (type: string): string => {
    if (!type) return 'text';
    if (type === 'conversation' || type === 'extendedTextMessage') return 'text';
    if (type.includes('image')) return 'image';
    if (type.includes('video')) return 'video';
    if (type.includes('audio')) return 'audio';
    if (type.includes('document')) return 'document';
    if (type.includes('sticker')) return 'sticker';
    if (type.includes('contact')) return 'contact';
    if (type.includes('location')) return 'location';
    return type;
  };

  const formatTime = (timestamp: number | string) => {
    if (!timestamp) return '';
    let ts: number;
    if (typeof timestamp === 'number') {
      // Pode ser epoch em segundos ou ms
      ts = timestamp > 9999999999 ? timestamp : timestamp * 1000;
    } else if (typeof timestamp === 'string') {
      // Tenta parsear como número primeiro
      const parsed = Number(timestamp);
      if (!isNaN(parsed)) {
        ts = parsed > 9999999999 ? parsed : parsed * 1000;
      } else {
        // String de data (ex: "2026-05-01 14:16:54")
        ts = new Date(timestamp).getTime();
      }
    } else {
      return '';
    }
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const extractNumberFromJid = (jid: string): string => {
    const atIndex = jid.indexOf('@');
    return atIndex !== -1 ? jid.substring(0, atIndex) : jid;
  };

  const formatLastMessageTime = (timestamp: number) => {
    if (!timestamp) return '';
    // timestamp já está em milissegundos
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const handleReply = (msg: Message) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-[90vh] bg-gray-50">
      {/* Sidebar - Chats List (Fixed) */}
      <div className={`${showMobileChat ? 'hidden' : 'flex'} md:flex w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex-col`}>
        {/* Header */}
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold">Conversas</h2>
          <div className="flex gap-2">
            {instances.map(inst => (
              <div
                key={inst.id}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: inst.cor || '#25D366' }}
                title={inst.nome}
              />
            ))}
          </div>
        </div>

        {/* Chats List - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Carregando...</div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Nenhuma conversa</div>
          ) : (
            chats.map(chat => (
              <div
                key={`${chat.instanceName}-${chat.jid}`}
                onClick={() => handleSelectChat(chat)}
                className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-3 ${selectedChat?.jid === chat.jid ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
              >
                <div className="relative shrink-0">
                  {chat.profilePicUrl ? (
                    <CachedImage
                      id={`profile-${chat.jid}`}
                      src={chat.profilePicUrl}
                      alt={chat.name || '?'}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-medium">
                      {(chat.name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div
                    className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white"
                    style={{ backgroundColor: chat.instanceCor || '#25D366' }}
                  />
                  {chat.has_client && (
                    <div className="absolute top-0 left-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center" title="Cliente cadastrado">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 truncate">{chat.cliente_nome || chat.name || chat.jid}</span>
                    <span className="text-xs text-gray-500 shrink-0 ml-2">
                      {formatLastMessageTime(chat.lastMessageTimestamp)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 truncate">{chat.lastMessage}</span>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {chat.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {chat.unreadCount}
                        </span>
                      )}
                      {!chat.has_client && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreatingClientFromChat(chat);
                            setShowCreateClientModal(true);
                          }}
                          className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 transition-colors"
                          title="Criar cliente"
                        >
                          + Cliente
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!showMobileChat ? 'hidden' : 'flex'} md:flex flex-col flex-1 bg-gray-100`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0">
              <button
                className="md:hidden p-1 hover:bg-gray-800 rounded"
                onClick={() => setShowMobileChat(false)}
              >
                ←
              </button>
              {selectedChat.profilePicUrl ? (
                <CachedImage
                  id={`profile-${selectedChat.jid}`}
                  src={selectedChat.profilePicUrl}
                  alt={selectedChat.name || '?'}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-medium shrink-0">
                  {(selectedChat.name || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{selectedChat.name || selectedChat.jid}</div>
                <div className="text-xs text-gray-300 flex items-center gap-2">
                  <span>{selectedChat.instanceName}</span>
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: selectedChat.instanceCor || '#25D366' }}
                  />
                </div>
              </div>
              {selectedChat?.has_client && (
                <button
                  onClick={() => setShowNovoPedidoModal(true)}
                  className="ml-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  + Pedido
                </button>
              )}
            </div>

            {/* Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messagesLoading ? (
                <div className="text-center text-gray-500 py-8">Carregando mensagens...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">Nenhuma mensagem ainda</div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] p-3 rounded-lg shadow-sm ${msg.from_me
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-900 rounded-bl-sm'
                        }`}
                    >
                      {msg.reply_to && (
                        <div className={`p-2 rounded mb-2 text-xs ${msg.from_me ? 'bg-blue-700' : 'bg-gray-100'} border-l-4 ${msg.from_me ? 'border-blue-400' : 'border-blue-600'}`}>
                          Respondeu uma mensagem
                        </div>
                      )}

                      {/* Render message content based on type */}
                      {msg.messageType === 'image' && msg.media_url ? (
                        <div>
                          <CachedImage
                            id={`msg-${msg.id}`}
                            src={msg.media_url}
                            instanceId={msg.instanceId}
                            alt="Imagem"
                            className="w-full max-w-full h-auto rounded-lg mb-1 shadow-sm md:max-w-sm lg:max-w-md"
                            style={{
                              maxHeight: '300px',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />

                          {msg.body && !['[Imagem]', 'imageMessage'].includes(msg.body) && (
                            <div className="text-sm mt-2 leading-relaxed break-words px-1 whitespace-pre-wrap overflow-wrap-anywhere">
                              {msg.body}
                            </div>
                          )}
                        </div>
                      ) : (msg.messageType === 'document' || msg.messageType === 'documentMessage') && msg.media_url ? (
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-black/20 rounded">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{msg.fileName || msg.body || 'Documento'}</div>
                            <button
                              onClick={(e) => downloadFile(msg?.media_url, msg.fileName)}
                              className={`text-xs underline ${msg.from_me ? 'text-blue-200' : 'text-blue-600'}`}
                            >
                              Baixar
                            </button>
                          </div>
                        </div>
                      ) : msg.messageType === 'video' && msg.media_url ? (
                        <div>
                          <video
                            src={msg.media_url.startsWith('msg_id:')
                              ? `${import.meta.env.VITE_API_URL}/whatsapp-instances/${msg.instanceId}/media/?message_id=${msg.media_url.replace('msg_id:', '')}`
                              : msg.media_url}
                            controls
                            className="max-w-full rounded mb-1"
                            style={{ maxHeight: '300px' }}
                          />
                          {msg.body && msg.body !== '[Vídeo]' && (
                            <div className="text-sm mt-1">{msg.body}</div>
                          )}
                        </div>
                      ) : msg.messageType === 'audio' ? (
                        <div>
                          <audio
                            src={msg.media_url?.startsWith('msg_id:')
                              ? `${import.meta.env.VITE_API_URL}/whatsapp-instances/${msg.instanceId}/media/?message_id=${msg.media_url.replace('msg_id:', '')}`
                              : msg.media_url}
                            controls
                            className="max-w-full"
                          />
                        </div>
                      ) : (
                        <div className="text-sm">{msg.body}</div>
                      )}

                      <div className={`text-right text-xs mt-1 ${msg.from_me ? 'text-blue-200' : 'text-gray-500'}`}>
                        {formatTime(msg.timestamp)}
                        {msg.from_me && <span className="ml-1">{msg.read ? '✓✓' : '✓'}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply preview */}
            {replyTo && (
              <div className="bg-gray-200 p-3 flex items-center justify-between border-t shrink-0">
                <div className="text-sm">
                  <span className="text-blue-600 font-medium">Respondendo:</span> {replyTo.body}
                </div>
                <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-gray-700 p-1">
                  ✕
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 p-4 flex items-center gap-3 shrink-0 relative">
              {/* Attachment Menu */}
              {showAttachmentMenu && (
                <div className="absolute bottom-16 left-4 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  <button
                    onClick={() => {
                      fileInputRef.current?.setAttribute('accept', 'image/*');
                      fileInputRef.current?.click();
                      setShowAttachmentMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                  >
                    🖼️ Foto/Imagem
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current?.setAttribute('accept', '*/*');
                      fileInputRef.current?.click();
                      setShowAttachmentMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                  >
                    📎 Documento
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-bold text-lg"
                title="Anexar arquivo"
              >
                +
              </button>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />

              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Digite uma mensagem..."
                className="flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim()}
                className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Enviar
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Selecione uma conversa para começar
          </div>
        )}

        {/* Create Client Modal */}
        {showCreateClientModal && creatingClientFromChat && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Criar Cliente</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const nome = formData.get('nome') as string;
                const telefone = formData.get('telefone') as string;
                const jid = creatingClientFromChat.jid;

                try {
                  await api.post('/clientes/', { nome, telefone, jid });
                  setShowCreateClientModal(false);
                  setCreatingClientFromChat(null);
                  // Atualiza has_client localmente
                  setChats(prev => prev.map(c =>
                    c.jid === jid ? { ...c, has_client: true } : c
                  ));
                  addAlert('Cliente criado com sucesso!', 'success');
                } catch (error: any) {
                  addAlert('Erro ao criar cliente: ' + (error.response?.data?.detail || error.message), 'error');
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      name="nome"
                      type="text"
                      defaultValue={creatingClientFromChat.name || extractNumberFromJid(creatingClientFromChat.jid)}
                      required
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input
                      name="telefone"
                      type="text"
                      defaultValue={extractNumberFromJid(creatingClientFromChat.jid)}
                      required
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <input type="hidden" name="jid" value={creatingClientFromChat.jid} />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateClientModal(false);
                      setCreatingClientFromChat(null);
                    }}
                    className="flex-1 p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Criar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showNovoPedidoModal && (
          <ModalNovoDTF
            isOpen={showNovoPedidoModal}
            onClose={() => setShowNovoPedidoModal(false)}
            onSuccess={() => {
              setShowNovoPedidoModal(false);
              addAlert('Pedido criado com sucesso!', 'success');
            }}
            clienteId={selectedChatClienteId ? Number(selectedChatClienteId) : undefined}
          />
        )}
      </div>
    </div>
  );
};

export default WhatsAppUnified;
