
const { getMergedSportsChannels } = require('../../lib/sources');

function clean(value = '') {
  return String(value)
    .replace(/[\r\n"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getOrigin(event) {
  return (
    process.env.URL ||
    `https://${event.headers.host || 'korndog-sports-addon.netlify.app'}`
  ).replace(/\/+$/, '');
}

function getGroup(channel = {}) {
  const text = [
    channel.category,
    channel.genre,
    ...(Array.isArray(channel.genres) ? channel.genres : []),
    channel.name,
    channel.description
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const rules = [
    { group: 'Motorsports', pattern: /motor|racing|nascar|nhra|formula|monster jam|moto|turbo|aci sport/ },
    { group: 'Combat Sports', pattern: /wrestling|ufc|mma|boxing|fight|combat|fite/ },
    { group: 'Golf', pattern: /golf/ },
    { group: 'Tennis', pattern: /tennis|supertennis/ },
    { group: 'Billiards', pattern: /billiard|snooker|kozoom|pool/ },
    { group: 'Poker & Gaming', pattern: /poker|world poker tour/ },
    { group: 'Outdoor Sports', pattern: /sportsman|hunting|fishing|nautical|slopes|outdoor/ },
    { group: 'Strength Sports', pattern: /strongman|powerlifting|weightlifting/ },
    { group: 'Sports News & Talk', pattern: /sportsgrid|jim rome|draftkings|fanduel|espnews|talksport/ },
    { group: 'Baseball', pattern: /baseball|mlb/ },
    { group: 'Basketball', pattern: /basketball|nba|wnba/ },
    { group: 'Hockey', pattern: /hockey|nhl/ },
    { group: 'Soccer', pattern: /soccer|fifa|real madrid|goltv|futv|fútbol|futbol|premier league|la liga|serie a/ },
    { group: 'Football', pattern: /football|nfl|acc network|accdn|espnu/ },
    { group: 'College Sports', pattern: /college|ncaa|lacrosse/ },
    { group: 'Extreme Sports', pattern: /extreme sports|fuel tv|fast&funbox|in trouble/ }
  ];

  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      return rule.group;
    }
  }

  return 'General Sports';
}

function getStreamUrl(channel, origin) {
  if (channel.source === 'plex') {
    return `${origin}/plex-hls/${encodeURIComponent(channel.id)}/master.m3u8`;
  }

  return channel.streamUrl || '';
}

exports.handler = async event => {
  try {
    const origin = getOrigin(event);
    const channels = await getMergedSportsChannels();

    const entries = channels
      .map(channel => {
        const streamUrl = getStreamUrl(channel, origin);

        if (!channel.id || !channel.name || !streamUrl) {
          return null;
        }

        const attributes = [
          `tvg-id="${clean(channel.id)}"`,
          `tvg-name="${clean(channel.name)}"`,
          channel.logo ? `tvg-logo="${clean(channel.logo)}"` : '',
          `group-title="${clean(getGroup(channel))}"`
        ]
          .filter(Boolean)
          .join(' ');

        return [
          `#EXTINF:-1 ${attributes},${clean(channel.name)}`,
          streamUrl
        ].join('\n');
      })
      .filter(Boolean);

    const body = ['#EXTM3U', ...entries, ''].join('\n\n');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/x-mpegurl; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
      },
      body
    };
  } catch (error) {
    console.error('[playlist] failed:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      body: 'Unable to generate playlist'
    };
  }
};
