/**
 * Screenshot Command - Take a screenshot of a website
 * .ss <url>   — screenshot any URL
 *
 * Uses screenshotmachine.com API (free tier available)
 * OR falls back to a public screenshot API (no key needed)
 */

const https = require('https');

const takeScreenshot = (url) => {
  // Uses screenshotapi.net free endpoint
  const encoded = encodeURIComponent(url);
  const apiUrl  = `https://api.screenshotmachine.com?key=&url=${encoded}&dimension=1366x768&format=png&delay=2000&zoom=100`;
  // Fallback to s-shot.ru (no API key required)
  const fallback = `https://mini.s-shot.ru/1024x768/PNG/1024/Z100/?${encoded}`;

  return new Promise((resolve, reject) => {
    https.get(fallback, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`Screenshot service returned ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
};

const isValidUrl = (str) => {
  try { new URL(str); return true; } catch { return false; }
};

module.exports = {
  name: 'ss',
  aliases: ['screenshot', 'snap', 'webshot'],
  category: 'utility',
  description: 'Take a screenshot of any website',
  usage: '.ss <URL>',

  async execute(sock, msg, args, extra) {
    try {
      let url = args[0] || '';
      if (!url) return extra.reply('❌ Usage: `.ss <URL>`\nExample: `.ss https://google.com`');
      if (!url.startsWith('http')) url = 'https://' + url;
      if (!isValidUrl(url)) return extra.reply('❌ Invalid URL.');

      await extra.reply(`📸 Taking screenshot of *${url}*...`);
      const buffer = await takeScreenshot(url);

      await sock.sendMessage(extra.from, {
        image: buffer,
        caption: `📸 Screenshot of ${url}`
      }, { quoted: msg });
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}\n💡 Make sure the URL is accessible.`);
    }
  }
};
