/**
 * Menu Command - Display all available commands
 * Updated: removed newsletter channel link, better emoji design
 */

const config = require('../../config');
const { loadCommands } = require('../../utils/commandLoader');

module.exports = {
  name: 'menu',
  aliases: ['help', 'commands'],
  category: 'general',
  description: 'Show all available commands',
  usage: '.menu',

  async execute(sock, msg, args, extra) {
    try {
      const commands = loadCommands();
      const categories = {};

      commands.forEach((cmd, name) => {
        if (cmd.name === name) {
          if (!categories[cmd.category]) categories[cmd.category] = [];
          categories[cmd.category].push(cmd);
        }
      });

      const ownerNames = Array.isArray(config.ownerName) ? config.ownerName : [config.ownerName];
      const displayOwner = ownerNames[0] || 'Bot Owner';
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

      // ── header ────────────────────────────────────────────────────
      let menuText = `✦ ──────────────────── ✦\n`;
      menuText += `   ⚡ *${config.botName}* ⚡\n`;
      menuText += `✦ ──────────────────── ✦\n\n`;
      menuText += `👋 Heyy @${extra.sender.split('@')[0]}!\n`;
      menuText += `🕐 ${timeStr}  •  📅 ${dateStr}\n\n`;
      menuText += `┌──────────────────────\n`;
      menuText += `│ 🤖 Bot  : ${config.botName}\n`;
      menuText += `│ 🔑 Prefix: *${config.prefix}*\n`;
      menuText += `│ 📦 Cmds  : ${commands.size}\n`;
      menuText += `│ 👑 Owner : ${displayOwner}\n`;
      menuText += `└──────────────────────\n\n`;

      // ── category map ──────────────────────────────────────────────
      const catConfig = [
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

      for (const { key, icon, label } of catConfig) {
        if (!categories[key] || categories[key].length === 0) continue;
        menuText += `╔══「 ${icon} *${label}* 」\n`;
        categories[key].forEach(cmd => {
          menuText += `║  ➣ ${config.prefix}${cmd.name}\n`;
        });
        menuText += `╚══════════════════════\n\n`;
      }

      // ── footer (NO channel link) ───────────────────────────────────
      menuText += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      menuText += `💡 *${config.prefix}help <cmd>* for details\n`;
      menuText += `🌟 Version: 1.0.0\n`;
      menuText += `━━━━━━━━━━━━━━━━━━━━━━`;

      // ── send ──────────────────────────────────────────────────────
      const fs   = require('fs');
      const path = require('path');
      const imagePath = path.join(__dirname, '../../utils/bot_image.jpg');

      const base = {
        caption: menuText,
        mentions: [extra.sender]
      };

      if (fs.existsSync(imagePath)) {
        await sock.sendMessage(extra.from, {
          image: fs.readFileSync(imagePath),
          ...base
        }, { quoted: msg });
      } else {
        await sock.sendMessage(extra.from, {
          text: menuText,
          mentions: [extra.sender]
        }, { quoted: msg });
      }

    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
