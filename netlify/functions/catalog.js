const { getMergedSportsChannels } = require('../../lib/sources');
const { getConcertItems } = require('../../lib/providers/concerts');
const { CATALOGS, FEATURED_NAMES } = require('../../lib/catalogs');

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
  const match = path.match(/\/catalog\/([^/]+)\/([^/]+)\.json$/);
  if (match) {
    type = type || decode(match[1]);
    id = id || decode(match[2]);
  }

  return { type, id };
}

function isFeatured(channel) {
  const name = String(channel.name || '').toLowerCase();
  return FEATURED_NAMES.some(target =>
    name.includes(target.toLowerCase())
  );
}

exports.handler = async event => {
  const { type, id } = parseRequest(event);

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300'
  };

  if (type !== 'tv') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ metas: [] })
    };
  }

  const catalog = CATALOGS.find(item => item.id === id);
  if (!catalog) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ metas: [] })
    };
  }

  try {
    if (catalog.category === 'Concerts') {
      const items = await getConcertItems();

      const filtered = catalog.folderMatch
        ? items.filter(it => (it.folder || '').includes(catalog.folderMatch))
        : items;

      const metas = filtered.map(item => ({
        id: item.id,
        type: 'tv',
        name: item.name,
        poster: item.logo || undefined,
        posterShape: 'poster',
        description: item.description || 'Concert Corner session'
      }));

      console.log('[catalog]', { id, category: catalog.category, returned: metas.length });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ metas })
      };
    }

    const allChannels = await getMergedSportsChannels();
    let channels;

    if (catalog.category === 'Featured') {
      channels = allChannels
        .filter(isFeatured)
        .sort((a, b) => (b.score || 0) - (a.score || 0));
    } else {
      channels = allChannels
        .filter(channel => channel.category === catalog.category)
        .sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    const metas = channels.map(channel => ({
      id: channel.id,
      type: 'tv',
      name: channel.name,
      poster: channel.logo || undefined,
      posterShape: 'square',
      description:
        `${channel.description || 'Verified live channel'}\n\n` +
        `${channel.probe?.maxHeight || '?'}p · ` +
        `Score ${channel.score || 0} · ` +
        `Verified ${channel.checkedAt || 'recently'}`,
      genres: [catalog.name]
    }));

    console.log('[catalog]', {
      id,
      category: catalog.category,
      returned: metas.length
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
