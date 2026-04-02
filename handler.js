/**
 * Message Handler - Processes incoming messages and executes commands
 */

const config = require('./config');
const database = require('./database');
const { loadCommands } = require('./utils/commandLoader');
const { addMessage } = require('./utils/groupstats');
const { checkSlowMode } = require('./utils/slowMode');
const { jidDecode, jidEncode } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Group metadata cache to prevent rate limiting
const groupMetadataCache = new Map();
const CACHE_TTL = 30000;
const CACHE_MAX_SIZE = 50;

const evictOldestCacheEntry = () => {
  let oldestKey = null;
  let oldestTime = Infinity;
  for (const [k, v] of groupMetadataCache.entries()) {
    if (v.timestamp < oldestTime) { oldestTime = v.timestamp; oldestKey = k; }
  }
  if (oldestKey) groupMetadataCache.delete(oldestKey);
};

const setCacheEntry = (groupId, data) => {
  if (groupMetadataCache.size >= CACHE_MAX_SIZE) evictOldestCacheEntry();
  groupMetadataCache.set(groupId, { data, timestamp: Date.now() });
};

const _groupMetadataCacheCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of groupMetadataCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) groupMetadataCache.delete(key);
  }
}, 90 * 1000);

const commands = loadCommands();

const getMessageContent = (msg) => {
  if (!msg || !msg.message) return null;
  let m = msg.message;
  if (m.ephemeralMessage) m = m.ephemeralMessage.message;
  if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
  if (m.viewOnceMessage) m = m.viewOnceMessage.message;
  if (m.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;
  return m;
};

const getCachedGroupMetadata = async (sock, groupId) => {
  try {
    if (!groupId || !groupId.endsWith('@g.us')) return null;
    const cached = groupMetadataCache.get(groupId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
    const metadata = await sock.groupMetadata(groupId);
    setCacheEntry(groupId, metadata);
    return metadata;
  } catch (error) {
    if (error.message && (error.message.includes('forbidden') || error.message.includes('403') || error.statusCode === 403 || error.output?.statusCode === 403 || error.data === 403)) {
      setCacheEntry(groupId, null);
      return null;
    }
    if (error.message && error.message.includes('rate-overlimit')) {
      const cached = groupMetadataCache.get(groupId);
      if (cached) return cached.data;
      return null;
    }
    const cached = groupMetadataCache.get(groupId);
    if (cached) return cached.data;
    return null;
  }
};

const getLiveGroupMetadata = async (sock, groupId) => {
  try {
    const metadata = await sock.groupMetadata(groupId);
    setCacheEntry(groupId, metadata);
    return metadata;
  } catch (error) {
    const cached = groupMetadataCache.get(groupId);
    if (cached) return cached.data;
    return null;
  }
};

const getGroupMetadata = getCachedGroupMetadata;

const isOwner = (sender) => {
  if (!sender) return false;
  const normalizedSender = normalizeJidWithLid(sender);
  const senderNumber = normalizeJid(normalizedSender);
  return config.ownerNumber.some(owner => {
    const normalizedOwner = normalizeJidWithLid(owner.includes('@') ? owner : `${owner}@s.whatsapp.net`);
    const ownerNumber = normalizeJid(normalizedOwner);
    return ownerNumber === senderNumber;
  });
};

const isMod = (sender) => {
  const number = sender.split('@')[0];
  return database.isModerator(number);
};

const lidMappingCache = new Map();
setInterval(() => { if (lidMappingCache.size > 100) lidMappingCache.clear(); }, 60 * 1000);

const normalizeJid = (jid) => {
  if (!jid) return null;
  if (typeof jid !== 'string') return null;
  if (jid.includes(':')) return jid.split(':')[0];
  if (jid.includes('@')) return jid.split('@')[0];
  return jid;
};

const getLidMappingValue = (user, direction) => {
  if (!user) return null;
  const cacheKey = `${direction}:${user}`;
  if (lidMappingCache.has(cacheKey)) return lidMappingCache.get(cacheKey);
  const sessionPath = path.join(__dirname, config.sessionName || 'session');
  const suffix = direction === 'pnToLid' ? '.json' : '_reverse.json';
  const filePath = path.join(sessionPath, `lid-mapping-${user}${suffix}`);
  if (!fs.existsSync(filePath)) { lidMappingCache.set(cacheKey, null); return null; }
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    const value = raw ? JSON.parse(raw) : null;
    lidMappingCache.set(cacheKey, value || null);
    return value || null;
  } catch (error) { lidMappingCache.set(cacheKey, null); return null; }
};

const normalizeJidWithLid = (jid) => {
  if (!jid) return jid;
  try {
    const decoded = jidDecode(jid);
    if (!decoded?.user) return `${jid.split(':')[0].split('@')[0]}@s.whatsapp.net`;
    let user = decoded.user;
    let server = decoded.server === 'c.us' ? 's.whatsapp.net' : decoded.server;
    const mapToPn = () => {
      const pnUser = getLidMappingValue(user, 'lidToPn');
      if (pnUser) { user = pnUser; server = server === 'hosted.lid' ? 'hosted' : 's.whatsapp.net'; return true; }
      return false;
    };
    if (server === 'lid' || server === 'hosted.lid') mapToPn();
    else if (server === 's.whatsapp.net' || server === 'hosted') mapToPn();
    if (server === 'hosted') return jidEncode(user, 'hosted');
    return jidEncode(user, 's.whatsapp.net');
  } catch (error) { return jid; }
};

const buildComparableIds = (jid) => {
  if (!jid) return [];
  try {
    const decoded = jidDecode(jid);
    if (!decoded?.user) return [normalizeJidWithLid(jid)].filter(Boolean);
    const variants = new Set();
    const normalizedServer = decoded.server === 'c.us' ? 's.whatsapp.net' : decoded.server;
    variants.add(jidEncode(decoded.user, normalizedServer));
    const isPnServer = normalizedServer === 's.whatsapp.net' || normalizedServer === 'hosted';
    const isLidServer = normalizedServer === 'lid' || normalizedServer === 'hosted.lid';
    if (isPnServer) {
      const lidUser = getLidMappingValue(decoded.user, 'pnToLid');
      if (lidUser) { const lidServer = normalizedServer === 'hosted' ? 'hosted.lid' : 'lid'; variants.add(jidEncode(lidUser, lidServer)); }
    } else if (isLidServer) {
      const pnUser = getLidMappingValue(decoded.user, 'lidToPn');
      if (pnUser) { const pnServer = normalizedServer === 'hosted.lid' ? 'hosted' : 's.whatsapp.net'; variants.add(jidEncode(pnUser, pnServer)); }
    }
    return Array.from(variants);
  } catch (error) { return [jid]; }
};

const findParticipant = (participants = [], userIds) => {
  const targets = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean).flatMap(id => buildComparableIds(id));
  if (!targets.length) return null;
  return participants.find(participant => {
    if (!participant) return false;
    const participantIds = [participant.id, participant.lid, participant.userJid].filter(Boolean).flatMap(id => buildComparableIds(id));
    return participantIds.some(id => targets.includes(id));
  }) || null;
};

