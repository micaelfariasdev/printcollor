import express from 'express';
import QRCode from 'qrcode';
import { rm } from 'node:fs/promises';
import * as Whaileys from 'whaileys';

// O fork pode expor o socket como default ESM, default CommonJS ou named export.
const makeWASocket = Whaileys.default?.default || Whaileys.default || Whaileys.makeWASocket;
const { DisconnectReason, useMultiFileAuthState } = Whaileys;

const app = express(); app.use(express.json());
const port = process.env.PORT || 3100;
const token = process.env.NOTIFIER_TOKEN;
let socket; let state = { status: 'desconectado', qr: null, number: null };
let connecting = false;
let connectionGeneration = 0;
app.use((req, res, next) => req.headers.authorization === `Bearer ${token}` ? next() : res.sendStatus(401));

async function connect() {
  if (connecting || state.status === 'conectado') return state;
  if (typeof makeWASocket !== 'function') throw new Error('Export makeWASocket não encontrado no whaileys');
  connecting = true;
  try {
    const generation = ++connectionGeneration;
    const { state: auth, saveCreds } = await useMultiFileAuthState(process.env.SESSION_DIR || './session');
    socket = makeWASocket({ auth, printQRInTerminal: false, syncFullHistory: false });
    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (generation !== connectionGeneration) return;
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
const waitForQr = (timeout = 8000) => new Promise(resolve => {
  const started = Date.now();
  const timer = setInterval(() => {
    if (state.qr || state.status === 'conectado' || Date.now() - started >= timeout) {
      clearInterval(timer);
      resolve();
    }
  }, 250);
});
app.post('/connection/reconnect', async (_, res) => {
  // Gerar QR significa vincular uma nova sessao, portanto descarta credenciais antigas.
  connectionGeneration += 1;
  connecting = false;
  state = { status: 'conectando', qr: null, number: null };
  try { socket?.ws?.close(); } catch (_) { /* socket antigo ja pode estar fechado */ }
  socket = undefined;
  await rm(process.env.SESSION_DIR || './session', { recursive: true, force: true });
  await connect();
  await waitForQr();
  res.json({ ok: true, ...state });
});
app.post('/notifications/send', async (req, res) => {
  if (!socket || state.status !== 'conectado') return res.status(503).json({ error: 'not_connected' });
  const jid = `${String(req.body.telefone).replace(/\D/g, '')}@s.whatsapp.net`;
  const link = req.body.url && !String(req.body.texto || '').includes(req.body.url) ? `\n\n🔗 ${req.body.botao || 'Ver pedido'}: ${req.body.url}` : '';
  const conteudo = `${req.body.texto || ''}${link}`.trim();
  const result = await socket.sendMessage(jid, { text: conteudo });
  res.json({ id: result.key.id });
});
connect(); app.listen(port, () => console.log(`DTF notifier on ${port}`));
