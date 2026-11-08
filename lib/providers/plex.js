const zlib = require('zlib');
const fetchImpl = global.fetch || require('node-fetch');

const CLIENT_ID =
  process.env.PLEX_CLIENT_ID || 'korndog-sports-provider';

// Backup lineup source (matthuisman / i.mjh.nz): gzipped JSON of Plex channels.
const MJH_URL =
  'https://raw.githubusercontent.com/matthuisman/i.mjh.nz/master/Plex/.channels.json.gz';

// Last-run diagnostics, read by /health
const state = {
  lineupSource: 'none',
  lineupCount: 0,
  tokenSource: 'none',
  channelsLoaded: 0,
  lastRun: null,
  lastError: null
};

let cachedAnonToken = null;
let cachedAnonAt = 0;

const SPORTS_URL =
  'https://watch.plex.tv/live-tv/category/sports';

const M3U_URL =
  'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/plex_us.m3u';

const TARGETS = [
  {
    slug: 'ufc',
    name: 'UFC',
    category: 'Combat Sports'
  },
  {
    slug: 'tna-wrestling-channel',
    name: 'TNA Wrestling Channel',
    category: 'Combat Sports'
  },
  {
    slug: 'fight-network',
    name: 'Fight Network',
    category: 'Combat Sports'
  },
  {
    slug: 'one-championship-tv',
    name: 'ONE Championship TV',
    category: 'Combat Sports'
  },
  {
    slug: 'monster-jam',
    name: 'Monster Jam',
    category: 'Motorsports'
  },
  {
    slug: 'nhra-tv',
    name: 'NHRA TV',
    category: 'Motorsports'
  },
  {
    slug: 'racing-america',
    name: 'Racing America',
    category: 'Motorsports'
  },
  {
    slug: 'acl-cornhole-tv-2',
    name: 'ACL Cornhole TV',
    category: 'General Sports'
  },
  {
    slug: 'fubo-sports-network',
    name: 'Fubo Sports Network',
    category: 'General Sports'
  },
  {
    slug: 'tennis-channel-2',
    name: 'Tennis Channel 2',
    category: 'Tennis'
  },
  {
    slug: 'the-jim-rome-show',
    name: 'The Jim Rome Show',
    category: 'General Sports'
  },
  {
    slug: 'cbs-sports-hq-2',
    name: 'CBS Sports HQ',
    category: 'General Sports'
  },
  {
    slug: 'nbc-sports-now',
    name: 'NBC Sports NOW',
    category: 'General Sports'
  },
  {
    slug: 'f1-channel',
    name: 'F1 Channel',
    category: 'Motorsports'
  },
  {
    slug: 'scripps-sports-network',
    name: 'Scripps Sports Network',
    category: 'General Sports'
  }
];

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

function addToken(url, token) {
  if (!url || !token) return url;

  const separator = url.includes('?') ? '&' : '?';

  return `${url}${separator}X-Plex-Token=${encodeURIComponent(token)}`;
}

