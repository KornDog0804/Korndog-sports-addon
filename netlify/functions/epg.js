
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
        const title = `${channel.name} Live`;
        const desc =
          channel.description ||
          `Live programming from ${channel.name} on KornDog Sports.`;

        return [
          `<programme start="${xmltvTime(now)}" stop="${xmltvTime(end)}" channel="${esc(channel.id)}">`,
          `  <title>${esc(title)}</title>`,
          `  <desc>${esc(desc)}</desc>`,
          `  <category>Sports</category>`,
          `</programme>`
        ].join('\n');
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
