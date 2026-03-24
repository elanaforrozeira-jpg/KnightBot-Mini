/**
 * 🎯 QUIZ COMMAND — Text mode quiz with WhatsApp native poll
 * Commands: .quiz | .quiz stop | .quiz score | .quiz leaderboard
 */

const activeQuizzes = new Map();
const quizScores   = new Map();
const pollToQuiz   = new Map();

// ─────────────────────────────────────────
//  QUESTION BANK — JEE Mains + Advanced Level
// ─────────────────────────────────────────
const jeeQuestions = [

  // ── PHYSICS ──
  { q: 'A body thrown vertically up with velocity u. Ratio of time of ascent to descent is:', options: ['1:1', '1:2', '2:1', 'u:g'], ans: 0, category: 'Kinematics', subject: 'P' },
  { q: 'Dimensional formula of angular momentum is:', options: ['[ML²T⁻²]', '[ML²T⁻¹]', '[MLT⁻¹]', '[M²L²T⁻¹]'], ans: 1, category: 'Dimensions', subject: 'P' },
  { q: 'Which has the highest penetrating power?', options: ['Alpha', 'Beta', 'Gamma', 'X-rays'], ans: 2, category: 'Modern Physics', subject: 'P' },
  { q: 'Work done moving 2C across 12V potential difference:', options: ['6 J', '10 J', '24 J', '14 J'], ans: 2, category: 'Electrostatics', subject: 'P' },
  { q: 'SI unit of magnetic flux is:', options: ['Tesla', 'Weber', 'Gauss', 'Henry'], ans: 1, category: 'Magnetism', subject: 'P' },
  { q: 'In photoelectric effect, stopping potential depends on:', options: ['Intensity', 'Frequency', 'Both', 'Neither'], ans: 1, category: 'Modern Physics', subject: 'P' },
  { q: 'de Broglie wavelength is inversely proportional to:', options: ['Mass', 'Speed', 'Momentum', 'Energy'], ans: 2, category: 'Modern Physics', subject: 'P' },
  { q: 'Two resistors 4Ω and 6Ω in parallel. Equivalent resistance:', options: ['10 Ω', '2.4 Ω', '5 Ω', '1.2 Ω'], ans: 1, category: 'Current Electricity', subject: 'P' },
  { q: 'Escape velocity from Earth surface is approximately:', options: ['7.9 km/s', '11.2 km/s', '3.0 km/s', '9.8 km/s'], ans: 1, category: 'Gravitation', subject: 'P' },
  { q: 'Binding energy per nucleon is maximum for:', options: ['U-238', 'He-4', 'Fe-56', 'C-12'], ans: 2, category: 'Nuclear Physics', subject: 'P' },
  { q: 'A ball is dropped from height h. Time to reach ground is:', options: ['sqrt(h/g)', 'sqrt(2h/g)', '2sqrt(h/g)', 'h/g'], ans: 1, category: 'Kinematics', subject: 'P' },
  { q: 'If temperature of black body doubles, radiated power becomes:', options: ['2 times', '4 times', '8 times', '16 times'], ans: 3, category: 'Thermal Physics', subject: 'P' },
  { q: 'A wire of resistance R is stretched to double its length. New resistance:', options: ['R/2', 'R', '2R', '4R'], ans: 3, category: 'Current Electricity', subject: 'P' },
  { q: 'Which quantity is conserved in elastic collision?', options: ['KE only', 'Momentum only', 'Both KE and momentum', 'Neither'], ans: 2, category: 'Laws of Motion', subject: 'P' },
  { q: 'In Young\'s double slit, fringe width beta. Slit sep doubled, new fringe width:', options: ['beta/2', '2*beta', 'beta', '4*beta'], ans: 0, category: 'Wave Optics', subject: 'P' },
  { q: 'A capacitor of capacitance C is charged to V. Energy stored is:', options: ['CV', 'CV²', 'CV²/2', '2CV²'], ans: 2, category: 'Electrostatics', subject: 'P' },
  { q: 'Which gate gives output 1 only when both inputs are 0?', options: ['AND', 'OR', 'NOR', 'NAND'], ans: 2, category: 'Electronics', subject: 'P' },
  { q: 'In SHM, acceleration is maximum at:', options: ['Mean position', 'Extreme position', 'Any point', 'Half amplitude'], ans: 1, category: 'Oscillations', subject: 'P' },
  { q: 'Moment of inertia of solid sphere about diameter:', options: ['MR²', '2MR²/3', '2MR²/5', 'MR²/2'], ans: 2, category: 'Rotational Motion', subject: 'P' },
  { q: 'Threshold frequency in photoelectric effect depends on:', options: ['Intensity', 'Metal surface', 'Both', 'Temperature'], ans: 1, category: 'Modern Physics', subject: 'P' },

  // ── CHEMISTRY ──
  { q: 'Which has highest ionization energy?', options: ['Na', 'Mg', 'Al', 'Si'], ans: 1, category: 'Periodic Table', subject: 'C' },
  { q: 'Hybridization of carbon in diamond:', options: ['sp', 'sp²', 'sp³', 'sp³d'], ans: 2, category: 'Chemical Bonding', subject: 'C' },
  { q: 'Gas produced when sodium reacts with water:', options: ['Oxygen', 'Nitrogen', 'Hydrogen', 'CO₂'], ans: 2, category: 's-Block', subject: 'C' },
  { q: 'Bond angle in water molecule is approximately:', options: ['109.5°', '120°', '104.5°', '180°'], ans: 2, category: 'Chemical Bonding', subject: 'C' },
  { q: 'Which is a Lewis acid?', options: ['NH₃', 'H₂O', 'BF₃', 'F⁻'], ans: 2, category: 'Equilibrium', subject: 'C' },
  { q: 'Oxidation state of Cr in K₂Cr₂O₇ is:', options: ['+3', '+6', '+4', '+7'], ans: 1, category: 'd-Block', subject: 'C' },
  { q: 'SN2 reaction is favored by:', options: ['Tertiary alkyl halides', 'Secondary', 'Primary alkyl halides', 'All equally'], ans: 2, category: 'Organic - Halides', subject: 'C' },
  { q: 'Enthalpy of formation of element in standard state is:', options: ['Positive', 'Negative', 'Zero', 'Depends'], ans: 2, category: 'Thermodynamics', subject: 'C' },
  { q: 'Which is most acidic?', options: ['CH₄', 'C₂H₂', 'C₂H₄', 'C₂H₆'], ans: 1, category: 'Organic - Basics', subject: 'C' },
  { q: 'Beckmann rearrangement converts:', options: ['Ketone to amine', 'Ketoxime to amide', 'Aldehyde to acid', 'Amine to nitro'], ans: 1, category: 'Organic - Named Rxns', subject: 'C' },
  { q: 'Number of sigma bonds in ethyne (HC≡CH):', options: ['1', '2', '3', '4'], ans: 2, category: 'Chemical Bonding', subject: 'C' },
  { q: 'Which gas has highest critical temperature?', options: ['H₂', 'N₂', 'CO₂', 'O₂'], ans: 2, category: 'States of Matter', subject: 'C' },
  { q: 'Rate of reaction doubles when temperature rises 10°C. This is explained by:', options: ['Le Chatelier', 'Arrhenius equation', 'Hess law', 'Raoult law'], ans: 1, category: 'Chemical Kinetics', subject: 'C' },
  { q: 'Which is not a colligative property?', options: ['Osmotic pressure', 'Optical rotation', 'Boiling point elevation', 'Vapour pressure lowering'], ans: 1, category: 'Solutions', subject: 'C' },
  { q: 'Compound with formula XeF₄ has geometry:', options: ['Tetrahedral', 'Square planar', 'See-saw', 'Square pyramidal'], ans: 1, category: 'Chemical Bonding', subject: 'C' },
  { q: 'In electrolysis, Faraday\'s second law relates to:', options: ['Time', 'Equivalent weights', 'Temperature', 'Voltage'], ans: 1, category: 'Electrochemistry', subject: 'C' },
  { q: 'Which is an example of lyophilic colloid?', options: ['Gold sol', 'Starch sol', 'As₂S₃ sol', 'Fe(OH)₃ sol'], ans: 1, category: 'Surface Chemistry', subject: 'C' },
  { q: 'Nylon-6,6 is formed from:', options: ['Hexamethylenediamine + adipic acid', 'Caprolactam', 'Ethylene glycol + terephthalic acid', 'Styrene'], ans: 0, category: 'Polymers', subject: 'C' },
  { q: 'Electrode potential of SHE is:', options: ['+1.0 V', '-1.0 V', '0 V', '+0.5 V'], ans: 2, category: 'Electrochemistry', subject: 'C' },
  { q: 'Strongest reducing agent among halogens:', options: ['F⁻', 'Cl⁻', 'Br⁻', 'I⁻'], ans: 3, category: 'p-Block', subject: 'C' },

  // ── MATHEMATICS ──
  { q: 'If f(x) = x² - 3x + 2, then f(0)+f(1)+f(2) = ?', options: ['0', '2', '3', '4'], ans: 1, category: 'Functions', subject: 'M' },
  { q: 'd/dx [sin(x²)] = ?', options: ['cos(x²)', '2x cos(x²)', 'cos(2x)', '2cos(x²)'], ans: 1, category: 'Differentiation', subject: 'M' },
  { q: '∫(1/x)dx = ?', options: ['x + C', 'ln|x| + C', '1/x² + C', '-1/x + C'], ans: 1, category: 'Integration', subject: 'M' },
  { q: 'Sum of roots of ax² + bx + c = 0 is:', options: ['b/a', '-b/a', 'c/a', '-c/a'], ans: 1, category: 'Quadratic Equations', subject: 'M' },
  { q: 'lim(x→0) sin(x)/x = ?', options: ['0', 'x', '1', '∞'], ans: 2, category: 'Limits', subject: 'M' },
  { q: 'Eccentricity of a circle is:', options: ['0', '1', '<1', '>1'], ans: 0, category: 'Conic Sections', subject: 'M' },
  { q: 'If det(A) = 5 for 3x3 matrix A, then det(2A) = ?', options: ['10', '20', '40', '25'], ans: 2, category: 'Matrices', subject: 'M' },
  { q: 'Angle between vectors i+j and i-j is:', options: ['0°', '45°', '90°', '180°'], ans: 2, category: 'Vectors', subject: 'M' },
  { q: 'General solution of dy/dx = y is:', options: ['y=Ce^x', 'y=Cx', 'y=C ln(x)', 'y=Ce^(-x)'], ans: 0, category: 'Differential Equations', subject: 'M' },
  { q: 'Slope of tangent to y = x³ at x = 2 is:', options: ['6', '8', '12', '4'], ans: 2, category: 'Differentiation', subject: 'M' },
  { q: 'cos(75°) = ?', options: ['(sqrt6-sqrt2)/4', '(sqrt6+sqrt2)/4', '(sqrt3-1)/2sqrt2', '(sqrt3+1)/2'], ans: 0, category: 'Trigonometry', subject: 'M' },
  { q: 'Number of terms in expansion of (1+x)^n is:', options: ['n', 'n-1', 'n+1', '2n'], ans: 2, category: 'Binomial Theorem', subject: 'M' },
  { q: 'If A and B are mutually exclusive, P(AuB) = ?', options: ['P(A)*P(B)', 'P(A)+P(B)', 'P(A)-P(B)', '1'], ans: 1, category: 'Probability', subject: 'M' },
  { q: '∫₀^π sin(x) dx = ?', options: ['0', '1', '2', 'π'], ans: 2, category: 'Integration', subject: 'M' },
  { q: 'The value of i^(4n+1) where n is integer:', options: ['1', '-1', 'i', '-i'], ans: 2, category: 'Complex Numbers', subject: 'M' },
  { q: 'If arithmetic mean of two numbers is 10 and geometric mean is 8, the numbers are:', options: ['4,16', '2,18', '6,14', '5,15'], ans: 0, category: 'Sequences', subject: 'M' },
  { q: 'Area of triangle with vertices (0,0),(4,0),(0,3) is:', options: ['6', '7', '12', '3.5'], ans: 0, category: 'Coordinate Geometry', subject: 'M' },
  { q: 'The number of diagonals in a hexagon is:', options: ['6', '9', '12', '15'], ans: 1, category: 'Permutations', subject: 'M' },
  { q: 'tan(A+B) = ? when tanA=1/2 and tanB=1/3:', options: ['1', '5/6', '6/5', '1/6'], ans: 0, category: 'Trigonometry', subject: 'M' },
  { q: 'Sum of infinite GP with first term 1 and ratio 1/2:', options: ['1', '1.5', '2', '3'], ans: 2, category: 'Sequences', subject: 'M' },
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
  return inner.conversation || inner.extendedTextMessage?.text || inner.imageMessage?.caption || inner.videoMessage?.caption || '';
}

