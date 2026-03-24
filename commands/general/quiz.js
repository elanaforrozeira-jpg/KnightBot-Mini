/**
 * 🧠 QUIZ COMMAND — Dynamic Image Card
 * .quiz        → image card with question
 * .quiz ans A  → answer submit
 * .quiz score  → apna score
 * .quiz top    → leaderboard
 * .quiz stop   → quiz band karo
 *
 * Made by Ruhvaan ❤️
 */

const fs   = require('fs');
const path = require('path');

const DATA_FILE  = path.join(__dirname, '../../marks_quiz.json');
const SCORE_FILE = path.join(__dirname, '../../quiz_scores.json');

// Active quiz sessions per chat
const activeSessions = {};

// ── Helpers ──────────────────────────────────────────────────────────────
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

// ── Word-wrap helper for canvas ───────────────────────────────────────────
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

// ── Generate Quiz Image ───────────────────────────────────────────────────
async function generateQuizImage(q) {
  let canvas, createCanvas;
  try {
    ({ createCanvas } = require('canvas'));
  } catch {
    return null; // canvas not available → fallback to text
  }

  const W = 800;
  const LABELS = ['A', 'B', 'C', 'D'];
  const COLORS = {
    bg:         '#0D0D1A',
    header:     '#1A1A2E',
    accent:     '#6C63FF',
    accent2:    '#FF6584',
    text:       '#FFFFFF',
    subtext:    '#A0AEC0',
    optBg:      '#16213E',
    optBorder:  '#6C63FF',
    watermark:  '#6C63FF',
  };

  // ── Measure height dynamically ────────────────────────────────────────
  const tmpC  = createCanvas(W, 100);
  const tmpCtx = tmpC.getContext('2d');

  tmpCtx.font = 'bold 22px Arial';
  const qLines = wrapText(tmpCtx, q.question, W - 80);

  tmpCtx.font = '20px Arial';
  const optLines = q.options.map(o => wrapText(tmpCtx, o, W - 130));

  const HEADER_H   = 70;
  const YEAR_H     = 35;
  const Q_TOP      = HEADER_H + YEAR_H + 20;
  const Q_H        = qLines.length * 30 + 20;
  const OPT_START  = Q_TOP + Q_H + 10;
  const OPT_PAD    = 18;
  const OPT_LINE_H = 28;

  let optTotalH = 0;
  for (const lines of optLines) {
    optTotalH += OPT_PAD * 2 + lines.length * OPT_LINE_H + 10;
  }

  const FOOTER_H = 50;
  const H = OPT_START + optTotalH + FOOTER_H + 20;

  // ── Draw ─────────────────────────────────────────────────────────────
  const cv  = createCanvas(W, H);
  const ctx = cv.getContext('2d');

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Top gradient strip
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#6C63FF');
  grad.addColorStop(1, '#FF6584');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 6);

  // Header box
  ctx.fillStyle = COLORS.header;
  ctx.fillRect(0, 6, W, HEADER_H);

  // Header icon
  ctx.font = '32px Arial';
  ctx.fillText('🧠', 20, 50);

  // Header title
  ctx.font = 'bold 26px Arial';
  ctx.fillStyle = COLORS.text;
  ctx.fillText('MHT-CET QUIZ', 65, 48);

  // Chapter tag (right side)
  if (q.chapter) {
    const tag = q.chapter.length > 28 ? q.chapter.slice(0, 25) + '...' : q.chapter;
    ctx.font = '14px Arial';
    ctx.fillStyle = COLORS.accent;
    const tw = ctx.measureText(tag).width;
    ctx.fillText(tag, W - tw - 20, 48);
  }

  // Year badge
  if (q.year) {
    ctx.font = '13px Arial';
    ctx.fillStyle = COLORS.accent2;
    ctx.fillText('📅 ' + q.year, 24, HEADER_H + 26);
  }

  // Question
  ctx.font = 'bold 22px Arial';
  ctx.fillStyle = COLORS.text;
  let qY = Q_TOP;
  for (const line of qLines) {
    ctx.fillText(line, 24, qY);
    qY += 30;
  }

  // Options
  ctx.font = '20px Arial';
  let optY = OPT_START;
  const LABEL_COLORS = ['#6C63FF', '#FF6584', '#43D9A2', '#FFD166'];

  for (let i = 0; i < q.options.length; i++) {
    const lines = optLines[i];
    const boxH  = OPT_PAD * 2 + lines.length * OPT_LINE_H;

    // Option box
    ctx.fillStyle = COLORS.optBg;
    roundRect(ctx, 20, optY, W - 40, boxH, 10);
    ctx.fill();

    // Left accent bar
    ctx.fillStyle = LABEL_COLORS[i];
    roundRect(ctx, 20, optY, 6, boxH, 3);
    ctx.fill();

    // Label circle
    ctx.beginPath();
    ctx.arc(52, optY + boxH / 2, 16, 0, Math.PI * 2);
    ctx.fillStyle = LABEL_COLORS[i];
    ctx.fill();

    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText(LABELS[i], 52, optY + boxH / 2 + 6);
    ctx.textAlign = 'left';

    // Option text
    ctx.font = '19px Arial';
    ctx.fillStyle = COLORS.text;
    for (let l = 0; l < lines.length; l++) {
      ctx.fillText(lines[l], 78, optY + OPT_PAD + (l + 1) * OPT_LINE_H - 6);
    }

    optY += boxH + 10;
  }

  // Footer divider
  ctx.fillStyle = '#ffffff22';
  ctx.fillRect(20, H - FOOTER_H, W - 40, 1);

  // Reply hint
  ctx.font = '15px Arial';
  ctx.fillStyle = COLORS.subtext;
  ctx.fillText('Reply: .quiz ans A/B/C/D  •  ⏰ 30 seconds', 24, H - FOOTER_H + 22);

  // Made by Ruhvaan watermark
  ctx.font = 'bold 16px Arial';
  const wm = '✨ Made by Ruhvaan';
  const wmW = ctx.measureText(wm).width;
  ctx.fillStyle = COLORS.watermark;
  ctx.fillText(wm, W - wmW - 20, H - FOOTER_H + 22);

  // Bottom gradient strip
  const grad2 = ctx.createLinearGradient(0, 0, W, 0);
  grad2.addColorStop(0, '#6C63FF');
  grad2.addColorStop(1, '#FF6584');
  ctx.fillStyle = grad2;
  ctx.fillRect(0, H - 5, W, 5);

  return cv.toBuffer('image/png');
}

