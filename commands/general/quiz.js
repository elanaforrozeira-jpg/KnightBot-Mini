/**
 * 🧠 QUIZ COMMAND — Full Image Card + Poll + Auto Next
 * .quiz        → start
 * .quiz score  → score
 * .quiz top    → leaderboard
 * .quiz stop   → stop
 *
 * © Courier Well — Education Platform
 */

const fs   = require('fs');
const path = require('path');

const DATA_FILE  = path.join(__dirname, '../../marks_quiz.json');
const SCORE_FILE = path.join(__dirname, '../../quiz_scores.json');

const activeSessions = {}; // { jid: { q, timer, qNum } }
const answeredMap    = {}; // { jid: Set(senderIds) }
const qCounters      = {}; // { jid: number } -- question counter per chat

const AUTO_DELAY  = 8000;  // 8s baad next question
const TIMEOUT_SEC = 30;
const TIMEOUT_MS  = TIMEOUT_SEC * 1000;

// ── File helpers ───────────────────────────────────────────────────────────────
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
function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Canvas helpers ─────────────────────────────────────────────────────────────
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line); line = w;
    } else { line = test; }
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

function gradBar(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, '#6C63FF');
  g.addColorStop(1, '#FF6584');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

// ── Generate QUESTION image ──────────────────────────────────────────────────
async function generateQuestionImage(q, qNum) {
  let createCanvas;
  try { ({ createCanvas } = require('canvas')); } catch { return null; }

  const W   = 820;
  const PAD = 30;
  const C   = {
    bg:      '#0D0D1A',
    header:  '#12122A',
    card:    '#161630',
    text:    '#FFFFFF',
    sub:     '#A0AEC0',
    accent:  '#6C63FF',
    pink:    '#FF6584',
    green:   '#43D9A2',
    yellow:  '#FFD166',
    divider: '#ffffff18',
    qBg:     '#1A1A35',
  };
  const OPT_COLORS = [C.accent, C.pink, C.green, C.yellow];
  const LABELS     = ['A', 'B', 'C', 'D'];

  // ─ Measure sizes
  const tmp = createCanvas(W, 10).getContext('2d');
  tmp.font  = 'bold 21px Arial';
  const qLines   = wrapText(tmp, q.question, W - PAD * 2 - 60);
  tmp.font  = '19px Arial';
  const optLines = q.options.map(o => wrapText(tmp, o, W - PAD * 2 - 80));

  const HEADER_H  = 68;
  const BADGE_H   = 34;
  const Q_TOP     = HEADER_H + BADGE_H + 20;
  const Q_LINE_H  = 30;
  const Q_H       = qLines.length * Q_LINE_H + 16;
  const OPT_PAD   = 14;
  const OPT_LH    = 26;
  const OPT_GAP   = 10;
  let   optsH     = 0;
  for (const lines of optLines) optsH += OPT_PAD * 2 + lines.length * OPT_LH + OPT_GAP;
  const FOOTER_H  = 54;
  const H         = Q_TOP + Q_H + 18 + optsH + FOOTER_H + 10;

  const cv  = createCanvas(W, H);
  const ctx = cv.getContext('2d');

  // Background
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

  // Top bar
  gradBar(ctx, 0, 0, W, 5);

  // Header
  ctx.fillStyle = C.header; ctx.fillRect(0, 5, W, HEADER_H);

  // Header left: icon + title
  ctx.font = '30px Arial'; ctx.fillStyle = C.text;
  ctx.fillText('🧠', PAD, 48);
  ctx.font = 'bold 26px Arial';
  ctx.fillText('MHT-CET QUIZ', PAD + 42, 48);

  // Header right: chapter
  if (q.chapter) {
    const tag = q.chapter.length > 25 ? q.chapter.slice(0, 22) + '…' : q.chapter;
    ctx.font = '13px Arial'; ctx.fillStyle = C.accent;
    ctx.textAlign = 'right';
    ctx.fillText(tag, W - PAD, 48);
    ctx.textAlign = 'left';
  }

  // Q Number + Year badge
  const badgeY = HEADER_H + 8;
  // Q number pill
  ctx.fillStyle = C.accent;
  roundRect(ctx, PAD, badgeY, 52, 24, 12); ctx.fill();
  ctx.font = 'bold 13px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText(`Q ${qNum}`, PAD + 26, badgeY + 16);
  ctx.textAlign = 'left';

  // Year badge
  if (q.year) {
    ctx.font = '13px Arial'; ctx.fillStyle = C.pink;
    ctx.fillText('📅 ' + q.year, PAD + 62, badgeY + 16);
  }

  // Question box
  ctx.fillStyle = C.qBg;
  roundRect(ctx, PAD, Q_TOP, W - PAD * 2, Q_H + 8, 12); ctx.fill();

  ctx.font = 'bold 21px Arial'; ctx.fillStyle = C.text;
  let qY = Q_TOP + Q_LINE_H;
  for (const line of qLines) { ctx.fillText(line, PAD + 14, qY); qY += Q_LINE_H; }

  // Options
  let optY = Q_TOP + Q_H + 26;
  for (let i = 0; i < q.options.length; i++) {
    const lines = optLines[i];
    const boxH  = OPT_PAD * 2 + lines.length * OPT_LH;

    // Option card
    ctx.fillStyle = C.card;
    roundRect(ctx, PAD, optY, W - PAD * 2, boxH, 10); ctx.fill();

    // Left color bar
    ctx.fillStyle = OPT_COLORS[i];
    roundRect(ctx, PAD, optY, 5, boxH, 3); ctx.fill();

    // Label circle
    ctx.beginPath();
    ctx.arc(PAD + 26, optY + boxH / 2, 15, 0, Math.PI * 2);
    ctx.fillStyle = OPT_COLORS[i]; ctx.fill();
    ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText(LABELS[i], PAD + 26, optY + boxH / 2 + 5);
    ctx.textAlign = 'left';

    // Option text
    ctx.font = '19px Arial'; ctx.fillStyle = C.text;
    for (let l = 0; l < lines.length; l++) {
      ctx.fillText(lines[l], PAD + 50, optY + OPT_PAD + (l + 1) * OPT_LH - 4);
    }
    optY += boxH + OPT_GAP;
  }

  // Divider
  ctx.fillStyle = C.divider; ctx.fillRect(PAD, H - FOOTER_H - 2, W - PAD * 2, 1);

  // Footer left
  ctx.font = '14px Arial'; ctx.fillStyle = C.sub;
  ctx.fillText('⏰ ' + TIMEOUT_SEC + 's  •  Vote karo poll mein', PAD, H - FOOTER_H + 22);

  // Footer right: Courier Well branding
  const brand = 'COURIER WELL';
  const subTx = 'Education Platform';
  ctx.font = 'bold 15px Arial';
  const bW  = ctx.measureText(brand).width;
  const sW  = ctx.measureText(subTx).width;
  const maxW = Math.max(bW, sW);
  const logoX = W - PAD - maxW - 30;
  const logoY = H - FOOTER_H + 10;

  // Logo circle
  ctx.beginPath();
  ctx.arc(logoX - 14, logoY + 11, 12, 0, Math.PI * 2);
  const lg = ctx.createLinearGradient(logoX - 26, logoY, logoX - 2, logoY + 22);
  lg.addColorStop(0, '#6C63FF'); lg.addColorStop(1, '#FF6584');
  ctx.fillStyle = lg; ctx.fill();
  ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText('CW', logoX - 14, logoY + 15);
  ctx.textAlign = 'left';

  ctx.font = 'bold 15px Arial'; ctx.fillStyle = '#FFFFFF';
  ctx.fillText(brand, logoX + 2, logoY + 14);
  ctx.font = '11px Arial'; ctx.fillStyle = C.accent;
  ctx.fillText(subTx, logoX + 2, logoY + 28);

  // Bottom bar
  gradBar(ctx, 0, H - 5, W, 5);

  return cv.toBuffer('image/png');
}

