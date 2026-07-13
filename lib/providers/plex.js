const fetchImpl = global.fetch || require('node-fetch');

const SPORTS_URL =
  'https://watch.plex.tv/live-tv/category/sports';

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

function extractImage(chunk) {
  const matches = [
    ...chunk.matchAll(
      /https:\/\/(?:provider-static|images)\.plex\.tv\/[^"' <\\]+/g
    )
  ].map(match => decodeHtml(match[0]));

  return (
    matches.find(url =>
      /logo|channel|horizontal|artwork/i.test(url)
    ) ||
    matches[0] ||
    null
  );
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

async function getSportsChannels() {
  const token = process.env.PLEX_TOKEN;
  const clientId =
    process.env.PLEX_CLIENT_ID ||
    'korndog-sports-provider';

  if (!token) {
    console.warn(
      '[plex] PLEX_TOKEN missing; Plex provider disabled'
    );

    return [];
  }

  const text = await fetchSportsPage(token, clientId);
  const channels = [];

  for (const target of TARGETS) {
    const marker = `/live-tv/channel/${target.slug}`;
    const markerIndex = text.indexOf(marker);

    if (markerIndex === -1) {
      console.warn(`[plex] target not found: ${target.slug}`);
      continue;
    }

    const start = Math.max(0, markerIndex - 7000);
    const end = Math.min(text.length, markerIndex + 14000);
    const chunk = text.slice(start, end);

    const rawPlaylist = findClosestPlaylist(
      text,
      markerIndex
    );

    if (!rawPlaylist) {
      console.warn(
        `[plex] playlist missing: ${target.slug}`
      );
      continue;
    }

    channels.push({
      id: `plex-${target.slug}`,
      sourceId: target.slug,
      name: target.name,
      category: target.category,
      source: 'plex',
      logo: extractImage(chunk),
      poster: extractImage(chunk),
      description: `${target.name} live on Plex`,
      streamUrl: addToken(rawPlaylist, token),
      verified: true,
      score: 120
    });
  }

  console.log(
    `[plex] targets=${TARGETS.length} loaded=${channels.length}`
  );

  return channels;
}

module.exports = {
  getSportsChannels,
  fetchSportsPage,
  TARGETS
};
