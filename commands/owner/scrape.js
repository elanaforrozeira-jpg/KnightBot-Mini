/**
 * 🔍 SCRAPE COMMAND — Owner Only
 * .scrape        → saare subjects scrape karo
 * .scrape status → quiz_data.json ka current status
 * Made by Ruhvaan
 */

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const MARKS_TOKEN   = process.env.MARKS_TOKEN   || '';
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN  || '';
const GITHUB_REPO   = process.env.GITHUB_REPO   || 'elanaforrozeira-jpg/KnightBot-Mini';
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

function makeClient(token) {
  return axios.create({
    baseURL: BASE,
    timeout: 20000,
    headers: {
      Authorization:    `Bearer ${token}`,
      Accept:           'application/json, text/plain, */*',
      'Accept-Language':'en-US,en;q=0.9',
      Origin:           'https://web.getmarks.app',
      Referer:          'https://web.getmarks.app/',
      'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Response se array nikalo — koi bhi key ho
function extractArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== 'object') return [];
  // Saari keys check karo — jo pehli array mile
  const knownKeys = ['chapters','questions','data','results','items','list','records'];
  for (const k of knownKeys) {
    if (Array.isArray(data[k])) return data[k];
  }
  // Koi bhi array wali key
  for (const k of Object.keys(data)) {
    if (Array.isArray(data[k]) && data[k].length > 0) return data[k];
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
    q: qText, q_image: qImg,
    options: options.slice(0, 4),
    ans: Math.min(ansIdx, options.length - 1),
    explanation, subject: subjectShort,
    category: chapterName,
    type: item.questionType || 'singleCorrect',
    year,
  };
}

async function scrapeAll(token, onProgress) {
  const client = makeClient(token);
  const allQuestions = [];
  let totalFetched = 0;

  for (const [subjName, subjId] of Object.entries(SUBJECTS)) {
    const short = SUBJECT_SHORT[subjName];
    await onProgress(`📖 ${subjName} chapters fetch ho rahe hain...`);

    let chapters = [];
    try {
      const r = await client.get(
        `/exam/${EXAM_ID}/modules/${MODULE_ID}/subjects/chapters`,
        { params: { platform: 'web', subjectId: subjId } }
      );
      const d = r.data;

      // DEBUG: response keys WhatsApp pe bhejo
      const topKeys = typeof d === 'object' ? Object.keys(d).join(', ') : String(d).slice(0,100);
      await onProgress(`🔍 ${subjName} raw keys: [${topKeys}]`);

      chapters = extractArray(d);
    } catch (e) {
      await onProgress(`❌ ${subjName} chapters failed: ${e.response?.status} ${e.message}`);
      continue;
    }

    if (!chapters.length) {
      await onProgress(`⚠️ ${subjName}: 0 chapters mila — API response check karo`);
      continue;
    }

    await onProgress(`  ✅ ${chapters.length} chapters | ${subjName}`);

    for (const ch of chapters) {
      const chId   = ch._id || ch.id || '';
      const chName = ch.title || ch.name || ch.chapterName || 'Unknown';
      if (!chId) continue;

      let offset = 0, chCount = 0;

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
            await onProgress('⚠️ Rate limit! 90s ruk raha hoon...');
            await sleep(90000);
            continue;
          }
          await onProgress(`❌ ${chName} q-fetch failed: ${e.message}`);
          break;
        }

        const items = extractArray(data);
        const total = data?.total || data?.totalCount || 0;

        if (!items.length) break;

        for (const item of items) {
          const parsed = parseQuestion(item, chName, short);
          if (parsed) { allQuestions.push(parsed); chCount++; totalFetched++; }
        }

        offset += LIMIT;
        if (total && offset >= total) break;
        if (items.length < LIMIT) break;

        await sleep(rand(1500, 3500));

        if (totalFetched > 0 && totalFetched % 50 === 0) {
          const w = rand(25000, 45000);
          await onProgress(`😴 ${totalFetched} done — ${Math.round(w/1000)}s break...`);
          await sleep(w);
        }
      }

      if (chCount > 0) await onProgress(`  ✅ ${chName}: ${chCount} qs`);
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
  catch (e) { console.error('GitHub push failed:', e.message); return false; }
}

module.exports = {
  name: 'scrape',
  aliases: ['scrapemarks', 'fetchquiz'],
  description: 'Marks App se questions scrape karo (owner only)',
  category: 'owner',
  ownerOnly: true,
  usage: '.scrape | .scrape status',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (args[0] === 'status') {
      const qFile = path.join(__dirname, '../../quiz_data.json');
      if (!fs.existsSync(qFile)) {
        await sock.sendMessage(jid, { text: '❌ quiz_data.json nahi hai.\n.scrape chalao pehle!' }, { quoted: msg });
        return;
      }
      try {
        const data = JSON.parse(fs.readFileSync(qFile, 'utf8'));
        const meta = data.meta || {};
        await sock.sendMessage(jid, {
          text:
            `📊 *Quiz Data Status*\n\n` +
            `📌 Total: ${meta.total || data.questions?.length || 0}\n` +
            `⚙️ Physics: ${meta.subjects?.P || 0}\n` +
            `⚙️ Chemistry: ${meta.subjects?.C || 0}\n` +
            `⚙️ Maths: ${meta.subjects?.M || 0}\n` +
            `📅 Updated: ${meta.updatedAt?.slice(0,10) || 'unknown'}`
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: `❌ File error: ${e.message}` }, { quoted: msg });
      }
      return;
    }

    if (!MARKS_TOKEN) {
      await sock.sendMessage(jid, {
        text: '❌ *MARKS_TOKEN* Railway env mein set nahi hai!\nRailway → Variables → MARKS_TOKEN add karo.'
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

      await sock.sendMessage(jid, {
        text:
          `✅ *Done!*\n\n` +
          `📊 Total: *${questions.length}*\n` +
          `Physics: ${output.meta.subjects.P} | Chem: ${output.meta.subjects.C} | Maths: ${output.meta.subjects.M}\n\n` +
          `💾 Local: Saved\n` +
          `${pushed ? '🚀 GitHub: Pushed!' : '⚠️ GitHub: Skipped (no GITHUB_TOKEN)'}`
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Failed: ${e.message}` }, { quoted: msg });
    }
  }
};
