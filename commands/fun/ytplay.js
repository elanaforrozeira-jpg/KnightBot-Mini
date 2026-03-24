/**
 * 🎥 YTPLAY COMMAND
 * .ytplay <YouTube URL or search query>
 * Downloads YT video and sends as video with audio to group
 * Made by Ruhvaan
 */

const ytdl = require('@distube/ytdl-core');
const ytSearch = require('yt-search');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const MAX_BYTES = 50 * 1024 * 1024; // 50MB

function isYtUrl(str) {
  return /youtu\.?be/.test(str);
}

async function downloadYT(url, outPath) {
  return new Promise((resolve, reject) => {
    const ffmpegPath = (() => { try { return require('ffmpeg-static'); } catch(e) { return 'ffmpeg'; } })();
    const tmpVideo = outPath + '_v.mp4';
    const tmpAudio = outPath + '_a.mp4';

    const videoStream = ytdl(url, { quality: 'highestvideo', filter: 'videoonly' });
    const audioStream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });

    const videoFile = fs.createWriteStream(tmpVideo);
    const audioFile = fs.createWriteStream(tmpAudio);

    let videoSize = 0, aborted = false;
    videoStream.on('data', chunk => {
      videoSize += chunk.length;
      if (videoSize > MAX_BYTES * 1.5 && !aborted) {
        aborted = true;
        videoStream.destroy();
        audioStream.destroy();
        reject(new Error('VIDEO_TOO_LARGE'));
      }
    });

    videoStream.pipe(videoFile);
    audioStream.pipe(audioFile);

    let vDone = false, aDone = false;
    const tryMerge = () => {
      if (!vDone || !aDone || aborted) return;
      exec(
        `"${ffmpegPath}" -i "${tmpVideo}" -i "${tmpAudio}" -c:v copy -c:a aac -shortest "${outPath}" -y`,
        (err) => {
          try { fs.unlinkSync(tmpVideo); } catch(_) {}
          try { fs.unlinkSync(tmpAudio); } catch(_) {}
          if (err) reject(err); else resolve(outPath);
        }
      );
    };

    videoFile.on('finish', () => { vDone = true; tryMerge(); });
    audioFile.on('finish', () => { aDone = true; tryMerge(); });
    videoStream.on('error', reject);
    audioStream.on('error', reject);
  });
}

module.exports = {
  name: 'ytplay',
  aliases: ['ytvideo', 'lecture', 'play'],
  description: 'YT video group mein directly bhejo (with audio)',
  category: 'fun',
  usage: '.ytplay <YouTube URL or search query>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      await sock.sendMessage(jid, {
        text: '❌ Usage: *.ytplay <YouTube URL or search terms>*\nExample: `.ytplay https://youtu.be/xxxx`'
      }, { quoted: msg });
      return;
    }

    const input = args.join(' ');
    let url = '';
    let videoInfo = null;

    await sock.sendMessage(jid, { text: '⏳ _Fetching video info..._' }, { quoted: msg });

    try {
      if (isYtUrl(input)) {
        url = input;
      } else {
        const results = await ytSearch(input);
        const video = results.videos?.[0];
        if (!video) {
          await sock.sendMessage(jid, { text: '❌ No results found for: ' + input }, { quoted: msg });
          return;
        }
        url = video.url;
      }
      videoInfo = await ytdl.getInfo(url);
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
      return;
    }

    const title = videoInfo.videoDetails.title;
    const duration = parseInt(videoInfo.videoDetails.lengthSeconds);
    const channel = videoInfo.videoDetails.ownerChannelName;

    if (duration > 1200) {
      await sock.sendMessage(jid, {
        text:
          `❌ Video bahut lamba hai! (${Math.floor(duration/60)} min)\n` +
          `⚠️ Max 20 minutes allowed.\n\n` +
          `📌 Link manually share karo:\n${url}`
      }, { quoted: msg });
      return;
    }

    await sock.sendMessage(jid, {
      text:
        `🎥 *${title}*\n` +
        `📺 ${channel} | ⏱️ ${Math.floor(duration/60)}m ${duration%60}s\n\n` +
        `⏬ _Downloading... please wait (may take 1-2 min)_`
    });

    const tmpDir = os.tmpdir();
    const outPath = path.join(tmpDir, `yt_${Date.now()}.mp4`);

    try {
      await downloadYT(url, outPath);

      const stat = fs.statSync(outPath);
      if (stat.size > MAX_BYTES) {
        fs.unlinkSync(outPath);
        await sock.sendMessage(jid, {
          text: `❌ File too large (${(stat.size/1024/1024).toFixed(1)}MB > 50MB)\n📌 Link: ${url}`
        }, { quoted: msg });
        return;
      }

      const videoBuffer = fs.readFileSync(outPath);
      try { fs.unlinkSync(outPath); } catch(_) {}

      await sock.sendMessage(jid, {
        video: videoBuffer,
        caption:
          `🎥 *${title}*\n` +
          `📺 ${channel} | ⏱️ ${Math.floor(duration/60)}m ${duration%60}s\n\n` +
          `_made by Ruhvaan_`,
        mimetype: 'video/mp4'
      });

    } catch (e) {
      try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch(_) {}
      if (e.message === 'VIDEO_TOO_LARGE') {
        await sock.sendMessage(jid, {
          text: `❌ Video too large!\n📌 Link: ${url}`
        }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, {
          text: `❌ Download failed: ${e.message}\n📌 Link: ${url}`
        }, { quoted: msg });
      }
    }
  }
};
