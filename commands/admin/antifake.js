/**
 * AntiFake Command - Block unofficial/fake WhatsApp numbers (non-standard JIDs)
 * .antifake on/off
 *
 * Fake numbers typically have JIDs that don't match real WA number patterns
 * or are flagged by WhatsApp as non-standard.
 */

const database = require('../../database');

module.exports = [
  {
    name: 'antifake',
    aliases: [],
    category: 'admin',
    description: 'Block fake/unofficial WhatsApp accounts from joining',
    usage: '.antifake on | off',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,

    async execute(sock, msg, args, extra) {
      const from = extra.from;
      const sub  = (args[0] || '').toLowerCase();
      const s    = database.getGroupSettings(from);

      if (sub === 'on') {
        database.updateGroupSettings(from, { antifake: true });
        return extra.reply('🛡️ AntiFake *enabled*. Unofficial WA numbers will be removed.');
      }
      if (sub === 'off') {
        database.updateGroupSettings(from, { antifake: false });
        return extra.reply('✅ AntiFake *disabled*.');
      }

      const status = s.antifake ? 'ON' : 'OFF';
      return extra.reply(
        `🛡️ *AntiFake*\nStatus: *${status}*\n\n` +
        '• `.antifake on` — enable\n' +
        '• `.antifake off` — disable'
      );
    }
  },

  {
    name: '__antifake_watcher',
    hidden: true,
    category: 'admin',
    description: 'Internal: checks new group participants for fake numbers',

    // Call from handler.js when a group-participants.add event fires:
    // require('./commands/admin/antifake').checkAntifake(sock, groupId, participant)
    checkAntifake: async (sock, groupId, participant) => {
      try {
        const s = database.getGroupSettings(groupId);
        if (!s.antifake) return;

        const num = participant.split('@')[0];
        // Fake/unofficial: numbers shorter than 7 digits or starting with unusual prefixes
        // Common unofficial clients use numbers like 0, 00, or non-numeric JIDs
        const isFake = !/^\d{7,15}$/.test(num);
        if (isFake) {
          await sock.groupParticipantsUpdate(groupId, [participant], 'remove');
          const meta = await sock.groupMetadata(groupId);
          // Notify group
          const ownerJid = meta.owner;
          await sock.sendMessage(groupId, {
            text: `🚫 Removed @${num} — detected as a *fake/unofficial WhatsApp account*.`,
            mentions: [participant]
          });
        }
      } catch (_) {}
    }
  }
];
