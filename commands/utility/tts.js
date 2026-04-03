/**
 * TTS Command - Text to Speech
 * .tts <text>          — convert text to voice (English default)
 * .tts <lang> <text>   — .tts hi namaste  (hi=Hindi, ar=Arabic, etc.)
 *
 * Uses Google TTS (free, no API key needed)
 */

const https = require('https');

const googleTTS = (text, lang = 'en') => {
  const encoded = encodeURIComponent(text);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`;
  return new Promise((resolve, reject) => {
    const chunks = [];
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`Status ${res.statusCode}`));
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
};

const LANGS = { hi: 'Hindi', en: 'English', ar: 'Arabic', fr: 'French', de: 'German', es: 'Spanish', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese' };

module.exports = {
  name: 'tts',
  aliases: ['voice', 'say'],
  category: 'utility',
  description: 'Convert text to speech (voice note)',
  usage: '.tts [lang] <text>  |  Example: .tts hi namaste',

  async execute(sock, msg, args, extra) {
    try {
      if (!args.length)
        return extra.reply(
          '❌ Usage: `.tts <text>` or `.tts <lang> <text>`\n\n' +
          '*Supported langs:* ' + Object.entries(LANGS).map(([k, v]) => `${k}=${v}`).join(', ')
        );

      let lang = 'en';
      let text = args.join(' ');

      if (LANGS[args[0]]) {
        lang = args[0];
        text = args.slice(1).join(' ');
      }

      if (!text) return extra.reply('❌ Please provide text after the language code.');
      if (text.length > 200) return extra.reply('❌ Text too long. Max 200 characters.');

      await extra.reply('🔊 Generating voice...');
      const audio = await googleTTS(text, lang);

      await sock.sendMessage(extra.from, {
        audio,
        mimetype: 'audio/mpeg',
        ptt: true
      }, { quoted: msg });
    } catch (error) {
      await extra.reply(`❌ TTS Error: ${error.message}`);
    }
  }
};
