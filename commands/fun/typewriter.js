/**
 * Typewriter Effect Command
 * Types out text letter by letter using message edits
 */

module.exports = {
  name: 'typewriter',
  aliases: ['type', 'tw'],
  category: 'fun',
  description: 'Sends text with typewriter animation effect',
  usage: '.typewriter <your text>',

  async execute(sock, msg, args, { from }) {
    const text = args.join(' ').trim();
    if (!text) {
      return await sock.sendMessage(from, {
        text: '✏️ Usage: .typewriter <text>\nExample: .typewriter Hello World!'
      }, { quoted: msg });
    }

    if (text.length > 150) {
      return await sock.sendMessage(from, {
        text: '❌ Text too long! Max 150 characters.'
      }, { quoted: msg });
    }

    const cursor = '|';
    // Start with cursor
    const sent = await sock.sendMessage(from, { text: cursor }, { quoted: msg });
    await new Promise(r => setTimeout(r, 300));

    let current = '';
    for (let i = 0; i < text.length; i++) {
      current += text[i];
      try {
        await sock.sendMessage(from, {
          text: current + cursor,
          edit: sent.key
        });
      } catch (e) { /* ignore edit errors */ }
      // Vary delay for natural feel
      const delay = text[i] === ' ' ? 150 : text[i] === '.' || text[i] === ',' ? 400 : 120;
      await new Promise(r => setTimeout(r, delay));
    }

    // Final: remove cursor
    try {
      await sock.sendMessage(from, { text: current, edit: sent.key });
    } catch (e) { /* ignore */ }
  }
};
