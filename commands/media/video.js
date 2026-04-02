/**
 * YT Video Downloader — multi-API fallback chain
 * APIs tried in order: Yupra → Okatsu → EliteProTech → cobalt.tools
 */

const yts    = require('yt-search');
const axios  = require('axios');
const config = require('../../config');

// ── tiny helpers ────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const tryRequest = async (fn, attempts = 3) => {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try { return await fn(); } catch (e) { last = e; if (i < attempts) await sleep(1200 * i); }
  }
  throw last;
};

const AX = axios.create({
  timeout: 60000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*'
  }
});

// ── video download APIs ──────────────────────────────────────────────
const dlYupra = async (url) => {
  const r = await tryRequest(() =>
    AX.get(`https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(url)}`)
  );
  if (r?.data?.success && r?.data?.data?.download_url)
    return { download: r.data.data.download_url, title: r.data.data.title, thumbnail: r.data.data.thumbnail };
  throw new Error('Yupra: no download_url');
};

const dlOkatsu = async (url) => {
  const r = await tryRequest(() =>
    AX.get(`https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(url)}`)
  );
  if (r?.data?.result?.mp4)
    return { download: r.data.result.mp4, title: r.data.result.title };
  throw new Error('Okatsu: no mp4');
};

const dlElite = async (url) => {
  const r = await tryRequest(() =>
    AX.get(`https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(url)}&format=mp4`)
  );
  if (r?.data?.success && r?.data?.downloadURL)
    return { download: r.data.downloadURL, title: r.data.title };
  throw new Error('EliteProTech: no downloadURL');
};

// cobalt.tools — reliable fallback, supports mp4 720p
const dlCobalt = async (url) => {
  const r = await tryRequest(() =>
    axios.post('https://api.cobalt.tools/', {
      url,
      videoQuality: '720',
      downloadMode: 'auto'
    }, {
      timeout: 60000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
  );
  if (r?.data?.url)
    return { download: r.data.url, title: 'YouTube Video' };
  throw new Error('Cobalt: no url');
};

const getVideo = async (url) => {
  const apis = [dlYupra, dlOkatsu, dlElite, dlCobalt];
  let last;
  for (const api of apis) {
    try { return await api(url); } catch (e) { last = e; }
  }
  throw last || new Error('All video APIs failed');
};

// ── command ─────────────────────────────────────────────────────────
module.exports = {
  name: 'ytvideo',
  aliases: ['ytv', 'ytmp4', 'ytvid', 'video'],
  category: 'media',
  description: 'Download video from YouTube',
  usage: '.video <video name or YouTube URL>',

  async execute(sock, msg, args) {
    const chatId  = msg.key.remoteJid;
    const text    = args.join(' ').trim();
    const instanceConfig = config.getConfigFromSocket ? config.getConfigFromSocket(sock) : config;

    if (!text) {
      return sock.sendMessage(chatId, {
        text: '🎬 *YouTube Video Downloader*\n\nUsage:\n• `.video <search query>`\n• `.video <YouTube URL>`'
      }, { quoted: msg });
    }

    // ── resolve URL ──
    let videoUrl = '', videoTitle = '', videoThumbnail = '';

    if (/^https?:\/\//i.test(text)) {
      videoUrl = text;
    } else {
      const { videos } = await yts(text);
      if (!videos?.length)
        return sock.sendMessage(chatId, { text: '❌ No videos found!' }, { quoted: msg });
      videoUrl       = videos[0].url;
      videoTitle     = videos[0].title;
      videoThumbnail = videos[0].thumbnail;
    }

    // ── validate YT URL ──
    if (!/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))/.test(videoUrl))
      return sock.sendMessage(chatId, { text: '❌ Not a valid YouTube link!' }, { quoted: msg });

    // ── send thumbnail first ──
    try {
      const ytId = (videoUrl.match(/(?:youtu\.be\/|v=|shorts\/)([a-zA-Z0-9_-]{11})/) || [])[1];
      const thumb = videoThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/sddefault.jpg` : null);
      if (thumb) {
        await sock.sendMessage(chatId, {
          image: { url: thumb },
          caption: `🎬 *${videoTitle || 'Searching...'}*\n⏳ Downloading, please wait...`
        }, { quoted: msg });
      }
    } catch (_) {}

    // ── download ──
    let videoData;
    try {
      videoData = await getVideo(videoUrl);
    } catch (e) {
      return sock.sendMessage(chatId, {
        text: `❌ Download failed: ${e.message}\n\nTry again or use a direct YouTube URL.`
      }, { quoted: msg });
    }

    // ── send video ──
    await sock.sendMessage(chatId, {
      video:    { url: videoData.download },
      mimetype: 'video/mp4',
      fileName: `${(videoData.title || videoTitle || 'video').replace(/[^\w\s-]/g, '')}.mp4`,
      caption:  `✅ *${videoData.title || videoTitle || 'YouTube Video'}*\n\n> _Downloaded by ${instanceConfig.botName || config.botName}_`
    }, { quoted: msg });
  }
};