// ── Generate SOLUTION image ──────────────────────────────────────────────────
async function generateSolutionImage(q, qNum, isCorrect, chosenIdx) {
  let createCanvas;
  try { ({ createCanvas } = require('canvas')); } catch { return null; }

  const W   = 820;
  const PAD = 30;
  const C   = {
    bg:     '#0D0D1A',
    header: '#12122A',
    text:   '#FFFFFF',
    sub:    '#A0AEC0',
    accent: '#6C63FF',
    pink:   '#FF6584',
    green:  '#43D9A2',
    red:    '#FF4D6D',
    solBg:  '#0F1E1A',
    divider:'#ffffff18',
  };
  const LABELS = ['A', 'B', 'C', 'D'];

  const tmp = createCanvas(W, 10).getContext('2d');
  tmp.font  = '18px Arial';
  const solText  = q.explanation || 'No solution available.';
  const solLines = wrapText(tmp, solText, W - PAD * 2 - 20);
  tmp.font  = 'bold 20px Arial';
  const qLines   = wrapText(tmp, q.question, W - PAD * 2 - 20);

  const HEADER_H = 68;
  const BADGE_H  = 34;
  const STATUS_H = 60;
  const Q_H      = qLines.length * 28 + 20;
  const ANS_H    = 48;
  const SOL_H    = solLines.length * 26 + 24;
  const FOOTER_H = 50;
  const H        = HEADER_H + BADGE_H + 16 + STATUS_H + 10 + Q_H + ANS_H + 16 + SOL_H + FOOTER_H + 10;

  const cv  = createCanvas(W, H);
  const ctx = cv.getContext('2d');

  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  gradBar(ctx, 0, 0, W, 5);

  // Header
  ctx.fillStyle = C.header; ctx.fillRect(0, 5, W, HEADER_H);
  ctx.font = '30px Arial'; ctx.fillText('💡', PAD, 48);
  ctx.font = 'bold 26px Arial'; ctx.fillStyle = C.text;
  ctx.fillText('SOLUTION', PAD + 42, 48);
  if (q.chapter) {
    ctx.font = '13px Arial'; ctx.fillStyle = C.accent; ctx.textAlign = 'right';
    ctx.fillText(q.chapter.length > 25 ? q.chapter.slice(0, 22) + '…' : q.chapter, W - PAD, 48);
    ctx.textAlign = 'left';
  }

  // Badge row
  const bY = HEADER_H + 8;
  ctx.fillStyle = C.accent;
  roundRect(ctx, PAD, bY, 52, 24, 12); ctx.fill();
  ctx.font = 'bold 13px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText(`Q ${qNum}`, PAD + 26, bY + 16); ctx.textAlign = 'left';
  if (q.year) {
    ctx.font = '13px Arial'; ctx.fillStyle = C.pink;
    ctx.fillText('📅 ' + q.year, PAD + 62, bY + 16);
  }

  // Status banner
  const stY = HEADER_H + BADGE_H + 16;
  ctx.fillStyle = isCorrect ? '#0A2A1A' : '#2A0A12';
  roundRect(ctx, PAD, stY, W - PAD * 2, STATUS_H, 12); ctx.fill();
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = isCorrect ? C.green : C.red;
  ctx.textAlign = 'center';
  ctx.fillText(
    isCorrect ? '✅  Sahi Jawab!' : '❌  Galat Jawab!',
    W / 2, stY + 38
  );
  ctx.textAlign = 'left';

  // Question recap
  let recapY = stY + STATUS_H + 16;
  ctx.font = 'bold 20px Arial'; ctx.fillStyle = C.sub;
  for (const line of qLines) { ctx.fillText(line, PAD, recapY); recapY += 28; }

  // Answer row
  const ansY = recapY + 8;
  // Wrong answer (if applicable)
  if (!isCorrect && chosenIdx !== undefined) {
    ctx.font = '18px Arial'; ctx.fillStyle = C.red;
    ctx.fillText(`❌ Tumne chose: ${LABELS[chosenIdx]}. ${q.options[chosenIdx]}`, PAD, ansY + 20);
  }
  ctx.font = 'bold 20px Arial'; ctx.fillStyle = C.green;
  ctx.fillText(`✅ Correct: ${LABELS[q.ans]}. ${q.options[q.ans]}`, PAD, ansY + (isCorrect ? 28 : 46));

  // Solution box
  const solBoxY = ansY + ANS_H + 16;
  ctx.fillStyle = C.solBg;
  roundRect(ctx, PAD, solBoxY, W - PAD * 2, SOL_H, 10); ctx.fill();
  ctx.fillStyle = C.accent;
  roundRect(ctx, PAD, solBoxY, 4, SOL_H, 2); ctx.fill();

  ctx.font = 'bold 14px Arial'; ctx.fillStyle = C.accent;
  ctx.fillText('SOLUTION', PAD + 16, solBoxY + 20);

  ctx.font = '18px Arial'; ctx.fillStyle = C.text;
  let slY = solBoxY + 30;
  for (const line of solLines) { ctx.fillText(line, PAD + 16, slY); slY += 26; }

  // Divider
  ctx.fillStyle = C.divider; ctx.fillRect(PAD, H - FOOTER_H - 2, W - PAD * 2, 1);

  // Footer
  ctx.font = '14px Arial'; ctx.fillStyle = C.sub;
  ctx.fillText('Next question aane wala hai...', PAD, H - FOOTER_H + 22);

  const brand = 'COURIER WELL';
  ctx.font = 'bold 15px Arial';
  const bW  = ctx.measureText(brand).width;
  const logoX = W - PAD - bW - 30;
  const lY    = H - FOOTER_H + 10;
  ctx.beginPath();
  ctx.arc(logoX - 14, lY + 11, 12, 0, Math.PI * 2);
  const lg = ctx.createLinearGradient(logoX - 26, lY, logoX - 2, lY + 22);
  lg.addColorStop(0, '#6C63FF'); lg.addColorStop(1, '#FF6584');
  ctx.fillStyle = lg; ctx.fill();
  ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText('CW', logoX - 14, lY + 15); ctx.textAlign = 'left';
  ctx.font = 'bold 15px Arial'; ctx.fillStyle = '#fff';
  ctx.fillText(brand, logoX + 2, lY + 14);
  ctx.font = '11px Arial'; ctx.fillStyle = C.accent;
  ctx.fillText('Education Platform', logoX + 2, lY + 28);

  gradBar(ctx, 0, H - 5, W, 5);

  return cv.toBuffer('image/png');
}

