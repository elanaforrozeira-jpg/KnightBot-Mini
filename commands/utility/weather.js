/**
 * Weather Command
 * .weather <city>   — get current weather for a city
 *
 * Uses wttr.in (free, no API key needed)
 */

const https = require('https');

const getWeather = (city) => {
  const encoded = encodeURIComponent(city);
  const url = `https://wttr.in/${encoded}?format=j1`;
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'curl/7.68.0' } }, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('City not found or invalid response.')); }
      });
    }).on('error', reject);
  });
};

module.exports = {
  name: 'weather',
  aliases: ['w', 'temp', 'climate'],
  category: 'utility',
  description: 'Get current weather for any city',
  usage: '.weather <city>',

  async execute(sock, msg, args, extra) {
    try {
      if (!args.length)
        return extra.reply('❌ Usage: `.weather <city>`\nExample: `.weather Mumbai`');

      const city = args.join(' ');
      await extra.reply(`🔍 Fetching weather for *${city}*...`);

      const data = await getWeather(city);
      const cur  = data.current_condition[0];
      const area = data.nearest_area[0];

      const place    = area.areaName[0].value;
      const country  = area.country[0].value;
      const desc     = cur.weatherDesc[0].value;
      const tempC    = cur.temp_C;
      const tempF    = cur.temp_F;
      const humidity = cur.humidity;
      const wind     = cur.windspeedKmph;
      const feelsC   = cur.FeelsLikeC;
      const uv       = cur.uvIndex;
      const visibility = cur.visibility;

      const icon = {
        Sunny: '☀️', Clear: '🌙', Cloudy: '☁️', Overcast: '☁️',
        Rain: '🌧️', Drizzle: '🌦️', Snow: '❄️', Fog: '🌫️',
        Thunder: '⛈️', Mist: '🌫️', Blizzard: '🌨️'
      };
      const emoji = Object.keys(icon).find(k => desc.includes(k)) ? icon[Object.keys(icon).find(k => desc.includes(k))] : '🌡️';

      const text =
        `${emoji} *Weather in ${place}, ${country}*\n\n` +
        `📋 Condition: *${desc}*\n` +
        `🌡️ Temp: *${tempC}°C* (${tempF}°F)\n` +
        `🤔 Feels like: *${feelsC}°C*\n` +
        `💧 Humidity: *${humidity}%*\n` +
        `💨 Wind: *${wind} km/h*\n` +
        `👁️ Visibility: *${visibility} km*\n` +
        `🔆 UV Index: *${uv}*`;

      await extra.reply(text);
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
