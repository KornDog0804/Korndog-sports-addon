// netlify/functions/meta.js

const { getMergedSportsChannels } = require('../../lib/sources');
const { getConcertItems } = require('../../lib/providers/concerts');

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
    if (id.startsWith('concert-')) {
      const items = await getConcertItems();
      const item = items.find(it => it.id === id);

      if (!item) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ meta: null })
        };
      }

      const meta = {
        id: item.id,
        type: 'tv',
        name: item.name,
        poster: item.logo || undefined,
        posterShape: 'poster',
        background: item.logo || undefined,
        description: item.description || `${item.folder || 'Concert Corner'} session`,
        genres: ['Concerts'],
        releaseInfo: item.folder || 'Concert Corner',
        behaviorHints: {
          defaultVideoId: item.id
        },
        videos: [
          {
            id: item.id,
            title: item.tracks && item.tracks.length > 1
              ? `Full Set (${item.tracks.length} songs)`
              : 'Watch',
            released: new Date().toISOString(),
            available: true
          }
        ]
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ meta })
      };
    }

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
      posterShape: 'square',
      background: channel.logo || undefined,
      description:
        channel.description ||
        `Live sports channel from ${channel.source}`,
      genres: channel.category
        ? [channel.category]
        : ['Sports'],
      releaseInfo: 'Live Channel',
      runtime: 'Live',
      behaviorHints: {
        defaultVideoId: channel.id
      },
      videos: [
        {
          id: channel.id,
          title: 'Watch Live',
          released: new Date().toISOString(),
          available: true
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
