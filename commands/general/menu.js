/**
 * Menu Command
 * Flow: loading animation (text) → edit to READY → send image with menu caption
 */

const config = require('../../config');
const { loadCommands } = require('../../utils/commandLoader');
const fs   = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const tryEdit = async (sock, from, key, text) => {
  try { await sock.sendMessage(from, { text, edit: key }); } catch (_) {}
};

// ─── Loading frames ───────────────────────────────────────────────────────────
const FRAMES = [
  '```\n⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡\n   ⟳  Starting up...\n⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡\n```',
  '```\n[██░░░░░░░░]  20%  ⚡\n   Loading modules...\n[██░░░░░░░░]  20%  ⚡\n```',
  '```\n[████░░░░░░]  45%  ⚡\n   Building menu...\n[████░░░░░░]  45%  ⚡\n```',
  '```\n[███████░░░]  72%  ⚡\n   Almost ready...\n[███████░░░]  72%  ⚡\n```',
  '```\n[██████████] 100%  ✅\n   Menu is ready!\n[██████████] 100%  ✅\n```',
];

// ─── Category config ──────────────────────────────────────────────────────────
const CAT_CFG = [
  { key: 'general',   icon: '◎', label: 'General'   },
  { key: 'ai',        icon: '◈', label: 'AI'        },
  { key: 'admin',     icon: '◆', label: 'Admin'     },
  { key: 'owner',     icon: '◉', label: 'Owner'     },
  { key: 'media',     icon: '◐', label: 'Media'     },
  { key: 'fun',       icon: '◇', label: 'Fun'       },
  { key: 'utility',   icon: '◌', label: 'Utility'   },
  { key: 'anime',     icon: '◑', label: 'Anime'     },
  { key: 'textmaker', icon: '◓', label: 'Textmaker' },
  { key: 'group',     icon: '◒', label: 'Group'     },
];

// ─── Build menu caption ───────────────────────────────────────────────────────
const buildCaption = (categories, totalCmds, timeStr, dateStr, ownerName, userNum) => {
  const P = config.prefix;
  const BOT = config.botName || 'KnightBot';
  let m = '';

  // ── Top bar
  m += `⚡ *${BOT}*  ·  v2.0\n`;
  m += `▸ ${dateStr}  ${timeStr}\n`;
  m += `▸ Hey *${userNum}* 👋\n`;
  m += `\n`;

  // ── Quick stats (single line each, clean)
  m += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
  m += `  🔑  Prefix    →  *${P}*\n`;
  m += `  📦  Commands  →  *${totalCmds}*\n`;
  m += `  👑  Owner     →  *${ownerName}*\n`;
  m += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
  m += `\n`;

  // ── Categories
  for (const { key, icon, label } of CAT_CFG) {
    const cmds = categories[key];
    if (!cmds || !cmds.length) continue;

    m += `${icon} *${label.toUpperCase()}*\n`;

    // show commands in 2-per-line grid for compact look
    const names = cmds.map(c => `${P}${c.name}`);
    for (let i = 0; i < names.length; i += 2) {
      const left  = names[i].padEnd(14);
      const right = names[i + 1] || '';
      m += `  ${left}${right}\n`;
    }
    m += `\n`;
  }

  // ── Footer
  m += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
  m += `💡 *${P}help <cmd>*  for details\n`;

  return m.trim();
};

// ─── Command ──────────────────────────────────────────────────────────────────
module.exports = {
  name: 'menu',
  aliases: ['start', 'm'],
  category: 'general',
  description: 'Show all available commands',
  usage: '.menu',

  async execute(sock, msg, args, extra) {
    try {
      const commands = loadCommands();
      const categories = {};
      let totalCmds = 0;

      commands.forEach((cmd, name) => {
        if (cmd.name === name && !cmd.hidden) {
          const cat = (cmd.category || 'other').toLowerCase();
          if (!categories[cat]) categories[cat] = [];
          categories[cat].push(cmd);
          totalCmds++;
        }
      });

      const now       = new Date();
      const timeStr   = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
      const dateStr   = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
      const ownerName = (Array.isArray(config.ownerName) ? config.ownerName[0] : config.ownerName) || 'Owner';
      const userNum   = extra.sender.split('@')[0];

      // ── Step 1: send first loading frame
      const loadMsg = await sock.sendMessage(extra.from, {
        text: FRAMES[0],
        mentions: [extra.sender]
      }, { quoted: msg });

      // ── Step 2: animate frames
      for (let i = 1; i < FRAMES.length; i++) {
        await sleep(450);
        if (loadMsg?.key) await tryEdit(sock, extra.from, loadMsg.key, FRAMES[i]);
      }

      await sleep(500);

      // ── Step 3: delete loading message (edit to empty-ish) & send image+menu
      if (loadMsg?.key) {
        await tryEdit(sock, extra.from, loadMsg.key, '✅ _Menu loaded!_');
      }

      // ── Step 4: send image first, with full menu as caption
      const caption    = buildCaption(categories, totalCmds, timeStr, dateStr, ownerName, userNum);
      const imagePath  = path.join(__dirname, '../../utils/bot_image.jpg');

      if (fs.existsSync(imagePath)) {
        await sock.sendMessage(extra.from, {
          image:   fs.readFileSync(imagePath),
          caption: caption,
          mentions: [extra.sender]
        }, { quoted: msg });
      } else {
        // No image fallback
        await sock.sendMessage(extra.from, {
          text:     caption,
          mentions: [extra.sender]
        }, { quoted: msg });
      }

    } catch (err) {
      await extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
