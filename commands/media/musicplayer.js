/**
 * 🎵 Music Player Command  (.np)
 *
 * WhatsApp mein audio message bhejta hai (PTT nahi) + Now Playing card
 * Baaki log .np join likh ke ya 🎵 react karke join ho sakte hain.
 *
 * Commands:
 *   .np <song name / yt link>  — start playing
 *   .np join                   — join current session
 *   .np add <song>             — add to queue
 *   .np queue                  — show queue
 *   .np skip                   — skip (admin/owner)
 *   .np stop                   — stop session (admin/owner)
 *   .np                        — show current NP card
 */

const yts   = require('yt-search');
const axios  = require('axios');
const APIs   = require('../../utils/api');

// In-memory sessions: chatId → session object
const sessions = new Map();

const getSession  = (chatId) => sessions.get(chatId) || null;
const stopSession = (chatId) => sessions.delete(chatId);

const createSession = (chatId, song) => {
  sessions.set(chatId, {
    title:     song.title,
    duration:  song.duration,
    url:       song.url,
    thumbnail: song.thumbnail || null,
    listeners: new Set(),
    queue:     [],
    playing:   true,
    startedAt: Date.now()
  });
  return sessions.get(chatId);
};

// Pretty-print seconds → M:SS
const fmtSec = (sec) => {
  if (!sec || isNaN(sec)) return 'N/A';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Parse "3:45" or "1:02:30" → seconds
const parseDuration = (str) => {
  if (!str || typeof str !== 'string') return 0;
  const parts = str.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

// Progress bar
const buildBar = (startedAt, durationStr) => {
  const totalSec = parseDuration(durationStr);
  if (!totalSec) return '▶️ 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩';
  const elapsed = Math.min(Math.floor((Date.now() - startedAt) / 1000), totalSec);
  const pct     = Math.round((elapsed / totalSec) * 10);
  const filled  = '🟩'.repeat(pct);
  const empty   = '⬛'.repeat(10 - pct);
  return `▶️ ${filled}${empty}\n⏩ ${fmtSec(elapsed)} / ${fmtSec(totalSec)}`;
};

// Now Playing card text
const npCard = (session) => {
  const listeners = session.listeners;
  const bar = buildBar(session.startedAt, session.duration);
  const listenerList = [...listeners].map(j => `@${j.split('@')[0]}`).join(', ') || 'Nobody';
  return (
    `🎵 *NOW PLAYING*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎶 *${session.title}*\n` +
    `⏱ Duration: *${session.duration || 'N/A'}*\n\n` +
    `${bar}\n\n` +
    `👥 *Listeners (${listeners.size}):*\n${listenerList}\n\n` +
    `📋 Queue: *${session.queue.length}* song(s)\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `> 🎵 *Type* \`.np join\` *to join the session!*`
  );
};

module.exports = {
  name: 'np',
  aliases: ['nowplaying', 'musicplayer', 'mp'],
  category: 'media',
  description: 'Music player — play, join & queue songs from YouTube',
  usage: '.np <song>  |  .np join  |  .np add <song>  |  .np queue  |  .np skip  |  .np stop',

  // Called from handler when someone reacts 🎵
  handleReaction: async (sock, reaction) => {
    const chatId  = reaction.key.remoteJid;
    const reactor = reaction.key.participant || reaction.key.remoteJid;
    const emoji   = reaction.message?.reactionMessage?.text;
    if (emoji !== '🎵') return;
    const session = getSession(chatId);
    if (!session || !session.playing || session.listeners.has(reactor)) return;
    session.listeners.add(reactor);
    const num = reactor.split('@')[0];
    await sock.sendMessage(chatId, {
      text: `🎵 *@${num} joined the session!*\n\n${npCard(session)}`,
      mentions: [reactor]
    });
  },

  async execute(sock, msg, args, ctx) {
    const { from, sender, isAdmin, isOwner, reply } = ctx;
    const sub = (args[0] || '').toLowerCase().trim();

    // ── SHOW CARD (no args) ──
    if (!sub) {
      const session = getSession(from);
      if (!session) {
        return reply(
          '🎵 *Music Player*\n\n' +
          '`.np <song>` — Start playing\n' +
          '`.np join` — Join session\n' +
          '`.np add <song>` — Add to queue\n' +
          '`.np queue` — Show queue\n' +
          '`.np skip` — Skip (admin)\n' +
          '`.np stop` — Stop (admin)'
        );
      }
      return sock.sendMessage(from, { text: npCard(session) }, { quoted: msg });
    }

    // ── JOIN ──
    if (sub === 'join') {
      const session = getSession(from);
      if (!session || !session.playing)
        return reply('❌ No music playing. Start with `.np <song name>`');
      if (session.listeners.has(sender))
        return reply('🎵 You are already in the session!');
      session.listeners.add(sender);
      const num = sender.split('@')[0];
      return sock.sendMessage(from, {
        text: `🎵 *@${num} joined the session!*\n\n${npCard(session)}`,
        mentions: [sender]
      }, { quoted: msg });
    }

    // ── STOP ──
    if (sub === 'stop') {
      if (!isOwner && !isAdmin) return reply('❌ Only admins can stop the music.');
      if (!getSession(from))  return reply('❌ No session running.');
      stopSession(from);
      return reply('⏹️ Music session stopped.');
    }

    // ── SKIP ──
    if (sub === 'skip') {
      if (!isOwner && !isAdmin) return reply('❌ Only admins can skip.');
      const session = getSession(from);
      if (!session) return reply('❌ No session running.');
      if (!session.queue.length) {
        stopSession(from);
        return reply('⏭️ Queue empty. Session ended.');
      }
      const next = session.queue.shift();
      // play next — re-run execute with next song URL
      return module.exports.execute(sock, msg, [next.url], ctx);
    }

    // ── QUEUE ──
    if (sub === 'queue') {
      const session = getSession(from);
      if (!session) return reply('❌ No session running.');
      if (!session.queue.length)
        return reply('📋 Queue is empty. Add songs with `.np add <song>`');
      const list = session.queue.map((s, i) => `${i + 1}. 🎵 ${s.title}`).join('\n');
      return reply(`📋 *Queue (${session.queue.length} songs)*\n\n${list}`);
    }

    // ── ADD TO QUEUE ──
    if (sub === 'add') {
      const query = args.slice(1).join(' ').trim();
      if (!query) return reply('Usage: `.np add <song name or link>`');
      const session = getSession(from);
      if (!session) return reply('❌ No session running. Start one with `.np <song>`');
      await reply('🔍 Searching...');
      try {
        let info;
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
          info = { title: query, url: query, duration: 'N/A' };
        } else {
          const res = await yts(query);
          if (!res?.videos?.length) return reply('❌ No results found.');
          const v = res.videos[0];
          info = { title: v.title, url: v.url, duration: v.timestamp };
        }
        session.queue.push(info);
        return reply(`✅ *${info.title}* added to queue!\n📋 Position: #${session.queue.length}`);
      } catch (e) {
        return reply('❌ Failed: ' + e.message);
      }
    }

    // ── PLAY (default) ────────────────────────────────────────────
    const query = args.join(' ').trim();
    if (!query) return reply('🎵 Type `.np <song name>` to play a song.');

    // Search YouTube
    let video;
    if (query.includes('youtube.com') || query.includes('youtu.be')) {
      video = { url: query, title: 'YouTube Song', thumbnail: null, timestamp: 'N/A', seconds: 0 };
    } else {
      await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });
      try {
        const search = await yts(query);
        if (!search?.videos?.length) return reply('❌ No results found.');
        video = search.videos[0];
      } catch (e) {
        return reply('❌ Search failed: ' + e.message);
      }
    }

    if (video.seconds && video.seconds > 600)
      return reply(`❌ Song too long (${video.timestamp}). Max 10 min allowed.`);

    // Create session & add sender as first listener
    const session = createSession(from, {
      title:    video.title,
      duration: video.timestamp,
      url:      video.url,
      thumbnail: video.thumbnail
    });
    session.listeners.add(sender);

    // Notify chat
    await sock.sendMessage(from, {
      text:
        `🎵 *Starting Music Player*\n\n` +
        `🎶 *${video.title}*\n` +
        `⏱ ${video.timestamp || 'N/A'}\n\n` +
        `_Downloading audio, please wait..._`
    }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

    // Download audio
    let audioBuffer;
    try {
      const audioData = await APIs.getYtAudio(video.url);
      const audioUrl  = audioData.download || audioData.dl || audioData.url;
      if (!audioUrl) throw new Error('No download URL returned by API');

      // Download with fallback stream method
      try {
        const resp = await axios.get(audioUrl, {
          responseType: 'arraybuffer',
          timeout: 120000,
          maxContentLength: Infinity,
          maxBodyLength:    Infinity,
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*', 'Accept-Encoding': 'identity' }
        });
        audioBuffer = Buffer.from(resp.data);
      } catch (_) {
        const resp = await axios.get(audioUrl, {
          responseType: 'stream',
          timeout: 120000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const chunks = [];
        await new Promise((res, rej) => {
          resp.data.on('data', c => chunks.push(c));
          resp.data.on('end', res);
          resp.data.on('error', rej);
        });
        audioBuffer = Buffer.concat(chunks);
      }
    } catch (err) {
      stopSession(from);
      return reply(`❌ Audio download failed: ${err.message}`);
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      stopSession(from);
      return reply('❌ Audio buffer empty. Try a different song.');
    }

    const title = (video.title || 'song').replace(/[^\w\s\-]/g, '').trim();

    // ─── Send as AUDIO message (NOT PTT/voice note) ───
    // ptt: false  → shows as a normal audio file with scrubber in WhatsApp
    await sock.sendMessage(from, {
      audio:    audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
      ptt:      false          // ⬅ THIS is the key: false = playable audio, true = voice note
    }, { quoted: msg });

    // ─── Send Now Playing card AFTER audio ───
    const cardText = npCard(session);
    await sock.sendMessage(from, { text: cardText }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
  }
};
