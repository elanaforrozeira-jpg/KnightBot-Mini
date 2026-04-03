/**
 * Reminder Command
 * .reminder <time> <message>   — set a reminder
 *   time formats: 10s, 5m, 2h, 1d
 * .reminders                   — list your active reminders
 * .cancelreminder <id>         — cancel a reminder
 */

const reminders = new Map(); // id → { jid, from, message, timeout }
let   ridCounter = 1;

const parseTime = (str) => {
  const match = str.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const n = parseInt(match[1]);
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * units[match[2]];
};

module.exports = [
  {
    name: 'reminder',
    aliases: ['remind', 'setreminder'],
    category: 'general',
    description: 'Set a reminder — bot will ping you after the given time',
    usage: '.reminder <10s|5m|2h|1d> <message>',

    async execute(sock, msg, args, extra) {
      if (args.length < 2)
        return extra.reply('❌ Usage: `.reminder <time> <message>`\nExample: `.reminder 10m Meeting start`');

      const ms = parseTime(args[0]);
      if (!ms || ms > 7 * 24 * 3600000)
        return extra.reply('❌ Invalid time. Use formats like `30s`, `5m`, `2h`, `1d` (max 7d).');

      const text   = args.slice(1).join(' ');
      const sender = msg.key.participant || msg.key.remoteJid;
      const from   = extra.from;
      const rid    = ridCounter++;

      const timeout = setTimeout(async () => {
        reminders.delete(rid);
        await sock.sendMessage(from, {
          text: `⏰ *Reminder #${rid}*\n@${sender.split('@')[0]}, you asked me to remind you:\n\n_${text}_`,
          mentions: [sender]
        });
      }, ms);

      reminders.set(rid, { jid: sender, from, message: text, timeout, due: Date.now() + ms });

      const readable = args[0];
      await extra.reply(`✅ Reminder *#${rid}* set!\n⏱️ In *${readable}*\n📝 ${text}`);
    }
  },

  {
    name: 'reminders',
    aliases: ['myreminders'],
    category: 'general',
    description: 'List your active reminders',
    usage: '.reminders',

    async execute(sock, msg, args, extra) {
      const sender = msg.key.participant || msg.key.remoteJid;
      const mine   = [...reminders.entries()].filter(([, r]) => r.jid === sender);
      if (!mine.length) return extra.reply('📋 You have no active reminders.');
      const list = mine.map(([id, r]) => {
        const left = Math.round((r.due - Date.now()) / 1000);
        return `*#${id}* — ${r.message} (in ${left}s)`;
      }).join('\n');
      await extra.reply(`⏰ *Your Reminders:*\n\n${list}`);
    }
  },

  {
    name: 'cancelreminder',
    aliases: ['rmreminder'],
    category: 'general',
    description: 'Cancel an active reminder by ID',
    usage: '.cancelreminder <id>',

    async execute(sock, msg, args, extra) {
      const id = parseInt(args[0]);
      if (!id || !reminders.has(id)) return extra.reply('❌ Reminder not found.');
      const r = reminders.get(id);
      const sender = msg.key.participant || msg.key.remoteJid;
      if (r.jid !== sender && !extra.isOwner && !extra.isMod)
        return extra.reply('❌ This is not your reminder.');
      clearTimeout(r.timeout);
      reminders.delete(id);
      await extra.reply(`✅ Reminder *#${id}* cancelled.`);
    }
  }
];
