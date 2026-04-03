/**
 * AntiWords Command - Auto-delete banned words & warn/kick sender
 * .antiwords on/off          — toggle
 * .antiwords add <word>      — ban a word
 * .antiwords remove <word>   — unban a word
 * .antiwords list            — list banned words
 * .antiwords setaction warn|delete|kick
 */

const database = require('../../database');

const getBanned = (groupId) => {
  const s = database.getGroupSettings(groupId);
  return s.bannedWords || [];
};

const saveBanned = (groupId, words) =>
  database.updateGroupSettings(groupId, { bannedWords: words });

module.exports = [
  {
    name: 'antiwords',
    aliases: ['badwords', 'bannedwords'],
    category: 'admin',
    description: 'Block specific words in the group',
    usage: '.antiwords on | off | add <word> | remove <word> | list | setaction warn|delete|kick',
    groupOnly: true,
    adminOnly: true,
    botAdminNeeded: true,

    async execute(sock, msg, args, extra) {
      const from = extra.from;
      const sub  = (args[0] || '').toLowerCase();
      const s    = database.getGroupSettings(from);

      if (sub === 'on') {
        database.updateGroupSettings(from, { antiwords: true });
        return extra.reply('🚫 AntiWords *enabled*.');
      }
      if (sub === 'off') {
        database.updateGroupSettings(from, { antiwords: false });
        return extra.reply('✅ AntiWords *disabled*.');
      }

      if (sub === 'setaction') {
        const action = (args[1] || '').toLowerCase();
        if (!['warn', 'delete', 'kick'].includes(action))
          return extra.reply('❌ Valid actions: warn | delete | kick');
        database.updateGroupSettings(from, { antiwordsAction: action });
        return extra.reply(`✅ AntiWords action set to *${action}*`);
      }

      if (sub === 'add') {
        const word = args.slice(1).join(' ').toLowerCase();
        if (!word) return extra.reply('❌ Usage: .antiwords add <word>');
        const words = getBanned(from);
        if (words.includes(word)) return extra.reply('⚠️ Word already banned.');
        words.push(word);
        saveBanned(from, words);
        return extra.reply(`✅ *${word}* added to banned words.`);
      }

      if (sub === 'remove') {
        const word = args.slice(1).join(' ').toLowerCase();
        if (!word) return extra.reply('❌ Usage: .antiwords remove <word>');
        const words = getBanned(from).filter(w => w !== word);
        saveBanned(from, words);
        return extra.reply(`✅ *${word}* removed from banned words.`);
      }

      if (sub === 'list') {
        const words = getBanned(from);
        if (!words.length) return extra.reply('📋 No banned words set.');
        return extra.reply(`🚫 *Banned Words* (${words.length}):\n\n${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}`);
      }

      const status = s.antiwords ? 'ON' : 'OFF';
      const action = s.antiwordsAction || 'delete';
      return extra.reply(
        `🚫 *AntiWords*\nStatus: *${status}* | Action: *${action}*\n\n` +
        '• `.antiwords on/off`\n• `.antiwords add <word>`\n• `.antiwords remove <word>`\n• `.antiwords list`\n• `.antiwords setaction warn|delete|kick`'
      );
    }
  },

  {
    name: '__antiwords_watcher',
    hidden: true,
    category: 'admin',
    description: 'Internal: checks messages for banned words',

    checkAntiwords: async (sock, msg, body, from) => {
      try {
        if (!from.endsWith('@g.us')) return;
        const s = database.getGroupSettings(from);
        if (!s.antiwords) return;
        const words = getBanned(from);
        const text  = (body || '').toLowerCase();
        const hit   = words.find(w => text.includes(w));
        if (!hit) return;

        const sender = msg.key.participant || msg.key.remoteJid;
        const action = s.antiwordsAction || 'delete';

        // always delete the message
        await sock.sendMessage(from, { delete: msg.key });

        if (action === 'kick') {
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
          await sock.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} was removed for using banned word: *${hit}*`, mentions: [sender] });
        } else if (action === 'warn') {
          const w = database.addWarning(from, sender, `Banned word: ${hit}`);
          await sock.sendMessage(from, {
            text: `⚠️ @${sender.split('@')[0]}, *banned word detected* — ${hit}\nWarnings: ${w.count}`,
            mentions: [sender]
          });
        } else {
          await sock.sendMessage(from, { text: `🚫 @${sender.split('@')[0]}, banned word deleted.`, mentions: [sender] });
        }
      } catch (_) {}
    }
  }
];
