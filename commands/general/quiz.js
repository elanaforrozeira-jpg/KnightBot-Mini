/**
 * 🧠 QUIZ COMMAND
 * .quiz        → random question
 * .quiz ans 2  → answer submit
 * .quiz score  → apna score dekho
 * .quiz top    → leaderboard
 * .quiz stop   → quiz band karo
 *
 * Made by Ruhvaan ❤️
 */

const fs   = require('fs');
const path = require('path');

// ─── Promo Image URL (change kar sakte ho) ───────────────────────────────────
const PROMO_IMAGE = process.env.QUIZ_PROMO_IMAGE ||
  'https://i.imgur.com/4M7IWwP.jpeg'; // Default: study-themed banner
// ─────────────────────────────────────────────────────────────────────────────

const DATA_FILE  = path.join(__dirname, '../../marks_quiz.json');
const SCORE_FILE = path.join(__dirname, '../../quiz_scores.json');

// Active quiz sessions: { jid: { q, ans, timer, msgId } }
const activeSessions = {};

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadQuestions() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : (raw.questions || []);
  } catch { return []; }
}

function loadScores() {
  if (!fs.existsSync(SCORE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(SCORE_FILE, 'utf8')); }
  catch { return {}; }
}

function saveScores(scores) {
  fs.writeFileSync(SCORE_FILE, JSON.stringify(scores, null, 2), 'utf8');
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function optionLabel(i) {
  return ['🅐', '🅑', '🅒', '🅓'][i] || `(${i + 1})`;
}

function formatQuestion(q, idx, total) {
  const labels = ['A', 'B', 'C', 'D'];
  const opts = q.options.map((o, i) =>
    `  ${labels[i]}. ${o}`
  ).join('\n');

  return (
    `╔══════════════════════╗\n` +
    `║  🧠 *MHT-CET QUIZ*   ║\n` +
    `╚══════════════════════╝\n\n` +
    `📚 *${q.chapter || 'Mathematics'}*\n` +
    `${q.year ? `🗓️ ${q.year}` : ''}\n\n` +
    `*Q. ${q.question}*\n\n` +
    `${opts}\n\n` +
    `Reply: *.quiz ans A/B/C/D*\n` +
    `⏰ 30 seconds!\n\n` +
    `_Made by Ruhvaan_ ✨`
  );
}

function formatPromoCaption(q) {
  const labels = ['A', 'B', 'C', 'D'];
  const opts = q.options.map((o, i) =>
    `  ${labels[i]}. ${o}`
  ).join('\n');

  return (
    `╔══════════════════════╗\n` +
    `║  🧠 *MHT-CET QUIZ*   ║\n` +
    `╚══════════════════════╝\n\n` +
    `📚 *${q.chapter || 'Mathematics'}*\n` +
    `${q.year ? `🗓️ ${q.year}` : ''}\n\n` +
    `*Q. ${q.question}*\n\n` +
    `${opts}\n\n` +
    `Reply: *.quiz ans A/B/C/D*\n` +
    `⏰ 30 seconds!\n\n` +
    `_Made by Ruhvaan_ ✨`
  );
}
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  name: 'quiz',
  aliases: ['q', 'mcq'],
  description: 'MHT-CET / JEE MCQ Quiz',
  category: 'general',
  usage: '.quiz | .quiz ans A | .quiz score | .quiz top | .quiz stop',

  async execute(sock, msg, args) {
    const jid      = msg.key.remoteJid;
    const sender   = msg.key.participant || msg.key.remoteJid;
    const sub      = (args[0] || '').toLowerCase();

    // ── .quiz score ──────────────────────────────────────────────────────────
    if (sub === 'score') {
      const scores = loadScores();
      const myScore = scores[sender] || { correct: 0, wrong: 0, total: 0 };
      await sock.sendMessage(jid, {
        text:
          `📊 *Your Quiz Score*\n\n` +
          `✅ Correct : ${myScore.correct}\n` +
          `❌ Wrong   : ${myScore.wrong}\n` +
          `📝 Total   : ${myScore.total}\n` +
          `🎯 Accuracy: ${myScore.total ? Math.round(myScore.correct / myScore.total * 100) : 0}%\n\n` +
          `_Made by Ruhvaan_ ✨`
      }, { quoted: msg });
      return;
    }

    // ── .quiz top ────────────────────────────────────────────────────────────
    if (sub === 'top') {
      const scores = loadScores();
      const sorted = Object.entries(scores)
        .sort((a, b) => b[1].correct - a[1].correct)
        .slice(0, 10);
      if (!sorted.length) {
        await sock.sendMessage(jid, { text: '📭 Abhi koi score nahi hai!' }, { quoted: msg });
        return;
      }
      const medals = ['🥇', '🥈', '🥉'];
      const board  = sorted.map(([id, s], i) =>
        `${medals[i] || `${i + 1}.`} @${id.split('@')[0]} — ✅ ${s.correct} correct`
      ).join('\n');
      await sock.sendMessage(jid, {
        text: `🏆 *Quiz Leaderboard*\n\n${board}\n\n_Made by Ruhvaan_ ✨`,
        mentions: sorted.map(([id]) => id)
      }, { quoted: msg });
      return;
    }

    // ── .quiz stop ───────────────────────────────────────────────────────────
    if (sub === 'stop') {
      if (activeSessions[jid]) {
        clearTimeout(activeSessions[jid].timer);
        delete activeSessions[jid];
        await sock.sendMessage(jid, { text: '⛔ Quiz band kar diya!' }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: '❓ Koi active quiz nahi hai.' }, { quoted: msg });
      }
      return;
    }

    // ── .quiz ans X ──────────────────────────────────────────────────────────
    if (sub === 'ans') {
      const session = activeSessions[jid];
      if (!session) {
        await sock.sendMessage(jid, {
          text: '❓ Koi active quiz nahi!\n*.quiz* se shuru karo.'
        }, { quoted: msg });
        return;
      }

      const labelMap = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
      const input    = (args[1] || '').toLowerCase();
      const chosen   = labelMap[input];

      if (chosen === undefined) {
        await sock.sendMessage(jid, {
          text: '❗ A, B, C ya D mein se ek bhejo!\nExample: *.quiz ans B*'
        }, { quoted: msg });
        return;
      }

      clearTimeout(session.timer);
      const q      = session.q;
      const scores = loadScores();
      if (!scores[sender]) scores[sender] = { correct: 0, wrong: 0, total: 0 };
      scores[sender].total++;

      const labels = ['A', 'B', 'C', 'D'];
      const correctLabel = labels[q.ans];
      const chosenLabel  = labels[chosen];

      if (chosen === q.ans) {
        scores[sender].correct++;
        saveScores(scores);
        delete activeSessions[jid];
        await sock.sendMessage(jid, {
          text:
            `✅ *Sahi Jawab!* 🎉\n\n` +
            `Answer: *${correctLabel}. ${q.options[q.ans]}*\n\n` +
            `${q.explanation ? `💡 *Solution:*\n${q.explanation.slice(0, 300)}\n\n` : ''}` +
            `Score: ✅ ${scores[sender].correct} | ❌ ${scores[sender].wrong}\n\n` +
            `_Made by Ruhvaan_ ✨`
        }, { quoted: msg });
      } else {
        scores[sender].wrong++;
        saveScores(scores);
        delete activeSessions[jid];
        await sock.sendMessage(jid, {
          text:
            `❌ *Galat Jawab!*\n\n` +
            `Tumne choose kiya: *${chosenLabel}. ${q.options[chosen]}*\n` +
            `Sahi Answer: *${correctLabel}. ${q.options[q.ans]}*\n\n` +
            `${q.explanation ? `💡 *Solution:*\n${q.explanation.slice(0, 300)}\n\n` : ''}` +
            `Score: ✅ ${scores[sender].correct} | ❌ ${scores[sender].wrong}\n\n` +
            `_Made by Ruhvaan_ ✨`
        }, { quoted: msg });
      }
      return;
    }

    // ── .quiz (new question) ─────────────────────────────────────────────────
    if (activeSessions[jid]) {
      await sock.sendMessage(jid, {
        text: '⚠️ Pehle wala quiz abhi chal raha hai!\n*.quiz ans A/B/C/D* se jawab do ya *.quiz stop* karo.'
      }, { quoted: msg });
      return;
    }

    const questions = loadQuestions();
    if (!questions.length) {
      await sock.sendMessage(jid, {
        text: '📭 Quiz data nahi mila!\nOwner se *.scrape* chalwao.'
      }, { quoted: msg });
      return;
    }

    const q = randItem(questions);

    // Send with promo image
    let sent;
    try {
      sent = await sock.sendMessage(jid, {
        image:    { url: PROMO_IMAGE },
        caption:  formatPromoCaption(q),
        mimetype: 'image/jpeg'
      }, { quoted: msg });
    } catch (e) {
      // Image fail hone pe fallback to text
      sent = await sock.sendMessage(jid, {
        text: formatQuestion(q)
      }, { quoted: msg });
    }

    // 30-second auto timeout
    const timer = setTimeout(async () => {
      if (!activeSessions[jid]) return;
      delete activeSessions[jid];
      const labels = ['A', 'B', 'C', 'D'];
      await sock.sendMessage(jid, {
        text:
          `⏰ *Time Up!*\n\n` +
          `Sahi Answer tha: *${labels[q.ans]}. ${q.options[q.ans]}*\n\n` +
          `${q.explanation ? `💡 *Solution:*\n${q.explanation.slice(0, 200)}\n\n` : ''}` +
          `New question ke liye *.quiz* bhejo\n\n` +
          `_Made by Ruhvaan_ ✨`
      });
    }, 30000);

    activeSessions[jid] = { q, timer, msgId: sent?.key?.id };
  }
};
