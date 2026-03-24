/**
 * 🖼️ JEE IMAGE QUIZ COMMAND
 * Beautiful image card + native poll
 * Made by Ruhvaan
 */

let createCanvas;
try {
  ({ createCanvas } = require('canvas'));
} catch (e) {
  createCanvas = null;
  console.warn('[JEE] canvas not available, using text fallback');
}

const {
  activeQuizzes,
  quizScores,
  pollToQuiz,
  getRandomQuestions,
  formatLeaderboard,
  processAnswer,
  sendNextQuestion,
  LETTERS,
  ANSWER_TIMEOUT
} = require('./quiz');

// ─────────────────────────────────────────
//  RENDER QUESTION AS IMAGE
// ─────────────────────────────────────────
async function renderQuestionImage(qData, index, total) {
  if (!createCanvas) throw new Error('canvas not available');

  const W = 900;
  const PAD = 40;
  const subjectColors = { P: '#1a73e8', C: '#0f9d58', M: '#f4b400' };
  const accent = subjectColors[qData.subject] || '#6200ea';
  const F = 'Liberation Sans';

  function wrap(ctx, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  const tmp = createCanvas(W, 100).getContext('2d');
  tmp.font = `26px "${F}"`;
  const qLines = wrap(tmp, qData.q, W - PAD * 2 - 20);

  const topH = 70, footH = 70;
  const H = topH + 60 + 40 + qLines.length * 36 + 20 + qData.options.length * 60 + 20 + footH + 30;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  // Top bar
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, topH);
  ctx.fillStyle = '#fff';
  ctx.font = `bold 22px "${F}"`;
  ctx.fillText('★ JEE DAILY CHALLENGE ★', PAD, 44);
  ctx.font = `20px "${F}"`;
  ctx.fillText(`Q ${index + 1} / ${total}`, W - 130, 44);

  let y = topH + 28;

  // Subject + chapter
  const subLabel = { P: '[PHY]', C: '[CHM]', M: '[MTH]' };
  ctx.fillStyle = accent;
  ctx.font = `bold 20px "${F}"`;
  ctx.fillText(`${subLabel[qData.subject] || '[PCM]'}  ${qData.category}`, PAD, y);
  y += 36;

  // Divider
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  y += 22;

  // Question
  ctx.fillStyle = '#fff';
  ctx.font = `bold 20px "${F}"`;
  ctx.fillText('Question :', PAD, y);
  y += 34;
  ctx.fillStyle = '#dde';
  ctx.font = `24px "${F}"`;
  for (const line of qLines) { ctx.fillText(line, PAD + 8, y); y += 36; }
  y += 14;

  // Options
  const bg = ['#16213e', '#0f3460', '#16213e', '#0f3460'];
  const labels = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < qData.options.length; i++) {
    ctx.fillStyle = bg[i % 2];
    if (ctx.roundRect) ctx.roundRect(PAD, y, W - PAD * 2, 50, 8);
    else ctx.rect(PAD, y, W - PAD * 2, 50);
    ctx.fill();

    // Badge
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(PAD + 26, y + 25, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold 17px "${F}"`;
    ctx.fillText(labels[i], PAD + 20, y + 31);

    ctx.fillStyle = '#eee';
    ctx.font = `21px "${F}"`;
    ctx.fillText(qData.options[i], PAD + 54, y + 32);
    y += 58;
  }
  y += 10;

  // Footer bar
  ctx.fillStyle = '#11112a';
  ctx.fillRect(0, y, W, footH);

  // Footer left: timer hint
  ctx.fillStyle = '#aaa';
  ctx.font = `16px "${F}"`;
  ctx.fillText('[30s]  Tap poll or type  A / B / C / D', PAD, y + 28);

  // Footer right: Made by Ruhvaan (small)
  ctx.fillStyle = '#666';
  ctx.font = `14px "${F}"`;
  const credit = 'made by Ruhvaan';
  const cw = ctx.measureText(credit).width;
  ctx.fillText(credit, W - PAD - cw, y + footH - 14);

  return canvas.toBuffer('image/png');
}

// ─────────────────────────────────────────
//  TEXT FALLBACK (when canvas unavailable)
// ─────────────────────────────────────────
function buildTextQuestion(qData, index, total) {
  const sub = { P: '⚛️', C: '🧪', M: '📐' };
  let t = `┌─────────────────────────┐\n`;
  t += `┃ 🌟 *JEE DAILY CHALLENGE*\n`;
  t += `┃ Q${index + 1}/${total} — ${sub[qData.subject] || '📚'} *${qData.category}*\n`;
  t += `└─────────────────────────┘\n\n`;
  t += `❓ *${qData.q}*\n\n`;
  t += `📌 *Options:*\n`;
  qData.options.forEach((o, i) => { t += `  *${LETTERS[i]})* ${o}\n`; });
  t += `\n⏱ _30s | Type A/B/C/D or tap poll_\n`;
  t += `\n_made by Ruhvaan_`;
  return t;
}

// ─────────────────────────────────────────
//  SEND IMAGE QUESTION
// ─────────────────────────────────────────
async function sendImageQuestion(sock, jid) {
  const session = activeQuizzes.get(jid);
  if (!session) return;

  if (session.current >= session.questions.length) {
    activeQuizzes.delete(jid);
    const scores = quizScores.get(jid);
    let fin = `🎉 *JEE QUIZ COMPLETED!* 🎉\n\n`;
    fin += formatLeaderboard(scores, session.participants);
    fin += `\n\n🔁 Phir se: *.jee* ya *.quiz*`;
    await sock.sendMessage(jid, { text: fin });
    return;
  }

  const qData = session.questions[session.current];
  // Reset per-question tracking
  session.answered.clear();
  session.pollVoters = new Set();
  session.currentPollId = null;

  // Try image, fallback to text
  try {
    const buf = await renderQuestionImage(qData, session.current, session.questions.length);
    await sock.sendMessage(jid, {
      image: buf,
      caption: `🌿 *JEE Daily Challenge* 🌿\n[ Q${session.current + 1}/${session.questions.length} — ${qData.category} ]\n\n⏱️ _30 seconds! Poll tap karke answer do_`
    });
  } catch (e) {
    console.error('[JEE Image Error]', e.message);
    await sock.sendMessage(jid, { text: buildTextQuestion(qData, session.current, session.questions.length) });
  }

  // Poll (always)
  try {
    const pm = await sock.sendMessage(jid, {
      poll: { name: '📝 Options:', values: qData.options, selectableOptionsCount: 1 }
    });
    if (pm?.key?.id) {
      session.currentPollId = pm.key.id;
      pollToQuiz.set(pm.key.id, { jid, questionIndex: session.current });
    }
  } catch (e) {
    let fb = `*Options:*\n`;
    qData.options.forEach((o, i) => { fb += `  ${LETTERS[i]})  ${o}\n`; });
    await sock.sendMessage(jid, { text: fb });
  }

  // Timeout
  session.timeout = setTimeout(async () => {
    const cur = activeQuizzes.get(jid);
    if (!cur || cur.current !== session.current) return;
    if (session.currentPollId) pollToQuiz.delete(session.currentPollId);
    const correct = qData.options[qData.ans];
    await sock.sendMessage(jid, {
      text: `⏱️ *Time's up!*\n\n✅ Correct: *${LETTERS[qData.ans]}) ${correct}*\n\n_Next question..._`
    });
    cur.current++;
    setTimeout(() => sendImageQuestion(sock, jid), 2000);
  }, ANSWER_TIMEOUT);
}

