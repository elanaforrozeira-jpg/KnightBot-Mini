/**
 * WhatsApp MD Bot - Main Entry Point
 */
process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
process.env.PUPPETEER_CACHE_DIR = process.env.PUPPETEER_CACHE_DIR || '/tmp/puppeteer_cache_disabled';

const { initializeTempSystem } = require('./utils/tempManager');
const { startCleanup } = require('./utils/cleanup');
initializeTempSystem();
startCleanup();
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const forbiddenPatternsConsole = [
  'closing session', 'closing open session', 'sessionentry', 'prekey bundle',
  'pendingprekey', '_chains', 'registrationid', 'currentratchet', 'chainkey',
  'ratchet', 'signal protocol', 'ephemeralkeypair', 'indexinfo', 'basekey'
];

console.log = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(p => message.includes(p))) originalConsoleLog.apply(console, args);
};
console.error = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(p => message.includes(p))) originalConsoleError.apply(console, args);
};
console.warn = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(p => message.includes(p))) originalConsoleWarn.apply(console, args);
};

const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  getAggregateVotesInPollMessage
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const config = require('./config');
const handler = require('./handler');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');

// ── reconnect state ──────────────────────────────────────────────────────────
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// ── SESSION WRITE GUARD ──────────────────────────────────────────────────────
// Sirf pehli baar (process start pe) session write hogi.
// Reconnect pe creds.json dobara OVERWRITE NAHI hogi — yahi 440 loop ka root cause tha.
let sessionWrittenOnce = false;

const getReconnectDelay = (attempt) => {
  return Math.min(3000 * Math.pow(2, attempt), 60000);
};

function cleanupPuppeteerCache() {
  try {
    const home = os.homedir();
    const cacheDir = path.join(home, '.cache', 'puppeteer');
    if (fs.existsSync(cacheDir)) {
      console.log('🧹 Removing Puppeteer cache at:', cacheDir);
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log('✅ Puppeteer cache removed');
    }
  } catch (err) {
    console.error('⚠️ Failed to cleanup Puppeteer cache:', err.message || err);
  }
}

const store = {
  messages: new Map(),
  maxPerChat: 20,
  bind: (ev) => {
    ev.on('messages.upsert', ({ messages }) => {
      for (const msg of messages) {
        if (!msg.key?.id) continue;
        const jid = msg.key.remoteJid;
        if (!store.messages.has(jid)) store.messages.set(jid, new Map());
        const chatMsgs = store.messages.get(jid);
        chatMsgs.set(msg.key.id, msg);
        if (chatMsgs.size > store.maxPerChat) {
          const oldestKey = chatMsgs.keys().next().value;
          chatMsgs.delete(oldestKey);
        }
      }
    });
  },
  loadMessage: async (jid, id) => store.messages.get(jid)?.get(id) || null
};

const processedMessages = new Set();
setInterval(() => { processedMessages.clear(); }, 5 * 60 * 1000);

const createSuppressedLogger = (level = 'silent') => {
  const forbiddenPatterns = [
    'closing session', 'closing open session', 'sessionentry', 'prekey bundle',
    'pendingprekey', '_chains', 'registrationid', 'currentratchet', 'chainkey',
    'ratchet', 'signal protocol', 'ephemeralkeypair', 'indexinfo', 'basekey', 'ratchetkey'
  ];
  let logger;
  try {
    logger = pino({
      level,
      transport: process.env.NODE_ENV === 'production' ? undefined : {
        target: 'pino-pretty',
        options: { colorize: true, ignore: 'pid,hostname' }
      },
      redact: ['registrationId', 'ephemeralKeyPair', 'rootKey', 'chainKey', 'baseKey']
    });
  } catch (err) {
    logger = pino({ level });
  }
  const originalInfo = logger.info.bind(logger);
  logger.info = (...args) => {
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ').toLowerCase();
    if (!forbiddenPatterns.some(p => msg.includes(p))) originalInfo(...args);
  };
  logger.debug = () => {};
  logger.trace = () => {};
  return logger;
};