const isAdmin = async (sock, participant, groupId, groupMetadata = null) => {
  if (!participant) return false;
  if (!groupId || !groupId.endsWith('@g.us')) return false;
  let liveMetadata = groupMetadata;
  if (!liveMetadata || !liveMetadata.participants) {
    if (groupId) liveMetadata = await getLiveGroupMetadata(sock, groupId);
    else return false;
  }
  if (!liveMetadata || !liveMetadata.participants) return false;
  const foundParticipant = findParticipant(liveMetadata.participants, participant);
  if (!foundParticipant) return false;
  return foundParticipant.admin === 'admin' || foundParticipant.admin === 'superadmin';
};

const isBotAdmin = async (sock, groupId, groupMetadata = null) => {
  if (!sock.user || !groupId) return false;
  if (!groupId.endsWith('@g.us')) return false;
  try {
    const botId = sock.user.id;
    const botLid = sock.user.lid;
    if (!botId) return false;
    const botJids = [botId];
    if (botLid) botJids.push(botLid);
    const liveMetadata = await getLiveGroupMetadata(sock, groupId);
    if (!liveMetadata || !liveMetadata.participants) return false;
    const participant = findParticipant(liveMetadata.participants, botJids);
    if (!participant) return false;
    return participant.admin === 'admin' || participant.admin === 'superadmin';
  } catch (error) { return false; }
};

