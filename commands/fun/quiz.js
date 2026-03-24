/**
 * 🎯 QUIZ COMMAND — Text mode quiz with WhatsApp native poll
 * Commands: .quiz | .quiz stop | .quiz score | .quiz leaderboard
 */

const activeQuizzes = new Map();
const quizScores   = new Map();
const pollToQuiz   = new Map(); // pollMsgId -> { jid, questionIndex }

// ─────────────────────────────────────────
//  SHARED QUESTION BANK (PCM JEE Level)
// ─────────────────────────────────────────
const jeeQuestions = [
  // ── PHYSICS ──
  { q: 'A body is thrown vertically upward with velocity u. The ratio of time of ascent to time of descent is:', options: ['1:1', '1:2', '2:1', 'u:g'], ans: 0, category: 'Physics', subject: 'P' },
  { q: 'The dimensional formula of angular momentum is:', options: ['[ML²T⁻²]', '[ML²T⁻¹]', '[MLT⁻¹]', '[M²L²T⁻¹]'], ans: 1, category: 'Physics', subject: 'P' },
  { q: 'A particle moves in a circle of radius r. In half revolution it travels a distance of:', options: ['πr', '2r', '2πr', 'r'], ans: 0, category: 'Physics', subject: 'P' },
  { q: 'Which of the following has the highest penetrating power?', options: ['Alpha rays', 'Beta rays', 'Gamma rays', 'X-rays'], ans: 2, category: 'Physics', subject: 'P' },
  { q: 'The work done in moving a charge of 2 C across two points having a potential difference of 12 V is:', options: ['6 J', '10 J', '24 J', '14 J'], ans: 2, category: 'Physics', subject: 'P' },
  { q: 'The SI unit of magnetic flux is:', options: ['Tesla', 'Weber', 'Gauss', 'Henry'], ans: 1, category: 'Physics', subject: 'P' },
  { q: 'A concave lens of focal length 20 cm forms an image at 15 cm from the lens. The object distance is:', options: ['60 cm', '120 cm', '30 cm', '40 cm'], ans: 0, category: 'Physics', subject: 'P' },
  { q: 'In photoelectric effect, stopping potential depends on:', options: ['Intensity of light', 'Frequency of light', 'Both intensity and frequency', 'Neither'], ans: 1, category: 'Physics', subject: 'P' },
  { q: 'The de Broglie wavelength of a particle is inversely proportional to its:', options: ['Mass', 'Speed', 'Momentum', 'Energy'], ans: 2, category: 'Physics', subject: 'P' },
  { q: 'Which law states that EMF induced is proportional to the rate of change of magnetic flux?', options: ["Ampere's law", "Gauss's law", "Faraday's law", "Lenz's law"], ans: 2, category: 'Physics', subject: 'P' },
  { q: 'Two resistors of 4Ω and 6Ω are connected in parallel. The equivalent resistance is:', options: ['10 Ω', '2.4 Ω', '5 Ω', '1.2 Ω'], ans: 1, category: 'Physics', subject: 'P' },
  { q: 'The time period of a simple pendulum is doubled when its length is:', options: ['Doubled', 'Halved', 'Quadrupled', 'Made 8 times'], ans: 2, category: 'Physics', subject: 'P' },
  { q: 'The escape velocity from the Earth surface is approximately:', options: ['7.9 km/s', '11.2 km/s', '3.0 km/s', '9.8 km/s'], ans: 1, category: 'Physics', subject: 'P' },
  { q: 'In Young\'s double slit experiment, fringe width is β. If slit separation is doubled, new fringe width is:', options: ['β/2', '2β', 'β', '4β'], ans: 0, category: 'Physics', subject: 'P' },
  { q: 'The binding energy per nucleon is maximum for:', options: ['Uranium-238', 'Helium-4', 'Iron-56', 'Carbon-12'], ans: 2, category: 'Physics', subject: 'P' },

  // ── CHEMISTRY ──
  { q: 'Which of the following has the highest ionization energy?', options: ['Na', 'Mg', 'Al', 'Si'], ans: 1, category: 'Chemistry', subject: 'C' },
  { q: 'The hybridization of carbon in diamond is:', options: ['sp', 'sp²', 'sp³', 'sp³d'], ans: 2, category: 'Chemistry', subject: 'C' },
  { q: 'Which gas is produced when sodium reacts with water?', options: ['Oxygen', 'Nitrogen', 'Hydrogen', 'CO₂'], ans: 2, category: 'Chemistry', subject: 'C' },
  { q: 'The bond angle in water molecule is approximately:', options: ['109.5°', '120°', '104.5°', '180°'], ans: 2, category: 'Chemistry', subject: 'C' },
  { q: 'Which of the following is a Lewis acid?', options: ['NH₃', 'H₂O', 'BF₃', 'F⁻'], ans: 2, category: 'Chemistry', subject: 'C' },
  { q: 'The IUPAC name of CH₃–CH=CH₂ is:', options: ['Propene', 'Propane', 'Propyne', 'Propadiene'], ans: 0, category: 'Chemistry', subject: 'C' },
  { q: 'Which quantum number determines the shape of an orbital?', options: ['Principal (n)', 'Azimuthal (l)', 'Magnetic (m)', 'Spin (s)'], ans: 1, category: 'Chemistry', subject: 'C' },
  { q: 'The oxidation state of Cr in K₂Cr₂O₇ is:', options: ['+3', '+6', '+4', '+7'], ans: 1, category: 'Chemistry', subject: 'C' },
  { q: 'SN2 reaction is favored by:', options: ['Tertiary alkyl halides', 'Secondary alkyl halides', 'Primary alkyl halides', 'All equally'], ans: 2, category: 'Chemistry', subject: 'C' },
  { q: 'Which of the following compounds shows geometrical isomerism?', options: ['CH₂=CH₂', 'CH₃–CH=CH–CH₃', 'CH₂=C(CH₃)₂', 'CH₄'], ans: 1, category: 'Chemistry', subject: 'C' },
  { q: 'The enthalpy of formation of an element in its standard state is:', options: ['Positive', 'Negative', 'Zero', 'Depends on element'], ans: 2, category: 'Chemistry', subject: 'C' },
  { q: 'Nylon-6,6 is formed by condensation polymerization of:', options: ['Hexamethylenediamine and adipic acid', 'Caprolactam', 'Ethylene glycol and terephthalic acid', 'Styrene'], ans: 0, category: 'Chemistry', subject: 'C' },
  { q: 'Which of the following is most acidic?', options: ['CH₄', 'C₂H₂', 'C₂H₄', 'C₂H₆'], ans: 1, category: 'Chemistry', subject: 'C' },
  { q: 'The electrode potential of standard hydrogen electrode is:', options: ['+1.0 V', '-1.0 V', '0 V', '+0.5 V'], ans: 2, category: 'Chemistry', subject: 'C' },
  { q: 'Beckmann rearrangement converts:', options: ['Ketone to amine', 'Ketoxime to amide', 'Aldehyde to acid', 'Amine to nitro compound'], ans: 1, category: 'Chemistry', subject: 'C' },

  // ── MATHEMATICS ──
  { q: 'If f(x) = x² – 3x + 2, then f(0) + f(1) + f(2) = ?', options: ['0', '2', '3', '4'], ans: 1, category: 'Mathematics', subject: 'M' },
  { q: 'The derivative of sin(x²) with respect to x is:', options: ['cos(x²)', '2x·cos(x²)', 'cos(2x)', '2cos(x²)'], ans: 1, category: 'Mathematics', subject: 'M' },
  { q: '∫(1/x)dx = ?', options: ['x + C', 'ln|x| + C', '1/x² + C', '-1/x + C'], ans: 1, category: 'Mathematics', subject: 'M' },
  { q: 'The sum of roots of quadratic equation ax² + bx + c = 0 is:', options: ['b/a', '-b/a', 'c/a', '-c/a'], ans: 1, category: 'Mathematics', subject: 'M' },
  { q: 'If |z| = 2 and arg(z) = π/3, then z = ?', options: ['1 + i√3', '√3 + i', '1 + i', '2 + 2i'], ans: 0, category: 'Mathematics', subject: 'M' },
  { q: 'The number of ways to arrange 5 letters of the word "MATHS" is:', options: ['60', '120', '24', '720'], ans: 1, category: 'Mathematics', subject: 'M' },
  { q: 'lim(x→0) [sin(x)/x] = ?', options: ['0', 'x', '1', '∞'], ans: 2, category: 'Mathematics', subject: 'M' },
  { q: 'The eccentricity of a circle is:', options: ['0', '1', '<1', '>1'], ans: 0, category: 'Mathematics', subject: 'M' },
  { q: 'If A is a 3×3 matrix with det(A) = 5, then det(2A) = ?', options: ['10', '20', '40', '25'], ans: 2, category: 'Mathematics', subject: 'M' },
  { q: 'The angle between vectors A = i+j and B = i–j is:', options: ['0°', '45°', '90°', '180°'], ans: 2, category: 'Mathematics', subject: 'M' },
  { q: 'The general solution of dy/dx = y is:', options: ['y = Ce^x', 'y = Cx', 'y = C·ln(x)', 'y = Ce^(-x)'], ans: 0, category: 'Mathematics', subject: 'M' },
  { q: 'In a GP, if first term is 2 and common ratio is 3, the 5th term is:', options: ['162', '54', '243', '486'], ans: 0, category: 'Mathematics', subject: 'M' },
  { q: '⁴⁵C₁ + ⁴⁵C₂ + ... + ⁴⁵C₄₅ = ?', options: ['2⁴⁵', '2⁴⁴', '2⁴⁵ – 1', '2⁴⁴ – 1'], ans: 2, category: 'Mathematics', subject: 'M' },
  { q: 'The slope of tangent to curve y = x³ at x = 2 is:', options: ['6', '8', '12', '4'], ans: 2, category: 'Mathematics', subject: 'M' },
  { q: 'Cos(75°) = ?', options: ['(√6–√2)/4', '(√6+√2)/4', '(√3–1)/2√2', '(√3+1)/2'], ans: 0, category: 'Mathematics', subject: 'M' },
];

