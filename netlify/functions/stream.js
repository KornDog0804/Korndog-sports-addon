// netlify/functions/stream.js

const { getMergedSportsChannels } = require('../../lib/sources');

function decode(value) {
  try {
    return decodeURIComponent(value || '');
  } catch {
    return value || '';
  }
}

function parseRequest(event) {
  const query = event.queryStringParameters || {};
  let type = query.type || '';
  let id = query.id || '';

  const path = event.path || event.rawPath || '';
  const match = path.match(/\/stream\/([^/]+)\/([^/]+)\.json$/);

  if (match) {
    type = type || decode(match[1]);
    id = id || decode(match[2]);
  }

  return { type, id: id.replace(/\.json$/, '') };
}

exports.handler = async (event) => {
  const { type, id } = parseRequest(event);

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  };

  if (type !== 'tv' || !id) {
    console.log('[stream] rejected request', {
      path: event.path,
      query: event.queryStringParameters,
      parsed: { type, id }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ streams: [] })
    };
  }

  try {
    const channels = await getMergedSportsChannels();
    const channel = channels.find(item => item.id === id);

    console.log('[stream] lookup', {
      id,
      found: Boolean(channel),
      hasStreamUrl: Boolean(channel?.streamUrl)
    });

    if (!channel?.streamUrl) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ streams: [] })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        streams: [
          {
            name: 'KornDog Sports',
            title: `${channel.name} (${channel.source})`,
            url:
          channel.source === 'plex'
            ? `${process.env.URL}/.netlify/functions/plex-hls?id=${encodeURIComponent(channel.id)}`
            : channel.streamUrl
          }
        ]
      })
    };
  } catch (error) {
    console.error('[stream] failed:', error);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ streams: [] })
    };
  }
};
