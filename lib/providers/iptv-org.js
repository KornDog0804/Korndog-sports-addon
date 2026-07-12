// lib/providers/iptv-org.js

const fetch = require('node-fetch');
const { parseM3U } = require('../m3u');

const SPORTS_PLAYLIST_URL =
  'https://iptv-org.github.io/iptv/categories/sports.m3u';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

async function fetchPlaylist() {
  const response = await fetch(SPORTS_PLAYLIST_URL, {
    headers: {
      Accept: 'application/x-mpegURL,text/plain,*/*',
      'User-Agent': 'KornDog-Sports/0.2.0'
    },
    timeout: 20000
  });

  if (!response.ok) {
    throw new Error(
      `iptv-org request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.text();
}

async function getSportsChannels() {
  const text = await fetchPlaylist();
  const parsed = parseM3U(text);

  const channels = parsed
    .filter(channel => channel.streamUrl)
    .map((channel, index) => {
      const baseId =
        channel.tvgId ||
        slugify(channel.name) ||
        `channel-${index}`;

      return {
        id: `iptvorg-${baseId}-${index}`,
        sourceId: channel.tvgId || baseId,
        name: channel.name,
        logo: channel.logo || null,
        source: 'iptv-org',
        streamUrl: channel.streamUrl,
        description: [
          channel.group || 'Sports',
          channel.country,
          channel.language,
          'Public stream indexed by iptv-org'
        ]
          .filter(Boolean)
          .join(' · ')
      };
    });

  console.log(
    `[iptv-org] parsed=${parsed.length} accepted=${channels.length}`
  );

  return channels;
}

module.exports = {
  getSportsChannels,
  fetchPlaylist
};
