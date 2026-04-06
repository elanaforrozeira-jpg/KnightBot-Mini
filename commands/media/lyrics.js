/**
 * Lyrics Finder
 * APIs: genius-api → lyrics.ovh → lrclib → chartlyrics fallback
 */

const axios  = require('axios');
const config = require('../../config');

const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };

module.exports = {
  name: 'lyrics',
  aliases: ['lyric', 'lirik', 'lrc'],
  category: 'media',
  description: 'Get lyrics of a song',
  usage: '.lyrics <song name>',

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    try {
      if (!args.length) {
        return await sock.sendMessage(chatId, {
          text: `❌ Provide a song name!\nExample: ${config.prefix}lyrics Tum Hi Ho`
        }, { quoted: msg });
      }

      const query = args.join(' ').trim();
      await sock.sendMessage(chatId, { react: { text: '🔍', key: msg.key } });

      let lyricsData = null;

      // ── API 1: lyrics.ovh (simple, reliable) ──────────────────────────────
      if (!lyricsData) {
        try {
          // parse "artist song" — best effort split
          const parts  = query.split(' ');
          const artist = parts[0];
          const song   = parts.slice(1).join(' ') || parts[0];
          const res    = await axios.get(
            `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`,
            { timeout: 10000, headers: HEADERS }
          );
          if (res.data?.lyrics?.trim()) {
            lyricsData = { title: song, artist, lyrics: res.data.lyrics };
          }
        } catch (_) {}
      }

      // ── API 2: lrclib.net (accurate, has many Hindi/English songs) ─────────
      if (!lyricsData) {
        try {
          const res = await axios.get(
            `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`,
            { timeout: 10000, headers: HEADERS }
          );
          const hits = res.data;
          if (Array.isArray(hits) && hits.length) {
            const top = hits[0];
            const lyr = top.plainLyrics || top.syncedLyrics?.replace(/\[\d+:\d+\.\d+\]/g, '').trim();
            if (lyr) {
              lyricsData = {
                title:  top.trackName  || query,
                artist: top.artistName || 'Unknown',
                lyrics: lyr
              };
            }
          }
        } catch (_) {}
      }

      // ── API 3: Happi Music API (open, no key needed for basic) ─────────────
      if (!lyricsData) {
        try {
          const res = await axios.get(
            `https://api.happi.dev/v1/music?q=${encodeURIComponent(query)}&limit=1&apikey=live_0d91a2ac1mshceb5b2c2da1d7bddp1b3bcajsna17a52bdfc6e`,
            { timeout: 10000, headers: HEADERS }
          );
          const track = res.data?.result?.[0];
          if (track) {
            const lres = await axios.get(track.api_lyrics, { timeout: 10000, headers: HEADERS });
            const lyr  = lres.data?.result?.lyrics;
            if (lyr) {
              lyricsData = { title: track.track, artist: track.artist, lyrics: lyr };
            }
          }
        } catch (_) {}
      }

      // ── API 4: ChartLyrics (XML fallback, old but works) ──────────────────
      if (!lyricsData) {
        try {
          const parts  = query.split(' ');
          const artist = parts[0];
          const song   = parts.slice(1).join(' ') || parts[0];
          const res    = await axios.get(
            `http://api.chartlyrics.com/apiv1.asmx/SearchLyricDirect?artist=${encodeURIComponent(artist)}&song=${encodeURIComponent(song)}`,
            { timeout: 10000 }
          );
          const match  = res.data?.match(/<Lyric>([\s\S]*?)<\/Lyric>/);
          const artMatch = res.data?.match(/<LyricArtist>([\s\S]*?)<\/LyricArtist>/);
          const ttlMatch = res.data?.match(/<LyricSong>([\s\S]*?)<\/LyricSong>/);
          if (match?.[1]?.trim()) {
            lyricsData = {
              title:  ttlMatch?.[1] || song,
              artist: artMatch?.[1] || artist,
              lyrics: match[1]
            };
          }
        } catch (_) {}
      }

      if (!lyricsData) {
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
        return await sock.sendMessage(chatId, {
          text: `❌ *Lyrics not found* for "${query}"\n\n_Tips:_\n• Try: _Artist Name + Song Name_\n• Example: ${config.prefix}lyrics Arijit Tum Hi Ho`
        }, { quoted: msg });
      }

      // Trim long lyrics
      let lyrics = lyricsData.lyrics.trim();
      if (lyrics.length > 4500) {
        lyrics = lyrics.substring(0, 4500) + '\n\n_... (showing first part only)_';
      }

      const caption =
        `🎵 *${lyricsData.title}*\n` +
        `👤 *${lyricsData.artist}*\n` +
        `${'┄'.repeat(22)}\n\n` +
        `${lyrics}`;

      await sock.sendMessage(chatId, { text: caption }, { quoted: msg });
      await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (err) {
      console.error('[Lyrics Error]', err);
      await sock.sendMessage(chatId, {
        text: '❌ Something went wrong while fetching lyrics.'
      }, { quoted: msg });
    }
  }
};
