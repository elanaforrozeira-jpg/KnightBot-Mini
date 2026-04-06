/**
 * Song Downloader - YouTube Audio
 * • Sends as audio/mp4 (voice note = false) so it plays in WhatsApp
 * • Multi-API fallback
 */

const yts   = require('yt-search');
const axios  = require('axios');
const APIs   = require('../../utils/api');

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
        if (!search?.videos?.length) {
          return await sock.sendMessage(chatId, { text: '❌ No results found.' }, { quoted: msg });
        }
        video = search.videos[0];
      }

      await sock.sendMessage(chatId, {
        text: `🎵 *Downloading...*\n\n📌 *${video.title || 'Audio'}*\n⏱ Duration: ${video.timestamp || 'N/A'}\n\n_Please wait..._`
      }, { quoted: msg });
      await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

      // Get audio URL
      const audioData = await APIs.getYtAudio(video.url);
      const audioUrl  = audioData.download || audioData.dl || audioData.url;
      if (!audioUrl) throw new Error('No download URL returned');

      // Download
      let audioBuffer;
      try {
        const resp = await axios.get(audioUrl, {
          responseType: 'arraybuffer',
          timeout: 180000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*', 'Accept-Encoding': 'identity' }
        });
        audioBuffer = Buffer.from(resp.data);
      } catch (e) {
        const resp = await axios.get(audioUrl, {
          responseType: 'stream',
          timeout: 180000,
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

      if (!audioBuffer?.length) throw new Error('Downloaded buffer is empty');

      // Detect actual format from magic bytes
      const sig  = audioBuffer.slice(0, 4).toString('hex');
      const ftyp = audioBuffer.slice(4, 8).toString('ascii');
      let mimetype = 'audio/mpeg';  // default mp3

      if (ftyp === 'ftyp') {
        // M4A / AAC container
        mimetype = 'audio/mp4';
      } else if (sig === '4f676753') {
        // OggS
        mimetype = 'audio/ogg; codecs=opus';
      } else if (sig === '52494646') {
        // RIFF (WAV)
        mimetype = 'audio/wav';
      }
      // ID3 tag (mp3) — sig starts with '494433' or 'fffb/ffe3/fff3'
      // stays as audio/mpeg

      const title = (audioData.title || video.title || 'song').replace(/[^\w\s\-]/g, '').trim();
      const ext   = mimetype.includes('mp4') ? 'm4a' : mimetype.includes('ogg') ? 'ogg' : 'mp3';

      // Send as audio document (NOT ptt) — plays inline in WhatsApp
      await sock.sendMessage(chatId, {
        audio:    audioBuffer,
        mimetype: mimetype,
        fileName: `${title}.${ext}`,
        ptt:      false
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
