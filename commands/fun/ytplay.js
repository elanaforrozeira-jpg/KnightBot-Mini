/**
 * 🎥 YTPLAY COMMAND
 * .ytplay <YouTube URL>
 * Downloads YT video (up to 50MB) and sends as video with audio to group
 * Students can watch lecture directly in WhatsApp
 * Made by Ruhvaan
 */

const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const MAX_BYTES = 50 * 1024 * 1024; // 50MB WhatsApp limit

function isYtUrl(str) {
  return /youtu\.?be/.test(str);
}

function cleanTitle(title) {
  return title.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 40);
}

async function downloadYT(url, outPath) {
  return new Promise((resolve, reject) => {
    // Try ffmpeg merge (video+audio) first
    const ffmpegPath = (() => { try { return require('ffmpeg-static'); } catch(e) { return 'ffmpeg'; } })();
    const tmpVideo = outPath + '_video.mp4';
    const tmpAudio = outPath + '_audio.mp4';

    let videoStream = ytdl(url, { quality: 'highestvideo', filter: 'videoonly' });
    let audioStream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });

    const videoFile = fs.createWriteStream(tmpVideo);
    const audioFile = fs.createWriteStream(tmpAudio);

    let videoSize = 0;
    let aborted = false;

    videoStream.on('data', chunk => {
      videoSize += chunk.length;
      if (videoSize > MAX_BYTES * 1.5 && !aborted) {
        aborted = true;
        videoStream.destroy();
        audioStream.destroy();
        videoFile.close();
        audioFile.close();
        reject(new Error('VIDEO_TOO_LARGE'));
      }
    });

    videoStream.pipe(videoFile);
    audioStream.pipe(audioFile);

    let videoDone = false, audioDone = false;
    const tryMerge = () => {
      if (!videoDone || !audioDone) return;
      if (aborted) return;
      exec(
        `"${ffmpegPath}" -i "${tmpVideo}" -i "${tmpAudio}" -c:v copy -c:a aac -shortest "${outPath}" -y`,
        (err) => {
          try { fs.unlinkSync(tmpVideo); } catch(_) {}
          try { fs.unlinkSync(tmpAudio); } catch(_) {}
          if (err) reject(err);
          else resolve(outPath);
        }
      );
    };

    videoFile.on('finish', () => { videoDone = true; tryMerge(); });
    audioFile.on('finish', () => { audioDone = true; tryMerge(); });
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
      await sock.sendMessage(jid, { text: '❌ Usage: *.ytplay <YouTube URL or search terms>*\nExample: `.ytplay https://youtu.be/xxxx`' }, { quoted: msg });
      return;
    }

    const input = args.join(' ');
    let url = '';
    let videoInfo = null;

    await sock.sendMessage(jid, { text: '⏳ _Fetching video info..._' }, { quoted: msg });

    try {
      if (isYtUrl(input)) {
        url = input;
        videoInfo = await ytdl.getInfo(url);
      } else {
        // Search
        const results = await ytSearch(input);
        const video = results.videos?.[0];
        if (!video) {
          await sock.sendMessage(jid, { text: '❌ No results found!' }, { quoted: msg });
          return;
        }
        url = video.url;
        videoInfo = await ytdl.getInfo(url);
      }
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error fetching video: ${e.message}` }, { quoted: msg });
      return;
    }

    const title = videoInfo.videoDetails.title;
    const duration = videoInfo.videoDetails.lengthSeconds;
    const channel = videoInfo.videoDetails.ownerChannelName;
    const thumb = videoInfo.videoDetails.thumbnails?.slice(-1)[0]?.url || '';

    // Block very long videos (>20 min)
    if (parseInt(duration) > 1200) {
      await sock.sendMessage(jid, {
        text: `❌ Video bahut lamba hai! (${Math.floor(duration/60)} min)\n⚠️ Max 20 minutes allowed.\n\n📌 Link share karo manually: ${url}`
      }, { quoted: msg });
      return;
    }

    await sock.sendMessage(jid, {
      text:
        `🎥 *${title}*\n` +
        `📺 Channel: ${channel}\n` +
        `⏱️ Duration: ${Math.floor(duration/60)}m ${duration%60}s\n\n` +
        `⏬ _Downloading... please wait_`
    });

    const tmpDir = os.tmpdir();
    const outPath = path.join(tmpDir, `yt_${Date.now()}.mp4`);

    try {
      await downloadYT(url, outPath);

      const stat = fs.statSync(outPath);
      if (stat.size > MAX_BYTES) {
        fs.unlinkSync(outPath);
        await sock.sendMessage(jid, {
          text: `❌ Video too large to send (${(stat.size/1024/1024).toFixed(1)}MB > 50MB)\n📌 Direct link: ${url}`
        }, { quoted: msg });
        return;
      }

      const videoBuffer = fs.readFileSync(outPath);
      fs.unlinkSync(outPath);

      await sock.sendMessage(jid, {
        video: videoBuffer,
        caption:
          `🎥 *${title}*\n` +
          `📺 ${channel}\n` +
          `⏱️ ${Math.floor(duration/60)}m ${duration%60}s\n\n` +
          `_made by Ruhvaan_`,
        mimetype: 'video/mp4'
      });

    } catch (e) {
      try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch(_) {}
      if (e.message === 'VIDEO_TOO_LARGE') {
        await sock.sendMessage(jid, {
          text: `❌ Video too large to download!\n📌 Direct link share karo: ${url}`
        }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, {
          text: `❌ Download failed: ${e.message}\n📌 Direct link: ${url}`
        }, { quoted: msg });
      }
    }
  }
};
