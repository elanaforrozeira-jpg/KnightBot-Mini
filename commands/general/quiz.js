/**
 * QUIZ — Clean Image + Simple Poll + White Solution
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

// ── helpers ──────────────────────────────────────────────────────────────────
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

function gradBar(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, '#6C63FF'); g.addColorStop(1, '#FF6584');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

// ── QUESTION IMAGE (dark, only question text) ────────────────────────────────
async function generateQuestionImage(q, qNum) {
  let createCanvas;
  try { ({ createCanvas } = require('canvas')); } catch { return null; }

  const W = 820, PAD = 44;

  // measure
  const tmp = createCanvas(W, 10).getContext('2d');
  tmp.font  = 'bold 24px Arial';
  const qLines = wrapText(tmp, q.question, W - PAD * 2);

  const HEADER_H = 72;
  const TOP_PAD  = 28;
  const LINE_H   = 38;
  const BOT_PAD  = 36;
  const FOOTER_H = 56;
  const H = HEADER_H + TOP_PAD + qLines.length * LINE_H + BOT_PAD + FOOTER_H;

  const cv  = createCanvas(W, H);
  const ctx = cv.getContext('2d');

  // bg
  ctx.fillStyle = '#0D0D1A'; ctx.fillRect(0, 0, W, H);
  gradBar(ctx, 0, 0, W, 5);

  // header
  ctx.fillStyle = '#12122A'; ctx.fillRect(0, 5, W, HEADER_H);
  ctx.font = '32px Arial'; ctx.fillStyle = '#fff';
  ctx.fillText('🧠', PAD - 4, 50);
  ctx.font = 'bold 27px Arial';
  ctx.fillText('MHT-CET QUIZ', PAD + 40, 50);
  if (q.chapter) {
    ctx.font = '14px Arial'; ctx.fillStyle = '#6C63FF';
    ctx.textAlign = 'right';
    const tag = q.chapter.length > 26 ? q.chapter.slice(0,23)+'…' : q.chapter;
    ctx.fillText(tag, W - PAD, 50);
    ctx.textAlign = 'left';
  }

  // Q-num pill + year
  const pillY = HEADER_H + 14;
  ctx.fillStyle = '#6C63FF';
  roundRect(ctx, PAD, pillY, 56, 26, 13); ctx.fill();
  ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.fillText('Q ' + qNum, PAD + 28, pillY + 18); ctx.textAlign = 'left';
  if (q.year) {
    ctx.font = '14px Arial'; ctx.fillStyle = '#FF6584';
    ctx.fillText('📅 ' + q.year, PAD + 68, pillY + 18);
  }

  // question text — nice and roomy
  ctx.font = 'bold 24px Arial'; ctx.fillStyle = '#FFFFFF';
  let y = HEADER_H + TOP_PAD + 44;
  for (const line of qLines) {
    ctx.fillText(line, PAD, y);
    y += LINE_H;
  }

  // footer divider
  ctx.fillStyle = '#ffffff15';
  ctx.fillRect(PAD, H - FOOTER_H, W - PAD*2, 1);

  // footer hint
  ctx.font = '14px Arial'; ctx.fillStyle = '#718096';
  ctx.fillText('⏰ ' + TIMEOUT_SEC + ' seconds  •  Neeche poll mein vote karo', PAD, H - FOOTER_H + 22);

  // Courier Well brand
  ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#FFFFFF';
  const bW = ctx.measureText('COURIER WELL').width;
  const lx = W - PAD - bW - 28;
  const ly = H - FOOTER_H + 8;
  ctx.beginPath(); ctx.arc(lx-12, ly+11, 11, 0, Math.PI*2);
  const lg = ctx.createLinearGradient(lx-23,ly,lx-1,ly+22);
  lg.addColorStop(0,'#6C63FF'); lg.addColorStop(1,'#FF6584');
  ctx.fillStyle = lg; ctx.fill();
  ctx.font = 'bold 9px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText('CW', lx-12, ly+15); ctx.textAlign = 'left';
  ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#fff';
  ctx.fillText('COURIER WELL', lx+2, ly+14);
  ctx.font = '11px Arial'; ctx.fillStyle = '#6C63FF';
  ctx.fillText('Education Platform', lx+2, ly+27);

  gradBar(ctx, 0, H-5, W, 5);
  return cv.toBuffer('image/png');
}

// ── SOLUTION IMAGE (white, airy) ──────────────────────────────────────────────
async function generateSolutionImage(q, qNum, isCorrect, chosenIdx) {
  let createCanvas;
  try { ({ createCanvas } = require('canvas')); } catch { return null; }

  const W = 820, PAD = 50;
  const LABELS = ['A','B','C','D'];

  const tmp = createCanvas(W, 10).getContext('2d');
  tmp.font  = '20px Arial';
  const solText  = q.explanation || 'Solution available in textbook.';
  const solLines = wrapText(tmp, solText, W - PAD*2 - 16);
  tmp.font = 'bold 22px Arial';
  const qLines = wrapText(tmp, q.question, W - PAD*2);

  // heights
  const TOP       = 60;
  const STATUS_H  = 80;
  const Q_H       = qLines.length * 32 + 24;
  const ANS_H     = (!isCorrect ? 64 : 44) + 16;
  const SOL_H     = solLines.length * 30 + 48;
  const FOOTER_H  = 64;
  const H = TOP + STATUS_H + 32 + Q_H + 20 + ANS_H + 20 + SOL_H + FOOTER_H;

  const cv  = createCanvas(W, H);
  const ctx = cv.getContext('2d');

  // white background
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);

  // top accent bar
  gradBar(ctx, 0, 0, W, 6);

  // ── Status block (colored band)
  const stColor = isCorrect ? '#F0FFF4' : '#FFF5F5';
  const stBorder = isCorrect ? '#48BB78' : '#FC8181';
  const stText   = isCorrect ? '✅  Sahi Jawab!' : '❌  Galat Jawab!';
  const stTColor = isCorrect ? '#276749' : '#9B2335';

  ctx.fillStyle = stColor;
  ctx.fillRect(0, 6, W, STATUS_H);
  ctx.fillStyle = stBorder;
  ctx.fillRect(0, 6, 6, STATUS_H);

  ctx.font = 'bold 30px Arial'; ctx.fillStyle = stTColor;
  ctx.textAlign = 'center';
  ctx.fillText(stText, W/2, 6 + STATUS_H/2 + 11);
  ctx.textAlign = 'left';

  // ── Q number + chapter label
  let y = 6 + STATUS_H + 32;
  ctx.font = 'bold 13px Arial'; ctx.fillStyle = '#6C63FF';
  const pill = `Q ${qNum}${q.chapter ? '  ·  ' + q.chapter : ''}${q.year ? '  ·  ' + q.year : ''}`;
  ctx.fillText(pill, PAD, y);
  y += 22;

  // thin rule
  ctx.fillStyle = '#E2E8F0'; ctx.fillRect(PAD, y, W - PAD*2, 1); y += 16;

  // ── Question text
  ctx.font = 'bold 22px Arial'; ctx.fillStyle = '#1A202C';
  for (const line of qLines) { ctx.fillText(line, PAD, y); y += 32; }
  y += 20;

  // ── Answer rows
  if (!isCorrect && chosenIdx !== undefined) {
    ctx.font = '20px Arial'; ctx.fillStyle = '#E53E3E';
    ctx.fillText(`✗  Your answer:  ${LABELS[chosenIdx]}. ${q.options[chosenIdx]}`, PAD, y);
    y += 36;
  }
  ctx.font = 'bold 21px Arial'; ctx.fillStyle = '#276749';
  ctx.fillText(`✓  Correct answer:  ${LABELS[q.ans]}. ${q.options[q.ans]}`, PAD, y);
  y += 20;

  // thin rule
  ctx.fillStyle = '#E2E8F0'; ctx.fillRect(PAD, y+8, W-PAD*2, 1); y += 28;

  // ── Solution box
  const solBoxH = solLines.length * 30 + 48;
  ctx.fillStyle = '#F7F8FC';
  roundRect(ctx, PAD, y, W-PAD*2, solBoxH, 14); ctx.fill();
  ctx.strokeStyle = '#CBD5E0'; ctx.lineWidth = 1;
  roundRect(ctx, PAD, y, W-PAD*2, solBoxH, 14); ctx.stroke();

  // left accent
  ctx.fillStyle = '#6C63FF';
  roundRect(ctx, PAD, y, 5, solBoxH, 3); ctx.fill();

  ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#6C63FF';
  ctx.fillText('SOLUTION', PAD + 20, y + 24);

  ctx.font = '20px Arial'; ctx.fillStyle = '#2D3748';
  let sy = y + 46;
  for (const line of solLines) { ctx.fillText(line, PAD + 20, sy); sy += 30; }

  // ── Footer
  const fy = H - FOOTER_H;
  ctx.fillStyle = '#EDF2F7'; ctx.fillRect(0, fy, W, FOOTER_H);

  ctx.font = '14px Arial'; ctx.fillStyle = '#718096';
  ctx.fillText('Next question aane wala hai...', PAD, fy + 26);

  // Courier Well
  ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#1A202C';
  const bW2 = ctx.measureText('COURIER WELL').width;
  const lx2 = W - PAD - bW2 - 28;
  const ly2 = fy + 10;
  ctx.beginPath(); ctx.arc(lx2-12, ly2+11, 11, 0, Math.PI*2);
  const lg2 = ctx.createLinearGradient(lx2-23,ly2,lx2-1,ly2+22);
  lg2.addColorStop(0,'#6C63FF'); lg2.addColorStop(1,'#FF6584');
  ctx.fillStyle = lg2; ctx.fill();
  ctx.font = 'bold 9px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText('CW', lx2-12, ly2+15); ctx.textAlign = 'left';
  ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#1A202C';
  ctx.fillText('COURIER WELL', lx2+2, ly2+14);
  ctx.font = '11px Arial'; ctx.fillStyle = '#6C63FF';
  ctx.fillText('Education Platform', lx2+2, ly2+28);

  gradBar(ctx, 0, H-5, W, 5);
  return cv.toBuffer('image/png');
}

// ── Send Quiz Round ───────────────────────────────────────────────────────────
async function sendQuiz(sock, jid, quotedMsg) {
  const questions = loadQuestions();
  if (!questions.length) {
    await sock.sendMessage(jid, { text: '🚫 Quiz data nahi mila!' }); return;
  }

  if (!qCounters[jid]) qCounters[jid] = 0;
  qCounters[jid]++;
  const qNum   = qCounters[jid];
  const q      = randItem(questions);
  const LABELS = ['A','B','C','D'];
  const opts   = { quoted: quotedMsg || undefined };

  // 1️⃣ Question image
  let imgBuf = null;
  try { imgBuf = await generateQuestionImage(q, qNum); } catch {}
  if (imgBuf) {
    await sock.sendMessage(jid, { image: imgBuf, mimetype: 'image/png', caption: '' }, opts);
  } else {
    await sock.sendMessage(jid, {
      text: `🧠 *Q${qNum}. ${q.question}*\n\n` +
        q.options.map((o,i) => `${LABELS[i]}. ${o}`).join('\n') +
        `\n\n⏰ ${TIMEOUT_SEC}s\n_© Courier Well_`
    }, opts);
  }

  // 2️⃣ Poll — only options, no question text
  try {
    await sock.sendMessage(jid, {
      poll: {
        name:            `Q${qNum} — Choose the correct answer:`,
        values:          LABELS.slice(0, q.options.length).map((l, i) => `${l}. ${q.options[i].slice(0,100)}`),
        selectableCount: 1,
      }
    });
  } catch {}

  // 3️⃣ Auto timeout
  const timer = setTimeout(async () => {
    if (!activeSessions[jid]) return;
    delete activeSessions[jid]; delete answeredMap[jid];

    let solBuf = null;
    try { solBuf = await generateSolutionImage(q, qNum, false, undefined); } catch {}
    if (solBuf) {
      await sock.sendMessage(jid, { image: solBuf, mimetype: 'image/png', caption: '⏰ Time Up!' });
    } else {
      await sock.sendMessage(jid, {
        text: `⏰ *Time Up!*\nSahi: *${LABELS[q.ans]}. ${q.options[q.ans]}*\n_© Courier Well_`
      });
    }
    setTimeout(() => sendQuiz(sock, jid, null), AUTO_DELAY);
  }, TIMEOUT_MS);

  answeredMap[jid]    = new Set();
  activeSessions[jid] = { q, timer, qNum };
}

// ── Module ────────────────────────────────────────────────────────────────────
module.exports = {
  name: 'quiz', aliases: ['q','mcq'],
  description: 'MHT-CET Quiz — Image + Poll + Auto Next',
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
        text: `📊 *Your Score*\n\n✅ Correct : ${s.correct}\n❌ Wrong   : ${s.wrong}\n📝 Total   : ${s.total}\n🎯 Accuracy: ${acc}%\n\n_© Courier Well — Education Platform_`
      }, { quoted: msg });
    }

    // top
    if (sub === 'top') {
      const sorted = Object.entries(loadScores()).sort((a,b)=>b[1].correct-a[1].correct).slice(0,10);
      if (!sorted.length) return sock.sendMessage(jid,{text:'🚫 Koi score nahi abhi!'},{quoted:msg});
      const medals = ['🥇','🥈','🥉'];
      return sock.sendMessage(jid, {
        text: `🏆 *Leaderboard*\n\n` +
          sorted.map(([id,s],i)=>`${medals[i]||i+1+'.'} @${id.split('@')[0]} — ✅ ${s.correct}`).join('\n') +
          `\n\n_© Courier Well — Education Platform_`,
        mentions: sorted.map(([id])=>id)
      }, { quoted: msg });
    }

    // stop
    if (sub === 'stop') {
      if (!activeSessions[jid]) return sock.sendMessage(jid,{text:'❓ Koi active quiz nahi.'},{quoted:msg});
      clearTimeout(activeSessions[jid].timer);
      delete activeSessions[jid]; delete answeredMap[jid];
      return sock.sendMessage(jid,{text:'⛔ Quiz band!\n_© Courier Well_'},{quoted:msg});
    }

    // ans
    if (sub === 'ans') {
      const session = activeSessions[jid];
      if (!session) return sock.sendMessage(jid,{text:'❓ Koi active quiz nahi! .quiz se shuru karo.'},{quoted:msg});
      if (answeredMap[jid]?.has(sender)) return sock.sendMessage(jid,{text:'⚠️ Pehle hi jawab de diya!'},{quoted:msg});
      const lm = {a:0,b:1,c:2,d:3,'1':0,'2':1,'3':2,'4':3};
      const chosen = lm[(args[1]||'').toLowerCase()];
      if (chosen===undefined) return sock.sendMessage(jid,{text:'⚠️ A/B/C/D bhejo. Example: .quiz ans B'},{quoted:msg});

      answeredMap[jid].add(sender);
      clearTimeout(session.timer);
      const { q, qNum } = session;
      delete activeSessions[jid]; delete answeredMap[jid];

      const scores = loadScores();
      if (!scores[sender]) scores[sender] = {correct:0,wrong:0,total:0};
      scores[sender].total++;
      const ok = chosen === q.ans;
      if (ok) scores[sender].correct++; else scores[sender].wrong++;
      saveScores(scores);

      let solBuf = null;
      try { solBuf = await generateSolutionImage(q, qNum, ok, chosen); } catch {}
      if (solBuf) {
        await sock.sendMessage(jid, {
          image:    solBuf,
          mimetype: 'image/png',
          caption:  `${ok?'✅ Sahi!':'❌ Galat!'}  Score: ✅${scores[sender].correct} ❌${scores[sender].wrong}\n_© Courier Well_`
        }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, {
          text: ok
            ? `✅ Sahi! Answer: ${LABELS[q.ans]}. ${q.options[q.ans]}\nScore: ✅${scores[sender].correct} ❌${scores[sender].wrong}\n_© Courier Well_`
            : `❌ Galat! Sahi: ${LABELS[q.ans]}. ${q.options[q.ans]}\nScore: ✅${scores[sender].correct} ❌${scores[sender].wrong}\n_© Courier Well_`
        }, { quoted: msg });
      }
      setTimeout(() => sendQuiz(sock, jid, null), AUTO_DELAY);
      return;
    }

    // start
    if (activeSessions[jid]) {
      return sock.sendMessage(jid,{
        text:'⚠️ Quiz chal raha hai!\n.quiz ans A/B/C/D bhejo ya .quiz stop karo.'
      },{quoted:msg});
    }
    await sendQuiz(sock, jid, msg);
  }
};
