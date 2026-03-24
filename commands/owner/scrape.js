/**
 * 🔍 SCRAPE COMMAND — Owner Only
 * .scrape        → saare subjects scrape karo
 * .scrape status → quiz_data.json ka current status
 * .scrape debug  → API response dekhne ke liye
 */

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const MARKS_TOKEN   = process.env.MARKS_TOKEN   || '';
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN  || '';
const GITHUB_REPO   = process.env.GITHUB_REPO   || 'elanaforrozeira-jpg/KnightBot-Mini';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// Confirmed from Network Tab
const EXAM_ID   = '6995da5e576cd1ce1a19b560';
const MODULE_ID = '6996c063c905dafe76ae1720';
const BASE_V4   = 'https://web.getmarks.app/api/v4/marks-selected';
const BASE_V2   = 'https://web.getmarks.app/api/v2';
const LIMIT     = 20;

const SUBJECTS = {
  Chemistry: '6996c064c905dafe76ae1723',
  Maths:     '6996c065c905dafe76ae173d',
  Physics:   '6996c067c905dafe76ae175a',
};
const SUBJECT_SHORT = { Chemistry: 'C', Maths: 'M', Physics: 'P' };

function makeHeaders(token) {
  return {
    Authorization:     `Bearer ${token}`,
    Accept:            'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,en-IN;q=0.8',
    Origin:            'https://web.getmarks.app',
    Referer:           'https://web.getmarks.app/',
    'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0',
    'sec-ch-ua':       '"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"',
    'sec-ch-ua-mobile':'?0',
    'sec-ch-ua-platform': '"Windows"',
    'Sec-Fetch-Dest':  'empty',
    'Sec-Fetch-Mode':  'cors',
    'Sec-Fetch-Site':  'same-origin',
  };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// Deep search for array in any nested object
function findArray(obj, visited = new Set()) {
  if (!obj || typeof obj !== 'object') return [];
  if (visited.has(obj)) return [];
  visited.add(obj);
  if (Array.isArray(obj) && obj.length > 0) return obj;
  // Priority keys
  for (const k of ['chapters','items','list','questions','data','results','records']) {
    if (Array.isArray(obj[k]) && obj[k].length > 0) return obj[k];
  }
  // Recurse into object values
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      const found = findArray(obj[k], visited);
      if (found.length > 0) return found;
    }
  }
  return [];
}

function cleanText(raw) {
  if (!raw) return '';
  let t = String(raw);
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');
  t = t.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  const sym = {
    '\\times':'×','\\div':'÷','\\pm':'±','\\alpha':'α','\\beta':'β',
    '\\gamma':'γ','\\Delta':'Δ','\\theta':'θ','\\lambda':'λ','\\mu':'μ',
    '\\pi':'π','\\sigma':'σ','\\omega':'ω','\\infty':'∞','\\leq':'≤',
    '\\geq':'≥','\\neq':'≠','\\approx':'≈','\\rightarrow':'→',
    '\\leftarrow':'←','\\cdot':'·','\\\\':' ',
  };
  for (const [k, v] of Object.entries(sym)) t = t.split(k).join(v);
  t = t.replace(/\\[a-zA-Z]+/g, '').replace(/\$/g, '');
  return t.replace(/\s+/g, ' ').trim();
}

function parseQuestion(item, chapterName, subjectShort) {
  const qObj  = item.question || item.title || {};
  const qText = cleanText(qObj.text || qObj.content || item.text || '');
  if (!qText) return null;

  const rawOpts = item.options || [];
  const options = [];
  let ansIdx = 0;

  rawOpts.forEach((opt, i) => {
    const txt = cleanText(opt.text || opt.value || opt.content || `Option ${i+1}`);
    if (opt.isCorrect === true) ansIdx = i;
    if (txt) options.push(txt);
  });

  if (options.length < 2) return null;

  const expObj = item.explanation || item.solution || item.hint || {};
  const explanation = cleanText(
    typeof expObj === 'object' ? (expObj.text || expObj.content || '') : String(expObj)
  );
  const year = item.previousYear ? String(item.previousYear).slice(0, 4) : '';

  return {
    q:           qText,
    q_image:     qObj.image || null,
    options:     options.slice(0, 4),
    ans:         Math.min(ansIdx, options.length - 1),
    explanation,
    subject:     subjectShort,
    category:    chapterName,
    type:        item.questionType || 'singleCorrect',
    year,
  };
}