// ─────────────────────────────────────────
//  POLL VOTE HANDLER — one vote per user
// ─────────────────────────────────────────
module.exports.handlePollVote = async function(sock, pollUpdate) {
  try {
    const pollId = pollUpdate?.pollCreationMessageKey?.id;
    if (!pollId) return false;
    const entry = pollToQuiz.get(pollId);
    if (!entry) return false;
    const { jid, questionIndex } = entry;
    const session = activeQuizzes.get(jid);
    if (!session || session.current !== questionIndex || session.mode !== 'image') return false;

    const sender = pollUpdate.voter;
    const selected = pollUpdate.selectedOptions || [];

    // Block multiple votes — silent ignore
    if (!session.pollVoters) session.pollVoters = new Set();
    if (session.pollVoters.has(sender)) return true;
    if (!selected.length) return false;
    session.pollVoters.add(sender);

    const qData = session.questions[session.current];
    const idx = qData.options.indexOf(selected[0]);
    if (idx === -1) return false;

    await processAnswer(sock, jid, sender, session, idx, null, null);
    return true;
  } catch (e) { return false; }
};

// ─────────────────────────────────────────
//  TEXT ANSWER HANDLER — reacts ✅/❌
// ─────────────────────────────────────────
function extractText(msg) {
  const m = msg.message;
  if (!m) return '';
  const inner = m.ephemeralMessage?.message || m.viewOnceMessageV2?.message || m;
  return inner.conversation || inner.extendedTextMessage?.text || inner.imageMessage?.caption || inner.videoMessage?.caption || '';
}

