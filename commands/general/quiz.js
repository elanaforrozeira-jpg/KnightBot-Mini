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

// ── QUESTION IMAGE — white, sharp (2x scale), clean ───────────────────────────
async function generateQuestionImage(q, qNum) {
  let createCanvas;
  try { ({ createCanvas } = require('canvas')); } catch { return null; }

  // Draw at 2x for sharpness, then we send the full buffer (WhatsApp downscales)
  const SCALE  = 2;
  const W      = 820;   // logical width
  const PAD    = 48;
  const DW     = W * SCALE;
  const DPAD   = PAD * SCALE;

  // Measure at 1x first to calc height
  const probe  = createCanvas(DW, 100).getContext('2d');
  probe.scale(SCALE, SCALE);
  probe.font   = 'bold 22px "Arial"';
  const qLines = wrapText(probe, q.question, W - PAD * 2);

  const HEADER_H  = 64;
  const Q_LINE_H  = 34;
  const Q_H       = qLines.length * Q_LINE_H;
  const FOOTER_H  = 52;
  const INNER_PAD = 32; // space above + below question text
  const H = HEADER_H + INNER_PAD + Q_H + INNER_PAD + FOOTER_H;
  const DH = H * SCALE;

  const cv  = createCanvas(DW, DH);
  const ctx = cv.getContext('2d');
  ctx.scale(SCALE, SCALE);  // all drawing coords are now logical

  // ─ White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // ─ Top color bar (accent)
  ctx.fillStyle = '#5B5FE8';
  ctx.fillRect(0, 0, W, 5);

  // ─ Header row
  ctx.fillStyle = '#F8F9FF';
  ctx.fillRect(0, 5, W, HEADER_H);

  // Thin bottom border on header
  ctx.fillStyle = '#E8EAF6';
  ctx.fillRect(0, 5 + HEADER_H - 1, W, 1);

  // Header: left — Q badge + chapter
  // Q badge
  ctx.fillStyle = '#5B5FE8';
  roundRect(ctx, PAD, 20, 54, 26, 13); ctx.fill();
  ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText('Q ' + qNum, PAD + 27, 37);
  ctx.textAlign = 'left';

  // Chapter (if present)
  if (q.chapter) {
    const tag = q.chapter.length > 32 ? q.chapter.slice(0,29)+'\u2026' : q.chapter;
    ctx.font = '14px Arial'; ctx.fillStyle = '#5B5FE8';
    ctx.fillText(tag, PAD + 64, 37);
  }

  // Header: right — year
  if (q.year) {
    ctx.font = '13px Arial'; ctx.fillStyle = '#888';
    ctx.textAlign = 'right';
    ctx.fillText(q.year, W - PAD, 37);
    ctx.textAlign = 'left';
  }

  // ─ Question text area
  ctx.font = 'bold 22px Arial'; ctx.fillStyle = '#1A1A2E';
  let y = 5 + HEADER_H + INNER_PAD + Q_LINE_H - 6;
  for (const line of qLines) {
    ctx.fillText(line, PAD, y);
    y += Q_LINE_H;
  }

  // ─ Footer
  const fy = H - FOOTER_H;
  ctx.fillStyle = '#F8F9FF';
  ctx.fillRect(0, fy, W, FOOTER_H);
  ctx.fillStyle = '#E8EAF6';
  ctx.fillRect(0, fy, W, 1);

  // Footer left: timer hint
  ctx.font = '13px Arial'; ctx.fillStyle = '#9BA3B8';
  ctx.fillText('\u23f0 ' + TIMEOUT_SEC + 's  \u2022  Poll mein vote karo', PAD, fy + 32);

  // Footer right: Courier Well (small, subtle)
  ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#5B5FE8';
  ctx.textAlign = 'right';
  ctx.fillText('COURIER WELL', W - PAD, fy + 24);
  ctx.font = '10px Arial'; ctx.fillStyle = '#B0B8CC';
  ctx.fillText('Education Platform', W - PAD, fy + 38);
  ctx.textAlign = 'left';

  // ─ Bottom accent line
  ctx.fillStyle = '#5B5FE8';
  ctx.fillRect(0, H - 4, W, 4);

  return cv.toBuffer('image/png');
}

