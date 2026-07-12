// lib/pluto.js
// Retrieves Pluto's anonymous channel lineup and normalizes sports channels.

const fetch = require('node-fetch');

const PLUTO_BOOT_URL = 'https://boot.pluto.tv/v4/start';

const SPORTS_MATCHERS = [
  'sport',
  'football',
  'basketball',
  'baseball',
  'soccer',
  'golf',
  'tennis',
  'hockey',
  'boxing',
  'combat',
  'mma',
  'ufc',
  'fight',
  'wrestl',
  'motor',
  'racing',
  'nascar',
  'poker',
  'outdoor'
];

function isSportsChannelName(...values) {
  const text = values
    .filter(Boolean)
    .map(value => {
      if (typeof value === 'string') return value;
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    })
    .join(' ')
    .toLowerCase();

  return SPORTS_MATCHERS.some(keyword => text.includes(keyword));
}

function createSessionId() {
  return `korndog-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildBootParams() {
  const sessionId = createSessionId();

  return new URLSearchParams({
    appName: 'web',
    appVersion: '5.0.0',
    deviceVersion: '1',
    deviceModel: 'web',
    deviceMake: 'Chrome',
    deviceType: 'web',
    clientID: sessionId,
    clientModelNumber: '1.0',
    sid: sessionId,
    deviceId: sessionId,
    deviceDNT: '0'
  }).toString();
}

function arrayFromPossibleObject(value) {
  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    return Object.values(value).filter(
      item => item && typeof item === 'object'
    );
  }

  return [];
}

function findRawChannels(data) {
  const candidates = [
    data?.EPG,
    data?.epg,
    data?.channels,
    data?.data?.EPG,
    data?.data?.epg,
    data?.data?.channels,
    data?.guide?.channels
  ];

  for (const candidate of candidates) {
    const channels = arrayFromPossibleObject(candidate);

    if (channels.length > 0) {
      return channels;
    }
  }

  return [];
}

function joinUrl(base, path) {
  if (!base || !path) return null;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function appendQuery(url, query) {
  if (!url || !query) return url;

  const cleanQuery = String(query).replace(/^\?/, '');

  if (!cleanQuery) return url;

  return `${url}${url.includes('?') ? '&' : '?'}${cleanQuery}`;
}

function findLogo(raw) {
  if (Array.isArray(raw?.images)) {
    const preferred =
      raw.images.find(image => image?.type === 'colorLogoPNG') ||
      raw.images.find(image => image?.type === 'colorLogo') ||
      raw.images.find(image => image?.type === 'featuredImage') ||
      raw.images[0];

    return preferred?.url || preferred?.path || null;
  }

  return (
    raw?.logo?.url ||
    raw?.logo?.path ||
    raw?.thumbnail ||
    raw?.image ||
    null
  );
}

function findDirectStream(raw) {
  return (
    raw?.stitched?.urls?.[0]?.url ||
    raw?.stitched?.url ||
    raw?.urls?.[0]?.url ||
    raw?.streamUrl ||
    raw?.hls ||
    null
  );
}

async function fetchPlutoBoot() {
  const url = `${PLUTO_BOOT_URL}?${buildBootParams()}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(
      `Pluto boot request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  const rawChannels = findRawChannels(data);

  const stitcherBase =
    data?.servers?.stitcher ||
    data?.servers?.stitcherServer ||
    data?.stitcherServer ||
    '';

  const stitcherParams =
    data?.stitcherParams ||
    data?.session?.stitcherParams ||
    '';

  console.log(
    `[pluto] boot keys=${Object.keys(data || {}).join(',')} channels=${rawChannels.length}`
  );

  return {
    data,
    rawChannels,
    stitcherBase,
    stitcherParams
  };
}

function normalizeChannel(raw, stitcherBase, stitcherParams) {
  const sourceId =
    raw?.slug ||
    raw?._id ||
    raw?.id ||
    raw?.channelId;

  if (!sourceId) return null;

  const name =
    raw?.name ||
    raw?.title ||
    raw?.displayName ||
    'Unknown Channel';

  let streamUrl = findDirectStream(raw);

  if (!streamUrl && raw?.stitched?.path) {
    streamUrl = joinUrl(stitcherBase, raw.stitched.path);
    streamUrl = appendQuery(streamUrl, stitcherParams);
  }

  return {
    id: `pluto-${sourceId}`,
    sourceId,
    name,
    logo: findLogo(raw),
    source: 'pluto',
    streamUrl,
    description:
      raw?.summary ||
      raw?.description ||
      raw?.synopsis ||
      `${name} on Pluto TV`
  };
}

async function getSportsChannels() {
  const {
    rawChannels,
    stitcherBase,
    stitcherParams
  } = await fetchPlutoBoot();

  const normalized = rawChannels
    .map(channel =>
      normalizeChannel(channel, stitcherBase, stitcherParams)
    )
    .filter(Boolean);

  const sportsChannels = normalized.filter(channel =>
    isSportsChannelName(
      channel.name,
      channel.description,
      rawChannels.find(raw =>
        String(raw?.slug || raw?._id || raw?.id) ===
        String(channel.sourceId)
      )
    )
  );

  console.log(
    `[pluto] normalized=${normalized.length} sports=${sportsChannels.length} playable=${sportsChannels.filter(channel => channel.streamUrl).length}`
  );

  // Do not discard catalog tiles merely because playback resolution failed.
  // The stream route can attempt to resolve the URL again when selected.
  return sportsChannels;
}

module.exports = {
  getSportsChannels,
  fetchPlutoBoot,
  findRawChannels,
  isSportsChannelName
};
