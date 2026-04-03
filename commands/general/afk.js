/**
 * AFK Command - Auto-reply when mentioned while AFK
 * .afk [reason]   — set yourself as AFK
 * .unafk          — manually go back online
 */

const afkUsers = new Map(); // jid → { reason, time }

module.exports = [
  {
    name: 'afk',
    aliases: ['away'],
    category: 'general',
    description: 'Set yourself as AFK — bot will auto-reply if you are mentioned',
    usage: '.afk [reason]',

    async execute(sock, msg, args, extra) {
      const sender = msg.key.participant || msg.key.remoteJid;
      const reason = args.join(' ') || 'No reason given';
      afkUsers.set(sender, { reason, time: Date.now() });
      await extra.reply(`✈️ You are now *AFK*\n📝 Reason: ${reason}`);
    }
  },

  {
    name: 'unafk',
    aliases: ['back'],
    category: 'general',
    description: 'Remove your AFK status manually',
    usage: '.unafk',

    async execute(sock, msg, args, extra) {
      const sender = msg.key.participant || msg.key.remoteJid;
      if (!afkUsers.has(sender)) return extra.reply('❌ You are not AFK.');
      afkUsers.delete(sender);
      await extra.reply('✅ Welcome back! AFK removed.');
    }
  },

  {
    name: '__afk_watcher',
    hidden: true,
    category: 'general',
    description: 'Internal: watches mentions and removes AFK on activity',

    // Call this from handler.js on every message:
    // require('./commands/general/afk').checkAfk(sock, msg);
    checkAfk: async (sock, msg) => {
      try {
        const sender = msg.key.participant || msg.key.remoteJid;
        const from   = msg.key.remoteJid;

        // If sender was AFK, remove and notify
        if (afkUsers.has(sender)) {
          const { reason, time } = afkUsers.get(sender);
          afkUsers.delete(sender);
          const mins = Math.floor((Date.now() - time) / 60000);
          await sock.sendMessage(from, {
            text: `👋 @${sender.split('@')[0]} is back! (was AFK for ${mins} min — _${reason}_)`,
            mentions: [sender]
          });
        }

        // If message mentions an AFK user, reply
        const ctx = msg.message?.extendedTextMessage?.contextInfo ||
                    msg.message?.imageMessage?.contextInfo ||
                    msg.message?.videoMessage?.contextInfo;
        const mentioned = ctx?.mentionedJid || [];
        for (const jid of mentioned) {
          if (afkUsers.has(jid)) {
            const { reason, time } = afkUsers.get(jid);
            const mins = Math.floor((Date.now() - time) / 60000);
            await sock.sendMessage(from, {
              text: `⚠️ @${jid.split('@')[0]} is *AFK* (${mins} min)\n📝 ${reason}`,
              mentions: [jid]
            }, { quoted: msg });
          }
        }
      } catch (_) {}
    }
  }
];
