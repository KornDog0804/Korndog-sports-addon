const pluto = require('./pluto');
const iptvOrg = require('./providers/iptv-org');
const verified = require('./providers/verified');
const plex = require('./providers/plex');

const BLOCKED_CHANNEL_TERMS = [
  'alkass',
  'al kass',
  'shoof',
  'arryadia',
  'riyadiya',
  'adjarasport',
  'a spor',
  'bahrain sports',
  'oman sports',
  'ktv sport',
  'abu dhabi',
  'dubai sports',
  'belarus',
  'беларусь',
  'матч',
  'удар',
  'футбол',
  'спорт',
  'sportitalia',
  'sportivnyy',
  'tvr sport',
  'tv cuatro',
  'tvcuatro',
  'itv deportes',
  'claro sports',
  'africa 24 sport',
  'tyc sports',
  'ziggo sport',
  'sport tv portugal'
];

function isBlockedChannel(channel = {}) {
  const haystack = [
    channel.id,
    channel.sourceId,
    channel.name,
    channel.description,
    channel.country,
    channel.countryCode
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return BLOCKED_CHANNEL_TERMS.some(term =>
    haystack.includes(term.toLowerCase())
  );
}

function removeBlockedChannels(channels) {
  return channels.filter(channel => !isBlockedChannel(channel));
}

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

  return removeBlockedChannels(merged).filter(channel => {
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

  return removeBlockedChannels(merged).filter(channel => {
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
