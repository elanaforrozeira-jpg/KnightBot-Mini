/**
 * Song Downloader - Download audio from YouTube
 * Uses multi-API fallback chain via utils/api.js
 */

const yts = require('yt-search');
const axios = require('axios');
const APIs = require('../../utils/api');
const { toAudio } = require('../../utils/converter');

module.exports = {
  name: 'song',
  aliases: ['play', 'music', 'yta', 'ytplay', 'ytaudio'],
  category: 'media',
  description: 'Download audio from YouTube',
  usage: '.song <song name or YouTube link>',

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    try {
      const text = args.join(' ').trim();
      if (!text) {
        return await sock.sendMessage(chatId, {
          text: '🎵 Usage: .song <song name or YouTube link>'
        }, { quoted: msg });
      }

      let video;
      if (text.includes('youtube.com') || text.includes('youtu.be')) {
        video = { url: text, title: 'YouTube Audio', thumbnail: null, timestamp: 'N/A' };
      } else {
        await sock.sendMessage(chatId, { react: { text: '🔍', key: msg.key } });
        const search = await yts(text);
        if (!search || !search.videos.length) {
          return await sock.sendMessage(chatId, { text: '❌ No results found for that query.' }, { quoted: msg });
        }
        video = search.videos[0];
      }

      // Inform user
      const infoMsg = `🎵 *Downloading...*\n\n📌 *${video.title || 'Audio'}*\n⏱ Duration: ${video.timestamp || 'N/A'}\n\n_Please wait..._`;
      await sock.sendMessage(chatId, { text: infoMsg }, { quoted: msg });
      await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

      // Download via multi-API fallback
      const audioData = await APIs.getYtAudio(video.url);
      const audioUrl = audioData.download || audioData.dl || audioData.url;
      if (!audioUrl) throw new Error('No download URL returned from any API');

      // Fetch audio buffer
      let audioBuffer;
      try {
        const resp = await axios.get(audioUrl, {
          responseType: 'arraybuffer', timeout: 120000,
          maxContentLength: Infinity, maxBodyLength: Infinity,
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*', 'Accept-Encoding': 'identity' }
        });
        audioBuffer = Buffer.from(resp.data);
      } catch (e) {
        // stream fallback
        const resp = await axios.get(audioUrl, {
          responseType: 'stream', timeout: 120000,
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*', 'Accept-Encoding': 'identity' }
        });
        const chunks = [];
        await new Promise((res, rej) => {
          resp.data.on('data', c => chunks.push(c));
          resp.data.on('end', res);
          resp.data.on('error', rej);
        });
        audioBuffer = Buffer.concat(chunks);
      }

      if (!audioBuffer || audioBuffer.length === 0) throw new Error('Downloaded buffer is empty');

      // Detect format
      const sig = audioBuffer.toString('ascii', 0, 4);
      const ftyp = audioBuffer.slice(4, 8).toString('ascii');
      let ext = 'mp3';
      if (ftyp === 'ftyp' || sig === '\x00\x00\x00\x1c' || sig === '\x00\x00\x00 ') ext = 'm4a';
      else if (sig === 'OggS') ext = 'ogg';
      else if (sig === 'RIFF') ext = 'wav';

      // Convert if needed
      let finalBuffer = audioBuffer;
      if (ext !== 'mp3') {
        try { finalBuffer = await toAudio(audioBuffer, ext); } catch (e) { finalBuffer = audioBuffer; }
      }

      const title = (audioData.title || video.title || 'song').replace(/[^\w\s\-]/g, '').trim();
      await sock.sendMessage(chatId, {
        audio: finalBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      }, { quoted: msg });
      await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (err) {
      console.error('[Song Error]', err.message);
      await sock.sendMessage(chatId, {
        text: `❌ *Download Failed*\n\n${err.message}\n\n_Try a different song or paste the YouTube link directly._`
      }, { quoted: msg });
      await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
  }
};
