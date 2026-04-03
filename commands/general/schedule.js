/**
 * Schedule Command - Schedule a message to be sent later
 * .schedule <time> <message>  — schedule a message in the current chat
 * .schedules                  — list scheduled messages
 * .cancelschedule <id>        — cancel a scheduled message
 */

const scheduled = new Map();
let   sidCounter = 1;

const parseTime = (str) => {
  const match = str.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const n = parseInt(match[1]);
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * units[match[2]];
};

module.exports = [
  {
    name: 'schedule',
    aliases: ['schedul', 'sched'],
    category: 'general',
    description: 'Schedule a message to be sent after a given time',
    usage: '.schedule <10s|5m|2h|1d> <message>',

    async execute(sock, msg, args, extra) {
      if (args.length < 2)
        return extra.reply('❌ Usage: `.schedule <time> <message>`\nExample: `.schedule 1h Good morning everyone!`');

      const ms = parseTime(args[0]);
      if (!ms || ms > 7 * 24 * 3600000)
        return extra.reply('❌ Invalid time. Formats: `30s` `5m` `2h` `1d` (max 7d).');

      const text  = args.slice(1).join(' ');
      const from  = extra.from;
      const owner = msg.key.participant || msg.key.remoteJid;
      const sid   = sidCounter++;

      const timeout = setTimeout(async () => {
        scheduled.delete(sid);
        await sock.sendMessage(from, { text });
      }, ms);

      scheduled.set(sid, { from, owner, text, timeout, due: Date.now() + ms });
      await extra.reply(`📅 Message *#${sid}* scheduled in *${args[0]}*!\n📝 ${text}`);
    }
  },

  {
    name: 'schedules',
    aliases: ['myscheduled'],
    category: 'general',
    description: 'List all your scheduled messages',
    usage: '.schedules',

    async execute(sock, msg, args, extra) {
      const owner = msg.key.participant || msg.key.remoteJid;
      const mine  = [...scheduled.entries()].filter(([, s]) => s.owner === owner);
      if (!mine.length) return extra.reply('📋 No scheduled messages.');
      const list = mine.map(([id, s]) => {
        const left = Math.round((s.due - Date.now()) / 1000);
        return `*#${id}* — ${s.text.slice(0, 40)}... (in ${left}s)`;
      }).join('\n');
      await extra.reply(`📅 *Scheduled Messages:*\n\n${list}`);
    }
  },

  {
    name: 'cancelschedule',
    aliases: ['unschedule'],
    category: 'general',
    description: 'Cancel a scheduled message by ID',
    usage: '.cancelschedule <id>',

    async execute(sock, msg, args, extra) {
      const id = parseInt(args[0]);
      if (!id || !scheduled.has(id)) return extra.reply('❌ Schedule not found.');
      const s = scheduled.get(id);
      const owner = msg.key.participant || msg.key.remoteJid;
      if (s.owner !== owner && !extra.isOwner && !extra.isMod)
        return extra.reply('❌ Not your scheduled message.');
      clearTimeout(s.timeout);
      scheduled.delete(id);
      await extra.reply(`✅ Scheduled message *#${id}* cancelled.`);
    }
  }
];