function parseAnswer(rawText) {
  let clean = rawText.replace(/@\d+/g, '').trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const ch = clean.charAt(0);
  if (['A','B','C','D'].includes(ch)) return LETTERS.indexOf(ch);
  if (['1','2','3','4'].includes(ch)) return parseInt(ch) - 1;
  return -1;
}

// ─────────────────────────────────────────
//  CORE: PROCESS ANSWER
//  msgKey = msg.key when text answer (for react)
//  msgKey = null for poll answers (can't react on polls)
// ─────────────────────────────────────────
async function processAnswer(sock, jid, sender, session, answerIndex, nameOverride, msgKey = null) {
  if (session.answered.has(sender)) {
    if (msgKey) {
      await sock.sendMessage(jid, { text: `⚠️ @${sender.split('@')[0]}, already answered!`, mentions: [sender] });
    }
    return 'already';
  }

  session.answered.add(sender);
  const name = nameOverride || session.participants[sender] || sender.split('@')[0];
  session.participants[sender] = name;

  const qData = session.questions[session.current];
  const isCorrect = answerIndex === qData.ans;
  const correctOption = qData.options[qData.ans];

  // React on text message (not possible on poll)
  if (msgKey) {
    try {
      await sock.sendMessage(jid, { react: { text: isCorrect ? '✅' : '❌', key: msgKey } });
    } catch (_) {}
  }

  const allScores = quizScores.get(jid) || {};
  quizScores.set(jid, allScores);
  if (!allScores[sender]) allScores[sender] = 0;
  if (!session.scores[sender]) session.scores[sender] = 0;

  if (isCorrect) {
    allScores[sender] += 10;
    session.scores[sender] += 10;
    // Always send response (poll voters also need to see result)
    await sock.sendMessage(jid, {
      text: `✅ *${name}* sahi jawab! *+10 pts* 🎯\n🏆 Total: *${allScores[sender]} pts*`,
      mentions: [sender]
    });
    clearTimeout(session.timeout);
    if (session.currentPollId) pollToQuiz.delete(session.currentPollId);
    session.current++;
    const nextFn = session.mode === 'image'
      ? () => { try { require('./jee').sendImageQuestion(sock, jid); } catch(e) { sendNextQuestion(sock, jid, session.mode); } }
      : () => sendNextQuestion(sock, jid, session.mode);
    setTimeout(nextFn, 2500);
    return 'correct';
  } else {
    allScores[sender] -= 2;
    session.scores[sender] -= 2;
    // Always send response for poll voters too
    await sock.sendMessage(jid, {
      text: `❌ *${name}* galat! *-2 pts*\n✅ Sahi tha: *${LETTERS[qData.ans]}) ${correctOption}*\n📊 Total: *${allScores[sender]} pts*`,
      mentions: [sender]
    });
    return 'wrong';
  }
}

