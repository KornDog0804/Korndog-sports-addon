const fetchImpl = global.fetch || require('node-fetch');

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

async function getSportsChannels() {
  const token = process.env.PLEX_TOKEN;

  if (!token) {
    console.warn(
      '[plex] PLEX_TOKEN missing; Plex provider disabled'
    );

    return [];
  }

  let lineup;

  try {
    const m3uText = await fetchChannelLineup();
    lineup = parseChannelLineup(m3uText);
  } catch (err) {
    console.warn(`[plex] failed to load channel lineup: ${err.message}`);
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
      streamUrl: addToken(streamUrl, token),
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
