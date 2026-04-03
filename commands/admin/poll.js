/**
 * Poll Command - Create a WhatsApp native poll
 * .poll <question> | <option1> | <option2> | ...
 */

module.exports = {
  name: 'poll',
  aliases: ['createpoll', 'vote'],
  category: 'admin',
  description: 'Create a WhatsApp poll in the group',
  usage: '.poll <question> | <opt1> | <opt2> | ...',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const full = args.join(' ');
      const parts = full.split('|').map(p => p.trim()).filter(Boolean);

      if (parts.length < 3)
        return extra.reply(
          '❌ *Usage:* `.poll <question> | <option1> | <option2> | ...`\n\n' +
          '*Example:* `.poll Favourite color? | Red | Blue | Green`'
        );

      const question = parts[0];
      const options  = parts.slice(1);

      if (options.length > 12)
        return extra.reply('❌ Maximum 12 options allowed in a poll.');

      await sock.sendMessage(extra.from, {
        poll: {
          name: question,
          values: options,
          selectableCount: 1
        }
      }, { quoted: msg });
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