// Fetch chapters — try multiple endpoints
async function fetchChapters(subjectName, subjectId, token) {
  const headers = makeHeaders(token);
  const endpoints = [
    // v4 marks-selected
    {
      url: `${BASE_V4}/exam/${EXAM_ID}/modules/${MODULE_ID}/subjects/chapters`,
      params: { platform: 'web', subjectId }
    },
    // v4 without exam path
    {
      url: `${BASE_V4}/exam/${EXAM_ID}/modules/${MODULE_ID}/chapters`,
      params: { platform: 'web', subjectId }
    },
    // v2 chapters
    {
      url: `${BASE_V2}/chapters`,
      params: { subjectId, moduleId: MODULE_ID, platform: 'web' }
    },
    // state module
    {
      url: `${BASE_V4}/exam/${EXAM_ID}/modules/${MODULE_ID}/state`,
      params: { module: 'MS', subjectId }
    },
  ];

  for (const ep of endpoints) {
    try {
      const r = await axios.get(ep.url, { headers, params: ep.params, timeout: 15000 });
      const chapters = findArray(r.data);
      if (chapters.length > 0) {
        // Verify it has chapter-like objects
        const hasId = chapters.some(c => c._id || c.id || c.chapterId);
        if (hasId) return { chapters, endpoint: ep.url };
      }
    } catch (e) {
      // try next
    }
    await sleep(500);
  }
  return { chapters: [], endpoint: null };
}

// Fetch questions for one chapter with pagination
async function fetchChapterQuestions(chapterId, chapterName, subjectShort, subjectId, token, onProgress) {
  const headers = makeHeaders(token);
  const questions = [];
  let offset = 0;

  // Try both URL patterns
  const urlPatterns = [
    `${BASE_V4}/exam/${EXAM_ID}/modules/${MODULE_ID}/chapters/${chapterId}/questions/all`,
    `${BASE_V4}/exam/${EXAM_ID}/modules/${MODULE_ID}/subjects/${subjectId}/chapters/${chapterId}/questions/all`,
  ];

  let workingUrl = null;

  // Find working URL
  for (const url of urlPatterns) {
    try {
      const r = await axios.get(url, { headers, params: { limit: 5, offset: 0 }, timeout: 15000 });
      const items = findArray(r.data);
      if (items.length > 0) { workingUrl = url; break; }
    } catch (e) {
      if (e.response?.status !== 404) workingUrl = urlPatterns[0]; // use default if not 404
    }
    await sleep(300);
  }

  if (!workingUrl) workingUrl = urlPatterns[0];

  while (true) {
    let data;
    try {
      const r = await axios.get(workingUrl, {
        headers,
        params: { limit: LIMIT, offset },
        timeout: 20000
      });
      data = r.data;
    } catch (e) {
      if (e.response?.status === 429) {
        await onProgress('⚠️ Rate limit! 90s ruk raha hoon...');
        await sleep(90000);
        continue;
      }
      break;
    }

    const items = findArray(data);
    const total = data?.total || data?.totalCount || data?.count || 0;

    if (!items.length) break;

    for (const item of items) {
      const parsed = parseQuestion(item, chapterName, subjectShort);
      if (parsed) questions.push(parsed);
    }

    offset += LIMIT;
    if (total && offset >= total) break;
    if (items.length < LIMIT) break;

    await sleep(rand(1500, 3500));
  }

  return questions;
}

async function scrapeAll(token, onProgress) {
  const allQuestions = [];
  let totalFetched = 0;

  for (const [subjName, subjId] of Object.entries(SUBJECTS)) {
    const short = SUBJECT_SHORT[subjName];
    await onProgress(`📖 ${subjName} shuru...`);

    const { chapters, endpoint } = await fetchChapters(subjName, subjId, token);

    if (!chapters.length) {
      await onProgress(`❌ ${subjName}: chapters nahi mile — skip`);
      continue;
    }

    await onProgress(`✅ ${subjName}: ${chapters.length} chapters (${endpoint?.split('/').pop()})`);

    for (const ch of chapters) {
      const chId   = ch._id || ch.id || ch.chapterId || '';
      const chName = ch.title || ch.name || ch.chapterName || 'Unknown';
      if (!chId) continue;

      const qs = await fetchChapterQuestions(chId, chName, short, subjId, token, onProgress);
      allQuestions.push(...qs);
      totalFetched += qs.length;

      if (qs.length > 0)
        await onProgress(`  ✅ ${chName}: ${qs.length} qs | Total: ${totalFetched}`);

      // Big break every 50 questions
      if (totalFetched > 0 && totalFetched % 50 === 0) {
        const w = rand(20000, 35000);
        await onProgress(`😴 ${totalFetched} done — ${Math.round(w/1000)}s break...`);
        await sleep(w);
      }

      await sleep(rand(2000, 4000));
    }
  }

  return allQuestions;
}