// ─────────────────────────────────────────
//  SEND NEXT QUESTION (text mode)
// ─────────────────────────────────────────
async function sendNextQuestion(sock, jid, mode = 'text') {
  const session = activeQuizzes.get(jid);
  if (!session) return;

  if (session.current >= session.questions.length) {
    activeQuizzes.delete(jid);
    const scores = quizScores.get(jid);
    let fin = `🎉 *QUIZ COMPLETED!* 🎉\n\n`;
    fin += formatLeaderboard(scores, session.participants);
    fin += `\n\n🔁 Phir se: *.quiz* ya *.jee*`;
    await sock.sendMessage(jid, { text: fin });
    return;
  }

  const qData = session.questions[session.current];
  session.answered.clear();
  session.pollVoters = new Set();
  session.currentPollId = null;

  const subEmoji = { P: '⚛️', C: '🧪', M: '📐' };
  await sock.sendMessage(jid, {
    text:
      `🌿 *Quiz* 🌿\n` +
      `[ *Q${session.current + 1}/${session.questions.length}* ] ${subEmoji[qData.subject]||'📚'} *${qData.category}*\n\n` +
      `❓ *${qData.q}*\n\n⏱️ _30 seconds!_`
  });

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

  session.timeout = setTimeout(async () => {
    const cur = activeQuizzes.get(jid);
    if (!cur || cur.current !== session.current) return;
    if (session.currentPollId) pollToQuiz.delete(session.currentPollId);
    const correct = qData.options[qData.ans];
    await sock.sendMessage(jid, {
      text: `⏱️ *Time's up!*\n\n✅ Correct: *${LETTERS[qData.ans]}) ${correct}*\n\n_Next question..._`
    });
    cur.current++;
    setTimeout(() => sendNextQuestion(sock, jid, mode), 2000);
  }, ANSWER_TIMEOUT);
}