// ── Send Quiz Round ────────────────────────────────────────────────────────────
async function sendQuiz(sock, jid, quotedMsg) {
  const questions = loadQuestions();
  if (!questions.length) {
    await sock.sendMessage(jid, { text: '🚫 Quiz data nahi mila! Owner se .scrape chalwao.' });
    return;
  }

  if (!qCounters[jid]) qCounters[jid] = 0;
  qCounters[jid]++;
  const qNum   = qCounters[jid];
  const q      = randItem(questions);
  const LABELS = ['A', 'B', 'C', 'D'];

  // 1️⃣ Question image
  let imgBuf = null;
  try { imgBuf = await generateQuestionImage(q, qNum); } catch {}

  const sendOpts = quotedMsg ? { quoted: quotedMsg } : {};

  if (imgBuf) {
    await sock.sendMessage(jid, {
      image:    imgBuf,
      mimetype: 'image/png',
      caption:  ''
    }, sendOpts);
  } else {
    // Fallback text
    const L = ['A','B','C','D'];
    await sock.sendMessage(jid, {
      text:
        `🧠 *Q${qNum}. ${q.question}*\n\n` +
        q.options.map((o, i) => `${L[i]}. ${o}`).join('\n') +
        `\n\n⏰ ${TIMEOUT_SEC}s\n_© Courier Well_`
    }, sendOpts);
  }

  // 2️⃣ WhatsApp Poll
  try {
    await sock.sendMessage(jid, {
      poll: {
        name:            `Q${qNum}. ${q.question.slice(0, 90)}${q.question.length > 90 ? '…' : ''}`,
        values:          q.options.map((o, i) => `${LABELS[i]}. ${o.slice(0, 100)}`),
        selectableCount: 1,
      }
    });
  } catch {}

  // 3️⃣ Auto timeout
  const timer = setTimeout(async () => {
    if (!activeSessions[jid]) return;
    delete activeSessions[jid];
    delete answeredMap[jid];

    let solBuf = null;
    try { solBuf = await generateSolutionImage(q, qNum, false, undefined); } catch {}

    if (solBuf) {
      await sock.sendMessage(jid, {
        image:    solBuf,
        mimetype: 'image/png',
        caption:  '⏰ Time Up!'
      });
    } else {
      await sock.sendMessage(jid, {
        text:
          `⏰ *Time Up!*\n\nSahi Answer: *${LABELS[q.ans]}. ${q.options[q.ans]}*\n` +
          `${q.explanation ? `\n💡 ${q.explanation.slice(0, 300)}` : ''}\n\n_© Courier Well_`
      });
    }
    setTimeout(() => sendQuiz(sock, jid, null), AUTO_DELAY);
  }, TIMEOUT_MS);

  answeredMap[jid]    = new Set();
  activeSessions[jid] = { q, timer, qNum };
}

