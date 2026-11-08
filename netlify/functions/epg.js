
const { getMergedSportsChannels } = require('../../lib/sources');

function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmltvTime(date) {
  const pad = value => String(value).padStart(2, '0');

  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds())
  ].join('') + ' +0000';
}

exports.handler = async () => {
  try {
    const channels = await getMergedSportsChannels();

    const now = new Date();
    const end = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    const channelXml = channels
      .filter(channel => channel.id && channel.name)
      .map(channel => {
        const icon = channel.logo
          ? `<icon src="${esc(channel.logo)}" />`
          : '';

        return [
          `<channel id="${esc(channel.id)}">`,
          `  <display-name>${esc(channel.name)}</display-name>`,
          icon ? `  ${icon}` : '',
          `</channel>`
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n');

    const programmeXml = channels
      .filter(channel => channel.id && channel.name)
      .map(channel => {
        const desc =
          channel.description ||
          `Live programming from ${channel.name} on KornDog Sports.`;

        const toXml = (start, stop, title) => [
          `<programme start="${xmltvTime(start)}" stop="${xmltvTime(stop)}" channel="${esc(channel.id)}">`,
          `  <title>${esc(title)}</title>`,
          `  <desc>${esc(desc)}</desc>`,
          `  <category>Sports</category>`,
          `</programme>`
        ].join('\n');

        // Real schedule (Plex channels): [startEpochSeconds, title] pairs.
        const real = (channel.programs || [])
          .map(item => ({ start: Number(item[0]) * 1000, title: String(item[1] || '') }))
          .filter(item => item.start && item.title)
          .sort((a, b) => a.start - b.start);

        if (real.length) {
          return real
            .map((item, index) => {
              const next = real[index + 1];
              const stopMs = next ? next.start : item.start + 30 * 60 * 1000;

              return toXml(new Date(item.start), new Date(stopMs), item.title);
            })
            .join('\n');
        }

        return toXml(now, end, `${channel.name} Live`);
      })
      .join('\n');

    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE tv SYSTEM "xmltv.dtd">',
      '<tv generator-info-name="KornDog Sports">',
      channelXml,
      programmeXml,
      '</tv>',
      ''
    ].join('\n');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      },
      body
    };
  } catch (error) {
    console.error('[epg] failed:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      body: 'Unable to generate EPG'
    };
  }
};
