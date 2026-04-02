/**
 * AddAdmin / RemoveAdmin Command
 * Owner-only: manage bot moderators (not WhatsApp group admins)
 *
 * .addadmin @user    — add user as bot moderator
 * .addadmin list     — list all current bot moderators
 * .removeadmin @user — remove user from bot moderators
 */

const database = require('../../database');
const config   = require('../../config');

// ── helpers ──────────────────────────────────────────────────────────────────

const getMentioned = (msg) => {
  const ctx =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo        ||
    msg.message?.videoMessage?.contextInfo;
  return (ctx?.mentionedJid || [])[0] || null;
};

const getQuotedSender = (msg) => {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (ctx?.participant && ctx.stanzaId && ctx.quotedMessage) return ctx.participant;
  return null;
};

const numOnly = (jid) => jid ? jid.split('@')[0].split(':')[0] : null;

// ── addadmin ─────────────────────────────────────────────────────────────────

module.exports = [
  {
    name: 'addadmin',
    aliases: ['addmod'],
    category: 'Owner',
    description: 'Add a bot moderator (owner only)',
    usage: '.addadmin @user  |  .addadmin list',
    ownerOnly: true,

    async execute(sock, msg, args, ctx) {
      const { from, reply } = ctx;

      // ── list subcommand ──
      if ((args[0] || '').toLowerCase() === 'list') {
        const mods = database.getModerators();
        if (!mods.length) return reply('📋 *Bot Moderators*\n\nNo moderators added yet.');

        const lines = mods.map((n, i) => `${i + 1}. @${n}`).join('\n');
        return sock.sendMessage(from, {
          text: `📋 *Bot Moderators* (${mods.length})\n\n${lines}`,
          mentions: mods.map(n => `${n}@s.whatsapp.net`)
        }, { quoted: msg });
      }

      // ── add subcommand ──
      const target = getMentioned(msg) || getQuotedSender(msg);
      if (!target) {
        return reply(
          '❌ *Usage:*\n' +
          '• `.addadmin @user` — mention the user\n' +
          '• Reply to their message with `.addadmin`\n' +
          '• `.addadmin list` — see all mods'
        );
      }

      const num = numOnly(target);
      if (!num) return reply('❌ Could not resolve user number.');

      // prevent adding owner as mod (redundant but clean)
      const isAlreadyOwner = config.ownerNumber.some(o => numOnly(o) === num);
      if (isAlreadyOwner) return reply('⚠️ This user is already the owner!');

      const added = database.addModerator(num);
      if (!added) {
        return sock.sendMessage(from, {
          text: `⚠️ @${num} is already a bot moderator!`,
          mentions: [target]
        }, { quoted: msg });
      }

      return sock.sendMessage(from, {
        text: `✅ @${num} has been added as a *Bot Moderator*!\n\nThey can now use mod-only commands.`,
        mentions: [target]
      }, { quoted: msg });
    }
  },

  // ── removeadmin ────────────────────────────────────────────────────────────
  {
    name: 'removeadmin',
    aliases: ['removemod', 'deladmin', 'delmod'],
    category: 'Owner',
    description: 'Remove a bot moderator (owner only)',
    usage: '.removeadmin @user',
    ownerOnly: true,

    async execute(sock, msg, args, ctx) {
      const { from, reply } = ctx;

      const target = getMentioned(msg) || getQuotedSender(msg);
      if (!target) {
        return reply(
          '❌ *Usage:*\n' +
          '• `.removeadmin @user` — mention the user\n' +
          '• Reply to their message with `.removeadmin`'
        );
      }

      const num = numOnly(target);
      if (!num) return reply('❌ Could not resolve user number.');

      const removed = database.removeModerator(num);
      if (!removed) {
        return sock.sendMessage(from, {
          text: `⚠️ @${num} is not a bot moderator!`,
          mentions: [target]
        }, { quoted: msg });
      }

      return sock.sendMessage(from, {
        text: `✅ @${num} has been removed from *Bot Moderators*.`,
        mentions: [target]
      }, { quoted: msg });
    }
  }
];
