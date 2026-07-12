// netlify/functions/catalog.js

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
  let genre = query.genre || '';
  let extra = query.extra || '';

  const path = event.path || event.rawPath || '';
  const match = path.match(/\/catalog\/([^/]+)\/([^/]+)(?:\/(.+))?\.json$/);

  if (match) {
    type = type || decode(match[1]);
    id = id || decode(match[2]);
    extra = extra || decode(match[3] || '');
  }

  if (!genre && extra) {
    const extraParams = new URLSearchParams(extra);
    genre = extraParams.get('genre') || '';
  }

  return { type, id, genre };
}

exports.handler = async (event) => {
  const { type, id, genre } = parseRequest(event);

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300'
  };

  if (type !== 'tv' || id !== 'korndog-sports') {
    console.log('[catalog] rejected request', {
      path: event.path,
      query: event.queryStringParameters,
      parsed: { type, id, genre }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ metas: [] })
    };
  }

  try {
    let channels = await getMergedSportsChannels();

    if (genre && genre !== 'Featured') {
      channels = channels.filter(channel => channel.category === genre);
    }

    const metas = channels.map(channel => ({
      id: channel.id,
      type: 'tv',
      name: channel.name,
      poster: channel.logo || undefined,
      posterShape: 'square',
      description: channel.description || '',
      genres: channel.category ? [channel.category] : []
    }));

    console.log('[catalog] response', {
      path: event.path,
      query: event.queryStringParameters,
      parsed: { type, id, genre },
      count: metas.length
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ metas })
    };
  } catch (error) {
    console.error('[catalog] failed:', error);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ metas: [] })
    };
  }
};
