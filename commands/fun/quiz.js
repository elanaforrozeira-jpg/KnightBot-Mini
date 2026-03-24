/**
 * 🎯 QUIZ COMMAND — WhatsApp Native Poll Format
 * Classic Telegram-style quiz with radio button options
 */

const activeQuizzes = new Map();   // jid -> session
const quizScores   = new Map();    // jid -> { userId: score }
const pollToQuiz   = new Map();    // pollMsgId -> { jid, questionIndex }

// ─────────────────────────────────────────────
//  QUESTION BANK
// ─────────────────────────────────────────────
const quizQuestions = [
  // General Knowledge
  { q: 'What is the capital of India?', options: ['Mumbai', 'Delhi', 'Kolkata', 'Chennai'], ans: 1, category: 'General Knowledge' },
  { q: 'Which planet is known as the Red Planet?', options: ['Earth', 'Jupiter', 'Mars', 'Venus'], ans: 2, category: 'General Knowledge' },
  { q: 'Who invented the telephone?', options: ['Edison', 'Tesla', 'Bell', 'Marconi'], ans: 2, category: 'General Knowledge' },
  { q: 'How many continents are there on Earth?', options: ['5', '6', '7', '8'], ans: 2, category: 'General Knowledge' },
  { q: 'What is the largest ocean?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], ans: 3, category: 'General Knowledge' },
  { q: 'Which country has the most population?', options: ['USA', 'India', 'China', 'Brazil'], ans: 2, category: 'General Knowledge' },
  { q: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'Maldives', 'San Marino'], ans: 1, category: 'General Knowledge' },
  { q: 'Which is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], ans: 1, category: 'General Knowledge' },

  // Science
  { q: 'What is the chemical symbol for Gold?', options: ['Go', 'Gd', 'Au', 'Ag'], ans: 2, category: 'Science' },
  { q: 'How many bones are in the human body?', options: ['196', '206', '216', '226'], ans: 1, category: 'Science' },
  { q: 'What gas do plants absorb from the air?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], ans: 2, category: 'Science' },
  { q: 'What is H2O commonly known as?', options: ['Hydrogen', 'Oxygen', 'Water', 'Salt'], ans: 2, category: 'Science' },
  { q: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Chloroplast'], ans: 2, category: 'Science' },
  { q: 'What is the speed of light (approx)?', options: ['3×10⁷ m/s', '3×10⁸ m/s', '3×10⁹ m/s', '3×10⁶ m/s'], ans: 1, category: 'Science' },

  // Mathematics
  { q: 'What is 12 × 12?', options: ['132', '144', '124', '148'], ans: 1, category: 'Mathematics' },
  { q: 'What is the square root of 144?', options: ['11', '12', '13', '14'], ans: 1, category: 'Mathematics' },
  { q: 'What is 15% of 200?', options: ['25', '30', '35', '20'], ans: 1, category: 'Mathematics' },
  { q: 'What is the value of Pi (approx)?', options: ['3.14', '2.71', '1.61', '3.41'], ans: 0, category: 'Mathematics' },
  { q: 'What is 2⁸?', options: ['128', '256', '512', '64'], ans: 1, category: 'Mathematics' },

  // Technology
  { q: 'What does CPU stand for?', options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Core Processing Unit'], ans: 1, category: 'Technology' },
  { q: 'Who founded Microsoft?', options: ['Steve Jobs', 'Elon Musk', 'Bill Gates', 'Mark Zuckerberg'], ans: 2, category: 'Technology' },
  { q: 'What does HTML stand for?', options: ['HyperText Markup Language', 'HighText Machine Language', 'HyperText Machine Learning', 'None'], ans: 0, category: 'Technology' },
  { q: 'Which language is used for Android apps primarily?', options: ['Python', 'Swift', 'Java/Kotlin', 'C++'], ans: 2, category: 'Technology' },
  { q: 'What does RAM stand for?', options: ['Random Access Memory', 'Read Access Memory', 'Run Application Memory', 'Remote Access Module'], ans: 0, category: 'Technology' },

  // Sports
  { q: 'How many players are in a football (soccer) team?', options: ['9', '10', '11', '12'], ans: 2, category: 'Sports' },
  { q: 'How many runs is a "six" worth in cricket?', options: ['4', '5', '6', '7'], ans: 2, category: 'Sports' },
  { q: 'How many sets are in a standard tennis match (men)?', options: ['3', '4', '5', '2'], ans: 2, category: 'Sports' },

  // India
  { q: 'Who is known as the Father of the Nation in India?', options: ['Nehru', 'Gandhi', 'Patel', 'Bose'], ans: 1, category: 'India' },
  { q: 'What is the national animal of India?', options: ['Lion', 'Elephant', 'Tiger', 'Leopard'], ans: 2, category: 'India' },
  { q: 'In which year did India gain independence?', options: ['1945', '1946', '1947', '1948'], ans: 2, category: 'India' },
  { q: 'What is the currency of India?', options: ['Dollar', 'Pound', 'Rupee', 'Yen'], ans: 2, category: 'India' },

  // Biology (JEE)
  { q: 'In a dihybrid cross F₂ generation, what fraction shows both recessive phenotypes?', options: ['1/16', '1/9', '1/4', '3/16'], ans: 0, category: 'Biology' },
  { q: 'Which organelle is responsible for protein synthesis?', options: ['Mitochondria', 'Ribosome', 'Golgi Body', 'Lysosome'], ans: 1, category: 'Biology' },
  { q: 'What is the full form of DNA?', options: ['Deoxyribonucleic Acid', 'Diribonucleic Acid', 'Deoxyribose Nucleic Acid', 'None'], ans: 0, category: 'Biology' },

  // Physics (JEE)
  { q: "Newton's second law relates force to:", options: ['Velocity', 'Acceleration', 'Displacement', 'Energy'], ans: 1, category: 'Physics' },
  { q: 'What is the SI unit of electric charge?', options: ['Ampere', 'Volt', 'Coulomb', 'Ohm'], ans: 2, category: 'Physics' },

  // Chemistry (JEE)
  { q: 'What is the atomic number of Carbon?', options: ['4', '6', '8', '12'], ans: 1, category: 'Chemistry' },
  { q: 'Which gas is produced when metals react with dilute acids?', options: ['Oxygen', 'CO2', 'Hydrogen', 'Nitrogen'], ans: 2, category: 'Chemistry' },
];

const ANSWER_TIMEOUT = 30000; // 30 seconds per question
const NUMBERS = ['1', '2', '3', '4'];

function getRandomQuestions(count = 10) {
  const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ─────────────────────────────────────────────
//  CLASSIC QUESTION HEADER (text message before poll)
// ─────────────────────────────────────────────
function formatQuestionHeader(questionData, index, total) {
  const { q, category } = questionData;
  let text = '';
  text += `🌿 *Quiz* 🌿\n`;
  text += `〔 *Question ${index + 1} / ${total}* 〕\n`;
  text += `🏷️ Chapter: *${category}*\n\n`;
  text += `❓ *Question-*\n`;
  text += `${q}\n\n`;
  text += `⏱️ _You have 30 seconds to answer!_`;
  return text;
}

// ─────────────────────────────────────────────
//  LEADERBOARD
// ─────────────────────────────────────────────
function formatLeaderboard(scores, participants) {
  if (!scores || Object.keys(scores).length === 0) return '📊 No scores yet!';
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const medals = ['🥇', '🥈', '🥉'];
  let text = `╔══════════════════╗\n`;
  text += `║  🏆 LEADERBOARD  ║\n`;
  text += `╚══════════════════╝\n\n`;
  sorted.forEach(([userId, score], i) => {
    const medal = medals[i] || `${i + 1}.`;
    const name = participants?.[userId] || userId.split('@')[0];
    text += `${medal} *${name}* — ${score} pts\n`;
  });
  return text;
}

// ─────────────────────────────────────────────
//  SEND NEXT QUESTION (Poll + Header)
// ─────────────────────────────────────────────
async function sendNextQuestion(sock, jid) {
  const session = activeQuizzes.get(jid);
  if (!session) return;

  if (session.current >= session.questions.length) {
    activeQuizzes.delete(jid);
    const scores = quizScores.get(jid);
    let finalText = `🎉 *QUIZ COMPLETED!* 🎉\n\n`;
    finalText += formatLeaderboard(scores, session.participants);
    finalText += `\n\n🔁 Start again with *.quiz*`;
    await sock.sendMessage(jid, { text: finalText });
    return;
  }

  const qData = session.questions[session.current];
  session.answered.clear();
  session.currentPollId = null;

  // 1️⃣ Send classic question header text
  await sock.sendMessage(jid, {
    text: formatQuestionHeader(qData, session.current, session.questions.length)
  });

  // 2️⃣ Send WhatsApp native POLL (radio buttons — selectableOptionsCount: 1)
  let pollMsg;
  try {
    pollMsg = await sock.sendMessage(jid, {
      poll: {
        name: `📝 *Options:*`,
        values: qData.options,          // ['1/16', '1/9', '1/4', '1/3']
        selectableOptionsCount: 1       // Single-select = radio buttons
      }
    });
    // Track poll message ID for answer detection
    if (pollMsg?.key?.id) {
      session.currentPollId = pollMsg.key.id;
      pollToQuiz.set(pollMsg.key.id, { jid, questionIndex: session.current });
    }
  } catch (e) {
    // Fallback to text if poll fails
    let fallback = `*Options:*\n`;
    qData.options.forEach((opt, i) => {
      fallback += `  ${NUMBERS[i]}️⃣  ${opt}\n`;
    });
    fallback += `\n📝 Reply with *1*, *2*, *3*, or *4*`;
    await sock.sendMessage(jid, { text: fallback });
  }

  // 3️⃣ Auto-timeout
  session.timeout = setTimeout(async () => {
    const currentSession = activeQuizzes.get(jid);
    if (!currentSession || currentSession.current !== session.current) return;

    // Clean up poll tracking
    if (session.currentPollId) pollToQuiz.delete(session.currentPollId);

    const correctOption = qData.options[qData.ans];
    await sock.sendMessage(jid, {
      text: `⏱️ *Time's up!*\n\n✅ Correct Answer: *${qData.ans + 1}) ${correctOption}*\n\n_Next question..._`
    });
    currentSession.current++;
    setTimeout(() => sendNextQuestion(sock, jid), 2000);
  }, ANSWER_TIMEOUT);
}

// ─────────────────────────────────────────────
//  PROCESS POLL VOTE (called from handler.js)
// ─────────────────────────────────────────────
module.exports.handlePollVote = async function(sock, pollUpdate) {
  try {
    // pollUpdate structure from Baileys: { pollCreationMessageKey, voter, selectedOptions }
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

    // selectedOptions[0] is the option TEXT the user picked
    const chosenText = selectedOptions[0];
    const qData = session.questions[session.current];
    const chosenIndex = qData.options.indexOf(chosenText);
    if (chosenIndex === -1) return false;

    // One answer per person per question
    if (session.answered.has(sender)) return true;
    session.answered.add(sender);

    if (!session.participants[sender]) {
      // Try to get name from contact
      session.participants[sender] = sender.split('@')[0];
    }

    const isCorrect = chosenIndex === qData.ans;
    const correctOption = qData.options[qData.ans];
    const name = session.participants[sender];

    const allScores = quizScores.get(jid) || {};
    if (!allScores[sender]) allScores[sender] = 0;
    if (!session.scores[sender]) session.scores[sender] = 0;
    quizScores.set(jid, allScores);

    if (isCorrect) {
      allScores[sender] += 10;
      session.scores[sender] += 10;
      await sock.sendMessage(jid, {
        text: `✅ *@${name}* got it correct! *+10 pts* 🎯\n🏆 Total: *${allScores[sender]} pts*`,
        mentions: [sender]
      });
      clearTimeout(session.timeout);
      pollToQuiz.delete(pollId);
      session.current++;
      setTimeout(() => sendNextQuestion(sock, jid), 2500);
    } else {
      allScores[sender] -= 2;
      session.scores[sender] -= 2;
      await sock.sendMessage(jid, {
        text: `❌ *@${name}* wrong! *-2 pts*\n✅ Correct was: *${qData.ans + 1}) ${correctOption}*\n📊 Total: *${allScores[sender]} pts*`,
        mentions: [sender]
      });
    }

    return true;
  } catch (e) {
    console.error('[Quiz PollVote Error]', e);
    return false;
  }
};

// ─────────────────────────────────────────────
//  TEXT ANSWER HANDLER (fallback A/B/C/D or 1/2/3/4)
// ─────────────────────────────────────────────
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
  let clean = rawText.replace(/@\d+/g, '').trim();
  clean = clean.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase();
  const ch = clean.charAt(0);
  // Accept A/B/C/D or 1/2/3/4
  if (['A', 'B', 'C', 'D'].includes(ch)) return ['A', 'B', 'C', 'D'].indexOf(ch);
  if (['1', '2', '3', '4'].includes(ch)) return parseInt(ch) - 1;
  return -1;
}

module.exports.handleAnswer = async function(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const session = activeQuizzes.get(jid);
  if (!session) return false;

  const rawText = extractText(msg);
  const answerIndex = parseAnswer(rawText);
  if (answerIndex === -1) return false;

  if (session.answered.has(sender)) {
    await sock.sendMessage(jid, {
      text: `⚠️ @${sender.split('@')[0]}, you already answered!`,
      mentions: [sender]
    });
    return true;
  }

  session.answered.add(sender);
  if (!session.participants[sender]) {
    session.participants[sender] = msg.pushName || sender.split('@')[0];
  }

  const qData = session.questions[session.current];
  const isCorrect = answerIndex === qData.ans;
  const correctOption = qData.options[qData.ans];
  const name = session.participants[sender];

  const allScores = quizScores.get(jid) || {};
  if (!allScores[sender]) allScores[sender] = 0;
  if (!session.scores[sender]) session.scores[sender] = 0;
  quizScores.set(jid, allScores);

  if (isCorrect) {
    allScores[sender] += 10;
    session.scores[sender] += 10;
    await sock.sendMessage(jid, {
      text: `✅ *@${name}* correct! *+10 pts* 🎯\n🏆 Total: *${allScores[sender]} pts*`,
      mentions: [sender]
    });
    clearTimeout(session.timeout);
    if (session.currentPollId) pollToQuiz.delete(session.currentPollId);
    session.current++;
    setTimeout(() => sendNextQuestion(sock, jid), 2500);
  } else {
    allScores[sender] -= 2;
    session.scores[sender] -= 2;
    await sock.sendMessage(jid, {
      text: `❌ *@${name}* wrong! *-2 pts*\n✅ Correct: *${qData.ans + 1}) ${correctOption}*\n📊 Total: *${allScores[sender]} pts*`,
      mentions: [sender]
    });
  }

  return true;
};

// ─────────────────────────────────────────────
//  MAIN EXPORT
// ─────────────────────────────────────────────
module.exports = {
  ...module.exports,
  name: 'quiz',
  aliases: ['trivia', 'quizstart'],
  description: 'Classic quiz with WhatsApp native poll (radio buttons)!',
  category: 'fun',
  usage: '.quiz [start|stop|score|leaderboard]',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const subCmd = args[0]?.toLowerCase() || 'start';

    if (subCmd === 'leaderboard' || subCmd === 'lb') {
      const scores = quizScores.get(jid);
      const session = activeQuizzes.get(jid);
      await sock.sendMessage(jid, { text: formatLeaderboard(scores, session?.participants) }, { quoted: msg });
      return;
    }

    if (subCmd === 'score') {
      const scores = quizScores.get(jid);
      const myScore = scores?.[sender] || 0;
      const name = msg.pushName || sender.split('@')[0];
      await sock.sendMessage(jid, { text: `📊 *${name}*, your score: *${myScore} pts* 🎯` }, { quoted: msg });
      return;
    }

    if (subCmd === 'stop' || subCmd === 'end') {
      const session = activeQuizzes.get(jid);
      if (!session) {
        await sock.sendMessage(jid, { text: '❌ No quiz is running!' }, { quoted: msg });
        return;
      }
      clearTimeout(session.timeout);
      if (session.currentPollId) pollToQuiz.delete(session.currentPollId);
      activeQuizzes.delete(jid);
      const scores = quizScores.get(jid);
      await sock.sendMessage(jid, { text: `🛑 *Quiz stopped!*\n\n` + formatLeaderboard(scores, session.participants) });
      return;
    }

    if (activeQuizzes.has(jid)) {
      await sock.sendMessage(jid, {
        text: '⚠️ Quiz already running! Use *.quiz stop* to stop.'
      }, { quoted: msg });
      return;
    }

    const questions = getRandomQuestions(10);
    const session = {
      questions,
      current: 0,
      scores: {},
      participants: {},
      answered: new Set(),
      timeout: null,
      currentPollId: null
    };
    session.participants[sender] = msg.pushName || sender.split('@')[0];
    activeQuizzes.set(jid, session);
    if (!quizScores.has(jid)) quizScores.set(jid, {});

    await sock.sendMessage(jid, {
      text: `🎮 *DAILY CHALLENGE QUIZ!* 🎮\n\n` +
        `📋 *10 Questions* from: GK, Science, Math, Tech, Sports, India, Biology, Physics, Chemistry!\n\n` +
        `🏆 *Scoring:*\n` +
        `  • ✅ Correct = *+10 pts*\n` +
        `  • ❌ Wrong = *-2 pts*\n` +
        `  • ⏱️ Timeout = *0 pts*\n\n` +
        `📊 Tap the poll option to answer!\n` +
        `⏸️ *.quiz stop* to end | *.quiz score* for your score\n\n` +
        `_Starting in 3 seconds..._`
    });

    setTimeout(() => sendNextQuestion(sock, jid), 3000);
  }
};