function findChannelImages(text, slug) {
  const marker = `/live-tv/channel/${slug}`;
  const markerIndex = text.indexOf(marker);

  if (markerIndex === -1) {
    console.warn(`[plex] image marker missing: ${slug}`);

    return {
      logo: null,
      poster: null
    };
  }

  const chunk = text.slice(
    Math.max(0, markerIndex - 2500),
    Math.min(text.length, markerIndex + 2500)
  );

  const urls = [
    ...chunk.matchAll(
      /https:\/\/provider-static\.plex\.tv\/[^"' <\\]+/g
    )
  ].map(match => decodeHtml(match[0]));

  const uniqueUrls = [...new Set(urls)];

  const logo =
    uniqueUrls.find(url =>
      /logo|logos|1500x1000|dark_bgd|light/i.test(url)
    ) ||
    uniqueUrls[0] ||
    null;

  const poster =
    uniqueUrls.find(url =>
      /vertical|2000x3000|1000x1500|artwork/i.test(url)
    ) ||
    uniqueUrls[1] ||
    logo;

  if (!logo) {
    console.warn(`[plex] logo missing: ${slug}`);
  }

  return {
    logo,
    poster
  };
}

function findClosestPlaylist(text, markerIndex) {
  const playlistRegex =
    /https:\/\/epg\.provider\.plex\.tv\/library\/parts\/[^"' <\\]+\.m3u8[^"' <\\]*/g;

  let match;
  let best = null;

  while ((match = playlistRegex.exec(text))) {
    const distance = Math.abs(match.index - markerIndex);

    if (!best || distance < best.distance) {
      best = {
        distance,
        url: decodeHtml(match[0])
      };
    }
  }

  return best?.url || null;
}

async function fetchSportsPage(token, clientId) {
  const response = await fetchImpl(SPORTS_URL, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Encoding': 'identity',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/138 Safari/537.36',
      'X-Plex-Token': token,
      'X-Plex-Client-Identifier': clientId,
      'X-Plex-Product': 'KornDog Sports',
      'X-Plex-Version': '0.5.0',
      'X-Plex-Platform': 'Android'
    },
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(
      `Plex sports page failed: ${response.status} ${response.statusText}`
    );
  }

  const body = await response.text();

  if (!body || body.length < 1000) {
    throw new Error(
      `Plex sports page returned too little data: ${body?.length || 0} bytes`
    );
  }

  return decodeHtml(body);
}

async function fetchChannelLineup() {
  const response = await fetchImpl(M3U_URL, {
    headers: {
      Accept: 'text/plain'
    }
  });

  if (!response.ok) {
    throw new Error(
      `Plex M3U fetch failed: ${response.status} ${response.statusText}`
    );
  }

  const body = await response.text();

  if (!body || body.length < 500) {
    throw new Error(
      `Plex M3U returned too little data: ${body?.length || 0} bytes`
    );
  }

  return body;
}

function parseChannelLineup(m3uText) {
  const lines = m3uText.split('\n');
  const entries = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line.startsWith('#EXTINF')) continue;

    const idMatch = line.match(/channel-id="([^"]+)"/);
    const nameMatch = line.match(/tvg-name="([^"]+)"/);
    const logoMatch = line.match(/tvg-logo="([^"]+)"/);

    const nextLine = (lines[i + 1] || '').trim();

    if (!idMatch || !nextLine || !nextLine.startsWith('http')) continue;

    entries.push({
      channelId: idMatch[1],
      name: nameMatch ? nameMatch[1] : '',
      logo: logoMatch ? logoMatch[1] : null
    });
  }

  return entries;
}

async function fetchLineupFromMjh() {
  const response = await fetchImpl(MJH_URL);

  if (!response.ok) {
    throw new Error(
      `Plex backup lineup failed: ${response.status} ${response.statusText}`
    );
  }

  const gz = Buffer.from(await response.arrayBuffer());
  const data = JSON.parse(zlib.gunzipSync(gz).toString('utf8'));
  const raw = data.channels || data;

  // Real format: { channels: { "<channelId>": { name, logo, regions, programs } } }
  const pairs = Array.isArray(raw)
    ? raw.map(item => [item.channelId || item.id, item])
    : Object.entries(raw);

  const entries = pairs
    .filter(([, item]) =>
      item &&
      (!Array.isArray(item.regions) || item.regions.includes('us'))
    )
    .map(([key, item]) => ({
      channelId: key,
      name: item.name || '',
      logo: item.logo || null,
      programs: Array.isArray(item.programs) ? item.programs : []
    }))
    .filter(entry => entry.channelId && entry.name);

  if (!entries.length) {
    throw new Error('Plex backup lineup was empty');
  }

  return entries;
}

