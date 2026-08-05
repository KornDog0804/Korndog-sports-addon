
const { getConcertItems } = require('../../lib/providers/concerts');

function clean(value = '') {
  return String(value)
    .replace(/[\r\n"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

exports.handler = async () => {
  try {
    const items = await getConcertItems();

    const entries = [];

    for (const item of items) {
      const tracks = Array.isArray(item.tracks)
        ? item.tracks
        : [];

      for (let index = 0; index < tracks.length; index += 1) {
        const track = tracks[index];

        if (!track.externalUrl) {
          continue;
        }

        const title =
          tracks.length > 1
            ? `${item.name} - ${track.title || `Track ${index + 1}`}`
            : item.name;

        const id = `${item.id}-${index + 1}`;

        const attributes = [
          `tvg-id="${clean(id)}"`,
          `tvg-name="${clean(title)}"`,
          item.logo
            ? `tvg-logo="${clean(item.logo)}"`
            : '',
          `group-title="${clean(item.folder || 'Concert Corner')}"`
        ]
          .filter(Boolean)
          .join(' ');

        entries.push(
          [
            `#EXTINF:-1 ${attributes},${clean(title)}`,
            track.externalUrl
          ].join('\n')
        );
      }
    }

    const body = [
      '#EXTM3U',
      ...entries,
      ''
    ].join('\n\n');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/x-mpegurl; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      },
      body
    };
  } catch (error) {
    console.error('[concert-playlist] failed:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      body: 'Unable to generate Concert Corner playlist'
    };
  }
};
