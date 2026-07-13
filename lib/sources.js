const pluto = require('./pluto');
const iptvOrg = require('./providers/iptv-org');
const verified = require('./providers/verified');
const plutoTargets = require('./providers/pluto-targets');

async function getDiscoveredSportsChannels() {
  const sources = [
    ['pluto', pluto.getSportsChannels()],
    ['iptv-org', iptvOrg.getSportsChannels()]
  ];

  const results = await Promise.allSettled(
    sources.map(source => source[1])
  );

  const merged = [];

  results.forEach((result, index) => {
    const sourceName = sources[index][0];

    if (result.status === 'fulfilled') {
      console.log(`[sources] ${sourceName}=${result.value.length}`);
      merged.push(...result.value);
    } else {
      console.error(
        `[sources] ${sourceName} failed:`,
        result.reason?.message
      );
    }
  });

  const seen = new Set();

  return merged.filter(channel => {
    const key = channel.id || channel.streamUrl;

    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

async function getMergedSportsChannels() {
  const verifiedChannels = await verified.getSportsChannels();

  if (verifiedChannels.length > 0) {
    let targetChannels = [];

    try {
      targetChannels = await plutoTargets.getSportsChannels();
    } catch (error) {
      console.error(
        '[sources] pluto-targets failed:',
        error.message
      );
    }

    const merged = [
      ...verifiedChannels,
      ...targetChannels
    ];

    const seen = new Set();

    return merged.filter(channel => {
      const key = channel.id || channel.streamUrl;

      if (!key || seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }

  console.warn('[sources] Verified list empty; using discovery fallback');
  return getDiscoveredSportsChannels();
}

module.exports = {
  getMergedSportsChannels,
  getDiscoveredSportsChannels
};
