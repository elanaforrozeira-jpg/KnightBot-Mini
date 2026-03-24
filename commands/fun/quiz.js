const activeQuizzes = new Map(); // chatId -> quiz session data
const quizScores = new Map();    // chatId -> { userId: score }

const quizQuestions = [
  // General Knowledge
  { q: '🌍 What is the capital of India?', options: ['Mumbai', 'Delhi', 'Kolkata', 'Chennai'], ans: 1, category: 'GK' },
  { q: '🌍 Which planet is known as the Red Planet?', options: ['Earth', 'Jupiter', 'Mars', 'Venus'], ans: 2, category: 'GK' },
  { q: '🌍 Who invented the telephone?', options: ['Edison', 'Tesla', 'Bell', 'Marconi'], ans: 2, category: 'GK' },
  { q: '🌍 How many continents are there on Earth?', options: ['5', '6', '7', '8'], ans: 2, category: 'GK' },
  { q: '🌍 What is the largest ocean?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], ans: 3, category: 'GK' },
  { q: '🌍 Which country has the most population?', options: ['USA', 'India', 'China', 'Brazil'], ans: 2, category: 'GK' },
  { q: '🌍 What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'Maldives', 'San Marino'], ans: 1, category: 'GK' },
  { q: '🌍 Which is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], ans: 1, category: 'GK' },

  // Science
  { q: '🔬 What is the chemical symbol for Gold?', options: ['Go', 'Gd', 'Au', 'Ag'], ans: 2, category: 'Science' },
  { q: '🔬 How many bones are in the human body?', options: ['196', '206', '216', '226'], ans: 1, category: 'Science' },
  { q: '🔬 What gas do plants absorb from the air?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], ans: 2, category: 'Science' },
  { q: '🔬 What is the speed of light (approx)?', options: ['3×10⁷ m/s', '3×10⁸ m/s', '3×10⁹ m/s', '3×10⁶ m/s'], ans: 1, category: 'Science' },
  { q: '🔬 What is H2O commonly known as?', options: ['Hydrogen', 'Oxygen', 'Water', 'Salt'], ans: 2, category: 'Science' },
  { q: '🔬 What is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Chloroplast'], ans: 2, category: 'Science' },

  // Math
  { q: '🔢 What is 12 × 12?', options: ['132', '144', '124', '148'], ans: 1, category: 'Math' },
  { q: '🔢 What is the square root of 144?', options: ['11', '12', '13', '14'], ans: 1, category: 'Math' },
  { q: '🔢 What is 15% of 200?', options: ['25', '30', '35', '20'], ans: 1, category: 'Math' },
  { q: '🔢 What is the value of Pi (approx)?', options: ['3.14', '2.71', '1.61', '3.41'], ans: 0, category: 'Math' },

  // Technology
  { q: '💻 What does CPU stand for?', options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Core Processing Unit'], ans: 1, category: 'Tech' },
  { q: '💻 Who founded Microsoft?', options: ['Steve Jobs', 'Elon Musk', 'Bill Gates', 'Mark Zuckerberg'], ans: 2, category: 'Tech' },
  { q: '💻 What does HTML stand for?', options: ['HyperText Markup Language', 'HighText Machine Language', 'HyperText Machine Learning', 'None'], ans: 0, category: 'Tech' },
  { q: '💻 Which language is used for Android apps primarily?', options: ['Python', 'Swift', 'Java/Kotlin', 'C++'], ans: 2, category: 'Tech' },
  { q: '💻 What does RAM stand for?', options: ['Random Access Memory', 'Read Access Memory', 'Run Application Memory', 'Remote Access Module'], ans: 0, category: 'Tech' },

  // Sports
  { q: '⚽ How many players are in a football (soccer) team?', options: ['9', '10', '11', '12'], ans: 2, category: 'Sports' },
  { q: '🏏 How many runs is a "six" worth in cricket?', options: ['4', '5', '6', '7'], ans: 2, category: 'Sports' },
  { q: '🎾 How many sets are in a standard tennis match (men)?', options: ['3', '4', '5', '2'], ans: 2, category: 'Sports' },

  // India
  { q: '🇮🇳 Who is known as the Father of the Nation in India?', options: ['Nehru', 'Gandhi', 'Patel', 'Bose'], ans: 1, category: 'India' },
  { q: '🇮🇳 What is the national animal of India?', options: ['Lion', 'Elephant', 'Tiger', 'Leopard'], ans: 2, category: 'India' },
  { q: '🇮🇳 In which year did India gain independence?', options: ['1945', '1946', '1947', '1948'], ans: 2, category: 'India' },
  { q: '🇮🇳 What is the currency of India?', options: ['Dollar', 'Pound', 'Rupee', 'Yen'], ans: 2, category: 'India' },
];

const ANSWER_TIMEOUT = 30000; // 30 seconds per question
const LETTERS = ['A', 'B', 'C', 'D'];

function getRandomQuestions(count = 10) {
  const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function formatQuestion(questionData, index, total) {
  const { q, options, category } = questionData;
  let text = `╔══════════════════╗\n`;
  text += `║  🎯 QUIZ TIME!   ║\n`;
  text += `╚══════════════════╝\n\n`;
  text += `📌 *Question ${index + 1}/${total}* | 🏷️ ${category}\n\n`;
  text += `❓ *${q}*\n\n`;
  options.forEach((opt, i) => {
    text += `  ${LETTERS[i]}️⃣  ${opt}\n`;
  });
  text += `\n⏱️ _You have 30 seconds to answer!_\n`;
  text += `📝 Reply with *A*, *B*, *C*, or *D*`;
  return text;
}

function formatLeaderboard(scores, participants) {
  if (!scores || Object.keys(scores).length === 0) {
    return '📊 No scores yet!';
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const medals = ['🥇', '🥈', '🥉'];
  let text = `╔══════════════════╗\n`;
  text += `║  🏆 LEADERBOARD  ║\n`;
  text += `╚══════════════════╝\n\n`;
  sorted.forEach(([userId, score], index) => {
    const medal = medals[index] || `${index + 1}.`;
    const name = participants?.[userId] || userId.split('@')[0];
    text += `${medal} *${name}* — ${score} pts\n`;
  });
  return text;
}

module.exports = {
  name: 'quiz',
  aliases: ['trivia', 'quizstart'],
  description: 'Start an interactive quiz game with scoring and leaderboard!',
  category: 'fun',
  usage: '.quiz [start|stop|score|leaderboard]',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const subCmd = args[0]?.toLowerCase() || 'start';

    // --- LEADERBOARD ---
    if (subCmd === 'leaderboard' || subCmd === 'lb') {
      const scores = quizScores.get(jid);
      const session = activeQuizzes.get(jid);
      const text = formatLeaderboard(scores, session?.participants);
      await sock.sendMessage(jid, { text }, { quoted: msg });
      return;
    }

    // --- SCORE ---
    if (subCmd === 'score') {
      const scores = quizScores.get(jid);
      const myScore = scores?.[sender] || 0;
      const name = msg.pushName || sender.split('@')[0];
      await sock.sendMessage(jid, {
        text: `📊 *${name}*, your score in this chat: *${myScore} pts* 🎯`
      }, { quoted: msg });
      return;
    }

    // --- STOP ---
    if (subCmd === 'stop' || subCmd === 'end') {
      const session = activeQuizzes.get(jid);
      if (!session) {
        await sock.sendMessage(jid, { text: '❌ No quiz is running in this chat!' }, { quoted: msg });
        return;
      }
      clearTimeout(session.timeout);
      activeQuizzes.delete(jid);
      const scores = quizScores.get(jid);
      let endText = `🛑 *Quiz stopped!*\n\n`;
      endText += formatLeaderboard(scores, session.participants);
      await sock.sendMessage(jid, { text: endText });
      return;
    }

    // --- START ---
    if (activeQuizzes.has(jid)) {
      await sock.sendMessage(jid, {
        text: '⚠️ A quiz is already running! Type *.quiz stop* to stop it or *.quiz leaderboard* to see scores.'
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
      timeout: null
    };

    // Track participant names
    session.participants[sender] = msg.pushName || sender.split('@')[0];

    activeQuizzes.set(jid, session);
    if (!quizScores.has(jid)) quizScores.set(jid, {});

    await sock.sendMessage(jid, {
      text: `🎮 *QUIZ STARTED!* 🎮\n\n📋 10 random questions from categories: GK, Science, Math, Tech, Sports, India!\n\n🏆 *Scoring:*\n  • ✅ Correct answer = *+10 pts*\n  • ❌ Wrong answer = *-2 pts*\n  • ⏱️ No answer = *0 pts*\n\n📝 Reply *A / B / C / D* for each question\n⏸️ Use *.quiz stop* to end | *.quiz score* for your score\n\n_Starting in 3 seconds..._`
    });

    setTimeout(() => sendNextQuestion(sock, jid), 3000);
  }
};

async function sendNextQuestion(sock, jid) {
  const session = activeQuizzes.get(jid);
  if (!session) return;

  if (session.current >= session.questions.length) {
    // Quiz finished
    activeQuizzes.delete(jid);
    const scores = quizScores.get(jid);
    let finalText = `🎉 *QUIZ COMPLETED!* 🎉\n\n`;
    finalText += formatLeaderboard(scores, session.participants);
    finalText += `\n\n🔁 Start again with *.quiz start*`;
    await sock.sendMessage(jid, { text: finalText });
    return;
  }

  const qData = session.questions[session.current];
  session.answered.clear();
  const qText = formatQuestion(qData, session.current, session.questions.length);
  await sock.sendMessage(jid, { text: qText });

  // Auto-advance after timeout
  session.timeout = setTimeout(async () => {
    const currentSession = activeQuizzes.get(jid);
    if (!currentSession || currentSession.current !== session.current) return;

    const correctLetter = LETTERS[qData.ans];
    const correctOption = qData.options[qData.ans];
    await sock.sendMessage(jid, {
      text: `⏱️ *Time's up!*\n\n✅ Correct answer: *${correctLetter}) ${correctOption}*\n\n_Next question loading..._`
    });

    currentSession.current++;
    setTimeout(() => sendNextQuestion(sock, jid), 2000);
  }, ANSWER_TIMEOUT);
}

// Answer handler - call this from your main handler.js
module.exports.handleAnswer = async function(sock, msg) {
  const jid = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  const answer = text.trim().toUpperCase();

  if (!['A', 'B', 'C', 'D'].includes(answer)) return false;

  const session = activeQuizzes.get(jid);
  if (!session) return false;

  // Prevent multiple answers from same user per question
  if (session.answered.has(sender)) {
    await sock.sendMessage(jid, {
      text: `⚠️ @${sender.split('@')[0]}, you already answered this question!`,
      mentions: [sender]
    });
    return true;
  }

  session.answered.add(sender);

  // Track participant name
  if (!session.participants[sender]) {
    session.participants[sender] = msg.pushName || sender.split('@')[0];
  }

  const qData = session.questions[session.current];
  const answerIndex = LETTERS.indexOf(answer);
  const isCorrect = answerIndex === qData.ans;
  const correctLetter = LETTERS[qData.ans];
  const correctOption = qData.options[qData.ans];
  const name = session.participants[sender];

  // Update scores
  const allScores = quizScores.get(jid);
  if (!allScores[sender]) allScores[sender] = 0;
  if (!session.scores[sender]) session.scores[sender] = 0;

  if (isCorrect) {
    allScores[sender] += 10;
    session.scores[sender] += 10;
    await sock.sendMessage(jid, {
      text: `✅ *@${name}* got it right! *+10 pts* 🎯\n🏆 Total score: *${allScores[sender]} pts*`,
      mentions: [sender]
    });

    // Move to next question after correct answer
    clearTimeout(session.timeout);
    session.current++;
    setTimeout(() => sendNextQuestion(sock, jid), 2500);
  } else {
    allScores[sender] -= 2;
    session.scores[sender] -= 2;
    await sock.sendMessage(jid, {
      text: `❌ *@${name}* Wrong! *-2 pts*\n✅ Correct was: *${correctLetter}) ${correctOption}*\n📊 Total score: *${allScores[sender]} pts*`,
      mentions: [sender]
    });
  }

  return true;
};
