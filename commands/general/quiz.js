/**
 * QUIZ — Sharp White Image + Poll + Text Solution
 * © Courier Well — Education Platform
 */

const fs   = require('fs');
const path = require('path');

const DATA_FILE  = path.join(__dirname, '../../marks_quiz.json');
const SCORE_FILE = path.join(__dirname, '../../quiz_scores.json');

const activeSessions = {};
const answeredMap    = {};
const qCounters      = {};

const AUTO_DELAY  = 8000;
const TIMEOUT_SEC = 30;
const TIMEOUT_MS  = TIMEOUT_SEC * 1000;

// ── File helpers ───────────────────────────────────────────────────────────
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
function saveScores(s) { fs.writeFileSync(SCORE_FILE, JSON.stringify(s, null, 2)); }
function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Clean raw question text from LaTeX/scraper artifacts ─────────────────────────
// Returns array of lines (for piecewise/multi-line) or single string
function cleanQuestion(raw) {
  let s = raw || '';

  // Remove LaTeX environment markers
  s = s.replace(/\\cc\s*/g, '').replace(/\\cl\s*/g, '').replace(/\\ll\s*/g, '');

  // Split on & delimiter (piecewise function lines)
  // Each & starts a new line
  const parts = s.split(/\s*&\s*/);

  // Clean each part
  const lines = parts
    .map(p => p
      .replace(/\\sqrt\s*/g, '√')         // sqrt
      .replace(/\^\{([^}]+)\}/g, '^($1)')  // ^{...} → ^(...)
      .replace(/\_\{([^}]+)\}/g, '_($1)')  // _{...} → _(...)
      .replace(/_x\s*→/g, 'lim x→')       // limit notation
      .replace(/_x\s*\u2192/g, 'lim x→')
      .replace(/(\s*,\s*x\s*=)/g, ', x =') // spacing
      .replace(/\s+/g, ' ')
      .trim()
    )
    .filter(p => p.length > 0);

  return lines;
}

// ── Canvas helpers ──────────────────────────────────────────────────────────
function wrapText(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

// ── QUESTION IMAGE — white, sharp (2x), question lines displayed properly ───────────
async function generateQuestionImage(q, qNum) {
  let createCanvas;
  try { ({ createCanvas } = require('canvas')); } catch { return null; }

  const SCALE = 2;
  const W     = 820;
  const PAD   = 48;

  // Get cleaned lines
  const qRawLines = cleanQuestion(q.question);

  // Measure wrapped lines at logical size
  const probe = createCanvas(W * SCALE, 100).getContext('2d');
  probe.scale(SCALE, SCALE);
  probe.font  = 'bold 21px Arial';

  // For each raw line, wrap it to fit width, flatten all into display lines
  const displayLines = [];
  for (const rawLine of qRawLines) {
    const wrapped = wrapText(probe, rawLine, W - PAD * 2 - 10);
    displayLines.push(...wrapped);
  }

  const LINE_H   = 34;
  const HEADER_H = 64;
  const TOP_PAD  = 24;
  const BOT_PAD  = 24;
  const FOOTER_H = 52;
  const H = HEADER_H + TOP_PAD + displayLines.length * LINE_H + BOT_PAD + FOOTER_H;

  const cv  = createCanvas(W * SCALE, H * SCALE);
  const ctx = cv.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // White bg
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);

  // Top accent bar
  ctx.fillStyle = '#5B5FE8'; ctx.fillRect(0, 0, W, 5);

  // Header bg
  ctx.fillStyle = '#F4F5FF'; ctx.fillRect(0, 5, W, HEADER_H);
  ctx.fillStyle = '#DDE0F5'; ctx.fillRect(0, 5 + HEADER_H - 1, W, 1);

  // Q-number pill
  ctx.fillStyle = '#5B5FE8';
  roundRect(ctx, PAD, 18, 56, 28, 14); ctx.fill();
  ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center'; ctx.fillText('Q ' + qNum, PAD + 28, 37); ctx.textAlign = 'left';

  // Chapter
  if (q.chapter) {
    const tag = q.chapter.length > 34 ? q.chapter.slice(0, 31) + '…' : q.chapter;
    ctx.font = '14px Arial'; ctx.fillStyle = '#5B5FE8';
    ctx.fillText(tag, PAD + 66, 37);
  }

  // Year (right)
  if (q.year) {
    ctx.font = '12px Arial'; ctx.fillStyle = '#999';
    ctx.textAlign = 'right'; ctx.fillText(q.year, W - PAD, 37); ctx.textAlign = 'left';
  }

  // Question lines
  ctx.font = 'bold 21px Arial'; ctx.fillStyle = '#1A1A2E';
  let y = 5 + HEADER_H + TOP_PAD + LINE_H - 6;
  for (let i = 0; i < displayLines.length; i++) {
    const line = displayLines[i];
    // Indent lines after first (piecewise continuation)
    const isFirst = i === 0;
    const x = isFirst ? PAD : PAD + 24;
    ctx.fillText(line, x, y);
    y += LINE_H;
  }

  // Footer
  const fy = H - FOOTER_H;
  ctx.fillStyle = '#F4F5FF'; ctx.fillRect(0, fy, W, FOOTER_H);
  ctx.fillStyle = '#DDE0F5'; ctx.fillRect(0, fy, W, 1);

  ctx.font = '13px Arial'; ctx.fillStyle = '#9BA3B8';
  ctx.fillText('⏰ ' + TIMEOUT_SEC + 's  •  Neeche poll mein vote karo', PAD, fy + 32);

  ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#5B5FE8';
  ctx.textAlign = 'right'; ctx.fillText('COURIER WELL', W - PAD, fy + 23);
  ctx.font = '10px Arial'; ctx.fillStyle = '#AAB'; ctx.fillText('Education Platform', W - PAD, fy + 37);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#5B5FE8'; ctx.fillRect(0, H - 4, W, 4);

  return cv.toBuffer('image/png');
}

