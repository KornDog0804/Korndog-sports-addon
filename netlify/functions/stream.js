// netlify/functions/stream.js

const { getMergedSportsChannels } = require('../../lib/sources');

exports.handler = async (event) => {
  const { type, id } = event.queryStringParameters || {};

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (type !== 'tv' || !id) {
    return { statusCode: 200, headers, body: JSON.stringify({ streams: [] }) };
  }

  try {
    const channels = await getMergedSportsChannels();
    const channel = channels.find(ch => ch.id === id);

    if (!channel || !channel.streamUrl) {
      return { statusCode: 200, headers, body: JSON.stringify({ streams: [] }) };
    }

    const streams = [
      {
        title: `${channel.name} (${channel.source})`,
        url: channel.streamUrl
      }
    ];

    return { statusCode: 200, headers, body: JSON.stringify({ streams }) };
  } catch (err) {
    console.error('[stream] failed:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ streams: [] }) };
  }
};
