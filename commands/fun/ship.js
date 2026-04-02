/**
 * Ship Command
 * Calculates love/compatibility between two people
 */

module.exports = {
  name: 'ship',
  aliases: ['love', 'compatibility', 'lovemeter'],
  category: 'fun',
  description: 'Calculate love compatibility between two people',
  usage: '.ship <person1> + <person2>',

  async execute(sock, msg, args, { from, sender, reply }) {
    let person1, person2;

    // Try to parse "name1 + name2" format
    const fullText = args.join(' ');
    if (fullText.includes('+')) {
      const parts = fullText.split('+').map(s => s.trim());
      person1 = parts[0];
      person2 = parts[1];
    } else if (args.length >= 2) {
      person1 = args[0];
      person2 = args.slice(1).join(' ');
    }

    // If only one name given, ship with sender
    if (!person2 && person1) {
      person2 = person1;
      person1 = sender.split('@')[0];
    }

    if (!person1 || !person2) {
      return reply('💕 Usage: .ship <person1> + <person2>\nExample: .ship Rahul + Priya');
    }

    // Deterministic but fun calculation based on names
    const combined = (person1 + person2).toLowerCase();
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash |= 0;
    }
    const percent = Math.abs(hash % 101);

    // Progress bar
    const filled = Math.round(percent / 10);
    const bar = '❤️'.repeat(filled) + '🖤'.repeat(10 - filled);

    // Message based on percent
    let msg2, emoji;
    if (percent >= 90) { msg2 = 'SOULMATES! 💍 You two are absolutely perfect for each other!'; emoji = '🥰💍'; }
    else if (percent >= 75) { msg2 = 'Amazing chemistry! You two are great together!'; emoji = '❤️‍🔥😍'; }
    else if (percent >= 60) { msg2 = 'Good match! There\'s definitely something special here.'; emoji = '💖😊'; }
    else if (percent >= 45) { msg2 = 'Not bad! A little effort and you could be great!'; emoji = '💛🙂'; }
    else if (percent >= 30) { msg2 = 'Hmm... It could work with some patience!'; emoji = '💙😐'; }
    else if (percent >= 15) { msg2 = 'Tough road ahead. Are you sure about this? 😅'; emoji = '🩶😅'; }
    else { msg2 = 'This might not be meant to be... 💔'; emoji = '💔😬'; }

    const result = `${emoji} *SHIP METER* ${emoji}\n\n` +
      `👤 *${person1}*\n` +
      `💞 + 💞\n` +
      `👤 *${person2}*\n\n` +
      `${bar}\n\n` +
      `💯 *Compatibility: ${percent}%*\n\n` +
      `📢 ${msg2}`;

    await sock.sendMessage(from, { text: result }, { quoted: msg });
  }
};
