/**
 * 🧠 QUIZ COMMAND — Image Card + Poll Options + Auto Next
 * .quiz        → start quiz
 * .quiz score  → apna score
 * .quiz top    → leaderboard
 * .quiz stop   → band karo
 *
 * © Courier Well
 */

const fs   = require('fs');
const path = require('path');

const DATA_FILE  = path.join(__dirname, '../../marks_quiz.json');
const SCORE_FILE = path.join(__dirname, '../../quiz_scores.json');

// Active sessions: { jid: { q, timer, pollMsgId } }
const activeSessions = {};
// Track who answered: { jid: Set(senderIds) }
const answeredMap = {};

const AUTO_DELAY    = 8000;  // 8s baad next question auto
const TIMEOUT_SEC   = 30;
const TIMEOUT_MS    = TIMEOUT_SEC * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function saveScores(s) {
  fs.writeFileSync(SCORE_FILE, JSON.stringify(s, null, 2), 'utf8');
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Word-wrap helper ──────────────────────────────────────────────────────────
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Generate Quiz Image (question only, no options) ───────────────────────────
async function generateQuizImage(q) {
  let createCanvas;
  try { ({ createCanvas } = require('canvas')); }
  catch { return null; }

  const W      = 800;
  const PAD    = 28;
  const COLORS = {
    bg:       '#0D0D1A',
    header:   '#1A1A2E',
    text:     '#FFFFFF',
    subtext:  '#A0AEC0',
    accent:   '#6C63FF',
    accent2:  '#FF6584',
    divider:  '#ffffff22',
  };

  // Measure question height
  const tmp    = createCanvas(W, 100).getContext('2d');
  tmp.font     = 'bold 23px Arial';
  const qLines = wrapText(tmp, 'Q. ' + q.question, W - PAD * 2);

  const HEADER_H = 72;
  const YEAR_H   = 32;
  const Q_H      = qLines.length * 32 + 20;
  const FOOTER_H = 52;
  const H        = HEADER_H + YEAR_H + 16 + Q_H + FOOTER_H + 10;

  const cv  = createCanvas(W, H);
  const ctx = cv.getContext('2d');

  // ── Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // ── Top gradient bar
  const g1 = ctx.createLinearGradient(0, 0, W, 0);
  g1.addColorStop(0, '#6C63FF');
  g1.addColorStop(1, '#FF6584');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, 5);

  // ── Header
  ctx.fillStyle = COLORS.header;
  ctx.fillRect(0, 5, W, HEADER_H);

  ctx.font = '34px Arial';
  ctx.fillText('🧠', PAD, 52);

  ctx.font      = 'bold 28px Arial';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('MHT-CET QUIZ', PAD + 46, 50);

  // Chapter tag right
  if (q.chapter) {
    const tag = q.chapter.length > 26 ? q.chapter.slice(0, 23) + '…' : q.chapter;
    ctx.font      = '14px Arial';
    ctx.fillStyle = COLORS.accent;
    const tw = ctx.measureText(tag).width;
    ctx.fillText(tag, W - tw - PAD, 50);
  }

  // ── Year
  if (q.year) {
    ctx.font      = '14px Arial';
    ctx.fillStyle = COLORS.accent2;
    ctx.fillText('📅 ' + q.year, PAD, HEADER_H + 5 + 20);
  }

  // ── Question text
  ctx.font      = 'bold 23px Arial';
  ctx.fillStyle = COLORS.text;
  let qY = HEADER_H + YEAR_H + 24;
  for (const line of qLines) {
    ctx.fillText(line, PAD, qY);
    qY += 32;
  }

  // ── Divider
  ctx.fillStyle = COLORS.divider;
  ctx.fillRect(PAD, H - FOOTER_H - 2, W - PAD * 2, 1);

  // ── Footer left: poll hint
  ctx.font      = '15px Arial';
  ctx.fillStyle = COLORS.subtext;
  ctx.fillText('Vote karo poll mein  •  ⏰ ' + TIMEOUT_SEC + ' seconds', PAD, H - FOOTER_H + 22);

  // ── Footer right: COURIER WELL branding
  ctx.font      = 'bold 15px Arial';
  const brand   = 'COURIER WELL';
  const sub     = 'Education Platform';
  const bW      = ctx.measureText(brand).width;

  // Small logo circle
  ctx.beginPath();
  ctx.arc(W - PAD - bW - 30, H - FOOTER_H + 16, 11, 0, Math.PI * 2);
  const lg = ctx.createLinearGradient(
    W - PAD - bW - 41, H - FOOTER_H + 5,
    W - PAD - bW - 19, H - FOOTER_H + 27
  );
  lg.addColorStop(0, '#6C63FF');
  lg.addColorStop(1, '#FF6584');
  ctx.fillStyle = lg;
  ctx.fill();

  ctx.font      = 'bold 11px Arial';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('CW', W - PAD - bW - 30, H - FOOTER_H + 20);
  ctx.textAlign = 'left';

  ctx.font      = 'bold 15px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(brand, W - PAD - bW, H - FOOTER_H + 14);

  ctx.font      = '11px Arial';
  ctx.fillStyle = COLORS.accent;
  ctx.fillText(sub, W - PAD - bW, H - FOOTER_H + 28);

  // ── Bottom gradient bar
  const g2 = ctx.createLinearGradient(0, 0, W, 0);
  g2.addColorStop(0, '#6C63FF');
  g2.addColorStop(1, '#FF6584');
  ctx.fillStyle = g2;
  ctx.fillRect(0, H - 5, W, 5);

  return cv.toBuffer('image/png');
}

