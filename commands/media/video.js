/**
 * Video Downloader - Download video from YouTube
 * Uses multi-API fallback chain via utils/api.js
 */

const yts = require('yt-search');
const axios = require('axios');
const APIs = require('../../utils/api');

module.exports = {
  name: 'video',
  aliases: ['ytvideo', 'ytv', 'yt'],
  category: 'media',
  description: 'Download video from YouTube',
  usage: '.video <video name or YouTube link>',

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    try {
      const text = args.join(' ').trim();
      if (!text) {
        return await sock.sendMessage(chatId, {
          text: '🎬 Usage: .video <video name or YouTube link>'
        }, { quoted: msg });
      }

      let video;
      if (text.includes('youtube.com') || text.includes('youtu.be')) {
        video = { url: text, title: 'YouTube Video', thumbnail: null, timestamp: 'N/A' };
      } else {
        await sock.sendMessage(chatId, { react: { text: '🔍', key: msg.key } });
        const search = await yts(text);
        if (!search || !search.videos.length) {
          return await sock.sendMessage(chatId, { text: '❌ No results found.' }, { quoted: msg });
        }
        video = search.videos[0];
        // Block videos > 10 min to avoid huge files
        if (video.seconds && video.seconds > 600) {
          return await sock.sendMessage(chatId, {
            text: `❌ Video is too long (${video.timestamp}). Max 10 minutes allowed.`
          }, { quoted: msg });
        }
      }

      const infoMsg = `🎬 *Downloading...*\n\n📌 *${video.title || 'Video'}*\n⏱ Duration: ${video.timestamp || 'N/A'}\n\n_Please wait..._`;
      await sock.sendMessage(chatId, { text: infoMsg }, { quoted: msg });
      await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

      const videoData = await APIs.getYtVideo(video.url);
      const dlUrl = videoData.download || videoData.dl || videoData.url;
      if (!dlUrl) throw new Error('No download URL returned');

      let videoBuffer;
      try {
        const resp = await axios.get(dlUrl, {
          responseType: 'arraybuffer', timeout: 180000,
          maxContentLength: Infinity, maxBodyLength: Infinity,
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*', 'Accept-Encoding': 'identity' }
        });
        videoBuffer = Buffer.from(resp.data);
      } catch (e) {
        const resp = await axios.get(dlUrl, {
          responseType: 'stream', timeout: 180000,
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
        });
        const chunks = [];
        await new Promise((res, rej) => {
          resp.data.on('data', c => chunks.push(c));
          resp.data.on('end', res);
          resp.data.on('error', rej);
        });
        videoBuffer = Buffer.concat(chunks);
      }

      if (!videoBuffer || videoBuffer.length === 0) throw new Error('Video buffer is empty');

      const title = (videoData.title || video.title || 'video').replace(/[^\w\s\-]/g, '').trim();
      await sock.sendMessage(chatId, {
        video: videoBuffer,
        mimetype: 'video/mp4',
        fileName: `${title}.mp4`,
        caption: `🎬 *${title}*\n\n> Powered by KnightBot`
      }, { quoted: msg });
      await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (err) {
      console.error('[Video Error]', err.message);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ *Download Failed*\n\n${err.message}\n\n_Try a different video or paste the YouTube link directly._`
      }, { quoted: msg });
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
    }
  }
};
