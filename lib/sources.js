// lib/sources.js
const pluto = require('./pluto');
const iptvOrg = require('./providers/iptv-org');

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(hd|fhd|uhd|4k|1080p|720p|live|tv)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function getMergedSportsChannels() {
  const providers = [
    ['pluto', () => pluto.getSportsChannels()],
    ['iptv-org', () => iptvOrg.getSportsChannels()]
  ];

  const results = await Promise.allSettled(
    providers.map(([, load]) => load())
  );

  const merged = [];

  results.forEach((result, index) => {
    const name = providers[index][0];

    if (result.status === 'fulfilled') {
      const channels = Array.isArray(result.value) ? result.value : [];
      console.log(`[sources] ${name}=${channels.length}`);
      merged.push(...channels);
    } else {
      console.error(`[sources] ${name} failed:`, result.reason?.message);
    }
  });

  const seen = new Set();

  return merged.filter(channel => {
    const key = normalizeName(channel.name) || channel.id;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = { getMergedSportsChannels };
