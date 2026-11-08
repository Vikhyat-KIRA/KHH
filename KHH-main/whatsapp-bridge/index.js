import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import {
  downloadSessionFromFirebase,
  uploadSessionToFirebaseDebounced,
  clearSessionFromFirebase
} from './firebaseSync.js';

dotenv.config();
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY || 'kanchan_secret_key_2026';
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || 'https://khh-whatsapp-bridge.onrender.com';

app.use(cors());
app.use(express.json());

let sock = null;
let connectionStatus = 'connecting';
let latestQr = null;
let isRestoredFromCloud = false;

async function connectToWhatsApp() {
  console.log('Starting WhatsApp Socket Connection...');

  if (!isRestoredFromCloud) {
    try {
      await downloadSessionFromFirebase();
      isRestoredFromCloud = true;
    } catch (err) {
      console.error('Could not download session from Firebase, proceeding with local files:', err);
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState('auth_session');

  // Fetch the latest live WhatsApp Web version so Meta NEVER throws Status Code 405
  let version = [2, 3000, 1015901307];
  try {
    const latest = await fetchLatestBaileysVersion();
    version = latest.version;
    console.log(`Using live WhatsApp Web v${version.join('.')}`);
  } catch (e) {
    console.warn('Using fallback WhatsApp version:', version);
  }

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'warn' }),
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false
  });

  sock.ev.on('creds.update', async () => {
    await saveCreds();
    uploadSessionToFirebaseDebounced();
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQr = qr;
      connectionStatus = 'qr_ready';
      console.log('================================================================');
      console.log('KANCHAN HOMOEO HALL AUTOMATION GATEWAY');
      console.log('Scan QR in logs OR open this link in your browser:');
      console.log(`${RENDER_EXTERNAL_URL}/qr`);
      console.log('================================================================\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;

      console.log(`Connection closed. Status Code: ${statusCode}. LoggedOut: ${isLoggedOut}`);
      connectionStatus = 'disconnected';
      latestQr = null;

      if (isLoggedOut) {
        console.log('401 Device logged out! Auto-purging dead session & generating fresh QR...');
        await clearSessionFromFirebase();
        setTimeout(connectToWhatsApp, 3000);
      } else {
        setTimeout(connectToWhatsApp, 5000);
      }
    } else if (connection === 'open') {
      latestQr = null;
      connectionStatus = 'connected';
      console.log('================================================================');
      console.log('KANCHAN HOMOEO HALL: WhatsApp Gateway Connected successfully!');
      console.log('Status: Listening for secure website booking triggers...');
      console.log('================================================================');

      uploadSessionToFirebaseDebounced();
    }
  });
}

app.get('/qr', (req, res) => {
  if (connectionStatus === 'connected') {
    return res.send('<h2 style="font-family:sans-serif;color:green;text-align:center;margin-top:50px;">WhatsApp is already connected!</h2>');
  }
  if (!latestQr) {
    return res.send('<h3 style="font-family:sans-serif;text-align:center;margin-top:50px;">Generating QR code... Refresh this page in 5 seconds.</h3><script>setTimeout(()=>location.reload(), 5000);</script>');
  }
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(latestQr)}`;
  res.send(`
    <div style="font-family:sans-serif;text-align:center;margin-top:40px;">
      <h2>Kanchan Homoeo Hall WhatsApp Bridge</h2>
      <p>Scan with WhatsApp &gt; Linked Devices &gt; Link a Device</p>
      <img src="${qrImageUrl}" style="border:10px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.15);border-radius:12px;" />
      <p style="color:#666;font-size:13px;">Page auto-refreshes every 15 seconds</p>
      <script>setTimeout(()=>location.reload(), 15000);</script>
    </div>
  `);
});

app.post('/send-message', async (req, res) => {
  const { phone, message, apiKey } = req.body;

  if (!apiKey || apiKey !== BRIDGE_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key.' });
  }

  if (!phone || !message) {
    return res.status(400).json({ error: 'Missing phone number or message body.' });
  }

  if (connectionStatus !== 'connected' || !sock) {
    return res.status(503).json({
      error: 'WhatsApp gateway is offline or initializing. Visit /qr to scan.',
      status: connectionStatus
    });
  }

  try {
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });

    console.log(`Automated confirmation message successfully sent to ${cleanPhone}`);
    return res.status(200).json({ success: true, message: 'Message sent successfully.' });
  } catch (error) {
    console.error('Failed to transmit WhatsApp message via Baileys:', error);
    return res.status(500).json({ error: 'Failed to transmit message.', details: error.message });
  }
});

app.get('/status', (req, res) => {
  res.json({
    app: 'Kanchan Homoeo Hall WhatsApp Bridge',
    status: connectionStatus,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Gateway server running on port ${PORT}`);
  connectToWhatsApp().catch(err => {
    console.error('Fatal initialization error:', err);
  });

  setInterval(() => {
    fetch(`${RENDER_EXTERNAL_URL}/status`).catch(() => {});
  }, 10 * 60 * 1000);
});
