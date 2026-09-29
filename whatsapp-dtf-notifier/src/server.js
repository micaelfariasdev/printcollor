import express from 'express';
import QRCode from 'qrcode';
import * as Whaileys from 'whaileys';

// O fork pode expor o socket como default ESM, default CommonJS ou named export.
const makeWASocket = Whaileys.default?.default || Whaileys.default || Whaileys.makeWASocket;
const { DisconnectReason, useMultiFileAuthState } = Whaileys;

const app = express(); app.use(express.json());
const port = process.env.PORT || 3100;
const token = process.env.NOTIFIER_TOKEN;
let socket; let state = { status: 'desconectado', qr: null, number: null };
let connecting = false;
const pendingActions = new Map();
app.use((req, res, next) => req.headers.authorization === `Bearer ${token}` ? next() : res.sendStatus(401));

async function connect() {
  if (connecting || state.status === 'conectado') return state;
  if (typeof makeWASocket !== 'function') throw new Error('Export makeWASocket não encontrado no whaileys');
  connecting = true;
  try {
    const { state: auth, saveCreds } = await useMultiFileAuthState(process.env.SESSION_DIR || './session');
    socket = makeWASocket({ auth, printQRInTerminal: false, syncFullHistory: false });
    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const message of messages) {
        const selected = message.message?.buttonsResponseMessage?.selectedButtonId;
        const originalId = message.message?.buttonsResponseMessage?.contextInfo?.stanzaId;
        const action = pendingActions.get(originalId) || pendingActions.get(message.key.remoteJid);
        if (!selected || !action || message.key.fromMe) continue;
        if (selected === 'pix_copia_cola' && action.pix) await socket.sendMessage(message.key.remoteJid, { text: `PIX Copia e Cola:\n${action.pix}` });
        if (selected === 'ver_pedido' && action.url) await socket.sendMessage(message.key.remoteJid, { text: `Acesse seu pedido:\n${action.url}` });
      }
    });
    socket.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) { state.status = 'aguardando_qr'; state.qr = await QRCode.toDataURL(qr); }
      if (connection === 'open') { connecting = false; state = { status: 'conectado', qr: null, number: socket.user?.id?.split(':')[0] || null }; }
      if (connection === 'close') {
        connecting = false; state.status = 'desconectado';
        if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) setTimeout(() => connect().catch(console.error), 3000);
      }
    });
  } catch (error) { connecting = false; throw error; }
  return state;
}
app.get('/health', (_, res) => res.json({ ok: true, ...state }));
app.post('/connection/reconnect', async (_, res) => { await connect(); res.json(state); });
app.post('/notifications/send', async (req, res) => {
  if (!socket || state.status !== 'conectado') return res.status(503).json({ error: 'not_connected' });
  const jid = `${String(req.body.telefone).replace(/\D/g, '')}@s.whatsapp.net`;
  const link = req.body.url && !String(req.body.texto || '').includes(req.body.url) ? `\n\n🔗 ${req.body.botao || 'Ver pedido'}: ${req.body.url}` : '';
  const templateButtons = [];
  if (req.body.url) templateButtons.push({
    index: 1,
    urlButton: { displayText: 'Ver pedido', url: req.body.url },
  });
  if (req.body.pix) templateButtons.push({
    index: 2,
    quickReplyButton: { displayText: 'Enviar PIX copia e cola', id: 'pix_copia_cola' },
  });
  const conteudo = `${req.body.texto || ''}${link}`.trim();
  let result;
  if (templateButtons.length) {
    try {
      result = await socket.sendMessage(jid, { text: conteudo, footer: 'Print Collor', templateButtons });
    } catch (error) {
      // Alguns clientes/versoes do WhatsApp recusam mensagens de template.
      // A notificacao nao pode ser perdida por causa do botao opcional.
      console.warn('Botao de URL indisponivel; enviando link em texto.', error.message);
      result = await socket.sendMessage(jid, { text: conteudo });
    }
  } else {
    result = await socket.sendMessage(jid, { text: conteudo });
  }
  if (req.body.pix) {
    const action = { pix: req.body.pix, url: req.body.url };
    pendingActions.set(result.key.id, action);
    pendingActions.set(jid, action);
  }
  res.json({ id: result.key.id });
});
connect(); app.listen(port, () => console.log(`DTF notifier on ${port}`));
