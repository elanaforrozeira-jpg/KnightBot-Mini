/**
 * 🖼️ JEE IMAGE QUIZ COMMAND
 * Sends question as a beautiful image card + native poll
 * Command: .jee | .jee physics | .jee chemistry | .jee math | .jee stop | .jee score
 */

const { createCanvas } = require('canvas');
const {
  activeQuizzes,
  quizScores,
  pollToQuiz,
  jeeQuestions,
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
  const W = 900;
  const PADDING = 40;
  const subjectColors = { P: '#1a73e8', C: '#0f9d58', M: '#f4b400' };
  const accentColor = subjectColors[qData.subject] || '#6200ea';
  const subjectEmoji = { P: '⚛', C: '🧪', M: '📐' };

  // Measure text to calculate dynamic height
  const tempCanvas = createCanvas(W, 100);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = '26px Sans';

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  const qLines = wrapText(tempCtx, qData.q, W - PADDING * 2 - 20);

  // Calculate total height needed
  const topBarH = 70;
  const titleH = 60;
  const qLabelH = 40;
  const qTextH = qLines.length * 36 + 20;
  const optionsH = qData.options.length * 60 + 20;
  const footerH = 60;
  const H = topBarH + titleH + qLabelH + qTextH + optionsH + footerH + 40;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, W, topBarH);

  // Top bar text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Sans';
  ctx.fillText(`❄ DAILY CHALLENGE ❄`, PADDING, 42);
  ctx.font = '20px Sans';
  ctx.fillText(`Q ${index + 1} / ${total}`, W - 140, 42);

  let y = topBarH + 30;

  // Chapter label
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 20px Sans';
  ctx.fillText(`${subjectEmoji[qData.subject] || '📚'} Chapter: ${qData.category}`, PADDING, y);
  y += 44;

  // Divider
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(W - PADDING, y);
  ctx.stroke();
  y += 20;

  // Question label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Sans';
  ctx.fillText('🌱 Question-', PADDING, y);
  y += 38;

  // Question text (wrapped)
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '26px Sans';
  for (const line of qLines) {
    ctx.fillText(line, PADDING + 10, y);
    y += 36;
  }
  y += 20;

  // Options
  const optBg = ['#16213e', '#0f3460', '#16213e', '#0f3460'];
  const optLabel = ['1', '2', '3', '4'];
  for (let i = 0; i < qData.options.length; i++) {
    // Option box
    ctx.fillStyle = optBg[i % 2];
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(PADDING, y, W - PADDING * 2, 50, 10);
    } else {
      ctx.rect(PADDING, y, W - PADDING * 2, 50);
    }
    ctx.fill();

    // Number badge
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(PADDING + 28, y + 25, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Sans';
    ctx.fillText(optLabel[i], PADDING + 22, y + 31);

    // Option text
    ctx.fillStyle = '#f0f0f0';
    ctx.font = '22px Sans';
    ctx.fillText(qData.options[i], PADDING + 58, y + 32);

    y += 60;
  }
  y += 10;

  // Footer
  ctx.fillStyle = '#888';
  ctx.font = '18px Sans';
  ctx.fillText('⏱ 30 seconds to answer  |  Tap poll below to answer', PADDING, y + 30);

  return canvas.toBuffer('image/png');
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
    let finalText = `🎉 *JEE QUIZ COMPLETED!* 🎉\n\n`;
    finalText += formatLeaderboard(scores, session.participants);
    finalText += `\n\n🔁 फिर से: *.jee* या *.quiz*`;
    await sock.sendMessage(jid, { text: finalText });
    return;
  }

  const qData = session.questions[session.current];
  session.answered.clear();
  session.currentPollId = null;

  // Render image
  let imgBuffer;
  try {
    imgBuffer = await renderQuestionImage(qData, session.current, session.questions.length);
  } catch (e) {
    console.error('[JEE Image Render Error]', e.message);
    // Fallback to text mode if canvas fails
    await sendNextQuestion(sock, jid, 'text');
    return;
  }

  // Send image with caption
  await sock.sendMessage(jid, {
    image: imgBuffer,
    caption:
      `🌿 *JEE Daily Challenge* 🌿\n` +
      `〔 Q${session.current + 1}/${session.questions.length} — ${qData.category} 〕\n\n` +
      `⏱️ _30 seconds! Poll tap karke answer do_`
  });

  // Native poll
  let pollMsg;
  try {
    pollMsg = await sock.sendMessage(jid, {
      poll: {
        name: `📝 *Options:*`,
        values: qData.options,
        selectableOptionsCount: 1
      }
    });
    if (pollMsg?.key?.id) {
      session.currentPollId = pollMsg.key.id;
      pollToQuiz.set(pollMsg.key.id, { jid, questionIndex: session.current });
    }
  } catch (e) {
    // Fallback text options
    let fallback = `*Options:*\n`;
    qData.options.forEach((opt, i) => { fallback += `  ${LETTERS[i]}️⃣  ${opt}\n`; });
    fallback += `\n📝 Reply *A / B / C / D* or *1 / 2 / 3 / 4*`;
    await sock.sendMessage(jid, { text: fallback });
  }

  // Timeout
  session.timeout = setTimeout(async () => {
    const cur = activeQuizzes.get(jid);
    if (!cur || cur.current !== session.current) return;
    if (session.currentPollId) pollToQuiz.delete(session.currentPollId);
    const correctOption = qData.options[qData.ans];
    await sock.sendMessage(jid, {
      text: `⏱️ *Time's up!*\n\n✅ Correct: *${LETTERS[qData.ans]}) ${correctOption}*\n\n_Next question..._`
    });
    cur.current++;
    setTimeout(() => sendImageQuestion(sock, jid), 2000);
  }, ANSWER_TIMEOUT);
}