const isUrl = (text) => { const urlRegex = /(https?:\/\/[^\s]+)/gi; return urlRegex.test(text); };
const hasGroupLink = (text) => { const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i; return linkRegex.test(text); };
const isSystemJid = (jid) => { if (!jid) return true; return jid.includes('@broadcast') || jid.includes('status.broadcast') || jid.includes('@newsletter') || jid.includes('@newsletter.'); };

// ─────────────────────────────────────────────────────────────────────────────
// Main message handler
// ─────────────────────────────────────────────────────────────────────────────
const handleMessage = async (sock, msg) => {
  try {
    if (!msg.message) return;
    const from = msg.key.remoteJid;
    if (isSystemJid(from)) return;

    const isGroup = from.endsWith('@g.us');

    // Group whitelist mode
    if (isGroup && config.groupWhitelistMode) {
      const ownerSending = (() => {
        const sender = msg.key.fromMe ? sock.user?.id : msg.key.participant || from;
        return isOwner(sender);
      })();
      if (!ownerSending && !database.isGroupWhitelisted(from)) return;
    }

    // Auto-React
    try {
      delete require.cache[require.resolve('./config')];
      const config = require('./config');
      if (config.autoReact && msg.message && !msg.key.fromMe) {
        const content = msg.message.ephemeralMessage?.message || msg.message;
        const text = content.conversation || content.extendedTextMessage?.text || '';
        const jid = msg.key.remoteJid;
        const emojis = ['❤️','🔥','👌','💀','😁','✨','👍','🤨','😎','😂','🤝','💫'];
        const mode = config.autoReactMode || 'bot';
        if (mode === 'bot') {
          const prefixList = ['.', '/', '#'];
          if (prefixList.includes(text?.trim()[0])) {
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
          }
        }
        if (mode === 'all') {
          const rand = emojis[Math.floor(Math.random() * emojis.length)];
          await sock.sendMessage(jid, { react: { text: rand, key: msg.key } });
        }
      }
    } catch (e) { console.error('[AutoReact Error]', e.message); }

    const content = getMessageContent(msg);
    let actualMessageTypes = [];
    if (content) {
      const allKeys = Object.keys(content);
      const protocolMessages = ['protocolMessage', 'senderKeyDistributionMessage', 'messageContextInfo'];
      actualMessageTypes = allKeys.filter(key => !protocolMessages.includes(key));
    }
    const messageType = actualMessageTypes[0];
    const sender = msg.key.fromMe ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : msg.key.participant || msg.key.remoteJid;
    const groupMetadata = isGroup ? await getGroupMetadata(sock, from) : null;
    const senderIsWhitelisted = database.isWhitelisted(sender);
    const senderIsOwnerFlag   = isOwner(sender);

    if (isGroup) {
      try { await handleAntigroupmention(sock, msg, groupMetadata); } catch (error) { console.error('Error in antigroupmention handler:', error); }
    }
    if (isGroup) addMessage(from, sender);
    if (!content || actualMessageTypes.length === 0) return;

    if (isGroup && !msg.key.fromMe) {
      try { await handleAntilink(sock, msg, groupMetadata); } catch (error) { console.error('Error in antilink handler:', error); }
    }

    if (isGroup && !msg.key.fromMe) {
      try {
        const groupSettings = database.getGroupSettings(from);
        if (groupSettings.slowmode) {
          const senderIsGroupOwner = groupMetadata?.owner && (groupMetadata.owner === sender);
          const senderIsBotOwner = isOwner(sender);
          const senderIsAdmin = await isAdmin(sock, sender, from, groupMetadata);
          if (!senderIsGroupOwner && !senderIsBotOwner && !senderIsAdmin && !senderIsWhitelisted) {
            const cooldownMs = (groupSettings.slowmodeCooldown || 30) * 1000;
            const result = checkSlowMode(from, sender, cooldownMs);
            if (result.onCooldown) {
              try { await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: msg.key.id, participant: sender } }); } catch (e) { console.error('Failed to delete slowmode violation message:', e); }
              let warnMsg;
              try { warnMsg = await sock.sendMessage(from, { text: `⏳ *Slow mode is active.*\nPlease wait *${result.remainingSecs}* more seconds before sending another message.` }, { quoted: msg }); } catch (e) {}
              if (warnMsg && warnMsg.key && warnMsg.key.id) {
                setTimeout(async () => { try { await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: true, id: warnMsg.key.id } }); } catch (e) {} }, 50000);
              }
              return;
            }
          }
        }
      } catch (e) { console.error('Error in slow mode check:', e); }
    }

    const btn = content.buttonsResponseMessage || msg.message?.buttonsResponseMessage;
    if (btn) {
      const buttonId = btn.selectedButtonId;
      const makeCtx = async () => ({
        from, sender, isGroup, groupMetadata,
        isOwner: isOwner(sender),
        isAdmin: await isAdmin(sock, sender, from, groupMetadata),
        isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
        isMod: isMod(sender),
        reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
        react:  (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
      });
      if (buttonId === 'btn_menu') { const menuCmd = commands.get('menu'); if (menuCmd) await menuCmd.execute(sock, msg, [], await makeCtx()); return; }
      else if (buttonId === 'btn_ping') { const pingCmd = commands.get('ping'); if (pingCmd) await pingCmd.execute(sock, msg, [], await makeCtx()); return; }
      else if (buttonId === 'btn_help') { const listCmd = commands.get('list'); if (listCmd) await listCmd.execute(sock, msg, [], await makeCtx()); return; }
    }

    const list = content.listResponseMessage || msg.message?.listResponseMessage;
    if (list) {
      const selectedRowId = list?.singleSelectReply?.selectedRowId || list?.selectedRowId;
      if (selectedRowId && String(selectedRowId).startsWith('quiz_')) {
        const quizCmd = commands.get('quiz');
        if (quizCmd && typeof quizCmd.handleSelection === 'function') { await quizCmd.handleSelection(sock, msg, selectedRowId); return; }
      }
    }

    let body = '';
    if (content.conversation) body = content.conversation;
    else if (content.extendedTextMessage) body = content.extendedTextMessage.text || '';
    else if (content.imageMessage) body = content.imageMessage.caption || '';
    else if (content.videoMessage) body = content.videoMessage.caption || '';
    body = (body || '').trim();

    if (!msg.key.fromMe) {
      try { const quizModule = require('./commands/fun/quiz'); if (typeof quizModule.handleAnswer === 'function') { const handled = await quizModule.handleAnswer(sock, msg); if (handled) return; } } catch (e) {}
      try { const jeeModule = require('./commands/fun/jee');   if (typeof jeeModule.handleAnswer === 'function')  { const handled = await jeeModule.handleAnswer(sock, msg);  if (handled) return; } } catch (e) {}
    }

    if (isGroup) {
      const groupSettings = database.getGroupSettings(from);
      if (groupSettings.antiall) {
        const senderIsAdmin = await isAdmin(sock, sender, from, groupMetadata);
        if (!senderIsAdmin && !senderIsOwnerFlag && !senderIsWhitelisted) {
          const botIsAdmin = await isBotAdmin(sock, from, groupMetadata);
          if (botIsAdmin) { await sock.sendMessage(from, { delete: msg.key }); return; }
        }
      }
      if (groupSettings.antitag && !msg.key.fromMe) {
        const ctx = content.extendedTextMessage?.contextInfo;
        const mentionedJids = ctx?.mentionedJid || [];
        const messageText = (body || content.imageMessage?.caption || content.videoMessage?.caption || '');
        const numericMentions = messageText.match(/@\d{10,}/g) || [];
        const uniqueNumericMentions = new Set();
        numericMentions.forEach(mention => { const numMatch = mention.match(/@(\d+)/); if (numMatch) uniqueNumericMentions.add(numMatch[1]); });
        const totalMentions = Math.max(mentionedJids.length, uniqueNumericMentions.size);
        if (totalMentions >= 3) {
          try {
            const participants = groupMetadata.participants || [];
            const mentionThreshold = Math.max(3, Math.ceil(participants.length * 0.5));
            if (totalMentions >= mentionThreshold || uniqueNumericMentions.size >= 10) {
              const senderIsAdmin = await isAdmin(sock, sender, from, groupMetadata);
              if (!senderIsAdmin && !senderIsOwnerFlag && !senderIsWhitelisted) {
                const action = (groupSettings.antitagAction || 'delete').toLowerCase();
                if (action === 'delete') {
                  try { await sock.sendMessage(from, { delete: msg.key }); await sock.sendMessage(from, { text: '⚠️ *Tagall Detected!*', mentions: [sender] }, { quoted: msg }); } catch (e) { console.error('Failed to delete tagall message:', e); }
                } else if (action === 'kick') {
                  try { await sock.sendMessage(from, { delete: msg.key }); } catch (e) {}
                  const botIsAdmin = await isBotAdmin(sock, from, groupMetadata);
                  if (botIsAdmin) {
                    try { await sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (e) {}
                    await sock.sendMessage(from, { text: `🚫 *Antitag!* @${sender.split('@')[0]} kicked.`, mentions: [sender] }, { quoted: msg });
                  }
                }
                return;
              }
            }
          } catch (e) { console.error('Error during anti-tag enforcement:', e); }
        }
      }
    }

    if (isGroup) {
      try { await handleAntigroupmention(sock, msg, groupMetadata); } catch (error) { console.error('Error in antigroupmention handler:', error); }
    }

    if (isGroup) {
      const groupSettings = database.getGroupSettings(from);
      if (groupSettings.autosticker) {
        const mediaMessage = content?.imageMessage || content?.videoMessage;
        if (mediaMessage && !body.startsWith(config.prefix)) {
          try {
            const stickerCmd = commands.get('sticker');
            if (stickerCmd) {
              await stickerCmd.execute(sock, msg, [], { from, sender, isGroup, groupMetadata, isOwner: isOwner(sender), isAdmin: await isAdmin(sock, sender, from, groupMetadata), isBotAdmin: await isBotAdmin(sock, from, groupMetadata), isMod: isMod(sender), reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }), react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } }) });
              return;
            }
          } catch (error) { console.error('[AutoSticker Error]:', error); }
        }
      }
    }

    try {
      const bombModule = require('./commands/fun/bomb');
      if (bombModule.gameState && bombModule.gameState.has(sender)) {
        const bombCommand = commands.get('bomb');
        if (bombCommand && bombCommand.execute) {
          await bombCommand.execute(sock, msg, [], { from, sender, isGroup, groupMetadata, isOwner: isOwner(sender), isAdmin: await isAdmin(sock, sender, from, groupMetadata), isBotAdmin: await isBotAdmin(sock, from, groupMetadata), isMod: isMod(sender), reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }), react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } }) });
          return;
        }
      }
    } catch (e) {}

    try {
      const tictactoeModule = require('./commands/fun/tictactoe');
      if (tictactoeModule.handleTicTacToeMove) {
        const isInGame = Object.values(tictactoeModule.games || {}).some(room => room.id.startsWith('tictactoe') && [room.game.playerX, room.game.playerO].includes(sender) && room.state === 'PLAYING');
        if (isInGame) {
          const handled = await tictactoeModule.handleTicTacToeMove(sock, msg, { from, sender, isGroup, groupMetadata, isOwner: isOwner(sender), isAdmin: await isAdmin(sock, sender, from, groupMetadata), isBotAdmin: await isBotAdmin(sock, from, groupMetadata), isMod: isMod(sender), reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }), react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } }) });
          if (handled) return;
        }
      }
    } catch (e) {}

    if (!body.startsWith(config.prefix)) return;

    const args = body.slice(config.prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const command = commands.get(commandName);
    if (!command) return;

    // ─────────────────────────────────────────────────────────────────────
    // SELF MODE CHECK
    // selfMode = true  →  only Owner, Bot Mods, AND Group Admins can use bot
    // selfMode = false →  everyone can use bot
    // ─────────────────────────────────────────────────────────────────────
    if (config.selfMode) {
      const senderIsOwner = isOwner(sender);
      const senderIsMod   = isMod(sender);
      const senderIsGroupAdmin = isGroup
        ? await isAdmin(sock, sender, from, groupMetadata)
        : false;

      if (!senderIsOwner && !senderIsMod && !senderIsGroupAdmin) {
        // Silent ignore — no response to random users
        return;
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    if (command.ownerOnly && !isOwner(sender)) {
      return sock.sendMessage(from, { text: config.messages.ownerOnly }, { quoted: msg });
    }
    if (command.modOnly && !isMod(sender) && !isOwner(sender)) {
      return sock.sendMessage(from, { text: '🔒 This command is only for moderators!' }, { quoted: msg });
    }
    if (command.groupOnly && !isGroup) {
      return sock.sendMessage(from, { text: config.messages.groupOnly }, { quoted: msg });
    }
    if (command.privateOnly && isGroup) {
      return sock.sendMessage(from, { text: config.messages.privateOnly }, { quoted: msg });
    }
    if (command.adminOnly && !(await isAdmin(sock, sender, from, groupMetadata)) && !isOwner(sender)) {
      return sock.sendMessage(from, { text: config.messages.adminOnly }, { quoted: msg });
    }
    if (command.botAdminNeeded) {
      const botIsAdmin = await isBotAdmin(sock, from, groupMetadata);
      if (!botIsAdmin) return sock.sendMessage(from, { text: config.messages.botAdminNeeded }, { quoted: msg });
    }

    if (config.autoTyping) await sock.sendPresenceUpdate('composing', from);

    console.log(`Executing command: ${commandName} from ${sender}`);

    await command.execute(sock, msg, args, {
      from, sender, isGroup, groupMetadata,
      isOwner:    isOwner(sender),
      isAdmin:    await isAdmin(sock, sender, from, groupMetadata),
      isBotAdmin: await isBotAdmin(sock, from, groupMetadata),
      isMod:      isMod(sender),
      isWhitelisted: senderIsWhitelisted,
      reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }),
      react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })
    });

  } catch (error) {
    console.error('Error in message handler:', error);
    if (error.message && error.message.includes('rate-overlimit')) { console.warn('⚠️ Rate limit reached. Skipping error message.'); return; }
    try {
      await sock.sendMessage(msg.key.remoteJid, { text: `${config.messages.error}\n\n${error.message}` }, { quoted: msg });
    } catch (e) { if (!e.message || !e.message.includes('rate-overlimit')) console.error('Error sending error message:', e); }
  }
};

