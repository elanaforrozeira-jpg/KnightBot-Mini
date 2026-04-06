/**
 * List Command - Show all commands (no buttons, no github link)
 */

const config = require('../../config');
const { loadCommands } = require('../../utils/commandLoader');

const CAT_EMOJIS = {
  general:   '🧭',
  ai:        '🤖',
  admin:     '🛡️',
  owner:     '👑',
  media:     '🎞️',
  fun:       '🎭',
  utility:   '🔧',
  anime:     '👾',
  textmaker: '🖋️',
  group:     '🔵',
  other:     '📦',
};

module.exports = {
  name: 'list',
  aliases: ['cmds', 'commands'],
  description: 'List all commands with descriptions',
  usage: '.list',
  category: 'general',

  async execute(sock, msg, args, extra) {
    try {
      const prefix   = config.prefix;
      const commands = loadCommands();
      const categories = {};

      commands.forEach((cmd, name) => {
        if (cmd.name === name && !cmd.hidden) {
          const cat = (cmd.category || 'other').toLowerCase();
          if (!categories[cat]) categories[cat] = [];
          categories[cat].push({
            names: [cmd.name].concat(cmd.aliases || []),
            label: cmd.description || '',
          });
        }
      });

      let menu = '';

      // Header
      menu += `⚡ *${config.botName}* — Commands\n`;
      menu += `🔑 Prefix: *${prefix}*\n`;
      menu += `📦 Total: *${Object.values(categories).flat().length}*\n`;
      menu += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n\n`;

      // Categories sorted
      const ORDER = ['general','ai','admin','owner','media','fun','utility','anime','textmaker','group','other'];
      const sorted = [
        ...ORDER.filter(k => categories[k]),
        ...Object.keys(categories).filter(k => !ORDER.includes(k))
      ];

      for (const cat of sorted) {
        const emoji = CAT_EMOJIS[cat] || '📦';
        menu += `${emoji} *${cat.toUpperCase()}*\n`;
        for (const entry of categories[cat]) {
          const cmdStr = entry.names.map(n => `${prefix}${n}`).join(', ');
          menu += entry.label
            ? `  • \`${cmdStr}\` — _${entry.label}_\n`
            : `  • \`${cmdStr}\`\n`;
        }
        menu += '\n';
      }

      menu = menu.trimEnd();

      await sock.sendMessage(extra.from, {
        text: menu,
        mentions: [extra.sender]
      }, { quoted: msg });

    } catch (err) {
      console.error('list.js error:', err);
      await extra.reply('❌ Failed to load commands list.');
    }
  }
};