// ── Module ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  name:     'quiz',
  aliases:  ['q', 'mcq'],
  description: 'MHT-CET Quiz — Image + Poll + Auto Next',
  category: 'general',
  usage:    '.quiz | .quiz ans A | .quiz score | .quiz top | .quiz stop',

  async execute(sock, msg, args) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const sub    = (args[0] || '').toLowerCase();
    const LABELS = ['A', 'B', 'C', 'D'];

    // ─ score
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

    // ─ top
    if (sub === 'top') {
      const scores = loadScores();
      const sorted = Object.entries(scores)
        .sort((a, b) => b[1].correct - a[1].correct).slice(0, 10);
      if (!sorted.length) {
        await sock.sendMessage(jid, { text: '🚫 Abhi koi score nahi!' }, { quoted: msg });
        return;
      }
      const medals = ['🥇','🥈','🥉'];
      const board  = sorted.map(([id, s], i) =>
        `${medals[i] || `${i+1}.`} @${id.split('@')[0]} — ✅ ${s.correct} correct`
      ).join('\n');
      await sock.sendMessage(jid, {
        text: `🏆 *Quiz Leaderboard*\n\n${board}\n\n_© Courier Well — Education Platform_`,
        mentions: sorted.map(([id]) => id)
      }, { quoted: msg });
      return;
    }

    // ─ stop
    if (sub === 'stop') {
      if (activeSessions[jid]) {
        clearTimeout(activeSessions[jid].timer);
        delete activeSessions[jid]; delete answeredMap[jid];
        await sock.sendMessage(jid, {
          text: '⛔ Quiz band kar diya!\n_© Courier Well — Education Platform_'
        }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: '❓ Koi active quiz nahi.' }, { quoted: msg });
      }
      return;
    }

    // ─ ans
    if (sub === 'ans') {
      const session = activeSessions[jid];
      if (!session) {
        await sock.sendMessage(jid,
          { text: '❓ Koi active quiz nahi!\n.quiz se shuru karo.' }, { quoted: msg });
        return;
      }
      if (answeredMap[jid]?.has(sender)) {
        await sock.sendMessage(jid,
          { text: '⚠️ Tumne pehle hi jawab de diya!' }, { quoted: msg });
        return;
      }
      const labelMap = { a:0, b:1, c:2, d:3, '1':0, '2':1, '3':2, '4':3 };
      const chosen   = labelMap[(args[1]||'').toLowerCase()];
      if (chosen === undefined) {
        await sock.sendMessage(jid,
          { text: '⚠️ A, B, C ya D bhejo! Example: .quiz ans B' }, { quoted: msg });
        return;
      }

      answeredMap[jid].add(sender);
      clearTimeout(session.timer);
      const q    = session.q;
      const qNum = session.qNum;
      delete activeSessions[jid]; delete answeredMap[jid];

      const scores = loadScores();
      if (!scores[sender]) scores[sender] = { correct:0, wrong:0, total:0 };
      scores[sender].total++;
      const isCorrect = chosen === q.ans;
      if (isCorrect) scores[sender].correct++; else scores[sender].wrong++;
      saveScores(scores);

      // Solution image
      let solBuf = null;
      try { solBuf = await generateSolutionImage(q, qNum, isCorrect, chosen); } catch {}

      if (solBuf) {
        await sock.sendMessage(jid, {
          image:    solBuf,
          mimetype: 'image/png',
          caption:
            `${isCorrect ? '✅ Sahi!' : '❌ Galat!'} Score: ✅${scores[sender].correct} | ❌${scores[sender].wrong}\n_© Courier Well_`
        }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, {
          text: isCorrect
            ? `✅ *Sahi!*\nAnswer: ${LABELS[q.ans]}. ${q.options[q.ans]}\n\nScore: ✅${scores[sender].correct} | ❌${scores[sender].wrong}\n_© Courier Well_`
            : `❌ *Galat!*\nSahi: ${LABELS[q.ans]}. ${q.options[q.ans]}\n\nScore: ✅${scores[sender].correct} | ❌${scores[sender].wrong}\n_© Courier Well_`
        }, { quoted: msg });
      }

      // Auto next
      setTimeout(() => sendQuiz(sock, jid, null), AUTO_DELAY);
      return;
    }

    // ─ start
    if (activeSessions[jid]) {
      await sock.sendMessage(jid, {
        text: '⚠️ Quiz chal raha hai!\n.quiz ans A/B/C/D bhejo ya .quiz stop karo.'
      }, { quoted: msg });
      return;
    }
    await sendQuiz(sock, jid, msg);
  }
};