// ─────────────────────────────────────────
//  POLL VOTE HANDLER
//  KEY FIX: Add participant name from pollUpdate.pushName
//  KEY FIX: Always send correct/wrong message to chat
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
    const selected = pollUpdate.selectedOptions || [];

    // Block multiple votes
    if (!session.pollVoters) session.pollVoters = new Set();
    if (session.pollVoters.has(sender)) return true;
    if (!selected.length) return false;
    session.pollVoters.add(sender);

    // Register participant name
    if (!session.participants[sender]) {
      session.participants[sender] = pollUpdate.pushName || sender.split('@')[0];
    }

    const qData = session.questions[session.current];
    const idx = qData.options.indexOf(selected[0]);
    if (idx === -1) return false;

    // Pass name override + null msgKey (polls can't be reacted to)
    await processAnswer(sock, jid, sender, session, idx, session.participants[sender], null);
    return true;
  } catch (e) {
    console.error('[PollVote Error]', e.message);
    return false;
  }
};

// ─────────────────────────────────────────
//  TEXT ANSWER HANDLER — reacts ✅/❌ on message
// ─────────────────────────────────────────
module.exports.handleAnswer = async function(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const session = activeQuizzes.get(jid);
  if (!session) return false;
  if (session.mode === 'image') return false; // handled by jee.js

  const raw = extractText(msg);
  const idx = parseAnswer(raw);
  if (idx === -1) return false;

  if (!session.participants[sender])
    session.participants[sender] = msg.pushName || sender.split('@')[0];

  await processAnswer(sock, jid, sender, session, idx, session.participants[sender], msg.key);
  return true;
};

