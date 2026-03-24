/**
 * 🔍 SCRAPE COMMAND — Owner Only
 * .scrape        → saare subjects scrape karo
 * .scrape status → quiz_data.json ka current status
 * Made by Ruhvaan
 */

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

// ──────────────────────────────
// CONFIG — Railway Env Variables mein daalo
// ──────────────────────────────
const MARKS_TOKEN  = process.env.MARKS_TOKEN  || '';  // Marks App Bearer token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';  // GitHub Personal Access Token
const GITHUB_REPO  = process.env.GITHUB_REPO  || 'elanaforrozeira-jpg/KnightBot-Mini';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

const EXAM_ID   = '6995da5e576cd1ce1a19b560';
const MODULE_ID = '6996c063c905dafe76ae1720';
const BASE      = 'https://web.getmarks.app/api/v4/marks-selected';
const LIMIT     = 20;

const SUBJECTS = {
  Chemistry: '6996c064c905dafe76ae1723',
  Maths:     '6996c065c905dafe76ae173d',
  Physics:   '6996c067c905dafe76ae175a',
};

const SUBJECT_SHORT = { Chemistry: 'C', Maths: 'M', Physics: 'P' };

// ──────────────────────────────
// AXIOS INSTANCE (human-like headers)
// ──────────────────────────────
function makeClient(token) {
  return axios.create({
    baseURL: BASE,
    timeout: 20000,
    headers: {
      Authorization:  `Bearer ${token}`,
      Accept:         'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Origin:         'https://web.getmarks.app',
      Referer:        'https://web.getmarks.app/',
      'User-Agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ──────────────────────────────
// HTML + LATEX CLEANER (basic JS version)
// ──────────────────────────────
function cleanText(raw) {
  if (!raw) return '';
  let t = String(raw);
  // HTML tags
  t = t.replace(/<[^>]+>/g, ' ');
  // Common LaTeX
  t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');
  t = t.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  const sym = {
    '\\times': '×', '\\div': '÷', '\\pm': '±',
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ',
    '\\Delta': 'Δ', '\\theta': 'θ', '\\lambda': 'λ',
    '\\mu': 'μ', '\\pi': 'π', '\\sigma': 'σ', '\\omega': 'ω',
    '\\infty': '∞', '\\leq': '≤', '\\geq': '≥',
    '\\neq': '≠', '\\approx': '≈', '\\rightarrow': '→',
    '\\leftarrow': '←', '\\cdot': '·', '\\\\': ' ',
  };
  for (const [k, v] of Object.entries(sym)) {
    t = t.split(k).join(v);
  }
  t = t.replace(/\\[a-zA-Z]+/g, '').replace(/\$/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

// ──────────────────────────────
// PARSE QUESTION
// ──────────────────────────────
function parseQuestion(item, chapterName, subjectShort) {
  const qObj  = item.question || item.title || {};
  const qText = cleanText(qObj.text || qObj.content || '');
  const qImg  = qObj.image || null;
  if (!qText) return null;

  const rawOpts = item.options || [];
  const options = [];
  let ansIdx = 0;

  rawOpts.forEach((opt, i) => {
    const txt = cleanText(opt.text || opt.value || `Option ${i+1}`);
    if (opt.isCorrect === true) ansIdx = i;
    if (txt) options.push(txt);
  });

  if (options.length < 2) return null;

  const expObj = item.explanation || item.solution || {};
  const explanation = cleanText(
    typeof expObj === 'object' ? (expObj.text || expObj.content || '') : String(expObj)
  );

  const year = item.previousYear ? String(item.previousYear).slice(0, 4) : '';

  return {
    q:           qText,
    q_image:     qImg,
    options:     options.slice(0, 4),
    ans:         Math.min(ansIdx, options.length - 1),
    explanation,
    subject:     subjectShort,
    category:    chapterName,
    type:        item.questionType || 'singleCorrect',
    year,
  };
}

// ──────────────────────────────
// SCRAPE ALL — core function
// ──────────────────────────────
async function scrapeAll(token, onProgress) {
  const client = makeClient(token);
  const allQuestions = [];
  let totalFetched = 0;

  for (const [subjName, subjId] of Object.entries(SUBJECTS)) {
    const short = SUBJECT_SHORT[subjName];
    await onProgress(`\ud83d\udcd6 ${subjName} chapters fetch ho rahe hain...`);

    // Chapters fetch
    let chapters = [];
    try {
      const r = await client.get(
        `/exam/${EXAM_ID}/modules/${MODULE_ID}/subjects/chapters`,
        { params: { platform: 'web', subjectId: subjId } }
      );
      const d = r.data;
      chapters = d.chapters || d.data || d.results || (Array.isArray(d) ? d : []);
    } catch (e) {
      await onProgress(`\u274c ${subjName} chapters failed: ${e.message}`);
      continue;
    }

    await onProgress(`  \u2705 ${chapters.length} chapters mila | ${subjName}`);

    for (const ch of chapters) {
      const chId   = ch._id || ch.id || '';
      const chName = ch.title || ch.name || 'Unknown';
      if (!chId) continue;

      let offset = 0;
      let chCount = 0;

      while (true) {
        let data;
        try {
          const r = await client.get(
            `/exam/${EXAM_ID}/modules/${MODULE_ID}/chapters/${chId}/questions/all`,
            { params: { limit: LIMIT, offset } }
          );
          data = r.data;
        } catch (e) {
          if (e.response?.status === 429) {
            await onProgress('\u26a0\ufe0f Rate limit! 90s ruk raha hoon...');
            await sleep(90000);
            continue;
          }
          break;
        }

        const items = data.questions || data.data || data.results || (Array.isArray(data) ? data : []);
        const total = data.total || data.totalCount || 0;

        if (!items.length) break;

        for (const item of items) {
          const parsed = parseQuestion(item, chName, short);
          if (parsed) { allQuestions.push(parsed); chCount++; totalFetched++; }
        }

        offset += LIMIT;
        if (total && offset >= total) break;
        if (items.length < LIMIT) break;

        // Human-like delay
        await sleep(rand(1500, 3500));

        // Har 50 questions pe bada break
        if (totalFetched % 50 === 0) {
          const w = rand(25000, 45000);
          await onProgress(`\ud83d\ude34 ${totalFetched} done — ${w/1000}s break (anti-ban)...`);
          await sleep(w);
        }
      }

      if (chCount > 0)
        await onProgress(`  \u2705 ${chName}: ${chCount} questions`);

      await sleep(rand(2000, 5000)); // chapter ke beech delay
    }
  }

  return allQuestions;
}

// ──────────────────────────────
// PUSH TO GITHUB
// ──────────────────────────────
async function pushToGithub(content) {
  if (!GITHUB_TOKEN) return false;

  const filePath = 'quiz_data.json';
  const apiUrl   = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
  const headers  = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'KnightBot-Mini',
  };

  // Get existing SHA
  let sha = undefined;
  try {
    const r = await axios.get(apiUrl, { headers });
    sha = r.data.sha;
  } catch (_) {}

  const body = {
    message: `\ud83e\udd16 Auto-update: quiz_data.json (${new Date().toISOString().slice(0,10)})`,
    content: Buffer.from(content).toString('base64'),
    branch:  GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  try {
    await axios.put(apiUrl, body, { headers });
    return true;
  } catch (e) {
    console.error('GitHub push failed:', e.message);
    return false;
  }
}

// ──────────────────────────────
// COMMAND EXPORT
// ──────────────────────────────
module.exports = {
  name: 'scrape',
  aliases: ['scrapemarks', 'fetchquiz'],
  description: 'Marks App se questions scrape karo (owner only)',
  category: 'owner',
  ownerOnly: true,
  usage: '.scrape | .scrape status',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    // STATUS check
    if (args[0] === 'status') {
      const qFile = path.join(__dirname, '../../quiz_data.json');
      if (!fs.existsSync(qFile)) {
        await sock.sendMessage(jid, { text: '\u274c quiz_data.json abhi exist nahi karta.\n.scrape chalao pehle!' }, { quoted: msg });
        return;
      }
      try {
        const data = JSON.parse(fs.readFileSync(qFile, 'utf8'));
        const meta = data.meta || {};
        await sock.sendMessage(jid, {
          text:
            `\ud83d\udcca *Quiz Data Status*\n\n` +
            `\ud83d\udccc Total: ${meta.total || data.questions?.length || 0}\n` +
            `\u2699\ufe0f Physics: ${meta.subjects?.P || 0}\n` +
            `\u2699\ufe0f Chemistry: ${meta.subjects?.C || 0}\n` +
            `\u2699\ufe0f Maths: ${meta.subjects?.M || 0}\n` +
            `\ud83d\udcc5 Source: ${meta.source || 'unknown'}`
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: `\u274c File read error: ${e.message}` }, { quoted: msg });
      }
      return;
    }

    // Env check
    if (!MARKS_TOKEN) {
      await sock.sendMessage(jid, {
        text:
          '\u274c *MARKS_TOKEN* Railway env mein set nahi hai!\n\n' +
          'Railway Dashboard → Variables mein add karo:\n' +
          '`MARKS_TOKEN = eyJhbGci...apna_token`\n' +
          '`GITHUB_TOKEN = ghp_...apna_token`'
      }, { quoted: msg });
      return;
    }

    await sock.sendMessage(jid, {
      text:
        '\ud83d\ude80 *Scraping shuru ho raha hai!*\n\n' +
        '\u26a0\ufe0f Ye kaam mein _bahut time lagega_ (saare questions)\n' +
        'Progress updates milte rahenge.\n\n' +
        '_Please wait..._'
    }, { quoted: msg });

    let lastUpdate = Date.now();
    const progressMsgs = [];

    // Progress sender (har 10 updates pe ek message)
    const onProgress = async (text) => {
      console.log('[SCRAPE]', text);
      progressMsgs.push(text);
      if (progressMsgs.length >= 10 || Date.now() - lastUpdate > 30000) {
        await sock.sendMessage(jid, { text: progressMsgs.join('\n') });
        progressMsgs.length = 0;
        lastUpdate = Date.now();
      }
    };

    try {
      const questions = await scrapeAll(MARKS_TOKEN, onProgress);

      const output = {
        meta: {
          source: 'web.getmarks.app',
          total:  questions.length,
          updatedAt: new Date().toISOString(),
          subjects: {
            P: questions.filter(q => q.subject === 'P').length,
            C: questions.filter(q => q.subject === 'C').length,
            M: questions.filter(q => q.subject === 'M').length,
          }
        },
        questions
      };

      const jsonStr = JSON.stringify(output, null, 2);

      // Local save
      const savePath = path.join(__dirname, '../../quiz_data.json');
      fs.writeFileSync(savePath, jsonStr, 'utf8');

      // GitHub push
      let pushed = false;
      if (GITHUB_TOKEN) {
        pushed = await pushToGithub(jsonStr);
      }

      await sock.sendMessage(jid, {
        text:
          `\u2705 *Scraping Complete!*\n\n` +
          `\ud83d\udcca Total: *${questions.length}* questions\n` +
          `\u2699\ufe0f Physics: ${output.meta.subjects.P}\n` +
          `\u2699\ufe0f Chemistry: ${output.meta.subjects.C}\n` +
          `\u2699\ufe0f Maths: ${output.meta.subjects.M}\n\n` +
          `\ud83d\udcbe Local: quiz_data.json saved\n` +
          `${pushed ? '\ud83d\ude80 GitHub: Successfully pushed!' : '\u26a0\ufe0f GitHub: Push failed (GITHUB_TOKEN check karo)'}\n\n` +
          `_Bot restart karo agar naye questions load karne hain_`
      }, { quoted: msg });

    } catch (e) {
      await sock.sendMessage(jid, {
        text: `\u274c Scraping failed: ${e.message}`
      }, { quoted: msg });
    }
  }
};
