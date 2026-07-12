// netlify/functions/catalog.js

const { getMergedSportsChannels } = require('../../lib/sources');

exports.handler = async (event) => {
  const { type, id } = event.queryStringParameters || {};

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (type !== 'tv' || id !== 'korndog-sports') {
    return { statusCode: 200, headers, body: JSON.stringify({ metas: [] }) };
  }

  try {
    const channels = await getMergedSportsChannels();

    const metas = channels.map(ch => ({
      id: ch.id,
      type: 'tv',
      name: ch.name,
      poster: ch.logo,
      posterShape: 'square',
      description: ch.description
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ metas }) };
  } catch (err) {
    console.error('[catalog] failed:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ metas: [] }) };
  }
};
