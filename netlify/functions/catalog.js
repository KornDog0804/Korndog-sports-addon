const {
  getMergedSportsChannels
} = require('../../lib/sources');

const PAGE_SIZE = 50;

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
  let skip = Number(query.skip || 0);
  let extra = query.extra || '';

  const path = event.path || event.rawPath || '';
  const match = path.match(
    /\/catalog\/([^/]+)\/([^/]+)(?:\/(.+))?\.json$/
  );

  if (match) {
    type = type || decode(match[1]);
    id = id || decode(match[2]);
    extra = extra || decode(match[3] || '');
  }

  if (extra) {
    const extraParams = new URLSearchParams(extra);

    genre = genre || extraParams.get('genre') || '';

    const extraSkip = Number(extraParams.get('skip') || 0);
    if (Number.isFinite(extraSkip)) skip = extraSkip;
  }

  if (!Number.isFinite(skip) || skip < 0) skip = 0;

  return {
    type,
    id,
    genre,
    skip
  };
}

exports.handler = async event => {
  const { type, id, genre, skip } = parseRequest(event);

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300'
  };

  if (type !== 'tv' || id !== 'korndog-sports') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ metas: [] })
    };
  }

  try {
    let channels = await getMergedSportsChannels();

    if (genre && genre !== 'Featured') {
      channels = channels.filter(
        channel => channel.category === genre
      );
    }

    const page = channels.slice(skip, skip + PAGE_SIZE);

    const metas = page.map(channel => ({
      id: channel.id,
      type: 'tv',
      name: channel.name,
      poster: channel.logo || undefined,
      posterShape: 'square',
      description:
        `${channel.description || 'Live sports channel'}\n\n` +
        `Verified: ${channel.checkedAt || 'recently'} · ` +
        `${channel.probe?.maxHeight || '?'}p · ` +
        `Score ${channel.score || 0}`,
      genres: channel.category
        ? [channel.category]
        : ['Sports']
    }));

    console.log('[catalog]', {
      total: channels.length,
      genre: genre || 'Featured',
      skip,
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