const ANSWER_TIMEOUT = 30000;
const LETTERS = ['A', 'B', 'C', 'D'];

function getRandomQuestions(count = 10, subjects = ['P','C','M']) {
  const filtered = jeeQuestions.filter(q => subjects.includes(q.subject));
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ─────────────────────────────────────────
//  LEADERBOARD
// ─────────────────────────────────────────
function formatLeaderboard(scores, participants) {
  if (!scores || Object.keys(scores).length === 0) return '📊 No scores yet!';
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const medals = ['🥇', '🥈', '🥉'];
  let text = `╔══════════════════╗\n║  🏆 LEADERBOARD  ║\n╚══════════════════╝\n\n`;
  sorted.forEach(([userId, score], i) => {
    const medal = medals[i] || `${i + 1}.`;
    const name = participants?.[userId] || userId.split('@')[0];
    text += `${medal} *${name}* — ${score} pts\n`;
  });
  return text;
}

// ─────────────────────────────────────────
//  TEXT EXTRACTION + ANSWER PARSING
// ─────────────────────────────────────────
function extractText(msg) {
  const m = msg.message;
  if (!m) return '';
  const inner = m.ephemeralMessage?.message || m.viewOnceMessageV2?.message || m;
  return (
    inner.conversation ||
    inner.extendedTextMessage?.text ||
    inner.imageMessage?.caption ||
    inner.videoMessage?.caption ||
    ''
  );
}

function parseAnswer(rawText) {
  // Remove @mentions
  let clean = rawText.replace(/@\d+/g, '').trim();
  // Keep only alphanumeric
  clean = clean.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const ch = clean.charAt(0);
  if (['A', 'B', 'C', 'D'].includes(ch)) return LETTERS.indexOf(ch);
  if (['1', '2', '3', '4'].includes(ch)) return parseInt(ch) - 1;
  return -1;
}

// ─────────────────────────────────────────
//  SCORE + RESPONSE HELPER
// ─────────────────────────────────────────
async function processAnswer(sock, jid, sender, session, answerIndex, nameOverride) {
  if (session.answered.has(sender)) {
    await sock.sendMessage(jid, {
      text: `⚠️ @${sender.split('@')[0]}, you already answered!`,
      mentions: [sender]
    });
    return 'already';
  }

  session.answered.add(sender);
  const name = nameOverride || session.participants[sender] || sender.split('@')[0];
  session.participants[sender] = name;

  const qData = session.questions[session.current];
  const isCorrect = answerIndex === qData.ans;
  const correctOption = qData.options[qData.ans];

  const allScores = quizScores.get(jid) || {};
  quizScores.set(jid, allScores);
  if (!allScores[sender]) allScores[sender] = 0;
  if (!session.scores[sender]) session.scores[sender] = 0;

  if (isCorrect) {
    allScores[sender] += 10;
    session.scores[sender] += 10;
    await sock.sendMessage(jid, {
      text: `✅ *@${name}* सही जवाब! *+10 pts* 🎯\n🏆 Total: *${allScores[sender]} pts*`,
      mentions: [sender]
    });
    clearTimeout(session.timeout);
    if (session.currentPollId) pollToQuiz.delete(session.currentPollId);
    session.current++;
    setTimeout(() => sendNextQuestion(sock, jid, session.mode), 2500);
    return 'correct';
  } else {
    allScores[sender] -= 2;
    session.scores[sender] -= 2;
    await sock.sendMessage(jid, {
      text: `❌ *@${name}* गलत! *-2 pts*\n✅ सही था: *${LETTERS[qData.ans]}) ${correctOption}*\n📊 Total: *${allScores[sender]} pts*`,
      mentions: [sender]
    });
    return 'wrong';
  }
}

// ─────────────────────────────────────────
//  SEND NEXT QUESTION
// ─────────────────────────────────────────
async function sendNextQuestion(sock, jid, mode = 'text') {
  const session = activeQuizzes.get(jid);
  if (!session) return;

  if (session.current >= session.questions.length) {
    activeQuizzes.delete(jid);
    const scores = quizScores.get(jid);
    let finalText = `🎉 *QUIZ COMPLETED!* 🎉\n\n`;
    finalText += formatLeaderboard(scores, session.participants);
    finalText += `\n\n🔁 फिर से शुरू करें *.quiz* या *.jee* से`;
    await sock.sendMessage(jid, { text: finalText });
    return;
  }

  const qData = session.questions[session.current];
  session.answered.clear();
  session.currentPollId = null;

  const subjectEmoji = { P: '⚛️', C: '🧪', M: '📐' };
  const emoji = subjectEmoji[qData.subject] || '📚';

  // ── Header text (always sent) ──
  const headerText =
    `🌿 *Quiz* 🌿\n` +
    `〔 *Question ${session.current + 1} / ${session.questions.length}* 〕\n` +
    `${emoji} Chapter: *${qData.category}*\n\n` +
    `❓ *Question-*\n` +
    `${qData.q}\n\n` +
    `⏱️ _You have 30 seconds!_`;

  await sock.sendMessage(jid, { text: headerText });

  // ── Poll (radio buttons) ──
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
    fallback += `\n📝 Reply *A / B / C / D*`;
    await sock.sendMessage(jid, { text: fallback });
  }

  // ── Auto-timeout ──
  session.timeout = setTimeout(async () => {
    const cur = activeQuizzes.get(jid);
    if (!cur || cur.current !== session.current) return;
    if (session.currentPollId) pollToQuiz.delete(session.currentPollId);
    const correctOption = qData.options[qData.ans];
    await sock.sendMessage(jid, {
      text: `⏱️ *Time's up!*\n\n✅ Correct: *${LETTERS[qData.ans]}) ${correctOption}*\n\n_Next question..._`
    });
    cur.current++;
    setTimeout(() => sendNextQuestion(sock, jid, mode), 2000);
  }, ANSWER_TIMEOUT);
}

