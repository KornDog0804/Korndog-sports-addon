
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

  if (/concert|music|festival|live music/.test(text)) {
    return 'Concert Corner';
  }

  if (/motor|racing|nascar|nhra|formula|monster jam|moto/.test(text)) {
    return 'Motorsports';
  }

  if (/wrestling|ufc|mma|boxing|fight|combat/.test(text)) {
    return 'Combat Sports';
  }

  if (/football|nfl/.test(text)) return 'Football';
  if (/basketball|nba/.test(text)) return 'Basketball';
  if (/baseball|mlb/.test(text)) return 'Baseball';
  if (/soccer|football club|fifa/.test(text)) return 'Soccer';
  if (/hockey|nhl/.test(text)) return 'Hockey';

  return 'Sports';
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
