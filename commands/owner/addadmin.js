/**
 * AddAdmin / RemoveAdmin Command
 * Owner-only: manage bot moderators
 *
 * .addadmin @user        — add by mention
 * .addadmin 919876543210 — add by number
 * Reply + .addadmin      — add quoted user
 * .addadmin list         — list all mods
 * .removeadmin @user     — remove mod
 */

const database = require('../../database');
const config   = require('../../config');

// ── helpers ──────────────────────────────────────────────────────────────────

const resolveTarget = (msg, args) => {
  // 1. @mention (any message type)
  const ctx =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo        ||
    msg.message?.videoMessage?.contextInfo        ||
    msg.message?.buttonsResponseMessage?.contextInfo;

  const mentioned = (ctx?.mentionedJid || []).filter(j => j && j.includes('@'));
  if (mentioned.length) return mentioned[0];

  // 2. Quoted message sender
  if (ctx?.participant && ctx.stanzaId) return ctx.participant;

  // 3. Plain number in args (e.g. 919876543210 or +919876543210)
  const rawNum = (args[0] || '').replace(/[^\d]/g, '');
  if (rawNum.length >= 7) return `${rawNum}@s.whatsapp.net`;

  return null;
};

const numOnly = (jid) =>
  jid ? jid.split('@')[0].split(':')[0] : null;

// ── module exports ───────────────────────────────────────────────────────────

module.exports = [
  {
    name: 'addadmin',
    aliases: ['addmod'],
    category: 'owner',
    description: 'Add a bot moderator (owner only)',
    usage: '.addadmin @user  |  .addadmin 91XXXXXXXXXX  |  .addadmin list',
    ownerOnly: true,

    async execute(sock, msg, args, ctx) {
      const from  = ctx.from;
      const reply = ctx.reply;

      // ─ owner check (redundant safety) ─
      if (!ctx.isOwner) {
        return reply('❌ Only the *owner* can use this command.');
      }

      // ─ list subcommand ─
      if ((args[0] || '').toLowerCase() === 'list') {
        const mods = database.getModerators();
        if (!mods.length)
          return reply('📋 *Bot Moderators*\n\nNo moderators added yet.');
        const lines = mods.map((n, i) => `${i + 1}. @${n}`).join('\n');
        return sock.sendMessage(from, {
          text: `📋 *Bot Moderators* (${mods.length})\n\n${lines}`,
          mentions: mods.map(n => `${n}@s.whatsapp.net`)
        }, { quoted: msg });
      }

      // ─ resolve target ─
      const target = resolveTarget(msg, args);
      if (!target) {
        return reply(
          '❌ *How to use .addadmin:*\n' +
          '• `.addadmin @user` — tag the user\n' +
          '• Reply to their message + `.addadmin`\n' +
          '• `.addadmin 919876543210` — paste their number\n' +
          '• `.addadmin list` — see all current mods'
        );
      }

      const num = numOnly(target);
      if (!num) return reply('❌ Could not resolve user number.');

      // prevent adding owner as mod
      const isAlreadyOwner = config.ownerNumber.some(o => numOnly(o) === num);
      if (isAlreadyOwner) return reply('⚠️ This user is already the owner!');

      const added = database.addModerator(num);
      if (!added) {
        return sock.sendMessage(from, {
          text: `⚠️ @${num} is already a bot moderator!`,
          mentions: [`${num}@s.whatsapp.net`]
        }, { quoted: msg });
      }

      return sock.sendMessage(from, {
        text: `✅ @${num} has been added as *Bot Moderator*!\n\n🛡️ They can now use mod-only commands.`,
        mentions: [`${num}@s.whatsapp.net`]
      }, { quoted: msg });
    }
  },

  {
    name: 'removeadmin',
    aliases: ['removemod', 'deladmin', 'delmod'],
    category: 'owner',
    description: 'Remove a bot moderator (owner only)',
    usage: '.removeadmin @user  |  .removeadmin 919876543210',
    ownerOnly: true,

    async execute(sock, msg, args, ctx) {
      const from  = ctx.from;
      const reply = ctx.reply;

      if (!ctx.isOwner) return reply('❌ Only the *owner* can use this command.');

      const target = resolveTarget(msg, args);
      if (!target) {
        return reply(
          '❌ *How to use .removeadmin:*\n' +
          '• `.removeadmin @user`\n' +
          '• Reply + `.removeadmin`\n' +
          '• `.removeadmin 919876543210`'
        );
      }

      const num = numOnly(target);
      if (!num) return reply('❌ Could not resolve user number.');

      const removed = database.removeModerator(num);
      if (!removed) {
        return sock.sendMessage(from, {
          text: `⚠️ @${num} is not a bot moderator!`,
          mentions: [`${num}@s.whatsapp.net`]
        }, { quoted: msg });
      }

      return sock.sendMessage(from, {
        text: `✅ @${num} removed from *Bot Moderators*.`,
        mentions: [`${num}@s.whatsapp.net`]
      }, { quoted: msg });
    }
  }
];
