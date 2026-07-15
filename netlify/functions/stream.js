// netlify/functions/stream.js

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
  const match = path.match(/\/stream\/([^/]+)\/([^/]+)\.json$/);
  if (match) {
    type = type || decode(match[1]);
    id = id || decode(match[2]);
  }

  return { type, id: id.replace(/\.json$/, '') };
}

// Pulls the 11-character YouTube video ID out of either URL format.
function extractYoutubeId(url) {
  if (!url) return null;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return longMatch ? longMatch[1] : null;
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
    if (id.startsWith('concert-')) {
      const items = await getConcertItems();
      const item = items.find(it => it.id === id);

      if (!item || !item.tracks || item.tracks.length === 0) {
        return { statusCode: 200, headers, body: JSON.stringify({ streams: [] }) };
      }

      // Everything routes through watch.html now - even single-track
      // sessions - so playback always stays inside the KornDog embedded
      // player instead of handing off to the full YouTube app/site. This
      // keeps "back" behavior consistent and avoids the multi-tap jump
      // back into Concert Corner that happens when YouTube itself opens.
      const videoIds = item.tracks
        .map(t => extractYoutubeId(t.externalUrl))
        .filter(Boolean);

      const idsParam = videoIds.join(',');
      const titlesParam = item.tracks.map(t => encodeURIComponent(t.title)).join(',');
      const sessionParam = encodeURIComponent(item.name);

      const watchUrl = `${process.env.URL}/watch.html?ids=${idsParam}&titles=${titlesParam}&session=${sessionParam}`;

      const streams = [
        {
          name: 'KornDog Concert Corner',
          title: item.tracks.length > 1
            ? `${item.name} (${item.tracks.length} songs, stitched)`
            : item.name,
          externalUrl: watchUrl
        }
      ];

      return { statusCode: 200, headers, body: JSON.stringify({ streams }) };
    }

    // Default path: sports channels (unchanged behavior)
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
                ? `${process.env.URL}/plex-hls/${encodeURIComponent(channel.id)}/master.m3u8`
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
