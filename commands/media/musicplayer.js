/**
 * 🎵 Music Player Command
 * Search & show a now-playing card with the song sent as audio.
 * Other users can react with 🎵 to "join" the listening session.
 *
 * Usage:
 *   .np <song name or yt link>   — starts "now playing"
 *   .np join                     — join the current session
 *   .np skip                     — skip (owner/admin)
 *   .np stop                     — stop session (owner/admin)
 *   .np queue                    — show queue
 *   .np add <song>               — add to queue
 */

const yts = require('yt-search');
const axios = require('axios');
const APIs = require('../../utils/api');
const { toAudio } = require('../../utils/converter');

// In-memory sessions per chat
const sessions = new Map();
// { chatId: { title, duration, url, listeners: Set<jid>, queue: [], playing: bool, msgKey } }

const getSession = (chatId) => sessions.get(chatId) || null;

const createSession = (chatId, song) => {
  sessions.set(chatId, {
    title: song.title,
    duration: song.duration,
    url: song.url,
    thumbnail: song.thumbnail || null,
    listeners: new Set(),
    queue: [],
    playing: true,
    startedAt: Date.now()
  });
  return sessions.get(chatId);
};

const stopSession = (chatId) => sessions.delete(chatId);

// Pretty duration
const fmtDur = (sec) => {
  if (!sec || isNaN(sec)) return 'N/A';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Now-playing card text
const npCard = (session, listeners) => {
  const bar = buildBar(session.startedAt, session.duration);
  const listenerList = [...listeners].map(j => `@${j.split('@')[0]}`).join(', ') || 'Nobody';
  return (
    `🎵 *NOW PLAYING*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎶 *${session.title}*\n` +
    `⏱ Duration: ${session.duration || 'N/A'}\n\n` +
    `${bar}\n\n` +
    `👥 *Listeners (${listeners.size}):* ${listenerList}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 Queue: ${session.queue.length} song(s) waiting\n` +
    `> Reply with 🎵 to join the session!`
  );
};

const buildBar = (startedAt, durationStr) => {
  // Parse duration string like "3:45"
  let totalSec = 0;
  if (durationStr && durationStr.includes(':')) {
    const parts = durationStr.split(':').map(Number);
    totalSec = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (!totalSec) return '▶️ 🎵🎵🎵🎵🎵🎵🎵🎵🎵🎵';
  const elapsed = Math.min(Math.floor((Date.now() - startedAt) / 1000), totalSec);
  const pct = Math.round((elapsed / totalSec) * 10);
  const filled = '🟩'.repeat(pct);
  const empty = '⬛'.repeat(10 - pct);
  const elStr = fmtDur(elapsed);
  const totStr = fmtDur(totalSec);
  return `${filled}${empty}\n⏩ ${elStr} / ${totStr}`;
};

module.exports = {
  name: 'np',
  aliases: ['nowplaying', 'musicplayer', 'mp'],
  category: 'media',
  description: 'Music player — search, play, join & queue songs',
  usage: '.np <song>  |  .np join  |  .np skip  |  .np stop  |  .np queue  |  .np add <song>',

  // Called from handler when someone reacts 🎵 to the now-playing message
  handleReaction: async (sock, reaction) => {
    const chatId = reaction.key.remoteJid;
    const reactor = reaction.key.participant || reaction.key.remoteJid;
    const emoji = reaction.message?.reactionMessage?.text;
    if (emoji !== '🎵') return;

    const session = getSession(chatId);
    if (!session || !session.playing) return;
    if (session.listeners.has(reactor)) return;

    session.listeners.add(reactor);
    const num = reactor.split('@')[0];
    await sock.sendMessage(chatId, {
      text: `🎵 *@${num} joined the listening session!*\n\n👥 Listeners: ${session.listeners.size}\n\n${npCard(session, session.listeners)}`,
      mentions: [reactor]
    });
  },

  async execute(sock, msg, args, { from, sender, isAdmin, isOwner, reply }) {
    const sub = (args[0] || '').toLowerCase();

    // ── JOIN ────────────────────────────────────────────────────────────────
    if (sub === 'join') {
      const session = getSession(from);
      if (!session || !session.playing)
        return reply('❌ No music is currently playing. Start one with `.np <song name>`');

      if (session.listeners.has(sender)) {
        return reply('🎵 You are already in the listening session!');
      }
      session.listeners.add(sender);
      const num = sender.split('@')[0];
      return sock.sendMessage(from, {
        text: `🎵 *@${num} joined the listening session!*\n\n${npCard(session, session.listeners)}`,
        mentions: [sender]
      }, { quoted: msg });
    }

    // ── STOP ────────────────────────────────────────────────────────────────
    if (sub === 'stop') {
      if (!isOwner && !isAdmin)
        return reply('❌ Only admins can stop the music.');
      if (!getSession(from))
        return reply('❌ No session running.');
      stopSession(from);
      return reply('⏹️ Music session stopped.');
    }

    // ── SKIP ────────────────────────────────────────────────────────────────
    if (sub === 'skip') {
      if (!isOwner && !isAdmin)
        return reply('❌ Only admins can skip.');
      const session = getSession(from);
      if (!session) return reply('❌ No session running.');
      if (!session.queue.length) {
        stopSession(from);
        return reply('⏭️ No more songs in queue. Session ended.');
      }
      const next = session.queue.shift();
      await reply(`⏭️ Skipped! Next: *${next.title}*`);
      // Trigger play of next song
      args = ['', next.url];
      // fall through to play logic below by resetting sub
    }

    // ── QUEUE ───────────────────────────────────────────────────────────────
    if (sub === 'queue') {
      const session = getSession(from);
      if (!session) return reply('❌ No session running.');
      if (!session.queue.length)
        return reply('📋 Queue is empty. Add songs with `.np add <song>`');
      const list = session.queue.map((s, i) => `${i + 1}. 🎵 ${s.title}`).join('\n');
      return reply(`📋 *Queue (${session.queue.length} songs)*\n\n${list}`);
    }

    // ── ADD TO QUEUE ────────────────────────────────────────────────────────
    if (sub === 'add') {
      const query = args.slice(1).join(' ').trim();
      if (!query) return reply('Usage: .np add <song name or link>');
      const session = getSession(from);
      if (!session) return reply('❌ No session running. Start one with `.np <song>`');
      await reply('🔍 Searching...');
      try {
        let info;
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
          info = { title: 'YouTube Song', url: query, duration: 'N/A' };
        } else {
          const res = await yts(query);
          if (!res?.videos?.length) return reply('❌ No results found.');
          const v = res.videos[0];
          info = { title: v.title, url: v.url, duration: v.timestamp };
        }
        session.queue.push(info);
        return reply(`✅ *${info.title}* added to queue!\n📋 Queue: ${session.queue.length} song(s)`);
      } catch (e) {
        return reply('❌ Failed to add song: ' + e.message);
      }
    }

    // ── PLAY (default) ──────────────────────────────────────────────────────
    const query = args.join(' ').trim();
    if (!query) {
      const session = getSession(from);
      if (session) {
        return sock.sendMessage(from, {
          text: npCard(session, session.listeners)
        }, { quoted: msg });
      }
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

    // Search
    let video;
    if (query.includes('youtube.com') || query.includes('youtu.be')) {
      video = { url: query, title: 'YouTube Song', thumbnail: null, timestamp: 'N/A', seconds: 0 };
    } else {
      await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });
      try {
        const search = await yts(query);
        if (!search?.videos?.length)
          return reply('❌ No results found for that query.');
        video = search.videos[0];
      } catch (e) {
        return reply('❌ Search failed: ' + e.message);
      }
    }

    if (video.seconds && video.seconds > 600)
      return reply(`❌ Song too long (${video.timestamp}). Max 10 minutes.`);

    // Create / update session
    const session = createSession(from, {
      title: video.title,
      duration: video.timestamp,
      url: video.url,
      thumbnail: video.thumbnail
    });
    session.listeners.add(sender);

    // Notify starting
    await sock.sendMessage(from, {
      text:
        `🎵 *Starting Music Player...*\n\n` +
        `🎶 *${video.title}*\n` +
        `⏱ ${video.timestamp || 'N/A'}\n\n` +
        `_Downloading audio, please wait..._`
    }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

    // Download audio
    let audioBuffer;
    try {
      const audioData = await APIs.getYtAudio(video.url);
      const audioUrl = audioData.download || audioData.dl || audioData.url;
      if (!audioUrl) throw new Error('No download URL');

      try {
        const resp = await axios.get(audioUrl, {
          responseType: 'arraybuffer', timeout: 120000,
          maxContentLength: Infinity, maxBodyLength: Infinity,
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*', 'Accept-Encoding': 'identity' }
        });
        audioBuffer = Buffer.from(resp.data);
      } catch (e) {
        const resp = await axios.get(audioUrl, {
          responseType: 'stream', timeout: 120000,
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
        });
        const chunks = [];
        await new Promise((res, rej) => {
          resp.data.on('data', c => chunks.push(c));
          resp.data.on('end', res);
          resp.data.on('error', rej);
        });
        audioBuffer = Buffer.concat(chunks);
      }

      // Convert if needed
      const sig = audioBuffer.toString('ascii', 0, 4);
      const ftyp = audioBuffer.slice(4, 8).toString('ascii');
      let ext = 'mp3';
      if (ftyp === 'ftyp' || sig === '\x00\x00\x00\x1c') ext = 'm4a';
      else if (sig === 'OggS') ext = 'ogg';

      if (ext !== 'mp3') {
        try { audioBuffer = await toAudio(audioBuffer, ext); } catch (e) { /* keep as-is */ }
      }
    } catch (err) {
      stopSession(from);
      return reply(`❌ Download failed: ${err.message}`);
    }

    // Send audio
    const sentAudio = await sock.sendMessage(from, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${video.title.replace(/[^\w\s]/g, '').trim()}.mp3`,
      ptt: false
    }, { quoted: msg });

    // Send now-playing card
    const cardText = npCard(session, session.listeners);
    await sock.sendMessage(from, { text: cardText }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
  }
};
