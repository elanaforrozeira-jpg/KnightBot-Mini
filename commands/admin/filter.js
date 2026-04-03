/**
 * Filter / AutoReply Command
 * .filter add <keyword> | <response>  — add keyword auto-reply for this group
 * .filter remove <keyword>            — remove a filter
 * .filter list                        — list all filters
 * .filter clear                       — clear all filters (admin only)
 */

const database = require('../../database');

// In-memory store per group: { groupId: { keyword: response } }
// Persisted via groupSettings under key 'filters'

const getFilters = (groupId) => {
  const s = database.getGroupSettings(groupId);
  return s.filters || {};
};

const saveFilters = (groupId, filters) => {
  database.updateGroupSettings(groupId, { filters });
};

module.exports = [
  {
    name: 'filter',
    aliases: ['autoreply', 'af'],
    category: 'admin',
    description: 'Set keyword auto-replies for this group',
    usage: '.filter add <word> | <reply>  |  .filter remove <word>  |  .filter list',
    groupOnly: true,
    adminOnly: true,

    async execute(sock, msg, args, extra) {
      const from = extra.from;
      const sub  = (args[0] || '').toLowerCase();

      if (sub === 'list') {
        const filters = getFilters(from);
        const keys = Object.keys(filters);
        if (!keys.length) return extra.reply('📋 No filters set for this group.');
        const list = keys.map((k, i) => `${i + 1}. *${k}* → ${filters[k]}`).join('\n');
        return extra.reply(`📋 *Group Filters* (${keys.length}):\n\n${list}`);
      }

      if (sub === 'clear') {
        saveFilters(from, {});
        return extra.reply('🗑️ All filters cleared.');
      }

      if (sub === 'remove') {
        const kw = args.slice(1).join(' ').toLowerCase();
        if (!kw) return extra.reply('❌ Usage: .filter remove <keyword>');
        const filters = getFilters(from);
        if (!filters[kw]) return extra.reply(`❌ Filter *${kw}* not found.`);
        delete filters[kw];
        saveFilters(from, filters);
        return extra.reply(`✅ Filter *${kw}* removed.`);
      }

      if (sub === 'add') {
        const rest = args.slice(1).join(' ');
        const parts = rest.split('|');
        if (parts.length < 2) return extra.reply('❌ Usage: .filter add <keyword> | <response>');
        const kw   = parts[0].trim().toLowerCase();
        const resp = parts.slice(1).join('|').trim();
        if (!kw || !resp) return extra.reply('❌ Keyword and response cannot be empty.');
        const filters = getFilters(from);
        filters[kw] = resp;
        saveFilters(from, filters);
        return extra.reply(`✅ Filter added!\n🔑 Keyword: *${kw}*\n💬 Reply: ${resp}`);
      }

      return extra.reply(
        '📋 *Filter Commands:*\n' +
        '• `.filter add <word> | <reply>` — add filter\n' +
        '• `.filter remove <word>` — remove filter\n' +
        '• `.filter list` — list all filters\n' +
        '• `.filter clear` — clear all filters'
      );
    }
  },

  {
    name: '__filter_watcher',
    hidden: true,
    category: 'admin',
    description: 'Internal: checks every message against group filters',

    // Call from handler.js: require('./commands/admin/filter').checkFilter(sock, msg, body, from)
    checkFilter: async (sock, msg, body, from) => {
      try {
        if (!from.endsWith('@g.us')) return;
        const filters = getFilters(from);
        const text = (body || '').toLowerCase().trim();
        for (const [kw, resp] of Object.entries(filters)) {
          if (text.includes(kw)) {
            await sock.sendMessage(from, { text: resp }, { quoted: msg });
            return;
          }
        }
      } catch (_) {}
    }
  }
];
