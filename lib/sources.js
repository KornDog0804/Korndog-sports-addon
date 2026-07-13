const pluto = require('./pluto');
const iptvOrg = require('./providers/iptv-org');
const verified = require('./providers/verified');
const plex = require('./providers/plex');

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

  let plexChannels = [];

  try {
    plexChannels = await plex.getSportsChannels();
  } catch (error) {
    console.error(
      '[sources] plex failed:',
      error?.message || error
    );
  }

  const merged = [
    ...verifiedChannels,
    ...plexChannels
  ];

  if (merged.length === 0) {
    console.warn(
      '[sources] Verified and Plex empty; using discovery fallback'
    );

    return getDiscoveredSportsChannels();
  }

  const seen = new Set();

  return merged.filter(channel => {
    const key =
      channel.id ||
      channel.streamUrl ||
      `${channel.source}:${channel.name}`;

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

module.exports = {
  getMergedSportsChannels,
  getDiscoveredSportsChannels
};
