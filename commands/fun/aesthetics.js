/**
 * Aesthetic Text & Art Commands
 */

module.exports = [
  {
    name: 'aesthetic',
    aliases: ['ae', 'aes', 'vaporwave'],
    category: 'fun',
    description: 'Convert text to aesthetic full-width style',
    usage: '.aesthetic <text>',
    async execute(sock, msg, args, { from, reply }) {
      const text = args.join(' ').trim();
      if (!text) return reply('Usage: .aesthetic <text>');
      const normal = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !?.';
      const wide   = 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ０１２３４５６７８９　！？．';
      const result = text.split('').map(c => {
        const i = normal.indexOf(c);
        return i !== -1 ? wide[i] : c;
      }).join('');
      await reply(`🌸 ${result}`);
    }
  },
  {
    name: 'zalgo',
    aliases: ['cursed', 'glitch'],
    category: 'fun',
    description: 'Make text look creepy/glitchy (zalgo)',
    usage: '.zalgo <text>',
    async execute(sock, msg, args, { from, reply }) {
      const text = args.join(' ').trim();
      if (!text) return reply('Usage: .zalgo <text>');
      const above = ['̍','̎','̄','̅','̿','̑','̆','̐','͒','͗','͑','̇','̈','̊','͂','̓','̈́','͊','͋','͌','̃','̂','̈','͂'];
      const below = ['̖','̗','̘','̙','̜','̝','̞','̟','̠','̤','̥','̦','̩','̪','̫','̬','̭','̮','̯','̰','̱','̲','̳','̹','̺','̻','̼'];
      const result = text.split('').map(c => {
        if (c === ' ') return ' ';
        let r = c;
        const aN = Math.floor(Math.random() * 3);
        const bN = Math.floor(Math.random() * 3);
        for (let i = 0; i < aN; i++) r += above[Math.floor(Math.random() * above.length)];
        for (let i = 0; i < bN; i++) r += below[Math.floor(Math.random() * below.length)];
        return r;
      }).join('');
      await reply(`👁️ ${result}`);
    }
  },
  {
    name: 'reverse',
    aliases: ['rev', 'mirror'],
    category: 'fun',
    description: 'Reverse a text',
    usage: '.reverse <text>',
    async execute(sock, msg, args, { reply }) {
      const text = args.join(' ').trim();
      if (!text) return reply('Usage: .reverse <text>');
      const result = [...text].reverse().join('');
      await reply(`🔄 ${result}`);
    }
  },
  {
    name: 'mock',
    aliases: ['sponge', 'spongebob'],
    category: 'fun',
    description: 'MoCk TeXt LiKe SpOnGeBoB',
    usage: '.mock <text>',
    async execute(sock, msg, args, { reply }) {
      const text = args.join(' ').trim();
      if (!text) return reply('Usage: .mock <text>');
      let toggle = false;
      const result = text.split('').map(c => {
        if (/[a-zA-Z]/.test(c)) { toggle = !toggle; return toggle ? c.toUpperCase() : c.toLowerCase(); }
        return c;
      }).join('');
      await reply(`🧽 ${result}`);
    }
  },
  {
    name: 'clap',
    aliases: ['clapback'],
    category: 'fun',
    description: 'Add 👏 between every word',
    usage: '.clap <text>',
    async execute(sock, msg, args, { reply }) {
      const text = args.join(' ').trim();
      if (!text) return reply('Usage: .clap <text>');
      const result = text.split(' ').join(' 👏 ');
      await reply(`👏 ${result} 👏`);
    }
  }
];