async function startBot() {
  const sessionFolder = `./${config.sessionName}`;
  const sessionFile = path.join(sessionFolder, 'creds.json');

  // ── Write session ONLY on first boot ─────────────────────────────────────────────
  // Reconnect ke waqt sessionWrittenOnce = true hoga, toh overwrite nahi hogi.
  // Is wajah se har reconnect pe WhatsApp ko naya session nazar nahi aayega (440 fix).
  if (!sessionWrittenOnce && config.sessionID && config.sessionID.startsWith('KnightBot!')) {
    try {
      const [header, b64data] = config.sessionID.split('!');
      if (header !== 'KnightBot' || !b64data) throw new Error('Invalid session format');
      const cleanB64 = b64data.replace('...', '');
      const compressedData = Buffer.from(cleanB64, 'base64');
      const decompressedData = zlib.gunzipSync(compressedData);
      if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true });
      fs.writeFileSync(sessionFile, decompressedData, 'utf8');
      sessionWrittenOnce = true;
      console.log('📡 Session : 🔑 Retrieved from KnightBot Session (first boot only)');
    } catch (e) {
      console.error('📡 Session : ❌ Error processing KnightBot session:', e.message);
    }
  } else if (sessionWrittenOnce) {
    console.log('📡 Session : ✅ Using existing creds (reconnect — skipping overwrite)');
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();
  const suppressedLogger = createSuppressedLogger('silent');

  const sock = makeWASocket({
    version,
    logger: suppressedLogger,
    printQRInTerminal: false,
    browser: ['Chrome', 'Windows', '10.0'],
    auth: state,
    syncFullHistory: false,
    downloadHistory: false,
    markOnlineOnConnect: false,
    getMessage: async (key) => {
      return store.messages.get(key.remoteJid)?.get(key.id) || undefined;
    }
  });

  store.bind(sock.ev);

  let lastActivity = Date.now();
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
  sock.ev.on('messages.upsert', () => { lastActivity = Date.now(); });
  const watchdogInterval = setInterval(async () => {
    if (Date.now() - lastActivity > INACTIVITY_TIMEOUT && sock.ws.readyState === 1) {
      console.log('⚠️ No activity detected. Forcing reconnect...');
      await sock.end(undefined, undefined, { reason: 'inactive' });
      clearInterval(watchdogInterval);
      setTimeout(() => startBot(), 5000);
    }
  }, 5 * 60 * 1000);

  sock.ev.on('connection.update', (update) => {
    const { connection } = update;
    if (connection === 'open') lastActivity = Date.now();
    else if (connection === 'close') clearInterval(watchdogInterval);
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('\n\n📱 Scan this QR code with WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      clearInterval(watchdogInterval);

      const statusCode   = lastDisconnect?.error?.output?.statusCode;
      const errorMessage = lastDisconnect?.error?.message || 'Unknown error';

      // ── 440 Stream Conflict ───────────────────────────────────────────────
      if (statusCode === 440) {
        reconnectAttempts++;
        const delay = getReconnectDelay(reconnectAttempts);
        console.log(`⚠️ Stream Conflict (440) — attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay / 1000}s...`);
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('❌ Max Stream Conflicts reached. Exiting for fresh Railway restart.');
          process.exit(1);
        }
        setTimeout(() => startBot(), delay);
        return;
      }

      // ── Logged out ───────────────────────────────────────────────────────────
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('🔴 Logged out. Please update SESSION_ID and redeploy.');
        process.exit(1);
        return;
      }

      // ── WA server errors ───────────────────────────────────────────────────
      if (statusCode === 515 || statusCode === 503 || statusCode === 408) {
        reconnectAttempts++;
        const delay = getReconnectDelay(reconnectAttempts);
        console.log(`⚠️ WA server error (${statusCode}). Reconnecting in ${delay / 1000}s...`);
        setTimeout(() => startBot(), delay);
        return;
      }

      // ── Generic close ──────────────────────────────────────────────────────
      reconnectAttempts++;
      const delay = getReconnectDelay(reconnectAttempts);
      console.log(`Connection closed: ${errorMessage} | Reconnecting in ${delay / 1000}s...`);
      setTimeout(() => startBot(), delay);

    } else if (connection === 'open') {
      reconnectAttempts = 0;
      console.log('\n✅ Bot connected successfully!');
      console.log(`📱 Bot Number: ${sock.user.id.split(':')[0]}`);
      console.log(`🤖 Bot Name: ${config.botName}`);
      console.log(`⚡ Prefix: ${config.prefix}`);
      const ownerNames = Array.isArray(config.ownerName) ? config.ownerName.join(',') : config.ownerName;
      console.log(`👑 Owner: ${ownerNames}\n`);
      console.log('Bot is ready to receive messages!\n');
      if (config.autoBio) await sock.updateProfileStatus(`${config.botName} | Active 24/7`);
      handler.initializeAntiCall(sock);
      const now = Date.now();
      for (const [jid, chatMsgs] of store.messages.entries()) {
        const timestamps = Array.from(chatMsgs.values()).map(m => m.messageTimestamp * 1000 || 0);
        if (timestamps.length > 0 && now - Math.max(...timestamps) > 24 * 60 * 60 * 1000) store.messages.delete(jid);
      }
      console.log(`🧹 Store cleaned. Active chats: ${store.messages.size}`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  const isSystemJid = (jid) => {
    if (!jid) return true;
    return jid.includes('@broadcast') || jid.includes('status.broadcast') ||
      jid.includes('@newsletter') || jid.includes('@newsletter.');
  };

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || !msg.key?.id) continue;
      const from = msg.key.remoteJid;
      if (!from || isSystemJid(from)) continue;
      const msgId = msg.key.id;
      if (processedMessages.has(msgId)) continue;
      const MESSAGE_AGE_LIMIT = 5 * 60 * 1000;
      if (msg.messageTimestamp && Date.now() - (msg.messageTimestamp * 1000) > MESSAGE_AGE_LIMIT) continue;
      processedMessages.add(msgId);
      if (msg.key && msg.key.id) {
        if (!store.messages.has(from)) store.messages.set(from, new Map());
        const chatMsgs = store.messages.get(from);
        chatMsgs.set(msg.key.id, msg);
        if (chatMsgs.size > store.maxPerChat) {
          const sortedIds = Array.from(chatMsgs.entries())
            .sort((a, b) => (a[1].messageTimestamp || 0) - (b[1].messageTimestamp || 0))
            .map(([id]) => id);
          for (let i = 0; i < sortedIds.length - store.maxPerChat; i++) chatMsgs.delete(sortedIds[i]);
        }
      }
      handler.handleMessage(sock, msg).catch(err => {
        if (!err.message?.includes('rate-overlimit') && !err.message?.includes('not-authorized'))
          console.error('Error handling message:', err.message);
      });
      setImmediate(async () => {
        if (config.autoRead && from.endsWith('@g.us')) {
          try { await sock.readMessages([msg.key]); } catch (e) {}
        }
        if (from.endsWith('@g.us')) {
          try {
            const groupMetadata = await handler.getGroupMetadata(sock, msg.key.remoteJid);
            if (groupMetadata) await handler.handleAntilink(sock, msg, groupMetadata);
          } catch (error) {}
        }
      });
    }
  });

  sock.ev.on('message-receipt.update', () => {});

  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      try {
        const pollVote = update?.update?.pollUpdateDecryptedV1;
        if (!pollVote) continue;
        const voter = update.key.participant || update.key.remoteJid;
        const selectedOptions = (pollVote.votes || []).map(v => v.optionName);
        const pollUpdate = {
          pollCreationMessageKey: {
            remoteJid: update.key.remoteJid,
            id: update.key.id,
            fromMe: update.key.fromMe
          },
          voter,
          selectedOptions,
          pushName: update.pushName || voter.split('@')[0]
        };
        const quizMod = require('./commands/fun/quiz');
        const jeeMod  = require('./commands/fun/jee');
        let handled = false;
        if (typeof jeeMod.handlePollVote === 'function') handled = await jeeMod.handlePollVote(sock, pollUpdate);
        if (!handled && typeof quizMod.handlePollVote === 'function') await quizMod.handlePollVote(sock, pollUpdate);
      } catch (e) {}
    }
  });

  sock.ev.on('group-participants.update', async (update) => {
    await handler.handleGroupUpdate(sock, update);
  });

  sock.ev.on('error', (error) => {
    const statusCode = error?.output?.statusCode;
    if (statusCode === 515 || statusCode === 503 || statusCode === 408 || statusCode === 440) return;
    console.error('Socket error:', error.message || error);
  });

  return sock;
}

console.log('🚀 Starting WhatsApp MD Bot...\n');
console.log(`📦 Bot Name: ${config.botName}`);
console.log(`⚡ Prefix: ${config.prefix}`);
const ownerNames = Array.isArray(config.ownerName) ? config.ownerName.join(',') : config.ownerName;
console.log(`👑 Owner: ${ownerNames}\n`);
cleanupPuppeteerCache();
startBot().catch(err => { console.error('Error starting bot:', err); process.exit(1); });

process.on('uncaughtException', (err) => {
  if (err.code === 'ENOSPC' || err.errno === -28 || err.message?.includes('no space left on device')) {
    console.error('⚠️ ENOSPC Error: No space left on device. Attempting cleanup...');
    const { cleanupOldFiles } = require('./utils/cleanup');
    cleanupOldFiles();
    return;
  }
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  if (err.code === 'ENOSPC' || err.errno === -28 || err.message?.includes('no space left on device')) {
    const { cleanupOldFiles } = require('./utils/cleanup');
    cleanupOldFiles();
    return;
  }
  if (err.message?.includes('rate-overlimit')) {
    console.warn('⚠️ Rate limit reached.');
    return;
  }
  console.error('Unhandled Rejection:', err);
});

module.exports = { store };
