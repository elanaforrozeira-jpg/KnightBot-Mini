/**
 * Funny Commands Pack
 * roast, compliment, pickup, fact, horoscope, would_you_rather, 8ball
 */

const roasts = [
  'You are the reason God created the mute button. 🔇',
  'I would roast you, but my mom said I am not allowed to burn trash. 🗑️',
  'You bring everyone so much joy... when you leave the room. 😂',
  'You are like a cloud. When you disappear, it is a beautiful day. ☀️',
  'I would explain it to you but I left my crayons at home. 🖍️',
  'You are proof that evolution CAN go in reverse. 🦧',
  'I would call you an idiot but that would be an insult to idiots. 🤦',
  'You have your whole life to be stupid. Why not take today off? 😴',
  'If you were any less intelligent, we would have to water you twice a week. 🌵',
  'I could agree with you but then we would both be wrong. 🤡',
  'You are like a software update — nobody wants you but you keep showing up. 🔄',
  'Somewhere out there, a tree is working very hard to produce oxygen for you. You owe it an apology. 🌳',
];

const compliments = [
  'You light up every room you walk into! ✨',
  'You have an amazing smile! 😊',
  'Your kindness is truly admirable. 💖',
  'You are one of the strongest people I know. 💪',
  'You make the world a better place just by being in it. 🌍',
  'Your laugh is contagious in the best way! 😂',
  'You are incredibly talented and creative! 🎨',
  'People are lucky to have you in their lives. 🍀',
  'You radiate positive energy! ⚡',
  'You are more awesome than you realise. 🔥',
];

const pickupLines = [
  'Are you a magician? Because whenever I look at you, everyone else disappears. 🪄',
  'Do you have a map? I keep getting lost in your eyes. 🗺️',
  'Are you a parking ticket? Because you have "fine" written all over you. 😏',
  'Are you Wi-Fi? Because I am feeling a connection. 📶',
  'If you were a vegetable, you would be a cute-cumber. 🥒',
  'Do you believe in love at first sight, or should I walk by again? 👀',
  'Are you a bank loan? Because you have my interest. 💰',
  'Is your name Google? Because you have everything I have been searching for. 🔍',
  'Are you a keyboard? Because you are just my type. ⌨️',
  'Do you have a name or can I call you mine? 💕',
];

const facts = [
  'Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs. 🍯',
  'A group of flamingos is called a flamboyance. 🦩',
  'Octopuses have three hearts. 🐙',
  'Bananas are slightly radioactive. 🍌',
  'It rains diamonds on Saturn and Jupiter. 💎',
  'Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid. 🏛️',
  'A day on Venus is longer than a year on Venus. ☀️',
  'Wombat poop is cube-shaped. 🟫',
  'The inventor of Pringles is buried in a Pringles can. 🥫',
  'A shrimp\'s heart is in its head. 🦐',
  'Humans share 50% of their DNA with bananas. 🍌',
  'There are more possible iterations of a game of chess than there are atoms in the observable universe. ♟️',
];

const horoscopes = [
  { sign: 'Aries',       msg: 'Today is your day to take bold risks! 🐏🔥' },
  { sign: 'Taurus',      msg: 'Slow down and enjoy the simple pleasures today. 🐂🌿' },
  { sign: 'Gemini',      msg: 'Your social charm is at its peak — use it wisely! 👯✨' },
  { sign: 'Cancer',      msg: 'Trust your intuition; it will not lead you astray. 🦀🌊' },
  { sign: 'Leo',         msg: 'The spotlight is yours — shine bright! 🦁👑' },
  { sign: 'Virgo',       msg: 'Details matter today; double-check everything. 🌾🔍' },
  { sign: 'Libra',       msg: 'Balance and harmony are key themes for you. ⚖️🕊️' },
  { sign: 'Scorpio',     msg: 'Your instincts are razor-sharp. Trust them. 🦂🔮' },
  { sign: 'Sagittarius', msg: 'An adventure awaits — say yes to opportunities! 🏹🌍' },
  { sign: 'Capricorn',   msg: 'Hard work pays off today. Stay the course. 🐐⛰️' },
  { sign: 'Aquarius',    msg: 'Think outside the box — your ideas are brilliant! 🏺💡' },
  { sign: 'Pisces',      msg: 'Your creativity is flowing. Express yourself freely. 🐟🎨' },
];

