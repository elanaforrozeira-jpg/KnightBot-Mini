/**
 * Truth or Dare Command
 */

const truths = [
  "What is your biggest fear?",
  "Who was your first crush?",
  "What's the most embarrassing thing you've done?",
  "Have you ever lied to your best friend?",
  "What's your biggest regret?",
  "Have you ever cheated in an exam?",
  "What's the most childish thing you still do?",
  "Who in this group do you find most annoying?",
  "Have you ever stolen anything?",
  "What's your most embarrassing memory?",
  "Have you ever cried during a movie?",
  "What's the longest you've gone without bathing?",
  "Have you ever pretended to be sick to skip school/work?",
  "What's the most expensive thing you've broken?",
  "Do you pick your nose in private?",
  "What's a secret you've never told anyone?",
  "Have you ever been rejected by your crush?",
  "What's the weirdest thing you've Googled?",
  "Have you ever eavesdropped on a conversation?",
  "What's the dumbest thing you've ever done?"
];

const dares = [
  "Send a voice note singing any song!",
  "Change your profile picture to a funny meme for 1 hour.",
  "Send a selfie with a silly face.",
  "Text 'I love you' to the 3rd person in your contacts.",
  "Do 15 push-ups and send a video.",
  "Let someone in the group write your status for 24 hours.",
  "Send a voice note saying 'I am a potato' 5 times.",
  "Call someone random and sing Happy Birthday.",
  "Go outside and shout your name loudly.",
  "Change your name in this group for 30 minutes.",
  "Send a photo of your shoes right now.",
  "Send a voicenote in an accent of your choice.",
  "Do your best impression of someone in this group.",
  "Send the 5th photo in your gallery.",
  "Describe yourself in 3 emojis only.",
  "Tell a 30-second joke.",
  "Write a short poem about this group.",
  "Send your most used emoji 50 times.",
  "Share your honest opinion about the last person who texted you.",
  "Do a handstand (or attempt one) and send a photo."
];

module.exports = [
  {
    name: 'truth',
    aliases: ['t'],
    category: 'fun',
    description: 'Get a random truth question',
    usage: '.truth',
    async execute(sock, msg, args, { from }) {
      const q = truths[Math.floor(Math.random() * truths.length)];
      await sock.sendMessage(from, {
        text: `🤔 *TRUTH*\n\n❓ ${q}\n\n_Answer honestly... or take a dare! (.dare)_`
      }, { quoted: msg });
    }
  },
  {
    name: 'dare',
    aliases: ['d'],
    category: 'fun',
    description: 'Get a random dare',
    usage: '.dare',
    async execute(sock, msg, args, { from }) {
      const d = dares[Math.floor(Math.random() * dares.length)];
      await sock.sendMessage(from, {
        text: `😈 *DARE*\n\n🎯 ${d}\n\n_Complete this dare or answer a truth! (.truth)_`
      }, { quoted: msg });
    }
  },
  {
    name: 'tod',
    aliases: ['truthordare', 'tandد'],
    category: 'fun',
    description: 'Random Truth or Dare',
    usage: '.tod',
    async execute(sock, msg, args, { from }) {
      const isTruth = Math.random() > 0.5;
      if (isTruth) {
        const q = truths[Math.floor(Math.random() * truths.length)];
        await sock.sendMessage(from, {
          text: `🎲 *Random: TRUTH!*\n\n❓ ${q}`
        }, { quoted: msg });
      } else {
        const d = dares[Math.floor(Math.random() * dares.length)];
        await sock.sendMessage(from, {
          text: `🎲 *Random: DARE!*\n\n🎯 ${d}`
        }, { quoted: msg });
      }
    }
  }
];
