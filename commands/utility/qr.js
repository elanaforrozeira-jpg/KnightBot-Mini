/**
 * QR Code Command
 * .qr <text/url>   — generate a QR code image
 *
 * Uses api.qrserver.com (free, no API key needed)
 */

const https = require('https');

const generateQR = (text) => {
  const encoded = encodeURIComponent(text);
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encoded}&format=png`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), url }));
    }).on('error', reject);
  });
};

module.exports = {
  name: 'qr',
  aliases: ['qrcode', 'genqr'],
  category: 'utility',
  description: 'Generate a QR code for any text or URL',
  usage: '.qr <text or URL>',

  async execute(sock, msg, args, extra) {
    try {
      if (!args.length)
        return extra.reply('❌ Usage: `.qr <text or URL>`\nExample: `.qr https://github.com`');

      const text = args.join(' ');
      if (text.length > 1000)
        return extra.reply('❌ Text too long. Max 1000 characters.');

      await extra.reply('🔲 Generating QR code...');
      const { buffer } = await generateQR(text);

      await sock.sendMessage(extra.from, {
        image: buffer,
        caption: `🔲 *QR Code*\n📝 ${text.length > 60 ? text.slice(0, 60) + '...' : text}`
      }, { quoted: msg });
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