// ── Text fallback ─────────────────────────────────────────────────────────────
function formatText(q) {
  const L = ['A', 'B', 'C', 'D'];
  return (
    `╔══════════════════════╗\n` +
    `║  🧠 *MHT-CET QUIZ*   ║\n` +
    `╚══════════════════════╝\n\n` +
    `📚 *${q.chapter || 'Mathematics'}*\n` +
    `${q.year ? `📅 ${q.year}` : ''}\n\n` +
    `*Q. ${q.question}*\n\n` +
    q.options.map((o, i) => `  ${L[i]}. ${o}`).join('\n') + '\n\n' +
    `⏰ ${TIMEOUT_SEC} seconds\n\n` +
    `_© Courier Well — Education Platform_`
  );
}

// ── Send one quiz round ───────────────────────────────────────────────────────
async function sendQuiz(sock, jid, quotedMsg) {
  const questions = loadQuestions();
  if (!questions.length) {
    await sock.sendMessage(jid, { text: '🚫 Quiz data nahi mila! Owner se *.scrape* chalwao.' });
    return;
  }

  const q      = randItem(questions);
  const LABELS = ['A', 'B', 'C', 'D'];

  // 1️⃣ Send image card
  let imgBuf = null;
  try { imgBuf = await generateQuizImage(q); } catch {}

  if (imgBuf) {
    await sock.sendMessage(jid, {
      image:    imgBuf,
      mimetype: 'image/png',
      caption:  `📚 *${q.chapter || 'Mathematics'}*${q.year ? `  |  📅 ${q.year}` : ''}\n_© Courier Well — Education Platform_`
    }, quotedMsg ? { quoted: quotedMsg } : {});
  } else {
    await sock.sendMessage(jid, { text: formatText(q) },
      quotedMsg ? { quoted: quotedMsg } : {});
  }

  // 2️⃣ Send WhatsApp Poll for options
  let pollMsg;
  try {
    pollMsg = await sock.sendMessage(jid, {
      poll: {
        name:          `Q. ${q.question.slice(0, 100)}${q.question.length > 100 ? '…' : ''}`,
        values:        q.options.map((o, i) => `${LABELS[i]}. ${o}`),
        selectableCount: 1,
      }
    });
  } catch (e) {
    // Poll failed — send text options
    await sock.sendMessage(jid, {
      text: q.options.map((o, i) => `${LABELS[i]}. ${o}`).join('\n') +
        '\n\nReply: *.quiz ans A/B/C/D*'
    });
  }

  // 3️⃣ Auto timeout
  const timer = setTimeout(async () => {
    if (!activeSessions[jid]) return;
    const session = activeSessions[jid];
    delete activeSessions[jid];
    delete answeredMap[jid];

    await sock.sendMessage(jid, {
      text:
        `⏰ *Time Up!*\n\n` +
        `Sahi Answer: *${LABELS[q.ans]}. ${q.options[q.ans]}*\n\n` +
        `${q.explanation ? `💡 *Solution:*\n${q.explanation.slice(0, 300)}\n\n` : ''}` +
        `_© Courier Well — Education Platform_`
    });

    // Auto next question after 8s
    setTimeout(() => sendQuiz(sock, jid, null), AUTO_DELAY);
  }, TIMEOUT_MS);

  answeredMap[jid]    = new Set();
  activeSessions[jid] = { q, timer, pollMsgId: pollMsg?.key?.id };
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  name:     'quiz',
  aliases:  ['q', 'mcq'],
  description: 'MHT-CET Quiz — Image Card + Poll + Auto Next',
  category: 'general',
  usage:    '.quiz | .quiz ans A | .quiz score | .quiz top | .quiz stop',

  async execute(sock, msg, args) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const sub    = (args[0] || '').toLowerCase();

    // ── .quiz score ───────────────────────────────────────────────────────────
    if (sub === 'score') {
      const scores = loadScores();
      const mine   = scores[sender] || { correct: 0, wrong: 0, total: 0 };
      const acc    = mine.total ? Math.round(mine.correct / mine.total * 100) : 0;
      await sock.sendMessage(jid, {
        text:
          `📊 *Your Quiz Score*\n\n` +
          `✅ Correct : ${mine.correct}\n` +
          `❌ Wrong   : ${mine.wrong}\n` +
          `📝 Total   : ${mine.total}\n` +
          `🎯 Accuracy: ${acc}%\n\n` +
          `_© Courier Well — Education Platform_`
      }, { quoted: msg });
      return;
    }

    // ── .quiz top ─────────────────────────────────────────────────────────────
    if (sub === 'top') {
      const scores = loadScores();
      const sorted = Object.entries(scores)
        .sort((a, b) => b[1].correct - a[1].correct)
        .slice(0, 10);
      if (!sorted.length) {
        await sock.sendMessage(jid, { text: '🚫 Abhi koi score nahi!' }, { quoted: msg });
        return;
      }
      const medals = ['🥇', '🥈', '🥉'];
      const board  = sorted.map(([id, s], i) =>
        `${medals[i] || `${i + 1}.`} @${id.split('@')[0]} — ✅ ${s.correct} correct`
      ).join('\n');
      await sock.sendMessage(jid, {
        text: `🏆 *Quiz Leaderboard*\n\n${board}\n\n_© Courier Well — Education Platform_`,
        mentions: sorted.map(([id]) => id)
      }, { quoted: msg });
      return;
    }

    // ── .quiz stop ────────────────────────────────────────────────────────────
    if (sub === 'stop') {
      if (activeSessions[jid]) {
        clearTimeout(activeSessions[jid].timer);
        delete activeSessions[jid];
        delete answeredMap[jid];
        await sock.sendMessage(jid, {
          text: '⛔ Quiz band kar diya!\n\n_© Courier Well — Education Platform_'
        }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: '❓ Koi active quiz nahi hai.' }, { quoted: msg });
      }
      return;
    }

    // ── .quiz ans A/B/C/D ─────────────────────────────────────────────────────
    if (sub === 'ans') {
      const session = activeSessions[jid];
      if (!session) {
        await sock.sendMessage(jid,
          { text: '❓ Koi active quiz nahi!\n*.quiz* se shuru karo.' },
          { quoted: msg });
        return;
      }

      // Prevent double answer
      if (answeredMap[jid]?.has(sender)) {
        await sock.sendMessage(jid,
          { text: '⚠️ Tumne pehle hi jawab de diya!' },
          { quoted: msg });
        return;
      }

      const labelMap = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
      const chosen   = labelMap[(args[1] || '').toLowerCase()];

      if (chosen === undefined) {
        await sock.sendMessage(jid,
          { text: '⚠️ A, B, C ya D bhejo!\nExample: *.quiz ans B*' },
          { quoted: msg });
        return;
      }

      answeredMap[jid].add(sender);
      clearTimeout(session.timer);
      delete activeSessions[jid];
      delete answeredMap[jid];

      const q      = session.q;
      const LABELS = ['A', 'B', 'C', 'D'];
      const scores = loadScores();
      if (!scores[sender]) scores[sender] = { correct: 0, wrong: 0, total: 0 };
      scores[sender].total++;

      const isCorrect = chosen === q.ans;
      if (isCorrect) scores[sender].correct++;
      else           scores[sender].wrong++;
      saveScores(scores);

      const exp = q.explanation
        ? `💡 *Solution:*\n${q.explanation.slice(0, 350)}\n\n`
        : '';

      await sock.sendMessage(jid, {
        text: isCorrect
          ? `✅ *Sahi Jawab!* 🎉\n\nAnswer: *${LABELS[q.ans]}. ${q.options[q.ans]}*\n\n${exp}Score: ✅ ${scores[sender].correct} | ❌ ${scores[sender].wrong}\n\n_© Courier Well — Education Platform_`
          : `❌ *Galat Jawab!*\n\nTumne: *${LABELS[chosen]}. ${q.options[chosen]}*\nSahi: *${LABELS[q.ans]}. ${q.options[q.ans]}*\n\n${exp}Score: ✅ ${scores[sender].correct} | ❌ ${scores[sender].wrong}\n\n_© Courier Well — Education Platform_`
      }, { quoted: msg });

      // Auto next after 8s
      setTimeout(() => sendQuiz(sock, jid, null), AUTO_DELAY);
      return;
    }

    // ── .quiz (start) ─────────────────────────────────────────────────────────
    if (activeSessions[jid]) {
      await sock.sendMessage(jid, {
        text: '⚠️ Pehle wala quiz chal raha hai!\n*.quiz ans A/B/C/D* se jawab do ya *.quiz stop* karo.'
      }, { quoted: msg });
      return;
    }

    await sendQuiz(sock, jid, msg);
  }
};
