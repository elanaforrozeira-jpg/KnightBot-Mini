/**
 * 🎥 YTPLAY COMMAND
 * .ytplay <YouTube URL or search query>
 * Uses yt-dlp (much better bot detection bypass than ytdl-core)
 * Made by Ruhvaan
 */

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MAX_BYTES = 50 * 1024 * 1024; // 50MB WhatsApp limit
const MAX_DURATION = 1200; // 20 min

function isYtUrl(str) {
  return /youtu\.?be/.test(str);
}

// Check if yt-dlp is available
function getYtDlp() {
  try { execSync('yt-dlp --version', { stdio: 'ignore' }); return 'yt-dlp'; } catch (_) {}
  try { execSync('python3 -m yt_dlp --version', { stdio: 'ignore' }); return 'python3 -m yt_dlp'; } catch (_) {}
  return null;
}

// Get video info using yt-dlp JSON
function getVideoInfo(ytdlp, url) {
  return new Promise((resolve, reject) => {
    exec(`${ytdlp} --dump-json --no-playlist "${url}"`, { timeout: 30000 }, (err, stdout) => {
      if (err) return reject(err);
      try { resolve(JSON.parse(stdout)); } catch(e) { reject(e); }
    });
  });
}

// Download video+audio merged to outPath
function downloadVideo(ytdlp, url, outPath) {
  return new Promise((resolve, reject) => {
    // -f: best video+audio up to 480p (keeps file small)
    // --merge-output-format mp4
    const cmd = `${ytdlp} -f "bestvideo[height<=480]+bestaudio/best[height<=480]/best" --merge-output-format mp4 --no-playlist -o "${outPath}" "${url}"`;
    exec(cmd, { timeout: 180000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      // yt-dlp sometimes adds extension itself
      if (fs.existsSync(outPath)) return resolve(outPath);
      if (fs.existsSync(outPath + '.mp4')) return resolve(outPath + '.mp4');
      reject(new Error('Output file not found after download'));
    });
  });
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
        text: '❌ Usage: *.ytplay <YouTube URL or search>*\nExample:\n`.ytplay https://youtu.be/xxxx`\n`.ytplay physics newton laws lecture`'
      }, { quoted: msg });
      return;
    }

    const ytdlp = getYtDlp();
    if (!ytdlp) {
      await sock.sendMessage(jid, {
        text: '❌ yt-dlp not installed on server. Contact admin.'
      }, { quoted: msg });
      return;
    }

    const input = args.join(' ');
    let url = '';

    await sock.sendMessage(jid, { text: '⏳ _Fetching video info..._' }, { quoted: msg });

    try {
      if (isYtUrl(input)) {
        url = input;
      } else {
        // Search using yt-dlp itself (no API key needed)
        url = `ytsearch1:${input}`;
      }

      const info = await getVideoInfo(ytdlp, url);
      const title = info.title || 'Unknown';
      const duration = parseInt(info.duration) || 0;
      const channel = info.uploader || info.channel || 'Unknown';
      const webUrl = info.webpage_url || url;

      if (duration > MAX_DURATION) {
        await sock.sendMessage(jid, {
          text:
            `❌ Video bahut lamba hai! (${Math.floor(duration/60)} min)\n` +
            `⚠️ Max 20 minutes allowed.\n\n` +
            `📌 Link share karo manually:\n${webUrl}`
        }, { quoted: msg });
        return;
      }

      await sock.sendMessage(jid, {
        text:
          `🎥 *${title}*\n` +
          `📺 ${channel} | ⏱️ ${Math.floor(duration/60)}m ${duration%60}s\n\n` +
          `⏬ _Downloading... please wait (1-2 min)_`
      });

      const tmpDir = os.tmpdir();
      const outPath = path.join(tmpDir, `yt_${Date.now()}.mp4`);

      const finalPath = await downloadVideo(ytdlp, webUrl, outPath);

      const stat = fs.statSync(finalPath);
      if (stat.size > MAX_BYTES) {
        try { fs.unlinkSync(finalPath); } catch(_) {}
        await sock.sendMessage(jid, {
          text: `❌ File too large (${(stat.size/1024/1024).toFixed(1)}MB > 50MB)\n📌 Direct link: ${webUrl}`
        }, { quoted: msg });
        return;
      }

      const videoBuffer = fs.readFileSync(finalPath);
      try { fs.unlinkSync(finalPath); } catch(_) {}

      await sock.sendMessage(jid, {
        video: videoBuffer,
        caption:
          `🎥 *${title}*\n` +
          `📺 ${channel} | ⏱️ ${Math.floor(duration/60)}m ${duration%60}s\n\n` +
          `_made by Ruhvaan_`,
        mimetype: 'video/mp4'
      });

    } catch (e) {
      await sock.sendMessage(jid, {
        text: `❌ Error: ${e.message?.slice(0, 200) || 'Unknown error'}\n📌 Try direct link instead.`
      }, { quoted: msg });
    }
  }
};
