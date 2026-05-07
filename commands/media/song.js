/**
 * Song Downloader - YouTube Audio
 * • Sends as audio/mp4 (voice note = false) so it plays in WhatsApp
 * • Multi-API fallback
 */

const yts   = require('yt-search');
const axios  = require('axios');
const APIs   = require('../../utils/api');
const { detectAudioFormat, looksLikeTextPayload, cleanAudioTitle } = require('../../utils/audioMessage');

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
      let contentType = '';
      try {
        const resp = await axios.get(audioUrl, {
          responseType: 'arraybuffer',
          timeout: 180000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*', 'Accept-Encoding': 'identity' }
        });
        audioBuffer = Buffer.from(resp.data);
        contentType = resp.headers?.['content-type'] || '';
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
        contentType = resp.headers?.['content-type'] || '';
      }

      if (!audioBuffer?.length) throw new Error('Downloaded buffer is empty');
      if (looksLikeTextPayload(audioBuffer, contentType)) {
        throw new Error('Invalid media response from downloader API');
      }

      const { mimetype, ext } = detectAudioFormat(audioBuffer, contentType);
      const title = cleanAudioTitle(audioData.title || video.title || 'song');

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