// ─────────────────────────────────────────
//  IMAGE MODE POLL VOTE HANDLER
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
    const selectedOptions = pollUpdate.selectedOptions || [];
    if (!selectedOptions.length) return false;

    const chosenText = selectedOptions[0];
    const qData = session.questions[session.current];
    const chosenIndex = qData.options.indexOf(chosenText);
    if (chosenIndex === -1) return false;

    await processAnswer(sock, jid, sender, session, chosenIndex, null);
    return true;
  } catch (e) {
    return false;
  }
};

// ─────────────────────────────────────────
//  TEXT ANSWER HANDLER (fallback A/B/C/D)
// ─────────────────────────────────────────
function extractText(msg) {
  const m = msg.message;
  if (!m) return '';
  const inner = m.ephemeralMessage?.message || m.viewOnceMessageV2?.message || m;
  return inner.conversation || inner.extendedTextMessage?.text || inner.imageMessage?.caption || inner.videoMessage?.caption || '';
}

function parseAnswer(rawText) {
  let clean = rawText.replace(/@\d+/g, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const ch = clean.charAt(0);
  if (['A','B','C','D'].includes(ch)) return LETTERS.indexOf(ch);
  if (['1','2','3','4'].includes(ch)) return parseInt(ch) - 1;
  return -1;
}

module.exports.handleAnswer = async function(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const session = activeQuizzes.get(jid);
  if (!session || session.mode !== 'image') return false;

  const rawText = extractText(msg);
  const answerIndex = parseAnswer(rawText);
  if (answerIndex === -1) return false;

  if (!session.participants[sender]) {
    session.participants[sender] = msg.pushName || sender.split('@')[0];
  }

  await processAnswer(sock, jid, sender, session, answerIndex, session.participants[sender]);
  return true;
};

// ─────────────────────────────────────────
//  MAIN EXPORT
// ─────────────────────────────────────────
module.exports = {
  ...module.exports,
  name: 'jee',
  aliases: ['jeequiz', 'imgquiz'],
  description: 'JEE level quiz with beautiful image cards!',
  category: 'fun',
  usage: '.jee [physics|chemistry|math|pcm|stop|score|lb]',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const subCmd = args[0]?.toLowerCase() || 'start';

    // Leaderboard
    if (['leaderboard', 'lb'].includes(subCmd)) {
      const scores = quizScores.get(jid);
      const session = activeQuizzes.get(jid);
      await sock.sendMessage(jid, { text: formatLeaderboard(scores, session?.participants) }, { quoted: msg });
      return;
    }

    // Score
    if (subCmd === 'score') {
      const scores = quizScores.get(jid);
      const myScore = scores?.[sender] || 0;
      const name = msg.pushName || sender.split('@')[0];
      await sock.sendMessage(jid, { text: `📊 *${name}*, score: *${myScore} pts* 🎯` }, { quoted: msg });
      return;
    }

    // Stop
    if (['stop', 'end'].includes(subCmd)) {
      const session = activeQuizzes.get(jid);
      if (!session) { await sock.sendMessage(jid, { text: '❌ No quiz running!' }, { quoted: msg }); return; }
      clearTimeout(session.timeout);
      if (session.currentPollId) pollToQuiz.delete(session.currentPollId);
      activeQuizzes.delete(jid);
      const scores = quizScores.get(jid);
      await sock.sendMessage(jid, { text: `🛑 *Quiz stopped!*\n\n` + formatLeaderboard(scores, session.participants) });
      return;
    }

    if (activeQuizzes.has(jid)) {
      await sock.sendMessage(jid, { text: '⚠️ Quiz already running! Use *.jee stop* to stop.' }, { quoted: msg });
      return;
    }

    // Subject filter
    let subjects = ['P', 'C', 'M'];
    if (subCmd === 'physics')   subjects = ['P'];
    if (subCmd === 'chemistry') subjects = ['C'];
    if (['math', 'maths'].includes(subCmd)) subjects = ['M'];

    const questions = getRandomQuestions(10, subjects);
    const session = {
      questions, current: 0, scores: {}, participants: {},
      answered: new Set(), timeout: null, currentPollId: null, mode: 'image'
    };
    session.participants[sender] = msg.pushName || sender.split('@')[0];
    activeQuizzes.set(jid, session);
    if (!quizScores.has(jid)) quizScores.set(jid, {});

    const subjectLabel = subjects.length === 3 ? 'PCM' : (subjects[0] === 'P' ? 'Physics' : subjects[0] === 'C' ? 'Chemistry' : 'Mathematics');

    await sock.sendMessage(jid, {
      text:
        `🖼️ *JEE IMAGE QUIZ!* 🖼️\n\n` +
        `📋 *10 Questions* — ${subjectLabel} (JEE Mains Level)\n\n` +
        `🏆 Scoring: ✅ +10 pts | ❌ -2 pts\n\n` +
        `📌 Poll tap karo ya *A/B/C/D* type karo\n` +
        `⏸️ *.jee stop* | *.jee score* | *.jee lb*\n\n` +
        `_Starting in 3 seconds..._`
    });

    setTimeout(() => sendImageQuestion(sock, jid), 3000);
  }
};
