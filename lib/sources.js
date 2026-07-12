// lib/sources.js
const pluto = require('./pluto');

async function getMergedSportsChannels() {
  const results = await Promise.allSettled([
    pluto.getSportsChannels()
    // future: samsung.getSportsChannels(), xumo.getSportsChannels(), plex.getSportsChannels()
  ]);

  const merged = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      merged.push(...result.value);
    } else {
      console.error(`[getMergedSportsChannels] source ${i} failed:`, result.reason?.message);
    }
  });

  return merged;
}

module.exports = { getMergedSportsChannels };
