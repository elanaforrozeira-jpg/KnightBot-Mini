/**
 * Countdown Command
 * Counts down from N to 0 with emoji
 */

module.exports = {
  name: 'countdown',
  aliases: ['cd', 'timer'],
  category: 'fun',
  description: 'Countdown from a number to 0',
  usage: '.countdown <number> (max 10)',

  async execute(sock, msg, args, { from }) {
    const num = parseInt(args[0]);
    if (isNaN(num) || num < 1) {
      return await sock.sendMessage(from, {
        text: '⏱ Usage: .countdown <number>\nExample: .countdown 5'
      }, { quoted: msg });
    }

    const n = Math.min(num, 10);

    const emojis = {
      10: '🔟', 9: '9️⃣', 8: '8️⃣', 7: '7️⃣', 6: '6️⃣',
      5: '5️⃣', 4: '4️⃣', 3: '3️⃣', 2: '2️⃣', 1: '1️⃣', 0: '0️⃣'
    };

    const sent = await sock.sendMessage(from, {
      text: `${emojis[n] || n}\n⏱ Starting countdown from *${n}*...`
    }, { quoted: msg });

    for (let i = n - 1; i >= 0; i--) {
      await new Promise(r => setTimeout(r, 1200));
      const bar = '🟥'.repeat(i) + '⬛'.repeat(n - i);
      const display = i === 0
        ? `${emojis[0]}\n🎉 *BOOM!* Time's up!`
        : `${emojis[i] || i}\n${bar}`;
      try {
        await sock.sendMessage(from, { text: display, edit: sent.key });
      } catch (e) {
        await sock.sendMessage(from, { text: display });
      }
    }
  }
};