// Rounded rect helper
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

// ── Fallback text format ──────────────────────────────────────────────────
function formatText(q) {
  const labels = ['A', 'B', 'C', 'D'];
  const opts = q.options.map((o, i) => `  ${labels[i]}. ${o}`).join('\n');
  return (
    `╔══════════════════════╗\n` +
    `║  🧠 *MHT-CET QUIZ*   ║\n` +
    `╚══════════════════════╝\n\n` +
    `📚 *${q.chapter || 'Mathematics'}*\n` +
    `${q.year ? `📅 ${q.year}` : ''}\n\n` +
    `*Q. ${q.question}*\n\n` +
    `${opts}\n\n` +
    `Reply: *.quiz ans A/B/C/D*\n` +
    `⏰ 30 seconds!\n\n` +
    `_✨ Made by Ruhvaan_`
  );
}

// ─────────────────────────────────────────────────────────────────────────
module.exports = {
  name: 'quiz',
  aliases: ['q', 'mcq'],
  description: 'MHT-CET / JEE MCQ Quiz with Image Cards',
  category: 'general',
  usage: '.quiz | .quiz ans A | .quiz score | .quiz top | .quiz stop',

  async execute(sock, msg, args) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const sub    = (args[0] || '').toLowerCase();

    // ── .quiz score ──────────────────────────────────────────────────────
    if (sub === 'score') {
      const scores  = loadScores();
      const mine    = scores[sender] || { correct: 0, wrong: 0, total: 0 };
      const acc     = mine.total ? Math.round(mine.correct / mine.total * 100) : 0;
      await sock.sendMessage(jid, {
        text:
          `📊 *Your Quiz Score*\n\n` +
          `✅ Correct : ${mine.correct}\n` +
          `❌ Wrong   : ${mine.wrong}\n` +
          `📝 Total   : ${mine.total}\n` +
          `🎯 Accuracy: ${acc}%\n\n` +
          `_✨ Made by Ruhvaan_`
      }, { quoted: msg });
      return;
    }

    // ── .quiz top ────────────────────────────────────────────────────────
    if (sub === 'top') {
      const scores = loadScores();
      const sorted = Object.entries(scores)
        .sort((a, b) => b[1].correct - a[1].correct)
        .slice(0, 10);
      if (!sorted.length) {
        await sock.sendMessage(jid, { text: '🚫 Abhi koi score nahi hai!' }, { quoted: msg });
        return;
      }
      const medals = ['🥇', '🥈', '🥉'];
      const board  = sorted.map(([id, s], i) =>
        `${medals[i] || `${i + 1}.`} @${id.split('@')[0]} — ✅ ${s.correct} correct`
      ).join('\n');
      await sock.sendMessage(jid, {
        text: `🏆 *Quiz Leaderboard*\n\n${board}\n\n_✨ Made by Ruhvaan_`,
        mentions: sorted.map(([id]) => id)
      }, { quoted: msg });
      return;
    }

    // ── .quiz stop ───────────────────────────────────────────────────────
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

    // ── .quiz ans X ──────────────────────────────────────────────────────
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

      const LABELS       = ['A', 'B', 'C', 'D'];
      const correctLabel = LABELS[q.ans];
      const chosenLabel  = LABELS[chosen];
      const isCorrect    = chosen === q.ans;

      if (isCorrect) scores[sender].correct++;
      else           scores[sender].wrong++;
      saveScores(scores);
      delete activeSessions[jid];

      const exp = q.explanation ? `💡 *Solution:*\n${q.explanation.slice(0, 350)}\n\n` : '';

      await sock.sendMessage(jid, {
        text: isCorrect
          ? `✅ *Sahi Jawab!* 🎉\n\nAnswer: *${correctLabel}. ${q.options[q.ans]}*\n\n${exp}Score: ✅ ${scores[sender].correct} | ❌ ${scores[sender].wrong}\n\n_✨ Made by Ruhvaan_`
          : `❌ *Galat Jawab!*\n\nTumne: *${chosenLabel}. ${q.options[chosen]}*\nSahi: *${correctLabel}. ${q.options[q.ans]}*\n\n${exp}Score: ✅ ${scores[sender].correct} | ❌ ${scores[sender].wrong}\n\n_✨ Made by Ruhvaan_`
      }, { quoted: msg });
      return;
    }

    // ── .quiz (new question) ─────────────────────────────────────────────
    if (activeSessions[jid]) {
      await sock.sendMessage(jid, {
        text: '⚠️ Pehle wala quiz chal raha hai!\n*.quiz ans A/B/C/D* se jawab do ya *.quiz stop* karo.'
      }, { quoted: msg });
      return;
    }

    const questions = loadQuestions();
    if (!questions.length) {
      await sock.sendMessage(jid, {
        text: '🚫 Quiz data nahi mila!\nOwner se *.scrape* chalwao.'
      }, { quoted: msg });
      return;
    }

    const q = randItem(questions);

    // ── Try canvas image first, fallback to text ──────────────────────
    let sent;
    try {
      const imgBuf = await generateQuizImage(q);
      if (imgBuf) {
        sent = await sock.sendMessage(jid, {
          image:    imgBuf,
          mimetype: 'image/png',
          caption:  `_✨ Made by Ruhvaan_`
        }, { quoted: msg });
      } else {
        throw new Error('canvas unavailable');
      }
    } catch {
      sent = await sock.sendMessage(jid, {
        text: formatText(q)
      }, { quoted: msg });
    }

    // 30 second auto timeout
    const LABELS = ['A', 'B', 'C', 'D'];
    const timer  = setTimeout(async () => {
      if (!activeSessions[jid]) return;
      delete activeSessions[jid];
      await sock.sendMessage(jid, {
        text:
          `⏰ *Time Up!*\n\n` +
          `Sahi Answer tha: *${LABELS[q.ans]}. ${q.options[q.ans]}*\n\n` +
          `${q.explanation ? `💡 *Solution:*\n${q.explanation.slice(0, 250)}\n\n` : ''}` +
          `New question ke liye *.quiz* bhejo\n\n` +
          `_✨ Made by Ruhvaan_`
      });
    }, 30000);

    activeSessions[jid] = { q, timer, msgId: sent?.key?.id };
  }
};
