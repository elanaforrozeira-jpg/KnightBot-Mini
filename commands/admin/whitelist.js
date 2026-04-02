/**
 * Whitelist Command
 * .whitelist add @user      — add user to whitelist (bypass antilink/antispam)
 * .whitelist remove @user   — remove user from whitelist
 * .whitelist list           — show all whitelisted users in this group
 * .whitelist addgroup       — add current group to group-whitelist (bot works here)
 * .whitelist removegroup    — remove current group from group-whitelist
 * .whitelist listgroups     — list all whitelisted groups (owner only)
 */

const database = require('../../database');

module.exports = {
  name: 'whitelist',
  aliases: ['wl'],
  description: 'Manage user & group whitelist',
  category: 'Admin',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, context) {
    const { from, sender, isOwner, isAdmin, reply, react } = context;

    const sub = (args[0] || '').toLowerCase();

    // ── helpers ──────────────────────────────────────────────────────────────
    const getMentioned = () => {
      const ctx =
        msg.message?.extendedTextMessage?.contextInfo ||
        msg.message?.imageMessage?.contextInfo ||
        msg.message?.videoMessage?.contextInfo;
      return (ctx?.mentionedJid || [])[0] || null;
    };

    const numberFromArg = (raw) => {
      if (!raw) return null;
      return raw.replace(/[^0-9]/g, '');
    };

    // ── subcommands ──────────────────────────────────────────────────────────

    // .whitelist add @user
    if (sub === 'add') {
      const mentioned = getMentioned();
      const rawArg = args[1] || '';
      const num = mentioned
        ? mentioned.split('@')[0]
        : numberFromArg(rawArg);

      if (!num) {
        return reply(
          '❌ *Usage:* .whitelist add @user\n_Tag the user you want to whitelist._'
        );
      }

      const userId = `${num}@s.whatsapp.net`;
      const added = database.addWhitelistUser(userId);

      if (added) {
        await react('✅');
        return reply(
          `✅ *Whitelisted!*\n@${num} has been added to the whitelist.\n_They will bypass antilink & antispam protection._`,
          { mentions: [userId] }
        );
      } else {
        return reply(`⚠️ @${num} is already in the whitelist.`, { mentions: [userId] });
      }
    }

    // .whitelist remove @user
    if (sub === 'remove' || sub === 'rem') {
      const mentioned = getMentioned();
      const rawArg = args[1] || '';
      const num = mentioned
        ? mentioned.split('@')[0]
        : numberFromArg(rawArg);

      if (!num) {
        return reply(
          '❌ *Usage:* .whitelist remove @user\n_Tag the user you want to remove._'
        );
      }

      const userId = `${num}@s.whatsapp.net`;
      const removed = database.removeWhitelistUser(userId);

      if (removed) {
        await react('✅');
        return reply(`✅ @${num} removed from whitelist.`, { mentions: [userId] });
      } else {
        return reply(`⚠️ @${num} was not in the whitelist.`, { mentions: [userId] });
      }
    }

    // .whitelist list
    if (sub === 'list') {
      const users = database.getWhitelistedUsers();
      if (!users.length) {
        return reply('📋 *Whitelist is empty.*\nNo users are whitelisted yet.');
      }
      const lines = users.map((u, i) => `${i + 1}. +${u}`).join('\n');
      return reply(`📋 *Whitelisted Users (${users.length}):*\n\n${lines}`);
    }

    // .whitelist addgroup  — owner only
    if (sub === 'addgroup') {
      if (!isOwner) {
        return reply('👑 Only the bot owner can whitelist groups.');
      }
      const added = database.addWhitelistGroup(from);
      if (added) {
        await react('✅');
        return reply('✅ *This group has been added to the group whitelist.*\nBot will work in this group even if groupWhitelistMode is ON.');
      } else {
        return reply('⚠️ This group is already in the group whitelist.');
      }
    }

    // .whitelist removegroup  — owner only
    if (sub === 'removegroup') {
      if (!isOwner) {
        return reply('👑 Only the bot owner can manage group whitelist.');
      }
      const removed = database.removeWhitelistGroup(from);
      if (removed) {
        await react('✅');
        return reply('✅ This group has been *removed* from the group whitelist.');
      } else {
        return reply('⚠️ This group was not in the group whitelist.');
      }
    }

    // .whitelist listgroups  — owner only
    if (sub === 'listgroups') {
      if (!isOwner) {
        return reply('👑 Only the bot owner can view group whitelist.');
      }
      const groups = database.getWhitelistedGroups();
      if (!groups.length) {
        return reply('📋 *Group whitelist is empty.*');
      }
      const lines = groups.map((g, i) => `${i + 1}. ${g}`).join('\n');
      return reply(`📋 *Whitelisted Groups (${groups.length}):*\n\n${lines}`);
    }

    // Default: show help
    return reply(
      `📋 *Whitelist Command Help*\n\n` +
      `*.whitelist add @user* — Add user to whitelist\n` +
      `*.whitelist remove @user* — Remove user from whitelist\n` +
      `*.whitelist list* — Show all whitelisted users\n` +
      `*.whitelist addgroup* — Whitelist this group _(owner only)_\n` +
      `*.whitelist removegroup* — Remove this group from whitelist _(owner only)_\n` +
      `*.whitelist listgroups* — List all whitelisted groups _(owner only)_\n\n` +
      `> *Whitelisted users bypass antilink & antispam protection.*`
    );
  }
};