// ─────────────────────────────────────────
//  POLL VOTE HANDLER (called from index.js)
// ─────────────────────────────────────────
module.exports.handlePollVote = async function(sock, pollUpdate) {
  try {
    const pollId = pollUpdate?.pollCreationMessageKey?.id;
    if (!pollId) return false;
    const entry = pollToQuiz.get(pollId);
    if (!entry) return false;
    const { jid, questionIndex } = entry;
    const session = activeQuizzes.get(jid);
    if (!session || session.current !== questionIndex) return false;

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
    console.error('[Quiz PollVote Error]', e.message);
    return false;
  }
};

// ─────────────────────────────────────────
//  TEXT ANSWER HANDLER (called from handler.js)
// ─────────────────────────────────────────
module.exports.handleAnswer = async function(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const session = activeQuizzes.get(jid);
  if (!session) return false;

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
//  EXPORTED SESSION MAP (for jee.js to use)
// ─────────────────────────────────────────
module.exports.activeQuizzes = activeQuizzes;
module.exports.quizScores    = quizScores;
module.exports.pollToQuiz    = pollToQuiz;
module.exports.jeeQuestions  = jeeQuestions;
module.exports.getRandomQuestions = getRandomQuestions;
module.exports.formatLeaderboard  = formatLeaderboard;
module.exports.sendNextQuestion   = sendNextQuestion;
module.exports.processAnswer      = processAnswer;
module.exports.LETTERS            = LETTERS;
module.exports.ANSWER_TIMEOUT     = ANSWER_TIMEOUT;

// ─────────────────────────────────────────
//  MAIN COMMAND EXPORT
// ─────────────────────────────────────────
module.exports = {
  ...module.exports,
  name: 'quiz',
  aliases: ['trivia', 'quizstart'],
  description: 'JEE level PCM quiz with poll options!',
  category: 'fun',
  usage: '.quiz [start|stop|score|leaderboard|pcm|physics|chemistry|math]',

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
      await sock.sendMessage(jid, { text: `📊 *${name}*, your score: *${myScore} pts* 🎯` }, { quoted: msg });
      return;
    }

    // Stop
    if (['stop', 'end'].includes(subCmd)) {
      const session = activeQuizzes.get(jid);
      if (!session) { await sock.sendMessage(jid, { text: '❌ No quiz is running!' }, { quoted: msg }); return; }
      clearTimeout(session.timeout);
      if (session.currentPollId) pollToQuiz.delete(session.currentPollId);
      activeQuizzes.delete(jid);
      const scores = quizScores.get(jid);
      await sock.sendMessage(jid, { text: `🛑 *Quiz stopped!*\n\n` + formatLeaderboard(scores, session.participants) });
      return;
    }

    if (activeQuizzes.has(jid)) {
      await sock.sendMessage(jid, { text: '⚠️ Quiz already running! Use *.quiz stop* to stop.' }, { quoted: msg });
      return;
    }

    // Subject filter
    let subjects = ['P', 'C', 'M'];
    if (subCmd === 'physics')   subjects = ['P'];
    if (subCmd === 'chemistry') subjects = ['C'];
    if (['math', 'maths'].includes(subCmd)) subjects = ['M'];
    if (subCmd === 'pcm') subjects = ['P', 'C', 'M'];

    const questions = getRandomQuestions(10, subjects);
    const session = {
      questions, current: 0, scores: {}, participants: {},
      answered: new Set(), timeout: null, currentPollId: null, mode: 'text'
    };
    session.participants[sender] = msg.pushName || sender.split('@')[0];
    activeQuizzes.set(jid, session);
    if (!quizScores.has(jid)) quizScores.set(jid, {});

    const subjectLabel = subjects.length === 3 ? 'PCM' : (subjects[0] === 'P' ? 'Physics' : subjects[0] === 'C' ? 'Chemistry' : 'Mathematics');

    await sock.sendMessage(jid, {
      text:
        `🎮 *JEE DAILY CHALLENGE!* 🎮\n\n` +
        `📋 *10 Questions* — ${subjectLabel}\n` +
        `📊 *Difficulty:* JEE Mains Level\n\n` +
        `🏆 *Scoring:*\n` +
        `  • ✅ Correct = *+10 pts*\n` +
        `  • ❌ Wrong = *-2 pts*\n` +
        `  • ⏱️ Timeout = *0 pts*\n\n` +
        `📌 Poll tap karke ya *A/B/C/D* type karke answer do\n` +
        `⏸️ *.quiz stop* | *.quiz score* | *.quiz lb*\n\n` +
        `_Starting in 3 seconds..._`
    });

    setTimeout(() => sendNextQuestion(sock, jid, 'text'), 3000);
  }
};