async function loadLineup() {
  try {
    const entries = parseChannelLineup(await fetchChannelLineup());

    if (entries.length) {
      state.lineupSource = 'm3u';
      return entries;
    }

    throw new Error('M3U had no entries');
  } catch (err) {
    console.warn(`[plex] M3U lineup failed (${err.message}); trying backup`);
  }

  const backup = await fetchLineupFromMjh();
  state.lineupSource = 'mjh';
  return backup;
}

// Plex hands out anonymous tokens; used only when PLEX_TOKEN is not set.
async function getAnonymousToken() {
  const now = Date.now();

  if (cachedAnonToken && now - cachedAnonAt < 6 * 60 * 60 * 1000) {
    return cachedAnonToken;
  }

  try {
    const response = await fetchImpl(
      'https://clients.plex.tv/api/v2/users/anonymous',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-Plex-Client-Identifier': CLIENT_ID,
          'X-Plex-Product': 'KornDog Sports',
          'X-Plex-Version': '0.5.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    if (json.authToken) {
      cachedAnonToken = json.authToken;
      cachedAnonAt = now;
      return cachedAnonToken;
    }
  } catch (err) {
    console.warn(`[plex] anonymous token failed: ${err.message}`);
  }

  return null;
}

// Env token first, anonymous token as a second chance.
async function getPlexTokenCandidates() {
  const list = [];

  if (process.env.PLEX_TOKEN) {
    list.push({ source: 'env', token: process.env.PLEX_TOKEN });
  }

  const anon = await getAnonymousToken();

  if (anon && anon !== process.env.PLEX_TOKEN) {
    list.push({ source: 'anonymous', token: anon });
  }

  return list;
}

async function getPlexToken() {
  const [first] = await getPlexTokenCandidates();

  return first ? first.token : null;
}

// Keep a small window of [startEpochSeconds, title] around now for the EPG.
function recentPrograms(list) {
  const nowSec = Math.floor(Date.now() / 1000);

  return (Array.isArray(list) ? list : [])
    .filter(item => Array.isArray(item) && Number(item[0]) >= nowSec - 4 * 3600)
    .slice(0, 24);
}

async function getSportsChannels() {
  state.lastRun = new Date().toISOString();
  state.lastError = null;

  const candidates = await getPlexTokenCandidates();
  const token = candidates[0] ? candidates[0].token : null;
  state.tokenSource = candidates[0] ? candidates[0].source : 'none';

  if (!token) {
    console.warn(
      '[plex] no Plex token available; Plex provider disabled'
    );

    return [];
  }

  let lineup;

  try {
    lineup = await loadLineup();
  } catch (err) {
    console.warn(`[plex] failed to load channel lineup: ${err.message}`);
    state.lineupSource = 'none';
    state.lastError = err.message;
    return [];
  }

  const channels = [];

  for (const target of TARGETS) {
    const match = lineup.find(
      entry =>
        entry.name &&
        entry.name.toLowerCase() === target.name.toLowerCase()
    );

    if (!match) {
      console.warn(`[plex] target not found in lineup: ${target.name}`);
      continue;
    }

    const streamUrl = `https://epg.provider.plex.tv/library/parts/${match.channelId}/`;

    channels.push({
      id: `plex-${target.slug}`,
      sourceId: target.slug,
      name: target.name,
      category: target.category,
      source: 'plex',
      logo: match.logo || null,
      poster: match.logo || null,
      description: `${target.name} live on Plex`,
      programs: recentPrograms(match.programs),
      streamUrl: addToken(streamUrl, token),
      verified: true,
      score: 120
    });
  }

  state.lineupCount = lineup.length;
  state.channelsLoaded = channels.length;

  console.log(
    `[plex] targets=${TARGETS.length} loaded=${channels.length}`
  );

  return channels;
}

module.exports = {
  getSportsChannels,
  getPlexToken,
  getPlexTokenCandidates,
  state,
  fetchSportsPage,
  TARGETS
};
