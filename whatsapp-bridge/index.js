import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { downloadSessionFromFirebase, uploadSessionToFirebaseDebounced } from './firebaseSync.js';

// Load environment variables
dotenv.config();
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY || 'kanchan_secret_key_2026';

app.use(cors());
app.use(express.json());

// Global reference to the WhatsApp socket connection
let sock = null;
let connectionStatus = 'connecting';

// Initialize the Baileys connection
async function connectToWhatsApp() {
  console.log('🔄 Starting WhatsApp Socket Connection...');

  // Download active session keys from Firestore first (restores login state if local files were deleted)
  try {
    await downloadSessionFromFirebase();
  } catch (err) {
    console.error('⚠️ Could not download session from Firebase, proceeding with local files:', err);
  }

  // Set up multi-file state authorization (saves credentials in "auth_session" directory)
  const { state, saveCreds } = await useMultiFileAuthState('auth_session');

  // Create the socket with low-level warning logger limits
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We will custom print using qrcode-terminal
    logger: pino({ level: 'warn' }),
    browser: ['Kanchan Homoeo Bridge', 'Safari', '3.0']
  });

  // Track connection events & credentials updates
  sock.ev.on('creds.update', async () => {
    await saveCreds();
    uploadSessionToFirebaseDebounced();
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.clear();
      console.log('================================================================');
      console.log('📢 KANCHAN HOMOEO HALL AUTOMATION GATEWAY');
      console.log('👉 Please scan this QR code with your father\'s WhatsApp:');
      console.log('👉 Steps: WhatsApp > Linked Devices > Link a Device');
      console.log('================================================================\n');
      
      qrcode.generate(qr, { small: true });
      connectionStatus = 'qr_ready';
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log(`❌ Connection closed. Reason Status Code: ${statusCode}. Reconnecting: ${shouldReconnect}`);
      connectionStatus = 'disconnected';

      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 5000); // Wait 5s before reconnecting
      } else {
        console.log('⚠️ Device logged out. Please scan the new QR code to authorize.');
      }
    } else if (connection === 'open') {
      console.clear();
      console.log('================================================================');
      console.log('✅ KANCHAN HOMOEO HALL: WhatsApp Gateway Connected successfully!');
      console.log('📱 Phone: Active on SIM data');
      console.log('🟢 Status: Listening for secure website booking triggers...');
      console.log('================================================================');
      connectionStatus = 'connected';
      
      // Force a cloud backup immediately on connection open to ensure session is stored
      uploadSessionToFirebaseDebounced();
    }
  });
}

// REST Webhook Route to trigger automated confirmations
app.post('/send-message', async (req, res) => {
  const { phone, message, apiKey } = req.body;

  // Validate API key for security
  if (!apiKey || apiKey !== BRIDGE_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key.' });
  }

  if (!phone || !message) {
    return res.status(400).json({ error: 'Missing phone number or message body.' });
  }

  // Validate connection state
  if (connectionStatus !== 'connected' || !sock) {
    return res.status(503).json({
      error: 'WhatsApp gateway is offline or initializing. Please scan QR code first.',
      status: connectionStatus
    });
  }

  try {
    // Strip special characters and spaces from the phone number
    let cleanPhone = phone.replace(/[^0-9]/g, '');

    // Standardize to Indian country code prefix if 10-digit
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    // Format phone number to the JID standard required by WhatsApp
    const jid = `${cleanPhone}@s.whatsapp.net`;

    // Send text message directly through the socket stream
    await sock.sendMessage(jid, { text: message });

    console.log(`✉️ Automated confirmation message successfully sent to ${cleanPhone}`);
    return res.status(200).json({ success: true, message: 'Message sent successfully.' });
  } catch (error) {
    console.error('❌ Failed to transmit WhatsApp message via Baileys:', error);
    return res.status(500).json({ error: 'Failed to transmit message.', details: error.message });
  }
});

// Basic status check route
app.get('/status', (req, res) => {
  res.json({
    app: 'Kanchan Homoeo Hall WhatsApp Bridge',
    status: connectionStatus,
    timestamp: new Date().toISOString()
  });
});

// Start express server and connect to Baileys stream
app.listen(PORT, () => {
  console.log(`🚀 Gateway server running on port ${PORT}`);
  connectToWhatsApp().catch(err => {
    console.error('Fatal initialization error:', err);
  });
});
