/**
 * QUIZ — Chapterwise | Math + Chemistry + Physics
 * JSON: marks_mathematics.json | marks_chemistry.json | marks_physics.json
 * © Courier Well — Education Platform
 */

const fs   = require('fs');
const path = require('path');

const SCORE_FILE = path.join(__dirname, '../../quiz_scores.json');

// Subject data files
const SUBJECT_FILES = {
  maths:     path.join(__dirname, '../../marks_mathematics.json'),
  chemistry: path.join(__dirname, '../../marks_chemistry.json'),
  physics:   path.join(__dirname, '../../marks_physics.json'),
};

const activeSessions = {}; // { jid: { q, timer, qNum, chapter, subject } }
const answeredMap    = {};
const qCounters      = {};

const AUTO_DELAY  = 8000;
const TIMEOUT_SEC = 30;
const TIMEOUT_MS  = TIMEOUT_SEC * 1000;

// ── Load helpers ───────────────────────────────────────────────────────────────
function loadSubject(key) {
  const file = SUBJECT_FILES[key];
  if (!file || !fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
}

// Returns { q, chapterTitle, subjectName } or null
function pickQuestion(subjectKey, chapterFilter) {
  const data = loadSubject(subjectKey);
  if (!data || !data.chapters) return null;

  let chapters = data.chapters;
  if (chapterFilter) {
    const cf = chapterFilter.toLowerCase();
    chapters = chapters.filter(c => c.title.toLowerCase().includes(cf));
    if (!chapters.length) return null;
  }

  // Pick random chapter then random question
  const chapter = chapters[Math.floor(Math.random() * chapters.length)];
  if (!chapter.questions || !chapter.questions.length) return null;
  const q = chapter.questions[Math.floor(Math.random() * chapter.questions.length)];
  return { q, chapterTitle: chapter.title, subjectName: data.subject || data.name || subjectKey };
}

// List chapters for a subject
function listChapters(subjectKey) {
  const data = loadSubject(subjectKey);
  if (!data || !data.chapters) return [];
  return data.chapters.map((c, i) => `${i+1}. ${c.title} (${c.total || c.questions?.length || 0} Qs)`);
}

function loadScores() {
  if (!fs.existsSync(SCORE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(SCORE_FILE, 'utf8')); }
  catch { return {}; }
}
function saveScores(s) { fs.writeFileSync(SCORE_FILE, JSON.stringify(s, null, 2)); }

// Get option text (supports both {text} and plain string)
function optText(o) {
  if (!o) return '';
  if (typeof o === 'string') return o;
  return o.text || o.value || String(o);
}

// ── Text cleaner: remove LaTeX/scraper artifacts, split on | ───────────────────────────
function cleanAndSplit(raw) {
  if (!raw) return [''];
  let s = String(raw);

  // Remove LaTeX env markers
  s = s.replace(/\\cc\s*/g, '').replace(/\\cl\s*/g, '').replace(/\\ll\s*/g, '');

  // Split on | (piecewise line separator in this JSON)
  const parts = s.split(/\s*\|\s*/);

  return parts
    .map(p => p
      .replace(/\\sqrt\s*/g, '\u221a')
      .replace(/\^\{([^}]+)\}/g, '^($1)')
      .replace(/\_\{([^}]+)\}/g, '_($1)')
      .replace(/lim\s*_x/g, 'lim x')
      .replace(/\bsqrt\b\s*\(/g, '\u221a(')
      .replace(/\bsqrt\b/g, '\u221a')
      .replace(/\.\s*\.$/, '')   // trailing ..
      .replace(/\s+/g, ' ')
      .trim()
    )
    .filter(p => p.length > 0);
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

// Subject accent colors
const SUBJECT_COLOR = {
  Mathematics: '#5B5FE8',
  Chemistry:   '#0EA5A0',
  Physics:     '#D97706',
};
function accentColor(subject) {
  for (const [k, v] of Object.entries(SUBJECT_COLOR)) {
    if (subject && subject.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return '#5B5FE8';
}

// ── QUESTION IMAGE — white, 2x sharp, clean ────────────────────────────────────
async function generateQuestionImage(q, qNum, chapterTitle, subjectName) {
  let createCanvas;
  try { ({ createCanvas } = require('canvas')); } catch { return null; }

  const SCALE  = 2;
  const W      = 860;
  const PAD    = 44;
  const ACCENT = accentColor(subjectName);

  // Clean question into lines
  const rawLines = cleanAndSplit(q.question);

  // Probe for measurement
  const probe = createCanvas(W * SCALE, 100).getContext('2d');
  probe.scale(SCALE, SCALE);

  // Wrap each raw line
  const FONT_Q   = 'bold 20px Arial';
  const FONT_SUB = '13px Arial';
  probe.font = FONT_Q;
  const displayLines = [];
  for (const rl of rawLines) {
    const wrapped = wrapText(probe, rl, W - PAD * 2 - 8);
    displayLines.push(...wrapped);
  }

  const LINE_H   = 32;
  const HEADER_H = 62;
  const TOP_PAD  = 28;
  const BOT_PAD  = 22;
  const FOOTER_H = 50;
  const H = HEADER_H + TOP_PAD + displayLines.length * LINE_H + BOT_PAD + FOOTER_H;

  const cv  = createCanvas(W * SCALE, H * SCALE);
  const ctx = cv.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // ─ White bg
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // ─ Top accent bar (4px)
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, W, 4);

  // ─ Header
  ctx.fillStyle = '#F7F8FD';
  ctx.fillRect(0, 4, W, HEADER_H);
  // header bottom rule
  ctx.fillStyle = '#E5E7F0';
  ctx.fillRect(0, 4 + HEADER_H - 1, W, 1);

  // Subject icon pill
  const subjEmoji = subjectName?.toLowerCase().includes('chem') ? '🧔' :
                    subjectName?.toLowerCase().includes('phys') ? '⚡' : '📐';
  ctx.fillStyle = ACCENT;
  roundRect(ctx, PAD - 4, 13, 34, 28, 8); ctx.fill();
  ctx.font = '18px Arial'; ctx.textAlign = 'center';
  ctx.fillText(subjEmoji, PAD - 4 + 17, 32);
  ctx.textAlign = 'left';

  // Q badge
  ctx.fillStyle = ACCENT + '22';
  roundRect(ctx, PAD + 38, 16, 52, 22, 11); ctx.fill();
  ctx.font = 'bold 13px Arial'; ctx.fillStyle = ACCENT;
  ctx.textAlign = 'center';
  ctx.fillText('Q ' + qNum, PAD + 38 + 26, 31);
  ctx.textAlign = 'left';

  // Chapter name
  if (chapterTitle) {
    const ct = chapterTitle.length > 38 ? chapterTitle.slice(0,35)+'\u2026' : chapterTitle;
    ctx.font = '13px Arial'; ctx.fillStyle = '#555';
    ctx.fillText(ct, PAD + 100, 31);
  }

  // Year (right)
  if (q.year) {
    const yr = q.year.length > 30 ? q.year.slice(0,28)+'\u2026' : q.year;
    ctx.font = '12px Arial'; ctx.fillStyle = '#999';
    ctx.textAlign = 'right';
    ctx.fillText(yr, W - PAD, 31);
    ctx.textAlign = 'left';
  }

  // Difficulty dots
  const diff = q.difficulty || 1;
  for (let d = 0; d < 3; d++) {
    ctx.beginPath();
    ctx.arc(PAD + 38 + d*14, 52, 4, 0, Math.PI*2);
    ctx.fillStyle = d < diff ? ACCENT : '#DDD';
    ctx.fill();
  }
  ctx.font = '11px Arial'; ctx.fillStyle = '#AAA';
  ctx.fillText(diff === 1 ? 'Easy' : diff === 2 ? 'Medium' : 'Hard', PAD + 82, 56);

  // ─ Question lines
  ctx.font = FONT_Q; ctx.fillStyle = '#1A1A2E';
  let y = 4 + HEADER_H + TOP_PAD + LINE_H - 8;
  for (let i = 0; i < displayLines.length; i++) {
    // Piecewise lines after first get slight indent
    const isFirst = i === 0 || !rawLines[0]?.includes('|');
    const indent = (!isFirst && rawLines.length > 1) ? 24 : 0;
    ctx.fillText(displayLines[i], PAD + indent, y);
    y += LINE_H;
  }

  // ─ Footer
  const fy = H - FOOTER_H;
  ctx.fillStyle = '#F7F8FD';
  ctx.fillRect(0, fy, W, FOOTER_H);
  ctx.fillStyle = '#E5E7F0';
  ctx.fillRect(0, fy, W, 1);

  ctx.font = '13px Arial'; ctx.fillStyle = '#9BA3B8';
  ctx.fillText('\u23f0 ' + TIMEOUT_SEC + 's  \u2022  Neeche poll mein vote karo', PAD, fy + 30);

  // Courier Well branding
  ctx.font = 'bold 13px Arial'; ctx.fillStyle = ACCENT;
  ctx.textAlign = 'right';
  ctx.fillText('COURIER WELL', W - PAD, fy + 22);
  ctx.font = '10px Arial'; ctx.fillStyle = '#B0B8CC';
  ctx.fillText('Education Platform', W - PAD, fy + 36);
  ctx.textAlign = 'left';

  // ─ Bottom accent bar
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, H - 4, W, 4);

  return cv.toBuffer('image/png');
}

// ── Text solution ────────────────────────────────────────────────────────────────────
function formatSolution(q, qNum, isCorrect, chosenIdx, score) {
  const L   = ['A','B','C','D'];
  const sol = q.solution
    ? cleanAndSplit(q.solution).join('\n  ')
    : 'Solution not available.';

  const correctI = q.correct_idx ?? 0;
  const lines = [];
  lines.push(isCorrect ? '\u2705 *Sahi Jawab!*' : '\u274c *Galat Jawab!*');
  lines.push('');
  if (!isCorrect && chosenIdx !== undefined) {
    lines.push('\u2717 Tumne choose kiya: *' + L[chosenIdx] + '. ' + optText(q.options[chosenIdx]) + '*');
  }
  lines.push('\u2713 *Correct Answer: ' + L[correctI] + '. ' + optText(q.options[correctI]) + '*');
  if (score) lines.push('\ud83c\udfaf Score: \u2705' + score.correct + ' | \u274c' + score.wrong + ' | Total: ' + score.total);
  lines.push('');
  lines.push('\ud83d\udca1 *Solution:*');
  lines.push(sol);
  lines.push('');
  lines.push('_Next question 8 seconds mein..._');
  lines.push('_\u00a9 Courier Well \u2014 Education Platform_');
  return lines.join('\n');
}

// ── Send Quiz Round ───────────────────────────────────────────────────────────
async function sendQuiz(sock, jid, quotedMsg, subjectKey, chapterFilter) {
  // Pick question
  let picked = null;
  if (subjectKey && subjectKey !== 'random') {
    picked = pickQuestion(subjectKey, chapterFilter);
  } else {
    // Random subject
    const keys = Object.keys(SUBJECT_FILES);
    const shuffled = keys.sort(() => Math.random() - 0.5);
    for (const k of shuffled) {
      picked = pickQuestion(k, chapterFilter);
      if (picked) break;
    }
  }

  if (!picked) {
    await sock.sendMessage(jid, { text: '\ud83d\udeab Quiz data nahi mila! Files check karo.' });
    return;
  }

  const { q, chapterTitle, subjectName } = picked;
  if (!qCounters[jid]) qCounters[jid] = 0;
  qCounters[jid]++;
  const qNum   = qCounters[jid];
  const LABELS = ['A','B','C','D'];
  const sendOpts = quotedMsg ? { quoted: quotedMsg } : {};

  // 1\ufe0f\u20e3 Question Image
  let imgBuf = null;
  try { imgBuf = await generateQuestionImage(q, qNum, chapterTitle, subjectName); } catch (e) { console.error('IMG:', e.message); }

  if (imgBuf) {
    await sock.sendMessage(jid, { image: imgBuf, mimetype: 'image/png', caption: '' }, sendOpts);
  } else {
    const lines = cleanAndSplit(q.question);
    await sock.sendMessage(jid, {
      text:
        '*[' + subjectName + '] Q' + qNum + '.*\n' +
        lines.join('\n') + '\n\n' +
        q.options.map((o,i) => LABELS[i] + '. ' + optText(o)).join('\n') +
        '\n\n\u23f0 ' + TIMEOUT_SEC + 's\n_\u00a9 Courier Well_'
    }, sendOpts);
  }

  // 2\ufe0f\u20e3 Poll — options only
  try {
    await sock.sendMessage(jid, {
      poll: {
        name:            'Q' + qNum + ' \u2014 Sahi option chunein:',
        values:          q.options.slice(0,4).map((o,i) => LABELS[i] + '.  ' + optText(o).slice(0, 100)),
        selectableCount: 1,
      }
    });
  } catch {}

  // 3\ufe0f\u20e3 Auto timeout
  const timer = setTimeout(async () => {
    if (!activeSessions[jid]) return;
    const sess = activeSessions[jid];
    delete activeSessions[jid]; delete answeredMap[jid];

    const ci = sess.q.correct_idx ?? 0;
    await sock.sendMessage(jid, {
      text:
        '\u23f0 *Time Up!*\n\n' +
        '\u2713 *Correct: ' + LABELS[ci] + '. ' + optText(sess.q.options[ci]) + '*\n\n' +
        '\ud83d\udca1 *Solution:*\n' + cleanAndSplit(sess.q.solution || 'N/A').join('\n  ') +
        '\n\n_Next question aane wala hai..._\n_\u00a9 Courier Well_'
    });
    setTimeout(() => sendQuiz(sock, jid, null, sess.subjectKey, sess.chapterFilter), AUTO_DELAY);
  }, TIMEOUT_MS);

  answeredMap[jid]    = new Set();
  activeSessions[jid] = { q, timer, qNum, chapterTitle, subjectKey, chapterFilter };
}

// ── Module ───────────────────────────────────────────────────────────────────────────
module.exports = {
  name: 'quiz', aliases: ['q','mcq'],
  description: 'Quiz — Math/Chem/Physics | Chapterwise',
  category: 'general',
  usage: '.quiz [maths|chemistry|physics] [chapter] | .quiz ans A | .quiz score | .quiz top | .quiz stop | .quiz chapters maths',

  async execute(sock, msg, args) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const sub    = (args[0] || '').toLowerCase();
    const LABELS = ['A','B','C','D'];

    // .quiz chapters maths
    if (sub === 'chapters') {
      const subjKey = args[1]?.toLowerCase() || 'maths';
      const keyMap  = { maths:'maths', math:'maths', mathematics:'maths', chem:'chemistry', chemistry:'chemistry', physics:'physics', phy:'physics' };
      const k       = keyMap[subjKey] || 'maths';
      const list    = listChapters(k);
      if (!list.length) return sock.sendMessage(jid, { text: '\ud83d\udeab File nahi mili: ' + k }, { quoted: msg });
      return sock.sendMessage(jid, {
        text: '\ud83d\udcda *' + k.toUpperCase() + ' Chapters:*\n\n' + list.join('\n') + '\n\n_\u00a9 Courier Well_'
      }, { quoted: msg });
    }

    // .quiz score
    if (sub === 'score') {
      const s   = loadScores()[sender] || { correct:0, wrong:0, total:0 };
      const acc = s.total ? Math.round(s.correct/s.total*100) : 0;
      return sock.sendMessage(jid, {
        text:
          '\ud83d\udcca *Your Quiz Score*\n\n' +
          '\u2705 Correct : ' + s.correct + '\n' +
          '\u274c Wrong   : ' + s.wrong + '\n' +
          '\ud83d\udcdd Total   : ' + s.total + '\n' +
          '\ud83c\udfaf Accuracy: ' + acc + '%\n\n' +
          '_\u00a9 Courier Well \u2014 Education Platform_'
      }, { quoted: msg });
    }

    // .quiz top
    if (sub === 'top') {
      const sorted = Object.entries(loadScores()).sort((a,b)=>b[1].correct-a[1].correct).slice(0,10);
      if (!sorted.length) return sock.sendMessage(jid, { text: '\ud83d\udeab Koi score nahi!' }, { quoted: msg });
      const medals = ['\ud83e\udd47','\ud83e\udd48','\ud83e\udd49'];
      return sock.sendMessage(jid, {
        text: '\ud83c\udfc6 *Leaderboard*\n\n' +
          sorted.map(([id,s],i) => (medals[i]||i+1+'.') + ' @' + id.split('@')[0] + ' \u2014 \u2705' + s.correct).join('\n') +
          '\n\n_\u00a9 Courier Well_',
        mentions: sorted.map(([id])=>id)
      }, { quoted: msg });
    }

    // .quiz stop
    if (sub === 'stop') {
      if (!activeSessions[jid]) return sock.sendMessage(jid, { text: '\u2753 Koi active quiz nahi.' }, { quoted: msg });
      clearTimeout(activeSessions[jid].timer);
      delete activeSessions[jid]; delete answeredMap[jid];
      return sock.sendMessage(jid, { text: '\u26d4 Quiz band!\n_\u00a9 Courier Well_' }, { quoted: msg });
    }

    // .quiz ans A
    if (sub === 'ans') {
      const session = activeSessions[jid];
      if (!session) return sock.sendMessage(jid, { text: '\u2753 Koi active quiz nahi! .quiz se shuru karo.' }, { quoted: msg });
      if (answeredMap[jid]?.has(sender)) return sock.sendMessage(jid, { text: '\u26a0\ufe0f Pehle hi jawab de diya!' }, { quoted: msg });
      const lm = { a:0,b:1,c:2,d:3,'1':0,'2':1,'3':2,'4':3 };
      const chosen = lm[(args[1]||'').toLowerCase()];
      if (chosen === undefined) return sock.sendMessage(jid, { text: '\u26a0\ufe0f A/B/C/D bhejo. Eg: .quiz ans B' }, { quoted: msg });

      answeredMap[jid].add(sender);
      clearTimeout(session.timer);
      const { q, qNum } = session;
      delete activeSessions[jid]; delete answeredMap[jid];

      const scores = loadScores();
      if (!scores[sender]) scores[sender] = { correct:0, wrong:0, total:0 };
      scores[sender].total++;
      const ci = q.correct_idx ?? 0;
      const ok = chosen === ci;
      if (ok) scores[sender].correct++; else scores[sender].wrong++;
      saveScores(scores);

      await sock.sendMessage(jid, {
        text: formatSolution(q, qNum, ok, ok ? undefined : chosen, scores[sender])
      }, { quoted: msg });

      setTimeout(() => sendQuiz(sock, jid, null, session.subjectKey, session.chapterFilter), AUTO_DELAY);
      return;
    }

    // .quiz [maths|chemistry|physics] [chapter keyword]
    if (activeSessions[jid])
      return sock.sendMessage(jid, {
        text: '\u26a0\ufe0f Quiz chal raha hai!\n.quiz ans A/B/C/D bhejo ya .quiz stop karo.'
      }, { quoted: msg });

    const keyMap = { maths:'maths', math:'maths', mathematics:'maths', chem:'chemistry', chemistry:'chemistry', physics:'physics', phy:'physics' };
    let subjectKey    = 'random';
    let chapterFilter = null;

    if (sub && keyMap[sub]) {
      subjectKey    = keyMap[sub];
      chapterFilter = args.slice(1).join(' ') || null;
    } else if (sub && sub !== '') {
      // e.g. .quiz continuity — treat as chapter filter across random subject
      chapterFilter = args.join(' ');
    }

    await sendQuiz(sock, jid, msg, subjectKey, chapterFilter);
  }
};