// ── Text solution formatter ──────────────────────────────────────────────────────
function cleanSolution(raw) {
  if (!raw) return 'Solution not available.';
  return raw
    .replace(/\\cc\s*/g, '').replace(/\\cl\s*/g, '').replace(/\\ll\s*/g, '')
    .replace(/\\sqrt\s*/g, '√')
    .replace(/\^\{([^}]+)\}/g, '^($1)')
    .replace(/\_\{([^}]+)\}/g, '_($1)')
    .replace(/_x\s*→/g, 'lim x→')
    .replace(/\s*&\s*/g, '\n  ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatSolution(q, qNum, isCorrect, chosenIdx, score) {
  const L = ['A','B','C','D'];
  const sol = cleanSolution(q.solution);
  const lines = [];

  lines.push(isCorrect ? '✅ *Sahi Jawab!*' : '❌ *Galat Jawab!*');
  lines.push('');
  if (!isCorrect && chosenIdx !== undefined) {
    lines.push(`✗ Tumne choose kiya: *${L[chosenIdx]}. ${q.options[chosenIdx]}*`);
  }
  lines.push(`✓ *Correct Answer: ${L[q.correct_idx ?? q.ans ?? 0]}. ${q.options[q.correct_idx ?? q.ans ?? 0]}*`);
  if (score) lines.push(`🎯 Score: ✅${score.correct} | ❌${score.wrong}`);
  lines.push('');
  lines.push('💡 *Solution:*');
  lines.push(sol);
  lines.push('');
  lines.push('_Next question 8 seconds mein aayega..._');
  lines.push('_© Courier Well — Education Platform_');

  return lines.join('\n');
}

// ── Send Quiz Round ───────────────────────────────────────────────────────────
async function sendQuiz(sock, jid, quotedMsg) {
  const questions = loadQuestions();
  if (!questions.length) {
    await sock.sendMessage(jid, { text: '🚫 Quiz data nahi mila!' });
    return;
  }

  if (!qCounters[jid]) qCounters[jid] = 0;
  qCounters[jid]++;
  const qNum   = qCounters[jid];
  const q      = randItem(questions);
  const LABELS = ['A','B','C','D'];
  const sendOpts = quotedMsg ? { quoted: quotedMsg } : {};

  // 1️⃣ Question image
  let imgBuf = null;
  try { imgBuf = await generateQuestionImage(q, qNum); } catch (e) { console.error('IMG:', e.message); }

  if (imgBuf) {
    await sock.sendMessage(jid, { image: imgBuf, mimetype: 'image/png', caption: '' }, sendOpts);
  } else {
    const cleanLines = cleanQuestion(q.question);
    await sock.sendMessage(jid, {
      text:
        `🧠 *Q${qNum}.*\n${cleanLines.join('\n')}\n\n` +
        q.options.map((o,i) => `${LABELS[i]}. ${o}`).join('\n') +
        `\n\n⏰ ${TIMEOUT_SEC}s\n_© Courier Well_`
    }, sendOpts);
  }

  // 2️⃣ Poll — only A/B/C/D options
  try {
    await sock.sendMessage(jid, {
      poll: {
        name:            `Q${qNum} — Sahi option choose karo:`,
        values:          q.options.map((o, i) => `${LABELS[i]}.  ${String(o).slice(0, 100)}`),
        selectableCount: 1,
      }
    });
  } catch {}

  // 3️⃣ Auto timeout
  const timer = setTimeout(async () => {
    if (!activeSessions[jid]) return;
    const session = activeSessions[jid];
    delete activeSessions[jid]; delete answeredMap[jid];
    await sock.sendMessage(jid, {
      text: '⏰ *Time Up!*\n\n' + formatSolution(session.q, session.qNum, false, undefined, null)
        .replace('❌ *Galat Jawab!*\n', '')
    });
    setTimeout(() => sendQuiz(sock, jid, null), AUTO_DELAY);
  }, TIMEOUT_MS);

  answeredMap[jid]    = new Set();
  activeSessions[jid] = { q, timer, qNum };
}

