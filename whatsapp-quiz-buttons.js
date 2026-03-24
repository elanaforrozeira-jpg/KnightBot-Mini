/**
 * whatsapp-quiz-buttons.js
 * Interactive quiz using Baileys buttons/list responses.
 * Exported functions:
 *  - initQuizFeature(sock)
 *  - sendQuizButtons(sock, jid, quizIndex)
 *
 * In-memory scores and state (persist externally if needed).
 */

const quizzes = [
  {
    question: "What is the capital of India?",
    options: ["A) Delhi", "B) Mumbai", "C) Kolkata", "D) Chennai"],
    answer: "A" // correct letter
  }
  // Add more quiz objects here if you want
];

const scores = {};         // { [jid]: number }
const userQuizState = {};  // { [jid]: quizIndex }

/** Send a quiz as interactive buttons */
async function sendQuizButtons(sock, jid, quizIndex = 0) {
  const quiz = quizzes[quizIndex];
  if (!quiz) throw new Error('Invalid quiz index');

  const buttons = quiz.options.map((opt, idx) => {
    const letter = ['A','B','C','D'][idx];
    return {
      buttonId: `quiz_${quizIndex}_${letter}`,
      buttonText: { displayText: opt },
      type: 1
    };
  });

  const text = `${quiz.question}\n\n${quiz.options.join('\n')}\n\nTap an option below:`;
  await sock.sendMessage(jid, { text, footer: 'Quiz Bot', buttons, headerType: 1 });
  userQuizState[jid] = quizIndex;
}

/** Helper: format options showing result markers */
function formatOptionsResult(quiz, userChoice) {
  const letters = ['A','B','C','D'];
  return quiz.options.map((opt, i) => {
    const letter = letters[i];
    const isCorrect = letter === quiz.answer;
    const isSelected = letter === userChoice;
    const prefix = isCorrect ? '✅' : (isSelected ? '🔘' : '▫️');
    return `${prefix} ${opt}`;
  }).join('\n');
}

/** Initialize handlers on a Baileys socket */
function initQuizFeature(sock) {
  // Convenience: allow external calls
  sock.sendQuizButtons = (jid, quizIndex=0) => sendQuizButtons(sock, jid, quizIndex);

  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages && m.messages[0];
      if (!msg || !msg.message) return;
      if (msg.key && msg.key.fromMe) return;

      const jid = msg.key.remoteJid;

      // Button response
      if (msg.message.buttonsResponseMessage) {
        const selectedId = msg.message.buttonsResponseMessage.selectedButtonId; // e.g. quiz_0_A
        const parts = selectedId.split('_');
        if (parts[0] !== 'quiz' || parts.length < 3) return;

        const quizIndex = parseInt(parts[1], 10);
        const userChoice = parts[2];

        const quiz = quizzes[quizIndex];
        if (!quiz) {
          await sock.sendMessage(jid, { text: 'Quiz not found.' });
          return;
        }

        if (!scores[jid]) scores[jid] = 0;
        const isCorrect = userChoice === quiz.answer;
        if (isCorrect) scores[jid] += 1;

        await sock.sendMessage(jid, { text: isCorrect ? `✅ Correct! Your score: ${scores[jid]}` : `❌ Wrong! Your score: ${scores[jid]}` });

        const resultText = `Result:\n\n${formatOptionsResult(quiz, userChoice)}\n\nCorrect: ${quiz.answer}\nYour score: ${scores[jid]}`;
        await sock.sendMessage(jid, { text: resultText });

        delete userQuizState[jid];
        return;
      }

      // List response (if used)
      if (msg.message.listResponseMessage) {
        const selectedRowId = msg.message.listResponseMessage.selectedRowId; // e.g. quiz_0_B
        const parts = selectedRowId.split('_');
        if (parts[0] !== 'quiz' || parts.length < 3) return;

        const quizIndex = parseInt(parts[1], 10);
        const userChoice = parts[2];

        const quiz = quizzes[quizIndex];
        if (!quiz) {
          await sock.sendMessage(jid, { text: 'Quiz not found.' });
          return;
        }

        if (!scores[jid]) scores[jid] = 0;
        const isCorrect = userChoice === quiz.answer;
        if (isCorrect) scores[jid] += 1;

        await sock.sendMessage(jid, { text: isCorrect ? `✅ Correct! Your score: ${scores[jid]}` : `❌ Wrong! Your score: ${scores[jid]}` });

        const resultText = `Result:\n\n${formatOptionsResult(quiz, userChoice)}\n\nCorrect: ${quiz.answer}\nYour score: ${scores[jid]}`;
        await sock.sendMessage(jid, { text: resultText });

        delete userQuizState[jid];
        return;
      }

      // Fallback: textual A/B/C/D answers if user typed instead of using buttons
      const plainText = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim().toUpperCase();
      if (['A','B','C','D'].includes(plainText) && userQuizState[jid] != null) {
        const quizIndex = userQuizState[jid];
        const quiz = quizzes[quizIndex];
        if (!scores[jid]) scores[jid] = 0;
        const userChoice = plainText;
        const isCorrect = userChoice === quiz.answer;
        if (isCorrect) scores[jid] += 1;

        await sock.sendMessage(jid, { text: isCorrect ? `✅ Correct! Your score: ${scores[jid]}` : `❌ Wrong! Your score: ${scores[jid]}` });

        const resultText = `Result:\n\n${formatOptionsResult(quiz, userChoice)}\n\nCorrect: ${quiz.answer}\nYour score: ${scores[jid]}`;
        await sock.sendMessage(jid, { text: resultText });

        delete userQuizState[jid];
      }
    } catch (e) {
      console.error('Quiz handler error:', e);
    }
  });
}

module.exports = { initQuizFeature, sendQuizButtons: sendQuizButtons };
