
const { getMergedSportsChannels } = require('../../lib/sources');

const PLEX_HOSTS = new Set([
  'epg.provider.plex.tv',
  'epg-ipv4.provider.plex.tv'
]);

function response(statusCode, body, contentType = 'text/plain') {
  return {
    statusCode,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    },
    body
  };
}

function getVariants(text, baseUrl) {
  const lines = text.split(/\r?\n/);
  const variants = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].trim().startsWith('#EXT-X-STREAM-INF:')) {
      continue;
    }

    let next = i + 1;

    while (
      next < lines.length &&
      (!lines[next].trim() || lines[next].trim().startsWith('#'))
    ) {
      next += 1;
    }

    if (next < lines.length) {
      variants.push(new URL(lines[next].trim(), baseUrl).toString());
    }
  }

  return variants;
}

function rewriteMaster(text, channelId, baseUrl, origin) {
  const lines = text.split(/\r?\n/);
  let variantIndex = 0;
  let expectingVariant = false;

  return lines.map(line => {
    const trimmed = line.trim();

    if (trimmed.startsWith('#EXT-X-STREAM-INF:')) {
      expectingVariant = true;
      return line;
    }

    if (expectingVariant && trimmed && !trimmed.startsWith('#')) {
      const proxied =
        `${origin}/plex-hls/${encodeURIComponent(channelId)}` +
        `/variant/${variantIndex}.m3u8`;

      variantIndex += 1;
      expectingVariant = false;
      return proxied;
    }

    return line;
  }).join('\n');
}

function rewriteVariant(text, baseUrl) {
  return text
    .split(/\r?\n/)
    .map(line => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }

      const resolved = new URL(trimmed, baseUrl);

      // Plex child playlists must never be returned directly.
      if (PLEX_HOSTS.has(resolved.hostname)) {
        return '';
      }

      // CDN media segments can be returned directly.
      return resolved.toString();
    })
    .filter(Boolean)
    .join('\n');
}

exports.handler = async event => {
  try {
    const query = event.queryStringParameters || {};
    const path = event.path || event.rawPath || '';

    let channelId = query.id || '';
    let variant =
      query.variant === undefined ? null : Number(query.variant);

    const masterMatch =
      path.match(/\/plex-hls\/([^/]+)\/master\.m3u8$/);

    const variantMatch =
      path.match(/\/plex-hls\/([^/]+)\/variant\/(\d+)\.m3u8$/);

    if (masterMatch) {
      channelId = decodeURIComponent(masterMatch[1]);
      variant = null;
    }

    if (variantMatch) {
      channelId = decodeURIComponent(variantMatch[1]);
      variant = Number(variantMatch[2]);
    }

    if (!channelId) {
      return response(400, 'Missing channel id');
    }

    const channels = await getMergedSportsChannels();
    const channel = channels.find(item => item.id === channelId);

    if (
      !channel ||
      channel.source !== 'plex' ||
      !channel.streamUrl
    ) {
      return response(404, 'Plex channel not found');
    }

    const masterResponse = await fetch(channel.streamUrl, {
      headers: {
        'X-Plex-Token': process.env.PLEX_TOKEN || '',
        'X-Plex-Client-Identifier':
          process.env.PLEX_CLIENT_ID || 'korndog-sports-provider',
        'User-Agent': 'KornDog Sports/0.5.3'
      },
      redirect: 'follow'
    });

    if (!masterResponse.ok) {
      return response(
        masterResponse.status,
        `Plex master failed: ${masterResponse.status}`
      );
    }

    const masterUrl = masterResponse.url;
    const masterText = await masterResponse.text();

    if (variant === null) {
      const origin =
        process.env.URL ||
        `https://${event.headers.host}`;

      return response(
        200,
        rewriteMaster(masterText, channelId, masterUrl, origin),
        'application/vnd.apple.mpegurl'
      );
    }

    const variants = getVariants(masterText, masterUrl);
    const variantUrl = variants[variant];

    if (!variantUrl) {
      return response(404, 'Variant not found');
    }

    const variantResponse = await fetch(variantUrl, {
      headers: {
        'X-Plex-Token': process.env.PLEX_TOKEN || '',
        'X-Plex-Client-Identifier':
          process.env.PLEX_CLIENT_ID || 'korndog-sports-provider',
        'User-Agent': 'KornDog Sports/0.5.3'
      },
      redirect: 'follow'
    });

    if (!variantResponse.ok) {
      return response(
        variantResponse.status,
        `Plex variant failed: ${variantResponse.status}`
      );
    }

    const variantText = await variantResponse.text();

    return response(
      200,
      rewriteVariant(variantText, variantResponse.url),
      'application/vnd.apple.mpegurl'
    );
  } catch (error) {
    console.error('[plex-hls] failed:', error);

    return response(500, 'Plex proxy failed');
  }
};