const wyrQuestions = [
  'Would you rather always speak in rhymes OR sing everything you say? 🎤',
  'Would you rather have the ability to fly OR be invisible?',
  'Would you rather eat only pizza for life OR never eat pizza again? 🍕',
  'Would you rather lose your phone OR your wallet?',
  'Would you rather be 10 minutes late to everything OR 30 minutes early? ⏰',
  'Would you rather always feel extremely cold OR always feel extremely hot? 🌡️',
  'Would you rather be famous for being smart OR famous for being funny? 🧠😂',
  'Would you rather have free WiFi everywhere OR free food wherever you go?',
  'Would you rather speak all languages OR talk to animals? 🦜',
  'Would you rather be a superhero nobody knows about OR a villain everyone is afraid of? 😈',
];

const eightBallResponses = [
  'It is certain. ✅',
  'It is decidedly so. ✅',
  'Without a doubt. ✅',
  'Yes, definitely. ✅',
  'You may rely on it. ✅',
  'As I see it, yes. ✅',
  'Most likely. 🤔',
  'Outlook good. 🟢',
  'Signs point to yes. 🟡',
  'Reply hazy, try again. 🌫️',
  'Ask again later. ⏳',
  'Better not tell you now. 🤐',
  'Cannot predict now. ❓',
  'Concentrate and ask again. 🧿',
  "Don't count on it. ❌",
  'My reply is no. ❌',
  'My sources say no. ❌',
  'Outlook not so good. 🔴',
  'Very doubtful. 🔴',
];

