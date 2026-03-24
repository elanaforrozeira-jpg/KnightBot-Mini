/**
 * 🎥 YTPLAY COMMAND
 * .ytplay <YouTube URL or search query>
 * Uses yt-dlp standalone binary
 * Made by Ruhvaan
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_DURATION = 1200; // 20 min

function isYtUrl(str) {
  return /youtu\.?be/.test(str);
}

// Try known paths for yt-dlp binary
function getYtDlp() {
  const candidates = [
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    '/bin/yt-dlp',
    'yt-dlp'
  ];
  for (const p of candidates) {
    try {
      if (p.startsWith('/')) {
        if (fs.existsSync(p)) return p;
      } else {
        return p; // fallback to PATH
      }
    } catch (_) {}
  }
  return '/usr/local/bin/yt-dlp'; // always try, let error surface naturally
}

const YTDLP = getYtDlp();

function runCmd(cmd, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.slice(0, 300) || err.message));
      resolve(stdout);
    });
  });
}

async function getVideoInfo(url) {
  const stdout = await runCmd(`"${YTDLP}" --dump-json --no-playlist "${url}"`, 45000);
  return JSON.parse(stdout.trim().split('\n')[0]); // take first line (search returns one result)
}

async function downloadVideo(url, outPath) {
  // 480p max, merge to mp4
  await runCmd(
    `"${YTDLP}" -f "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]/best" ` +
    `--merge-output-format mp4 --no-playlist -o "${outPath}" "${url}"`,
    180000
  );
  if (fs.existsSync(outPath)) return outPath;
  if (fs.existsSync(outPath + '.mp4')) return outPath + '.mp4';
  throw new Error('Output file not found after download');
}

module.exports = {
  name: 'ytplay',
  aliases: ['ytvideo', 'lecture', 'play'],
  description: 'YT video group mein directly bhejo (audio+video)',
  category: 'fun',
  usage: '.ytplay <YouTube URL or search query>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!args.length) {
      await sock.sendMessage(jid, {
        text: '❌ Usage: *.ytplay <YouTube URL or search>*\nExample:\n`.ytplay https://youtu.be/xxxx`\n`.ytplay physics waves lecture`'
      }, { quoted: msg });
      return;
    }

    const input = args.join(' ');
    const url = isYtUrl(input) ? input : `ytsearch1:${input}`;

    await sock.sendMessage(jid, { text: '⏳ _Fetching info..._' }, { quoted: msg });

    let info;
    try {
      info = await getVideoInfo(url);
    } catch (e) {
      await sock.sendMessage(jid, {
        text: `❌ Info fetch failed:\n${e.message?.slice(0,200)}`
      }, { quoted: msg });
      return;
    }

    const title    = info.title || 'Unknown';
    const duration = parseInt(info.duration) || 0;
    const channel  = info.uploader || info.channel || 'Unknown';
    const webUrl   = info.webpage_url || (isYtUrl(input) ? input : '');

    if (duration > MAX_DURATION) {
      await sock.sendMessage(jid, {
        text:
          `❌ Video bahut lamba! (${Math.floor(duration/60)} min)\n` +
          `⚠️ Max 20 min allowed.\n📌 ${webUrl}`
      }, { quoted: msg });
      return;
    }

    await sock.sendMessage(jid, {
      text:
        `🎥 *${title}*\n` +
        `📺 ${channel} | ⏱️ ${Math.floor(duration/60)}m ${duration%60}s\n\n` +
        `⏬ _Downloading... (1-2 min)_`
    });

    const outPath = path.join(os.tmpdir(), `yt_${Date.now()}.mp4`);

    try {
      const finalPath = await downloadVideo(webUrl, outPath);
      const stat = fs.statSync(finalPath);

      if (stat.size > MAX_BYTES) {
        try { fs.unlinkSync(finalPath); } catch(_) {}
        await sock.sendMessage(jid, {
          text: `❌ File too large (${(stat.size/1024/1024).toFixed(1)}MB > 50MB)\n📌 ${webUrl}`
        }, { quoted: msg });
        return;
      }

      const buf = fs.readFileSync(finalPath);
      try { fs.unlinkSync(finalPath); } catch(_) {}

      await sock.sendMessage(jid, {
        video: buf,
        caption:
          `🎥 *${title}*\n` +
          `📺 ${channel} | ⏱️ ${Math.floor(duration/60)}m ${duration%60}s\n\n` +
          `_made by Ruhvaan_`,
        mimetype: 'video/mp4'
      });

    } catch (e) {
      try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch(_) {}
      await sock.sendMessage(jid, {
        text: `❌ Download failed:\n${e.message?.slice(0,300)}\n📌 ${webUrl}`
      }, { quoted: msg });
    }
  }
};
