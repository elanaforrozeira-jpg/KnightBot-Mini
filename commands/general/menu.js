/**
 * Menu Command - Animated 3D Professional Menu
 * Animation: loading frames (via message edit) -> full 3D menu reveal
 */

const config = require('../../config');
const { loadCommands } = require('../../utils/commandLoader');
const fs   = require('fs');
const path = require('path');

// ─── Loading animation frames ────────────────────────────────────────────────
const FRAMES = [
  '```\n░░░░░░░░░░░░░░░░░░░░░░\n  ⟳  BOOTING...\n░░░░░░░░░░░░░░░░░░░░░░\n```',
  '```\n▓▓▓▓▓░░░░░░░░░░░░░░░░░\n  ⚡  LOADING  [███░░░░░]  30%\n▓▓▓▓▓░░░░░░░░░░░░░░░░░\n```',
  '```\n▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░\n  ⚡  LOADING  [██████░░]  65%\n▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░\n```',
  '```\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░\n  ⚡  LOADING  [███████░]  88%\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░\n```',
  '```\n██████████████████████\n  ✅  READY    [████████] 100%\n██████████████████████\n```',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const tryEdit = async (sock, from, key, text) => {
  try { await sock.sendMessage(from, { text, edit: key }); } catch (_) {}
};

const make3DBanner = (name) => [
  '╔' + '═'.repeat(24) + '╗',
  '║  ⚡ ' + name.toUpperCase().padEnd(18) + '⚡  ║',
  '╠' + '═'.repeat(24) + '╣',
  '║   ◈  YOUR BOT. YOUR RULES.  ◈   ║',
  '╚' + '═'.repeat(24) + '╝',
].join('\n');

const CAT_CFG = [
  { key: 'general',   icon: '🧭', label: 'GENERAL'   },
  { key: 'ai',        icon: '🤖', label: 'AI'        },
  { key: 'admin',     icon: '🛡️', label: 'ADMIN'     },
  { key: 'owner',     icon: '👑', label: 'OWNER'     },
  { key: 'media',     icon: '🎞️', label: 'MEDIA'     },
  { key: 'fun',       icon: '🎭', label: 'FUN'       },
  { key: 'utility',   icon: '🔧', label: 'UTILITY'   },
  { key: 'anime',     icon: '👾', label: 'ANIME'     },
  { key: 'textmaker', icon: '🖋️', label: 'TEXTMAKER' },
  { key: 'group',     icon: '🔵', label: 'GROUP'     },
];

// ─── Build full 3D menu text ──────────────────────────────────────────────────
const buildMenu = (categories, commands, timeStr, dateStr, ownerName, totalCmds, userNum) => {
  const banner = make3DBanner(config.botName || 'KnightBot');
  let m = '';

  // 3D banner in monospace block
  m += '```\n' + banner + '\n```\n\n';

  // Info card
  m += '┌───────────────────────────\n';
  m += `│  👤  *${userNum}*\n`;
  m += `│  🕐  ${timeStr}  ·  📅 ${dateStr}\n`;
  m += `│  🔑  Prefix » *${config.prefix}*\n`;
  m += `│  📦  Commands » *${totalCmds}*\n`;
  m += `│  👑  Owner » *${ownerName}*\n`;
  m += '└───────────────────────────\n\n';

  // 3D section divider
  m += '◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢\n';
  m += '     ◈  *COMMAND MODULES*  ◈\n';
  m += '◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢\n\n';

  // Command categories
  for (const { key, icon, label } of CAT_CFG) {
    const cmds = categories[key];
    if (!cmds || !cmds.length) continue;
    m += `╭── ${icon} *${label}*  ──  [${cmds.length} cmds]\n`;
    cmds.forEach((cmd, i) => {
      const isLast = i === cmds.length - 1;
      m += `${isLast ? '╰' : '├'}─ \`${config.prefix}${cmd.name}\``;
      if (cmd.description) m += `  _${cmd.description}_`;
      m += '\n';
    });
    m += '\n';
  }

  // Footer
  m += '◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢\n';
  m += `💡 *${config.prefix}help <cmd>*  —  command details\n`;
  m += `🌐 *Powered by ${config.botName || 'KnightBot'}*  ·  v2.0\n`;
  m += '◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢';

  return m;
};

// ─── Command ──────────────────────────────────────────────────────────────────
module.exports = {
  name: 'menu',
  aliases: ['start', 'm'],
  category: 'general',
  description: 'Show all commands with animated 3D menu',
  usage: '.menu',

  async execute(sock, msg, args, extra) {
    try {
      const commands = loadCommands();
      const categories = {};

      commands.forEach((cmd, name) => {
        if (cmd.name === name && !cmd.hidden) {
          const cat = (cmd.category || 'other').toLowerCase();
          if (!categories[cat]) categories[cat] = [];
          categories[cat].push(cmd);
        }
      });

      const now       = new Date();
      const timeStr   = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
      const dateStr   = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
      const ownerName = (Array.isArray(config.ownerName) ? config.ownerName[0] : config.ownerName) || 'Owner';
      const userNum   = extra.sender.split('@')[0];

      // count only real (non-hidden, non-alias) commands
      let totalCmds = 0;
      commands.forEach((cmd, name) => { if (cmd.name === name && !cmd.hidden) totalCmds++; });

      // ── Step 1: Send first loading frame ──────────────────────────
      const sent = await sock.sendMessage(extra.from, {
        text: FRAMES[0],
        mentions: [extra.sender]
      }, { quoted: msg });

      // ── Step 2-4: Animate through frames via message edit ─────────
      if (sent?.key) {
        for (let i = 1; i < FRAMES.length; i++) {
          await sleep(480);
          await tryEdit(sock, extra.from, sent.key, FRAMES[i]);
        }
        // ── Step 5: Reveal full 3D menu ─────────────────────────────
        await sleep(650);
        const fullMenu = buildMenu(categories, commands, timeStr, dateStr, ownerName, totalCmds, userNum);
        await tryEdit(sock, extra.from, sent.key, fullMenu);
      } else {
        // Fallback: no edit support, send directly
        const fullMenu = buildMenu(categories, commands, timeStr, dateStr, ownerName, totalCmds, userNum);
        await sock.sendMessage(extra.from, { text: fullMenu, mentions: [extra.sender] }, { quoted: msg });
      }

      // ── Step 6: Send bot image as separate msg (optional) ─────────
      const imagePath = path.join(__dirname, '../../utils/bot_image.jpg');
      if (fs.existsSync(imagePath)) {
        await sleep(400);
        await sock.sendMessage(extra.from, {
          image: fs.readFileSync(imagePath),
          caption:
            '╔' + '═'.repeat(24) + '╗\n' +
            '║  ⚡ ' + (config.botName || 'KnightBot').toUpperCase().padEnd(18) + '⚡  ║\n' +
            '╚' + '═'.repeat(24) + '╝',
        }, { quoted: msg });
      }

    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