module.exports = [
  // 🔥 ROAST
  {
    name: 'roast',
    aliases: ['burn', 'insult'],
    category: 'fun',
    description: 'Roast someone (or yourself)',
    usage: '.roast [@user]',
    async execute(sock, msg, args, { from, sender }) {
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = (ctx?.mentionedJid || [])[0];
      const target = mentioned || sender;
      const num = target.split('@')[0];
      const roast = roasts[Math.floor(Math.random() * roasts.length)];
      await sock.sendMessage(from, {
        text: `🔥 *Roast for @${num}*\n\n${roast}`,
        mentions: [target]
      }, { quoted: msg });
    }
  },

  // 💖 COMPLIMENT
  {
    name: 'compliment',
    aliases: ['praise', 'comp'],
    category: 'fun',
    description: 'Give someone a compliment',
    usage: '.compliment [@user]',
    async execute(sock, msg, args, { from, sender }) {
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = (ctx?.mentionedJid || [])[0];
      const target = mentioned || sender;
      const num = target.split('@')[0];
      const comp = compliments[Math.floor(Math.random() * compliments.length)];
      await sock.sendMessage(from, {
        text: `💖 *Compliment for @${num}*\n\n${comp}`,
        mentions: [target]
      }, { quoted: msg });
    }
  },

  // 😏 PICKUP LINE
  {
    name: 'pickup',
    aliases: ['flirt', 'pl'],
    category: 'fun',
    description: 'Random pickup line',
    usage: '.pickup',
    async execute(sock, msg, args, { from, reply }) {
      const line = pickupLines[Math.floor(Math.random() * pickupLines.length)];
      await reply(`😏 *Pickup Line*\n\n${line}`);
    }
  },

  // 🧠 FACT
  {
    name: 'fact',
    aliases: ['funfact', 'didyouknow'],
    category: 'fun',
    description: 'Random fun fact',
    usage: '.fact',
    async execute(sock, msg, args, { reply }) {
      const f = facts[Math.floor(Math.random() * facts.length)];
      await reply(`🧠 *Fun Fact*\n\n${f}`);
    }
  },

  // ♈ HOROSCOPE
  {
    name: 'horoscope',
    aliases: ['horo', 'zodiac'],
    category: 'fun',
    description: 'Daily horoscope for your zodiac sign',
    usage: '.horoscope <sign>  (e.g. .horoscope leo)',
    async execute(sock, msg, args, { reply }) {
      const input = (args[0] || '').toLowerCase();
      const match = horoscopes.find(h => h.sign.toLowerCase() === input);
      if (!match) {
        const signs = horoscopes.map(h => h.sign).join(', ');
        return reply(`♈ *Zodiac Signs:*\n${signs}\n\nUsage: .horoscope <sign>`);
      }
      await reply(`${match.msg}\n\n> Your daily reading for *${match.sign}*`);
    }
  },

  // 🤔 WOULD YOU RATHER
  {
    name: 'wyr',
    aliases: ['wouldyourather', 'wyq'],
    category: 'fun',
    description: 'Would You Rather question',
    usage: '.wyr',
    async execute(sock, msg, args, { reply }) {
      const q = wyrQuestions[Math.floor(Math.random() * wyrQuestions.length)];
      await reply(`🤔 *Would You Rather?*\n\n${q}`);
    }
  },

  // 🎱 8BALL
  {
    name: '8ball',
    aliases: ['eightball', 'magic8'],
    category: 'fun',
    description: 'Ask the magic 8-ball a question',
    usage: '.8ball <question>',
    async execute(sock, msg, args, { reply }) {
      const question = args.join(' ').trim();
      if (!question) return reply('🎱 Ask me a question!\nUsage: .8ball Will I pass my exam?');
      const ans = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
      await reply(`🎱 *Magic 8-Ball*\n\n❓ ${question}\n\n🔮 ${ans}`);
    }
  },

  // 😂 JOKE
  {
    name: 'joke',
    aliases: ['jokes', 'lol'],
    category: 'fun',
    description: 'Random joke',
    usage: '.joke',
    async execute(sock, msg, args, { from, reply }) {
      const jokes = [
        { q: 'Why do programmers prefer dark mode?', a: 'Because light attracts bugs! 🐛' },
        { q: 'Why did the computer go to the doctor?', a: 'Because it had a virus! 💊' },
        { q: 'How many programmers does it take to change a lightbulb?', a: 'None — that\'s a hardware problem. 💡' },
        { q: 'Why do Java developers wear glasses?', a: 'Because they don\'t C#! 👓' },
        { q: 'Why was the math book sad?', a: 'It had too many problems. 📚' },
        { q: 'What do you call a fish without eyes?', a: 'A fsh! 🐟' },
        { q: 'Why don\'t scientists trust atoms?', a: 'Because they make up everything! ⚛️' },
        { q: 'I told my wife she was drawing her eyebrows too high.', a: 'She looked surprised. 😲' },
      ];
      const j = jokes[Math.floor(Math.random() * jokes.length)];
      await sock.sendMessage(from, {
        text: `😂 *Joke Time!*\n\n❓ ${j.q}\n\n💬 ${j.a}`
      }, { quoted: msg });
    }
  },

  // 🎲 RANDOM NUMBER
  {
    name: 'random',
    aliases: ['rand', 'roll', 'dice'],
    category: 'fun',
    description: 'Roll a dice or pick a random number',
    usage: '.random [max]  or  .random [min] [max]',
    async execute(sock, msg, args, { reply }) {
      let min = 1, max = 6;
      if (args.length === 1) { max = parseInt(args[0]) || 6; }
      else if (args.length >= 2) { min = parseInt(args[0]) || 1; max = parseInt(args[1]) || 6; }
      if (min > max) [min, max] = [max, min];
      const result = Math.floor(Math.random() * (max - min + 1)) + min;
      const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
      const face = (result >= 1 && result <= 6) ? faces[result - 1] : '🎲';
      await reply(`${face} *Rolled: ${result}*\n\nRange: ${min} — ${max}`);
    }
  },

  // 🪙 COINFLIP
  {
    name: 'coinflip',
    aliases: ['flip', 'coin', 'toss'],
    category: 'fun',
    description: 'Flip a coin',
    usage: '.coinflip',
    async execute(sock, msg, args, { reply }) {
      const result = Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🔵';
      await reply(`🪙 *Coin Flip Result:*\n\n**${result}**`);
    }
  },
];