// Group participant update handler
const handleGroupUpdate = async (sock, update) => {
  try {
    const { id, participants, action } = update;
    if (!id || !id.endsWith('@g.us')) return;
    const groupSettings = database.getGroupSettings(id);
    if (!groupSettings.welcome && !groupSettings.goodbye) return;
    const groupMetadata = await getGroupMetadata(sock, id);
    if (!groupMetadata) return;
    const getParticipantJid = (participant) => {
      if (typeof participant === 'string') return participant;
      if (participant && participant.id) return participant.id;
      if (participant && typeof participant === 'object') return participant.jid || participant.participant || null;
      return null;
    };
    for (const participant of participants) {
      const participantJid = getParticipantJid(participant);
      if (!participantJid) { console.warn('Could not extract participant JID:', participant); continue; }
      const participantNumber = participantJid.split('@')[0];
      if (action === 'add' && groupSettings.welcome) {
        try {
          let displayName = participantNumber;
          const participantInfo = groupMetadata.participants.find(p => { const pId = p.id || p.jid || p.participant; const pPhone = p.phoneNumber; return pId === participantJid || pId?.split('@')[0] === participantNumber || pPhone === participantJid || pPhone?.split('@')[0] === participantNumber; });
          let phoneJid = null;
          if (participantInfo && participantInfo.phoneNumber) { phoneJid = participantInfo.phoneNumber; } else { try { const normalized = normalizeJidWithLid(participantJid); if (normalized && normalized.includes('@s.whatsapp.net')) phoneJid = normalized; } catch (e) { if (participantJid.includes('@s.whatsapp.net')) phoneJid = participantJid; } }
          if (phoneJid) {
            try {
              if (sock.store && sock.store.contacts && sock.store.contacts[phoneJid]) { const contact = sock.store.contacts[phoneJid]; if (contact.notify && contact.notify.trim() && !contact.notify.match(/^\d+$/)) displayName = contact.notify.trim(); else if (contact.name && contact.name.trim() && !contact.name.match(/^\d+$/)) displayName = contact.name.trim(); }
              if (displayName === participantNumber) { try { await sock.onWhatsApp(phoneJid); if (sock.store && sock.store.contacts && sock.store.contacts[phoneJid]) { const contact = sock.store.contacts[phoneJid]; if (contact.notify && contact.notify.trim() && !contact.notify.match(/^\d+$/)) displayName = contact.notify.trim(); } } catch (fetchError) {} }
            } catch (contactError) {}
          }
          if (displayName === participantNumber && participantInfo) { if (participantInfo.notify && participantInfo.notify.trim() && !participantInfo.notify.match(/^\d+$/)) displayName = participantInfo.notify.trim(); else if (participantInfo.name && participantInfo.name.trim() && !participantInfo.name.match(/^\d+$/)) displayName = participantInfo.name.trim(); }
          const groupName = groupMetadata.subject || 'the group';
          const groupDesc = groupMetadata.desc || 'No description';
          const now = new Date();
          const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          const welcomeMsg = `╭╼━≪•𝙽𝙴𝚆 𝙼𝙴𝙼𝙱𝙴𝚁•≫━╾╮\n┃𝚆𝙴𝙻𝙲𝙾𝙼𝙴: @${displayName} 👋\n┃Member count: #${groupMetadata.participants.length}\n┃𝚃𝙸𝙼𝙴: ${timeString}⏰\n╰━━━━━━━━━━━━━━━╯\n\n*@${displayName}* Welcome to *${groupName}*! 🎉\n*Group 𝙳𝙴𝚂𝙲𝚁𝙸𝙿𝚃𝙸𝙾𝙽*\n${groupDesc}\n\n> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${config.botName}*`;
          await sock.sendMessage(id, { text: welcomeMsg, mentions: [participantJid] });
        } catch (welcomeError) {
          let message = groupSettings.welcomeMessage || 'Welcome @user to @group! 👋';
          message = message.replace('@user', `@${participantNumber}`).replace('@group', groupMetadata.subject || 'the group');
          await sock.sendMessage(id, { text: message, mentions: [participantJid] });
        }
      } else if (action === 'remove' && groupSettings.goodbye) {
        try { await sock.sendMessage(id, { text: `Goodbye @${participantNumber} 👋 We will never miss you!`, mentions: [participantJid] }); } catch (goodbyeError) { await sock.sendMessage(id, { text: `Goodbye @${participantNumber} 👋`, mentions: [participantJid] }); }
      }
    }
  } catch (error) {
    if (error.message && (error.message.includes('forbidden') || error.message.includes('403') || error.statusCode === 403 || error.output?.statusCode === 403 || error.data === 403)) return;
    if (!error.message || !error.message.includes('forbidden')) console.error('Error handling group update:', error);
  }
};

