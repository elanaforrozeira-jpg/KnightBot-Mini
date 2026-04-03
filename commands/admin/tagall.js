/**
 * TagAll Command - Mention all group members
 * .tagall [message]   — tag all members with optional message
 * .everyone [message] — alias
 */

module.exports = {
  name: 'tagall',
  aliases: ['everyone', 'mentionall', 'all'],
  category: 'admin',
  description: 'Mention all group members',
  usage: '.tagall [message]',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const from    = extra.from;
      const message = args.join(' ') || '📢 Attention everyone!';
      const meta    = await sock.groupMetadata(from);
      const members = meta.participants.map(p => p.id);

      const mentions = members.map(m => `@${m.split('@')[0]}`).join(' ');
      const text = `${message}\n\n${mentions}`;

      await sock.sendMessage(from, { text, mentions: members }, { quoted: msg });
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