// ── Module ───────────────────────────────────────────────────────────────────────────
module.exports = {
  name: 'quiz', aliases: ['q','mcq'],
  description: 'MHT-CET Quiz — Image + Poll + Auto',
  category: 'general',
  usage: '.quiz | .quiz ans A | .quiz score | .quiz top | .quiz stop',

  async execute(sock, msg, args) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const sub    = (args[0]||'').toLowerCase();
    const LABELS = ['A','B','C','D'];

    if (sub === 'score') {
      const s = loadScores()[sender] || { correct:0, wrong:0, total:0 };
      const acc = s.total ? Math.round(s.correct/s.total*100) : 0;
      return sock.sendMessage(jid, {
        text:
          `📊 *Your Quiz Score*\n\n✅ Correct : ${s.correct}\n❌ Wrong   : ${s.wrong}\n📝 Total   : ${s.total}\n🎯 Accuracy: ${acc}%\n\n_© Courier Well — Education Platform_`
      }, { quoted: msg });
    }

    if (sub === 'top') {
      const sorted = Object.entries(loadScores())
        .sort((a,b) => b[1].correct - a[1].correct).slice(0,10);
      if (!sorted.length) return sock.sendMessage(jid, { text: '🚫 Koi score nahi!' }, { quoted: msg });
      const medals = ['🥇','🥈','🥉'];
      return sock.sendMessage(jid, {
        text: `🏆 *Leaderboard*\n\n` +
          sorted.map(([id,s],i) => `${medals[i]||i+1+'.'} @${id.split('@')[0]} — ✅${s.correct}`).join('\n') +
          `\n\n_© Courier Well_`,
        mentions: sorted.map(([id]) => id)
      }, { quoted: msg });
    }

    if (sub === 'stop') {
      if (!activeSessions[jid]) return sock.sendMessage(jid, { text: '❓ Koi active quiz nahi.' }, { quoted: msg });
      clearTimeout(activeSessions[jid].timer);
      delete activeSessions[jid]; delete answeredMap[jid];
      return sock.sendMessage(jid, { text: '⛔ Quiz band!\n_© Courier Well_' }, { quoted: msg });
    }

    if (sub === 'ans') {
      const session = activeSessions[jid];
      if (!session) return sock.sendMessage(jid, { text: '❓ Koi active quiz nahi! .quiz se shuru karo.' }, { quoted: msg });
      if (answeredMap[jid]?.has(sender)) return sock.sendMessage(jid, { text: '⚠️ Pehle hi jawab de diya!' }, { quoted: msg });

      const lm = { a:0,b:1,c:2,d:3,'1':0,'2':1,'3':2,'4':3 };
      const chosen = lm[(args[1]||'').toLowerCase()];
      if (chosen === undefined) return sock.sendMessage(jid, { text: '⚠️ A/B/C/D bhejo. Eg: .quiz ans B' }, { quoted: msg });

      answeredMap[jid].add(sender);
      clearTimeout(session.timer);
      const { q, qNum } = session;
      delete activeSessions[jid]; delete answeredMap[jid];

      const scores = loadScores();
      if (!scores[sender]) scores[sender] = { correct:0, wrong:0, total:0 };
      scores[sender].total++;
      const correctIdx = q.correct_idx ?? q.ans ?? 0;
      const ok = chosen === correctIdx;
      if (ok) scores[sender].correct++; else scores[sender].wrong++;
      saveScores(scores);

      await sock.sendMessage(jid, {
        text: formatSolution(q, qNum, ok, ok ? undefined : chosen, scores[sender])
      }, { quoted: msg });

      setTimeout(() => sendQuiz(sock, jid, null), AUTO_DELAY);
      return;
    }

    if (activeSessions[jid])
      return sock.sendMessage(jid, {
        text: '⚠️ Quiz chal raha hai!\n.quiz ans A/B/C/D bhejo ya .quiz stop karo.'
      }, { quoted: msg });

    await sendQuiz(sock, jid, msg);
  }
};
