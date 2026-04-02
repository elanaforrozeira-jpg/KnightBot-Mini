/**
 * Emoji Animation Command
 * Sends animated emoji sequences with cool patterns
 */

module.exports = {
  name: 'emoji',
  aliases: ['emojiart', 'emojianim', 'eani'],
  category: 'fun',
  description: 'Send cool emoji animations',
  usage: '.emoji <type>\nTypes: fire, heart, party, rain, wave, matrix, stars, loading, love, hype, skull, cool',

  async execute(sock, msg, args, { from, reply }) {
    const type = (args[0] || 'random').toLowerCase();

    const animations = {
      fire: [
        '🔥',
        '🔥🔥',
        '🔥🔥🔥',
        '🔥🔥🔥🔥',
        '🔥🔥🔥🔥🔥',
        '🔥🔥🔥🔥',
        '🔥🔥🔥',
        '🔥🔥',
        '🔥',
        '✨'
      ],
      heart: [
        '🤍',
        '🩶',
        '💙',
        '💚',
        '💛',
        '🧡',
        '❤️',
        '❤️‍🔥',
        '💗',
        '💖',
        '💞',
        '💓'
      ],
      party: [
        '🎉',
        '🎊🎉',
        '🎊🎉🎈',
        '🎊🎉🎈🎁',
        '🎊🎉🎈🎁🎂',
        '🥳🎊🎉🎈🎁🎂',
        '🥳🎊🎉🎈🎁',
        '🥳🎊🎉🎈',
        '🥳🎊🎉',
        '🥳🎊',
        '🥳',
        '✨🎉✨'
      ],
      rain: [
        '🌤️',
        '⛅',
        '🌥️',
        '☁️',
        '🌦️',
        '🌧️',
        '⛈️',
        '🌩️',
        '🌨️',
        '❄️',
        '☃️',
        '🌈'
      ],
      wave: [
        '〰️',
        '〰️〰️',
        '〰️〰️〰️',
        '〰️〰️〰️〰️',
        '🌊〰️〰️〰️〰️',
        '🌊🌊〰️〰️〰️',
        '🌊🌊🌊〰️〰️',
        '🌊🌊🌊🌊〰️',
        '🌊🌊🌊🌊🌊',
        '🌊🌊🌊🌊',
        '🌊🌊🌊',
        '🌊🌊',
        '🌊'
      ],
      stars: [
        '⭐',
        '⭐✨',
        '⭐✨🌟',
        '⭐✨🌟💫',
        '⭐✨🌟💫⚡',
        '🌟💫⚡✨⭐💥',
        '💫⚡✨⭐',
        '⚡✨⭐',
        '✨⭐',
        '⭐',
        '💥'
      ],
      loading: [
        '▱▱▱▱▱▱▱▱▱▱ 0%',
        '▰▱▱▱▱▱▱▱▱▱ 10%',
        '▰▰▱▱▱▱▱▱▱▱ 20%',
        '▰▰▰▱▱▱▱▱▱▱ 30%',
        '▰▰▰▰▱▱▱▱▱▱ 40%',
        '▰▰▰▰▰▱▱▱▱▱ 50%',
        '▰▰▰▰▰▰▱▱▱▱ 60%',
        '▰▰▰▰▰▰▰▱▱▱ 70%',
        '▰▰▰▰▰▰▰▰▱▱ 80%',
        '▰▰▰▰▰▰▰▰▰▱ 90%',
        '▰▰▰▰▰▰▰▰▰▰ 100% ✅'
      ],
      love: [
        '💔',
        '❤️',
        '❤️‍🩹',
        '❤️',
        '💗',
        '💓',
        '💖',
        '💝',
        '💞',
        '💕',
        '🥰'
      ],
      hype: [
        '😐',
        '🙂',
        '😊',
        '😄',
        '😁',
        '🤩',
        '🔥',
        '🔥🔥',
        '🔥🔥🔥',
        '💥🔥💥',
        '🚀🔥🚀'
      ],
      skull: [
        '😐',
        '😑',
        '😶',
        '💀',
        '☠️',
        '💀',
        '☠️',
        '💀☠️',
        '☠️💀☠️',
        '💀☠️💀'
      ],
      cool: [
        '🧊',
        '🧊❄️',
        '🧊❄️🌬️',
        '😎🧊❄️🌬️',
        '😎😎🧊❄️🌬️',
        '😎😎😎🧊❄️',
        '😎😎😎',
        '😎😎',
        '😎',
        '🕶️'
      ],
      matrix: [
        '⬛⬛⬛⬛⬛',
        '🟩⬛⬛⬛⬛',
        '⬛🟩⬛⬛⬛',
        '⬛⬛🟩⬛⬛',
        '⬛⬛⬛🟩⬛',
        '⬛⬛⬛⬛🟩',
        '⬛⬛⬛🟩⬛',
        '⬛⬛🟩⬛⬛',
        '⬛🟩⬛⬛⬛',
        '🟩⬛⬛⬛⬛',
        '🟩🟩🟩🟩🟩'
      ]
    };

    const allTypes = Object.keys(animations);
    const chosen = animations[type] || animations[allTypes[Math.floor(Math.random() * allTypes.length)]];

    if (type === 'list') {
      return await reply(`🎭 *Available Emoji Animations:*\n\n${allTypes.map(t => `• .emoji ${t}`).join('\n')}`);
    }

    // Send first frame
    const sent = await sock.sendMessage(from, { text: chosen[0] }, { quoted: msg });

    // Animate by editing
    for (let i = 1; i < chosen.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      try {
        await sock.sendMessage(from, {
          text: chosen[i],
          edit: sent.key
        });
      } catch (e) {
        // If edit fails, send new message
        await sock.sendMessage(from, { text: chosen[i] });
      }
    }
  }
};