function parseAnswer(raw) {
  let c = raw.replace(/@\d+/g, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const ch = c.charAt(0);
  if (['A','B','C','D'].includes(ch)) return LETTERS.indexOf(ch);
  if (['1','2','3','4'].includes(ch)) return parseInt(ch) - 1;
  return -1;
}

module.exports.handleAnswer = async function(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const session = activeQuizzes.get(jid);
  if (!session || session.mode !== 'image') return false;

  const raw = extractText(msg);
  const idx = parseAnswer(raw);
  if (idx === -1) return false;

  if (!session.participants[sender])
    session.participants[sender] = msg.pushName || sender.split('@')[0];

  const qData = session.questions[session.current];
  const isCorrect = idx === qData.ans;

  // ✅/❌ react on student's message
  try {
    await sock.sendMessage(jid, {
      react: { text: isCorrect ? '✅' : '❌', key: msg.key }
    });
  } catch (_) {}

  await processAnswer(sock, jid, sender, session, idx, session.participants[sender], msg.key);
  return true;
};

module.exports.sendImageQuestion = sendImageQuestion;

// ─────────────────────────────────────────
//  MAIN EXPORT
// ─────────────────────────────────────────
module.exports = {
  ...module.exports,
  name: 'jee',
  aliases: ['jeequiz', 'imgquiz'],
  description: 'JEE level quiz with image cards!',
  category: 'fun',
  usage: '.jee [physics|chemistry|math|stop|score|lb]',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const sub = (args[0] || '').toLowerCase();

    if (['leaderboard','lb'].includes(sub)) {
      const sc = quizScores.get(jid);
      const se = activeQuizzes.get(jid);
      await sock.sendMessage(jid, { text: formatLeaderboard(sc, se?.participants) }, { quoted: msg });
      return;
    }
    if (sub === 'score') {
      const sc = quizScores.get(jid);
      const pts = sc?.[sender] || 0;
      await sock.sendMessage(jid, { text: `📊 *${msg.pushName || sender.split('@')[0]}* — *${pts} pts* 🎯` }, { quoted: msg });
      return;
    }
    if (['stop','end'].includes(sub)) {
      const se = activeQuizzes.get(jid);
      if (!se) { await sock.sendMessage(jid, { text: '❌ No quiz running!' }, { quoted: msg }); return; }
      clearTimeout(se.timeout);
      if (se.currentPollId) pollToQuiz.delete(se.currentPollId);
      activeQuizzes.delete(jid);
      await sock.sendMessage(jid, { text: `🛑 *Quiz stopped!*\n\n` + formatLeaderboard(quizScores.get(jid), se.participants) });
      return;
    }
    if (activeQuizzes.has(jid)) {
      await sock.sendMessage(jid, { text: '⚠️ Quiz already running! *.jee stop* to stop.' }, { quoted: msg });
      return;
    }

    let subjects = ['P','C','M'];
    if (sub === 'physics')   subjects = ['P'];
    if (sub === 'chemistry') subjects = ['C'];
    if (['math','maths'].includes(sub)) subjects = ['M'];

    const questions = getRandomQuestions(10, subjects);
    const session = {
      questions, current: 0, scores: {}, participants: {},
      answered: new Set(), pollVoters: new Set(),
      timeout: null, currentPollId: null, mode: 'image'
    };
    session.participants[sender] = msg.pushName || sender.split('@')[0];
    activeQuizzes.set(jid, session);
    if (!quizScores.has(jid)) quizScores.set(jid, {});

    const label = subjects.length === 3 ? 'PCM' : (subjects[0]==='P'?'Physics':subjects[0]==='C'?'Chemistry':'Mathematics');
    await sock.sendMessage(jid, {
      text:
        `🖼️ *JEE IMAGE QUIZ!* 🖼️\n\n` +
        `📋 *10 Questions* — ${label}\n` +
        `🏆 +10 correct | -2 wrong\n\n` +
        `📌 Poll tap karo ya *A/B/C/D* likho\n` +
        `⏸️ *.jee stop* | *.jee score* | *.jee lb*\n\n` +
        `_Starting in 3 seconds..._`
    });
    setTimeout(() => sendImageQuestion(sock, jid), 3000);
  }
};
