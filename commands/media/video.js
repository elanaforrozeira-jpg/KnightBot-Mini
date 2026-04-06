/**
 * Video Downloader - YouTube
 * • 720p quality
 * • No length limit (supports 6hr+ videos)
 * • Live download progress updates
 * • No branding caption
 */

const yts   = require('yt-search');
const axios  = require('axios');
const APIs   = require('../../utils/api');

const fmt = (bytes) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

module.exports = {
  name: 'video',
  aliases: ['ytvideo', 'ytv', 'yt'],
  category: 'media',
  description: 'Download video from YouTube',
  usage: '.video <name or link>',

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
        if (!search?.videos?.length) {
          return await sock.sendMessage(chatId, { text: '❌ No results found.' }, { quoted: msg });
        }
        video = search.videos[0];
        // No length restriction — supports 6hr+
      }

      // Send info + status message
      const statusMsg = await sock.sendMessage(chatId, {
        text: `🎬 *Found!*\n\n📌 *${video.title || 'Video'}*\n⏱ Duration: ${video.timestamp || 'N/A'}\n\n⏳ _Fetching download link..._`
      }, { quoted: msg });
      await sock.sendMessage(chatId, { react: { text: '⏳', key: msg.key } });

      const tryEdit = async (text) => {
        try { await sock.sendMessage(chatId, { text, edit: statusMsg.key }); } catch (_) {}
      };

      // Get download URL (720p)
      const videoData = await APIs.getYtVideo(video.url);
      const dlUrl = videoData.download || videoData.dl || videoData.url;
      if (!dlUrl) throw new Error('No download URL returned');

      await tryEdit(
        `🎬 *Downloading...*\n\n📌 *${video.title || 'Video'}*\n⏱ Duration: ${video.timestamp || 'N/A'}\n\n📥 _Starting download..._`
      );

      // Stream download with progress tracking
      const resp = await axios.get(dlUrl, {
        responseType: 'stream',
        timeout: 0,           // no timeout for long videos
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': '*/*',
          'Accept-Encoding': 'identity'
        }
      });

      const totalSize = parseInt(resp.headers['content-length'] || '0', 10);
      const chunks = [];
      let downloaded = 0;
      let lastUpdate = Date.now();

      await new Promise((resolve, reject) => {
        resp.data.on('data', (chunk) => {
          chunks.push(chunk);
          downloaded += chunk.length;

          // Update progress every 3 seconds
          const now = Date.now();
          if (now - lastUpdate >= 3000) {
            lastUpdate = now;
            const percent = totalSize ? ` (${Math.round(downloaded / totalSize * 100)}%)` : '';
            const bar = totalSize
              ? '[' + '█'.repeat(Math.round(downloaded / totalSize * 10)) + '░'.repeat(10 - Math.round(downloaded / totalSize * 10)) + ']'
              : '';
            tryEdit(
              `🎬 *Downloading...*\n\n` +
              `📌 *${video.title || 'Video'}*\n` +
              `⏱ Duration: ${video.timestamp || 'N/A'}\n\n` +
              `📥 ${bar}${percent}\n` +
              `📦 Downloaded: *${fmt(downloaded)}*${totalSize ? ` / ${fmt(totalSize)}` : ''}`
            );
          }
        });
        resp.data.on('end', resolve);
        resp.data.on('error', reject);
      });

      const videoBuffer = Buffer.concat(chunks);
      if (!videoBuffer.length) throw new Error('Video buffer is empty');

      const title = (videoData.title || video.title || 'video').replace(/[^\w\s\-]/g, '').trim();

      await tryEdit(`✅ _Upload kiya ja raha hai..._`);

      // Send video — no branding in caption
      await sock.sendMessage(chatId, {
        video:    videoBuffer,
        mimetype: 'video/mp4',
        fileName: `${title}.mp4`,
        caption:  `🎬 *${title}*`
      }, { quoted: msg });

      await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (err) {
      console.error('[Video Error]', err.message);
      await sock.sendMessage(chatId, {
        text: `❌ *Download Failed*\n\n${err.message}\n\n_Try again or paste the YouTube link directly._`
      }, { quoted: msg });
      await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
  }
};