// Antilink handler
const handleAntilink = async (sock, msg, groupMetadata) => {
  try {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const groupSettings = database.getGroupSettings(from);
    if (!groupSettings.antilink) return;
    if (database.isWhitelisted(sender)) return;
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';
    const linkPattern = /(https?:\/\/)?([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}(\/[^\s]*)?/i;
    if (linkPattern.test(body)) {
      const senderIsAdmin = await isAdmin(sock, sender, from, groupMetadata);
      const senderIsOwner = isOwner(sender);
      if (senderIsAdmin || senderIsOwner) return;
      const botIsAdmin = await isBotAdmin(sock, from, groupMetadata);
      const action = (groupSettings.antilinkAction || 'delete').toLowerCase();
      if (action === 'kick' && botIsAdmin) {
        try { await sock.sendMessage(from, { delete: msg.key }); await sock.groupParticipantsUpdate(from, [sender], 'remove'); await sock.sendMessage(from, { text: `🔗 Anti-link triggered. Link removed.`, mentions: [sender] }, { quoted: msg }); } catch (e) { console.error('Failed to kick for antilink:', e); }
      } else {
        try { await sock.sendMessage(from, { delete: msg.key }); await sock.sendMessage(from, { text: `🔗 Anti-link triggered. Link removed.`, mentions: [sender] }, { quoted: msg }); } catch (e) { console.error('Failed to delete message for antilink:', e); }
      }
    }
  } catch (error) { console.error('Error in antilink handler:', error); }
};

// Anti-group mention handler
const handleAntigroupmention = async (sock, msg, groupMetadata) => {
  try {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const groupSettings = database.getGroupSettings(from);
    if (!groupSettings.antigroupmention) return;
    let isForwardedStatus = false;
    if (msg.message) {
      isForwardedStatus = isForwardedStatus || !!msg.message.groupStatusMentionMessage;
      isForwardedStatus = isForwardedStatus || (msg.message.protocolMessage && msg.message.protocolMessage.type === 25);
      isForwardedStatus = isForwardedStatus || (msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo && msg.message.extendedTextMessage.contextInfo.forwardedNewsletterMessageInfo);
      isForwardedStatus = isForwardedStatus || (msg.message.conversation && msg.message.contextInfo && msg.message.contextInfo.forwardedNewsletterMessageInfo);
      isForwardedStatus = isForwardedStatus || (msg.message.imageMessage && msg.message.imageMessage.contextInfo && msg.message.imageMessage.contextInfo.forwardedNewsletterMessageInfo);
      isForwardedStatus = isForwardedStatus || (msg.message.videoMessage && msg.message.videoMessage.contextInfo && msg.message.videoMessage.contextInfo.forwardedNewsletterMessageInfo);
      isForwardedStatus = isForwardedStatus || (msg.message.contextInfo && msg.message.contextInfo.forwardedNewsletterMessageInfo);
      if (msg.message.contextInfo) { const ctx = msg.message.contextInfo; isForwardedStatus = isForwardedStatus || !!ctx.isForwarded || !!ctx.forwardingScore || !!ctx.quotedMessageTimestamp; }
      if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo) { const extCtx = msg.message.extendedTextMessage.contextInfo; isForwardedStatus = isForwardedStatus || !!extCtx.isForwarded || !!extCtx.forwardingScore; }
    }
    if (isForwardedStatus) {
      const senderIsAdmin = await isAdmin(sock, sender, from, groupMetadata);
      const senderIsOwner = isOwner(sender);
      if (senderIsAdmin || senderIsOwner) return;
      const botIsAdmin = await isBotAdmin(sock, from, groupMetadata);
      const action = (groupSettings.antigroupmentionAction || 'delete').toLowerCase();
      if (action === 'kick' && botIsAdmin) {
        try { await sock.sendMessage(from, { delete: msg.key }); await sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch (e) { console.error('Failed to kick for antigroupmention:', e); }
      } else {
        try { await sock.sendMessage(from, { delete: msg.key }); } catch (e) { console.error('Failed to delete message for antigroupmention:', e); }
      }
    }
  } catch (error) { console.error('Error in antigroupmention handler:', error); }
};

// Anti-call feature initializer
const initializeAntiCall = (sock) => {
  sock.ev.on('call', async (calls) => {
    try {
      delete require.cache[require.resolve('./config')];
      const config = require('./config');
      if (!config.defaultGroupSettings.anticall) return;
      for (const call of calls) {
        if (call.status === 'offer') {
          await sock.rejectCall(call.id, call.from);
          await sock.updateBlockStatus(call.from, 'block');
          await sock.sendMessage(call.from, { text: '🚫 Calls are not allowed. You have been blocked.' });
        }
      }
    } catch (err) { console.error('[ANTICALL ERROR]', err); }
  });
};

module.exports = {
  handleMessage,
  handleGroupUpdate,
  handleAntilink,
  handleAntigroupmention,
  initializeAntiCall,
  isOwner,
  isAdmin,
  isBotAdmin,
  isMod,
  getGroupMetadata,
  findParticipant
};
