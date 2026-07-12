// netlify/functions/catalog.js

const { getMergedSportsChannels } = require('../../lib/sources');
const { CATEGORY_RULES } = require('../../lib/categories');

// Stremio expects the manifest to declare which genres exist so it can show
// them as filter tabs - manifest.js needs a matching "extra" block for this
// to actually render in the UI (see note below).
const KNOWN_GENRES = ['Featured', ...CATEGORY_RULES.map(r => r.category)];

exports.handler = async (event) => {
  const { type, id, genre } = event.queryStringParameters || {};

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (type !== 'tv' || id !== 'korndog-sports') {
    return { statusCode: 200, headers, body: JSON.stringify({ metas: [] }) };
  }

  try {
    let channels = await getMergedSportsChannels();

    if (genre && genre !== 'Featured') {
      channels = channels.filter(ch => ch.category === genre);
    }

    const metas = channels.map(ch => ({
      id: ch.id,
      type: 'tv',
      name: ch.name,
      poster: ch.logo,
      posterShape: 'square',
      description: ch.description,
      genres: [ch.category]
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ metas }) };
  } catch (err) {
    console.error('[catalog] failed:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ metas: [] }) };
  }
};
