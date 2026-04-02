/**
 * Fancy Text Generator
 * Converts normal text to various Unicode styles
 */

module.exports = {
  name: 'fancy',
  aliases: ['fancytext', 'styletext', 'ft'],
  category: 'fun',
  description: 'Convert text to fancy Unicode styles',
  usage: '.fancy <text>',

  async execute(sock, msg, args, { from, reply }) {
    const text = args.join(' ').trim();
    if (!text) return reply('✨ Usage: .fancy <text>\nExample: .fancy Hello World');

    const normal = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const styles = {
      '𝗕𝗼𝗹𝗱': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        .split('').reduce((m, c, i) => { m[c] = '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵'.split('')[i]; return m; }, {}),
      '𝘐𝘵𝘢𝘭𝘪𝘤': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
        .split('').reduce((m, c, i) => { m[c] = '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡'.split('')[i]; return m; }, {}),
      '𝕊𝕢𝕦𝕒𝕣𝕖': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
        .split('').reduce((m, c, i) => { m[c] = '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ'.split('')[i]; return m; }, {}),
      '𝔉𝔯𝔞𝔨𝔱𝔲𝔯': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
        .split('').reduce((m, c, i) => { m[c] = '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ'.split('')[i]; return m; }, {}),
    };

    // Simple char map approach
    const convert = (txt, map) => txt.split('').map(c => map[c] || c).join('');

    const bold = convert(text, styles['𝗕𝗼𝗹𝗱']);
    const italic = convert(text, styles['𝘐𝘵𝘢𝘭𝘪𝘤']);
    const square = convert(text, styles['𝕊𝕢𝕦𝕒𝕣𝕖']);
    const fraktur = convert(text, styles['𝔉𝔯𝔞𝔨𝔱𝔲𝔯']);

    // Bubble text (circled letters)
    const bubbleMap = 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ';
    const bubble = text.split('').map(c => {
      const idx = 'abcdefghijklmnopqrstuvwxyz'.indexOf(c.toLowerCase());
      if (idx === -1) return c;
      return c === c.toUpperCase() ? bubbleMap.split('')[idx + 26] : bubbleMap.split('')[idx];
    }).join('');

    // Strikethrough
    const strikethrough = text.split('').map(c => c + '̶').join('');

    // Small caps
    const scMap = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'Q',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
    const smallcaps = text.toLowerCase().split('').map(c => scMap[c] || c).join('');

    const result = `✨ *Fancy Text Styles*\n\n` +
      `📝 *Original:* ${text}\n\n` +
      `𝗕 *Bold:* ${bold}\n` +
      `𝘐 *Italic:* ${italic}\n` +
      `𝕊 *Double Struck:* ${square}\n` +
      `𝔉 *Fraktur:* ${fraktur}\n` +
      `ⓑ *Bubble:* ${bubble}\n` +
      `S̶ *Strikethrough:* ${strikethrough}\n` +
      `ꜱ *Small Caps:* ${smallcaps}`;

    await reply(result);
  }
};