// Exports
module.exports.activeQuizzes     = activeQuizzes;
module.exports.quizScores        = quizScores;
module.exports.pollToQuiz        = pollToQuiz;
module.exports.jeeQuestions      = jeeQuestions;
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

    if (['leaderboard','lb'].includes(subCmd)) {
      const sc = quizScores.get(jid); const se = activeQuizzes.get(jid);
      await sock.sendMessage(jid, { text: formatLeaderboard(sc, se?.participants) }, { quoted: msg }); return;
    }
    if (subCmd === 'score') {
      const sc = quizScores.get(jid); const pts = sc?.[sender] || 0;
      await sock.sendMessage(jid, { text: `📊 *${msg.pushName||sender.split('@')[0]}* — *${pts} pts* 🎯` }, { quoted: msg }); return;
    }
    if (['stop','end'].includes(subCmd)) {
      const se = activeQuizzes.get(jid);
      if (!se) { await sock.sendMessage(jid, { text: '❌ No quiz running!' }, { quoted: msg }); return; }
      clearTimeout(se.timeout);
      if (se.currentPollId) pollToQuiz.delete(se.currentPollId);
      activeQuizzes.delete(jid);
      await sock.sendMessage(jid, { text: `🛑 *Quiz stopped!*\n\n` + formatLeaderboard(quizScores.get(jid), se.participants) }); return;
    }
    if (activeQuizzes.has(jid)) {
      await sock.sendMessage(jid, { text: '⚠️ Quiz already running! *.quiz stop* to stop.' }, { quoted: msg }); return;
    }

    let subjects = ['P','C','M'];
    if (subCmd === 'physics')   subjects = ['P'];
    if (subCmd === 'chemistry') subjects = ['C'];
    if (['math','maths'].includes(subCmd)) subjects = ['M'];
    if (subCmd === 'pcm') subjects = ['P','C','M'];

    const questions = getRandomQuestions(10, subjects);
    const session = {
      questions, current: 0, scores: {}, participants: {},
      answered: new Set(), pollVoters: new Set(),
      timeout: null, currentPollId: null, mode: 'text'
    };
    session.participants[sender] = msg.pushName || sender.split('@')[0];
    activeQuizzes.set(jid, session);
    if (!quizScores.has(jid)) quizScores.set(jid, {});

    const label = subjects.length===3 ? 'PCM' : (subjects[0]==='P'?'Physics':subjects[0]==='C'?'Chemistry':'Mathematics');
    await sock.sendMessage(jid, {
      text:
        `🎮 *JEE DAILY CHALLENGE!* 🎮\n\n` +
        `📋 *10 Questions* — ${label} | JEE Mains Level\n\n` +
        `🏆 *Scoring:* ✅ +10 | ❌ -2 | ⏱️ timeout = 0\n\n` +
        `📌 Poll tap karo ya *A/B/C/D* type karo\n` +
        `⏸️ *.quiz stop* | *.quiz score* | *.quiz lb*\n\n` +
        `_Starting in 3 seconds..._`
    });
    setTimeout(() => sendNextQuestion(sock, jid, 'text'), 3000);
  }
};
