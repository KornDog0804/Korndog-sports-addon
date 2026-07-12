// netlify/functions/meta.js

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
  const match = path.match(/\/meta\/([^/]+)\/([^/]+)\.json$/);

  if (match) {
    type = type || decode(match[1]);
    id = id || decode(match[2]);
  }

  return { type, id };
}

exports.handler = async (event) => {
  const { type, id } = parseRequest(event);

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300'
  };

  if (type !== 'tv' || !id) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ meta: null })
    };
  }

  try {
    const channels = await getMergedSportsChannels();
    const channel = channels.find(item => item.id === id);

    if (!channel) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ meta: null })
      };
    }

    const meta = {
      id: channel.id,
      type: 'tv',
      name: channel.name,
      poster: channel.logo || undefined,
      background: channel.logo || undefined,
      description: channel.description || `Live sports channel from ${channel.source}`,
      genres: channel.category ? [channel.category] : ['Sports'],
      releaseInfo: 'Live Channel',
      runtime: 'Live',
      videos: [
        {
          id: channel.id,
          title: 'Watch Live',
          released: new Date().toISOString()
        }
      ]
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ meta })
    };
  } catch (error) {
    console.error('[meta] failed:', error);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ meta: null })
    };
  }
};
