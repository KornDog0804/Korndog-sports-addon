// netlify/functions/progress.js
// Tracks playback position per content item so playback can resume where
// it left off, regardless of which device/browser you're on. Single shared
// store since this is a personal addon, not multi-user - no auth needed.

const { getStore } = require('@netlify/blobs');

function store() {
  return getStore('watch-progress');
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const blobs = store();

  if (event.httpMethod === 'GET') {
    const id = event.queryStringParameters?.id;
    if (!id) return { statusCode: 200, headers, body: JSON.stringify({ progress: null }) };

    try {
      const raw = await blobs.get(id, { type: 'json' });
      return { statusCode: 200, headers, body: JSON.stringify({ progress: raw || null }) };
    } catch {
      return { statusCode: 200, headers, body: JSON.stringify({ progress: null }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { id, position, trackIndex } = body;
      if (!id || typeof position !== 'number') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id and position required' }) };
      }

      await blobs.setJSON(id, {
        position,
        trackIndex: trackIndex || 0,
        updatedAt: new Date().toISOString()
      });

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