async function pushToGithub(content) {
  if (!GITHUB_TOKEN) return false;
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/quiz_data.json`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'KnightBot-Mini',
  };
  let sha;
  try { sha = (await axios.get(apiUrl, { headers })).data.sha; } catch (_) {}
  const body = {
    message: `🤖 Auto-update quiz_data.json (${new Date().toISOString().slice(0,10)})`,
    content: Buffer.from(content).toString('base64'),
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;
  try { await axios.put(apiUrl, body, { headers }); return true; }
  catch (e) { return false; }
}

module.exports = {
  name: 'scrape',
  aliases: ['scrapemarks', 'fetchquiz'],
  description: 'Marks App se questions scrape karo (owner only)',
  category: 'owner',
  ownerOnly: true,
  usage: '.scrape | .scrape status | .scrape debug',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    // STATUS
    if (args[0] === 'status') {
      const qFile = path.join(__dirname, '../../quiz_data.json');
      if (!fs.existsSync(qFile)) {
        await sock.sendMessage(jid, { text: '❌ quiz_data.json nahi hai. .scrape chalao!' }, { quoted: msg });
        return;
      }
      try {
        const data = JSON.parse(fs.readFileSync(qFile, 'utf8'));
        const meta = data.meta || {};
        await sock.sendMessage(jid, {
          text:
            `📊 *Quiz Data*\n\n` +
            `📌 Total: ${meta.total || 0}\n` +
            `⚗️ Physics: ${meta.subjects?.P || 0}\n` +
            `🧪 Chemistry: ${meta.subjects?.C || 0}\n` +
            `📐 Maths: ${meta.subjects?.M || 0}\n` +
            `📅 Updated: ${meta.updatedAt?.slice(0,10) || 'unknown'}`
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: `❌ ${e.message}` }, { quoted: msg });
      }
      return;
    }

    // DEBUG — test karo bina full scrape ke
    if (args[0] === 'debug') {
      if (!MARKS_TOKEN) {
        await sock.sendMessage(jid, { text: '❌ MARKS_TOKEN set nahi hai Railway mein!' }, { quoted: msg });
        return;
      }
      await sock.sendMessage(jid, { text: '🔍 Debug mode — Chemistry chapters check kar raha hoon...' }, { quoted: msg });
      try {
        const { chapters, endpoint } = await fetchChapters('Chemistry', SUBJECTS.Chemistry, MARKS_TOKEN);
        const firstCh = chapters[0];
        const chId    = firstCh?._id || firstCh?.id || '';
        const chName  = firstCh?.title || firstCh?.name || 'Unknown';

        let msg2 = `📋 *Debug Result*\n\n` +
          `Chapters found: ${chapters.length}\n` +
          `Endpoint: ${endpoint || 'none'}\n` +
          `First chapter: ${chName} (${chId})\n\n`;

        if (chId) {
          const qs = await fetchChapterQuestions(chId, chName, 'C', SUBJECTS.Chemistry, MARKS_TOKEN, async () => {});
          msg2 += `Questions from "${chName}": ${qs.length}\n`;
          if (qs[0]) msg2 += `\nSample Q: ${qs[0].q.slice(0, 100)}...\nOptions: ${qs[0].options.join(' | ')}\nAns: ${qs[0].options[qs[0].ans]}`;
        }

        await sock.sendMessage(jid, { text: msg2 }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: `❌ Debug failed: ${e.message}` }, { quoted: msg });
      }
      return;
    }

    // MAIN SCRAPE
    if (!MARKS_TOKEN) {
      await sock.sendMessage(jid, {
        text: '❌ *MARKS_TOKEN* Railway env mein set nahi!\nRailway → Variables → MARKS_TOKEN add karo.'
      }, { quoted: msg });
      return;
    }

    await sock.sendMessage(jid, {
      text: '🚀 *Scraping shuru!*\n\n⚠️ Bahut time lagega.\nProgress updates aate rahenge...'
    }, { quoted: msg });

    let lastUpdate = Date.now();
    const buf = [];
    const onProgress = async (text) => {
      console.log('[SCRAPE]', text);
      buf.push(text);
      if (buf.length >= 8 || Date.now() - lastUpdate > 20000) {
        await sock.sendMessage(jid, { text: buf.join('\n') });
        buf.length = 0;
        lastUpdate = Date.now();
      }
    };

    try {
      const questions = await scrapeAll(MARKS_TOKEN, onProgress);
      const output = {
        meta: {
          source: 'web.getmarks.app',
          total: questions.length,
          updatedAt: new Date().toISOString(),
          subjects: {
            P: questions.filter(q => q.subject==='P').length,
            C: questions.filter(q => q.subject==='C').length,
            M: questions.filter(q => q.subject==='M').length,
          }
        },
        questions
      };
      const jsonStr = JSON.stringify(output, null, 2);
      fs.writeFileSync(path.join(__dirname, '../../quiz_data.json'), jsonStr, 'utf8');
      const pushed = await pushToGithub(jsonStr);

      // Flush remaining progress
      if (buf.length) await sock.sendMessage(jid, { text: buf.join('\n') });

      await sock.sendMessage(jid, {
        text:
          `✅ *Done!*\n\n` +
          `📊 Total: *${questions.length}*\n` +
          `Physics: ${output.meta.subjects.P} | Chem: ${output.meta.subjects.C} | Maths: ${output.meta.subjects.M}\n\n` +
          `💾 Local: Saved\n` +
          `${pushed ? '🚀 GitHub: Pushed!' : '⚠️ GitHub: Skipped (no GITHUB_TOKEN)'}`
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Failed: ${e.message}\n${e.stack?.slice(0,200)}` }, { quoted: msg });
    }
  }
};