// ── Text solution formatter ──────────────────────────────────────────────────────
function formatSolution(q, qNum, isCorrect, chosenIdx) {
  const L = ['A','B','C','D'];
  const lines = [];

  lines.push(isCorrect ? '\u2705 *Sahi Jawab!*' : '\u274c *Galat Jawab!*');
  lines.push('');
  if (!isCorrect && chosenIdx !== undefined) {
    lines.push(`\u2717 Tumne choose kiya: *${L[chosenIdx]}. ${q.options[chosenIdx]}*`);
  }
  lines.push(`\u2713 *Correct Answer: ${L[q.ans]}. ${q.options[q.ans]}*`);

  if (q.explanation) {
    lines.push('');
    lines.push('\ud83d\udca1 *Solution:*');
    lines.push(q.explanation);
  }

  lines.push('');
  lines.push('_Next question 8 seconds mein aayega..._');
  lines.push('_\u00a9 Courier Well \u2014 Education Platform_');

  return lines.join('\n');
}

// ── Send Quiz Round ───────────────────────────────────────────────────────────
async function sendQuiz(sock, jid, quotedMsg) {
  const questions = loadQuestions();
  if (!questions.length) {
    await sock.sendMessage(jid, { text: '\ud83d\udeab Quiz data nahi mila! Owner se .scrape chalwao.' });
    return;
  }

  if (!qCounters[jid]) qCounters[jid] = 0;
  qCounters[jid]++;
  const qNum   = qCounters[jid];
  const q      = randItem(questions);
  const LABELS = ['A','B','C','D'];
  const sendOpts = quotedMsg ? { quoted: quotedMsg } : {};

  // 1\ufe0f\u20e3 Question image
  let imgBuf = null;
  try { imgBuf = await generateQuestionImage(q, qNum); } catch (e) { console.error('IMG ERR:', e.message); }

  if (imgBuf) {
    await sock.sendMessage(jid, {
      image:    imgBuf,
      mimetype: 'image/png',
      caption:  ''
    }, sendOpts);
  } else {
    // text fallback
    await sock.sendMessage(jid, {
      text:
        `\ud83e\udde0 *Q${qNum}. ${q.question}*\n\n` +
        q.options.map((o,i) => `${LABELS[i]}. ${o}`).join('\n') +
        `\n\n\u23f0 ${TIMEOUT_SEC}s\n_\u00a9 Courier Well_`
    }, sendOpts);
  }

  // 2\ufe0f\u20e3 Poll — ONLY options (A/B/C/D), no question in poll name
  try {
    await sock.sendMessage(jid, {
      poll: {
        name:            `Q${qNum} \u2014 Correct option choose karo:`,
        values:          q.options.map((o, i) => `${LABELS[i]}.  ${o.slice(0, 100)}`),
        selectableCount: 1,
      }
    });
  } catch {}

  // 3\ufe0f\u20e3 Auto timeout
  const timer = setTimeout(async () => {
    if (!activeSessions[jid]) return;
    const session = activeSessions[jid];
    delete activeSessions[jid]; delete answeredMap[jid];

    await sock.sendMessage(jid, {
      text: formatSolution(session.q, session.qNum, false, undefined)
        .replace('\u274c *Galat Jawab!*', '\u23f0 *Time Up!*')
    });
    setTimeout(() => sendQuiz(sock, jid, null), AUTO_DELAY);
  }, TIMEOUT_MS);

  answeredMap[jid]    = new Set();
  activeSessions[jid] = { q, timer, qNum };
}

