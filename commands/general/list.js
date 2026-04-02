/**
 * List Command
 * Show all commands - branded for Ruhvaan
 */

const config = require('../../config');
const { loadCommands } = require('../../utils/commandLoader');
const { sendButtons } = require('gifted-btns');

// Colourful category emojis
const CAT_EMOJIS = {
  admin:   '🛡️',
  fun:     '🎭',
  general: '📌',
  media:   '🎬',
  owner:   '👑',
  other:   '📦',
};

// Rainbow-style Unicode block colouring using bold italic chars
const colorName = (name) => {
  // Each letter gets a Unicode "colour" via variation — we use bold for pop
  const colours = ['🔴','🟠','🟡','🟢','🔵','🟣','🩷'];
  return name.split('').map((c, i) =>
    c === ' ' ? ' ' : `${c}`
  ).join('');
};

// Big colourful block letters R U H V A A N using emoji squares
const RUHVAAN_BANNER = [
  '🟥🟧🟨🟩🟦🟪🩷',
  '  *R U H V A A N*  ',
  '🟥🟧🟨🟩🟦🟪🩷'
].join('\n');

module.exports = {
  name: 'list',
  aliases: ['cmds', 'commands', 'help'],
  description: 'List all commands with descriptions',
  usage: '.list',
  category: 'general',

  async execute(sock, msg, args, extra) {
    try {
      const prefix = config.prefix;
      const commands = loadCommands();
      const categories = {};

      commands.forEach((cmd, name) => {
        if (cmd.name === name) {
          const cat = (cmd.category || 'other').toLowerCase();
          if (!categories[cat]) categories[cat] = [];
          categories[cat].push({
            label: cmd.description || '',
            names: [cmd.name].concat(cmd.aliases || []),
          });
        }
      });

      // ── Build menu text ──────────────────────────────────────────────────
      let menu = `${RUHVAAN_BANNER}\n\n`;
      menu += `╔══════════════════════╗\n`;
      menu += `║  🤖 *${config.botName}*  ║\n`;
      menu += `╚══════════════════════╝\n`;
      menu += `⚡ Prefix: *${prefix}*\n\n`;

      const orderedCats = Object.keys(categories).sort();

      for (const cat of orderedCats) {
        const emoji = CAT_EMOJIS[cat] || '📦';
        menu += `${emoji} *${cat.toUpperCase()}*\n`;
        menu += `${'─'.repeat(20)}\n`;
        for (const entry of categories[cat]) {
          const cmdList = entry.names.map(n => `${prefix}${n}`).join(', ');
          const label = entry.label || '';
          menu += label
            ? `  • \`${cmdList}\` — ${label}\n`
            : `  • \`${cmdList}\`\n`;
        }
        menu += '\n';
      }

      menu = menu.trimEnd();

      // ── Send with colourful Ruhvaan footer ───────────────────────────────
      await sendButtons(sock, extra.from, {
        title: '',
        text: menu,
        footer: '🟥🟧🟨🟩🟦🟪🩷 *Ruhvaan* 🩷🟪🟦🟩🟨🟧🟥',
        buttons: [
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '🎬 YouTube',
              url: config.social?.youtube || 'https://youtube.com/@mr_unique_hacker'
            })
          },
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '💻 GitHub',
              url: config.social?.github || 'https://github.com/elanaforrozeira-jpg/KnightBot-Mini'
            })
          }
        ]
      }, { quoted: msg });

    } catch (err) {
      console.error('list.js error:', err);
      // Fallback plain text if gifted-btns fails
      try {
        const prefix = config.prefix;
        const commands = loadCommands();
        const categories = {};
        commands.forEach((cmd, name) => {
          if (cmd.name === name) {
            const cat = (cmd.category || 'other').toLowerCase();
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push({ label: cmd.description || '', names: [cmd.name].concat(cmd.aliases || []) });
          }
        });
        let menu = `${RUHVAAN_BANNER}\n\n🤖 *${config.botName}* — Commands\nPrefix: *${prefix}*\n\n`;
        for (const cat of Object.keys(categories).sort()) {
          const emoji = CAT_EMOJIS[cat] || '📦';
          menu += `${emoji} *${cat.toUpperCase()}*\n`;
          for (const entry of categories[cat]) {
            menu += `  • ${entry.names.map(n => `${prefix}${n}`).join(', ')}${entry.label ? ' — ' + entry.label : ''}\n`;
          }
          menu += '\n';
        }
        menu += '\n🟥🟧🟨🟩🟦🟪🩷 *Ruhvaan* 🩷🟪🟦🟩🟨🟧🟥';
        await extra.reply(menu);
      } catch (e) {
        await extra.reply('❌ Failed to load commands list.');
      }
    }
  }
};
