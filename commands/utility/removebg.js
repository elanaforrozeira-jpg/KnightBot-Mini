/**
 * RemoveBG Command - Remove background from an image
 * Reply to an image with .removebg
 *
 * Uses remove.bg API — set REMOVEBG_API_KEY in config or env
 * Free tier: 50 calls/month
 */

const https  = require('https');
const config = require('../../config');

const removeBg = (imageBuffer, apiKey) => {
  return new Promise((resolve, reject) => {
    // Build multipart form manually (no external deps)
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="image_file"; filename="image.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
      ),
      imageBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const options = {
      hostname: 'api.remove.bg',
      path: '/v1.0/removebg',
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode === 200) resolve(Buffer.concat(chunks));
        else reject(new Error(`API error ${res.statusCode}: ${Buffer.concat(chunks).toString().slice(0, 200)}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

module.exports = {
  name: 'removebg',
  aliases: ['rmbg', 'nobg', 'bgremove'],
  category: 'utility',
  description: 'Remove background from an image (reply to image)',
  usage: 'Reply to image + .removebg',

  async execute(sock, msg, args, extra) {
    try {
      const apiKey = process.env.REMOVEBG_API_KEY || config.removeBgApiKey;
      if (!apiKey)
        return extra.reply(
          '❌ RemoveBG API key not configured.\n' +
          'Add `REMOVEBG_API_KEY` in your env or config.\n' +
          'Get free key at https://www.remove.bg/api'
        );

      // Get image from quoted message or current message
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imageMsg  = quotedMsg?.imageMessage ||
                        msg.message?.imageMessage ||
                        quotedMsg?.stickerMessage;

      if (!imageMsg)
        return extra.reply('❌ Please *reply to an image* with `.removebg`');

      await extra.reply('🎨 Removing background... Please wait.');

      const stream = await sock.downloadContentFromMessage(imageMsg, 'image');
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const imageBuffer = Buffer.concat(chunks);

      const resultBuffer = await removeBg(imageBuffer, apiKey);

      await sock.sendMessage(extra.from, {
        image: resultBuffer,
        caption: '✅ Background removed!',
        mimetype: 'image/png'
      }, { quoted: msg });
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