// ── Module ───────────────────────────────────────────────────────────────────────────
module.exports = {
  name: 'quiz', aliases: ['q','mcq'],
  description: 'MHT-CET Quiz \u2014 Sharp Image + Poll + Auto Next',
  category: 'general',
  usage: '.quiz | .quiz ans A | .quiz score | .quiz top | .quiz stop',

  async execute(sock, msg, args) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const sub    = (args[0]||'').toLowerCase();
    const LABELS = ['A','B','C','D'];

    // score
    if (sub === 'score') {
      const s = loadScores()[sender] || { correct:0, wrong:0, total:0 };
      const acc = s.total ? Math.round(s.correct/s.total*100) : 0;
      return sock.sendMessage(jid, {
        text:
          `\ud83d\udcca *Your Quiz Score*\n\n` +
          `\u2705 Correct : ${s.correct}\n` +
          `\u274c Wrong   : ${s.wrong}\n` +
          `\ud83d\udcdd Total   : ${s.total}\n` +
          `\ud83c\udfaf Accuracy: ${acc}%\n\n` +
          `_\u00a9 Courier Well \u2014 Education Platform_`
      }, { quoted: msg });
    }

    // top
    if (sub === 'top') {
      const sorted = Object.entries(loadScores())
        .sort((a,b) => b[1].correct - a[1].correct).slice(0,10);
      if (!sorted.length)
        return sock.sendMessage(jid, { text: '\ud83d\udeab Koi score nahi abhi!' }, { quoted: msg });
      const medals = ['\ud83e\udd47','\ud83e\udd48','\ud83e\udd49'];
      return sock.sendMessage(jid, {
        text:
          `\ud83c\udfc6 *Leaderboard*\n\n` +
          sorted.map(([id,s],i) =>
            `${medals[i]||i+1+'.'} @${id.split('@')[0]} \u2014 \u2705 ${s.correct}`
          ).join('\n') +
          `\n\n_\u00a9 Courier Well \u2014 Education Platform_`,
        mentions: sorted.map(([id])=>id)
      }, { quoted: msg });
    }

    // stop
    if (sub === 'stop') {
      if (!activeSessions[jid])
        return sock.sendMessage(jid, { text: '\u2753 Koi active quiz nahi.' }, { quoted: msg });
      clearTimeout(activeSessions[jid].timer);
      delete activeSessions[jid]; delete answeredMap[jid];
      return sock.sendMessage(jid, {
        text: '\u26d4 Quiz band!\n_\u00a9 Courier Well \u2014 Education Platform_'
      }, { quoted: msg });
    }

    // ans
    if (sub === 'ans') {
      const session = activeSessions[jid];
      if (!session)
        return sock.sendMessage(jid,
          { text: '\u2753 Koi active quiz nahi! .quiz se shuru karo.' }, { quoted: msg });
      if (answeredMap[jid]?.has(sender))
        return sock.sendMessage(jid,
          { text: '\u26a0\ufe0f Pehle hi jawab de diya!' }, { quoted: msg });

      const lm = { a:0,b:1,c:2,d:3,'1':0,'2':1,'3':2,'4':3 };
      const chosen = lm[(args[1]||'').toLowerCase()];
      if (chosen === undefined)
        return sock.sendMessage(jid,
          { text: '\u26a0\ufe0f A/B/C/D bhejo. Example: .quiz ans B' }, { quoted: msg });

      answeredMap[jid].add(sender);
      clearTimeout(session.timer);
      const { q, qNum } = session;
      delete activeSessions[jid]; delete answeredMap[jid];

      const scores = loadScores();
      if (!scores[sender]) scores[sender] = { correct:0, wrong:0, total:0 };
      scores[sender].total++;
      const ok = chosen === q.ans;
      if (ok) scores[sender].correct++; else scores[sender].wrong++;
      saveScores(scores);

      await sock.sendMessage(jid, {
        text: formatSolution(q, qNum, ok, ok ? undefined : chosen) +
          `\n\n*Score: \u2705${scores[sender].correct} | \u274c${scores[sender].wrong}*`
      }, { quoted: msg });

      setTimeout(() => sendQuiz(sock, jid, null), AUTO_DELAY);
      return;
    }

    // start
    if (activeSessions[jid])
      return sock.sendMessage(jid, {
        text: '\u26a0\ufe0f Quiz chal raha hai!\n.quiz ans A/B/C/D bhejo ya .quiz stop karo.'
      }, { quoted: msg });

    await sendQuiz(sock, jid, msg);
  }
};
