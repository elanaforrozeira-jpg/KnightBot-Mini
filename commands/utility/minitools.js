const crypto = require('crypto');

const reqText = async (extra, args, usage) => {
  const text = args.join(' ').trim();
  if (!text) {
    await extra.reply(`❌ Usage: ${usage}`);
    return null;
  }
  return text;
};

const toTitleCase = (s) => s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
const swapCase = (s) => [...s].map(ch => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())).join('');
const safeJsonDecode = (s) => {
  try { return JSON.parse(Buffer.from(s, 'base64').toString('utf8')); }
  catch (_) { return null; }
};

module.exports = [
  {
    name: 'upper',
    category: 'utility',
    description: 'Convert text to uppercase',
    usage: '.upper <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.upper <text>');
      if (text === null) return;
      return extra.reply(text.toUpperCase());
    }
  },
  {
    name: 'lower',
    category: 'utility',
    description: 'Convert text to lowercase',
    usage: '.lower <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.lower <text>');
      if (text === null) return;
      return extra.reply(text.toLowerCase());
    }
  },
  {
    name: 'reverse',
    aliases: ['rev'],
    category: 'utility',
    description: 'Reverse text',
    usage: '.reverse <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.reverse <text>');
      if (text === null) return;
      return extra.reply([...text].reverse().join(''));
    }
  },
  {
    name: 'titlecase',
    aliases: ['title'],
    category: 'utility',
    description: 'Convert text to title case',
    usage: '.titlecase <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.titlecase <text>');
      if (text === null) return;
      return extra.reply(toTitleCase(text));
    }
  },
  {
    name: 'swapcase',
    category: 'utility',
    description: 'Swap uppercase/lowercase letters',
    usage: '.swapcase <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.swapcase <text>');
      if (text === null) return;
      return extra.reply(swapCase(text));
    }
  },
  {
    name: 'trim',
    category: 'utility',
    description: 'Trim extra spaces',
    usage: '.trim <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.trim <text>');
      if (text === null) return;
      return extra.reply(text.replace(/\s+/g, ' ').trim());
    }
  },
  {
    name: 'repeat',
    category: 'utility',
    description: 'Repeat text n times',
    usage: '.repeat <count> <text>',
    async execute(sock, msg, args, extra) {
      const count = parseInt(args[0], 10);
      const text = args.slice(1).join(' ').trim();
      if (!count || count < 1 || count > 10 || !text) {
        return extra.reply('❌ Usage: .repeat <1-10> <text>');
      }
      return extra.reply(Array.from({ length: count }, () => text).join('\n'));
    }
  },
  {
    name: 'slug',
    category: 'utility',
    description: 'Convert text to URL slug',
    usage: '.slug <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.slug <text>');
      if (text === null) return;
      return extra.reply(
        text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
      );
    }
  },
  {
    name: 'urlencode',
    aliases: ['encurl'],
    category: 'utility',
    description: 'Encode text for URL',
    usage: '.urlencode <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.urlencode <text>');
      if (text === null) return;
      return extra.reply(encodeURIComponent(text));
    }
  },
  {
    name: 'urldecode',
    aliases: ['decurl'],
    category: 'utility',
    description: 'Decode URL-encoded text',
    usage: '.urldecode <encoded text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.urldecode <encoded text>');
      if (text === null) return;
      try {
        return extra.reply(decodeURIComponent(text));
      } catch (_) {
        return extra.reply('❌ Invalid URL-encoded input.');
      }
    }
  },
  {
    name: 'b64e',
    aliases: ['base64e'],
    category: 'utility',
    description: 'Encode text to Base64',
    usage: '.b64e <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.b64e <text>');
      if (text === null) return;
      return extra.reply(Buffer.from(text, 'utf8').toString('base64'));
    }
  },
  {
    name: 'b64d',
    aliases: ['base64d'],
    category: 'utility',
    description: 'Decode Base64 text',
    usage: '.b64d <base64>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.b64d <base64>');
      if (text === null) return;
      try {
        const decoded = Buffer.from(text, 'base64').toString('utf8');
        if (!decoded) return extra.reply('❌ Invalid Base64 input.');
        return extra.reply(decoded);
      } catch (_) {
        return extra.reply('❌ Invalid Base64 input.');
      }
    }
  },
  {
    name: 'md5',
    category: 'utility',
    description: 'Generate MD5 hash',
    usage: '.md5 <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.md5 <text>');
      if (text === null) return;
      return extra.reply(crypto.createHash('md5').update(text).digest('hex'));
    }
  },
  {
    name: 'sha1',
    category: 'utility',
    description: 'Generate SHA1 hash',
    usage: '.sha1 <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.sha1 <text>');
      if (text === null) return;
      return extra.reply(crypto.createHash('sha1').update(text).digest('hex'));
    }
  },
  {
    name: 'sha256',
    category: 'utility',
    description: 'Generate SHA256 hash',
    usage: '.sha256 <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.sha256 <text>');
      if (text === null) return;
      return extra.reply(crypto.createHash('sha256').update(text).digest('hex'));
    }
  },
  {
    name: 'rand',
    aliases: ['random'],
    category: 'utility',
    description: 'Random number in range',
    usage: '.rand <min> <max>',
    async execute(sock, msg, args, extra) {
      const min = parseInt(args[0], 10);
      const max = parseInt(args[1], 10);
      if (Number.isNaN(min) || Number.isNaN(max) || min > max) {
        return extra.reply('❌ Usage: .rand <min> <max>');
      }
      const value = Math.floor(Math.random() * (max - min + 1)) + min;
      return extra.reply(`🎲 ${value}`);
    }
  },
  {
    name: 'choose',
    aliases: ['pick'],
    category: 'utility',
    description: 'Pick one option from list',
    usage: '.choose option1 | option2 | option3',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.choose option1 | option2 | option3');
      if (text === null) return;
      const options = text.split('|').map(x => x.trim()).filter(Boolean);
      if (options.length < 2) return extra.reply('❌ Provide at least 2 options separated by "|"');
      const choice = options[Math.floor(Math.random() * options.length)];
      return extra.reply(`✅ Chosen: *${choice}*`);
    }
  },
  {
    name: 'coinflip',
    aliases: ['toss'],
    category: 'utility',
    description: 'Flip a coin',
    usage: '.coinflip',
    async execute(sock, msg, args, extra) {
      return extra.reply(Math.random() < 0.5 ? '🪙 Heads' : '🪙 Tails');
    }
  },
  {
    name: 'roll',
    aliases: ['dice'],
    category: 'utility',
    description: 'Roll a dice',
    usage: '.roll [sides]',
    async execute(sock, msg, args, extra) {
      const sides = args[0] ? parseInt(args[0], 10) : 6;
      if (Number.isNaN(sides) || sides < 2 || sides > 1000) {
        return extra.reply('❌ Usage: .roll [2-1000]');
      }
      const value = Math.floor(Math.random() * sides) + 1;
      return extra.reply(`🎲 d${sides}: *${value}*`);
    }
  },
  {
    name: 'palindrome',
    aliases: ['ispalindrome'],
    category: 'utility',
    description: 'Check if text is palindrome',
    usage: '.palindrome <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.palindrome <text>');
      if (text === null) return;
      const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!normalized) return extra.reply('❌ Provide alphanumeric text.');
      const yes = normalized === [...normalized].reverse().join('');
      return extra.reply(yes ? '✅ Yes, palindrome' : '❌ Not a palindrome');
    }
  },
  {
    name: 'wordcount',
    aliases: ['wc'],
    category: 'utility',
    description: 'Count words in text',
    usage: '.wordcount <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.wordcount <text>');
      if (text === null) return;
      const count = text.trim() ? text.trim().split(/\s+/).length : 0;
      return extra.reply(`📝 Words: *${count}*`);
    }
  },
  {
    name: 'charcount',
    aliases: ['cc'],
    category: 'utility',
    description: 'Count characters in text',
    usage: '.charcount <text>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.charcount <text>');
      if (text === null) return;
      return extra.reply(`🔢 Characters: *${text.length}*`);
    }
  },
  {
    name: 'jsonb64',
    category: 'utility',
    description: 'Decode Base64 JSON payload',
    usage: '.jsonb64 <base64-json>',
    async execute(sock, msg, args, extra) {
      const text = await reqText(extra, args, '.jsonb64 <base64-json>');
      if (text === null) return;
      const decoded = safeJsonDecode(text);
      if (!decoded) return extra.reply('❌ Invalid Base64 JSON input.');
      return extra.reply(`\`\`\`${JSON.stringify(decoded, null, 2)}\`\`\``);
    }
  }
];
