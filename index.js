// index.js
// KornDog Sports - Stremio addon entry point.
// Serves a merged "Sports" catalog of free live channels (starting with Pluto TV)
// and resolves live stream URLs on play.

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const pluto = require('./lib/pluto');

const MANIFEST = {
  id: 'org.korndog.sports',
  version: '0.5.2',
  name: 'KornDog Sports',
  description: 'Free live sports and outdoor channels from multiple public providers, merged into one KornDog catalog.',
  logo: 'https://korndogrecords.com/favicon.png', // swap for real hosted logo when ready
  resources: ['catalog', 'stream'],
  types: ['tv'],
  catalogs: [
    {
      type: 'tv',
      id: 'korndog-sports',
      name: 'KornDog Sports'
    }
  ],
  idPrefixes: ['pluto-', 'iptvorg-'],
};

const builder = new addonBuilder(MANIFEST);

// Simple in-memory cache so we're not hitting Pluto on every single request.
// 20 min TTL - channel lineups don't change often, but stream tokens do
// (those get re-resolved separately in the stream handler, not cached here).
let cachedChannels = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 20 * 60 * 1000;

async function getMergedSportsChannels() {
  const now = Date.now();
  if (cachedChannels.length > 0 && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedChannels;
  }

  const results = await Promise.allSettled([
    pluto.getSportsChannels()
    // future: samsung.getSportsChannels(), xumo.getSportsChannels(), plex.getSportsChannels()
  ]);

  const merged = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      merged.push(...result.value);
    } else {
      console.error(`[getMergedSportsChannels] source ${i} failed:`, result.reason?.message);
    }
  });

  cachedChannels = merged;
  cacheTimestamp = now;
  return merged;
}

builder.defineCatalogHandler(async ({ type, id }) => {
  if (type !== 'tv' || id !== 'korndog-sports') {
    return { metas: [] };
  }

  const channels = await getMergedSportsChannels();

  const metas = channels.map(ch => ({
    id: ch.id,
    type: 'tv',
    name: ch.name,
    poster: ch.logo,
    posterShape: 'square',
    description: ch.description
  }));

  return { metas };
});

builder.defineStreamHandler(async ({ type, id }) => {
  if (type !== 'tv') {
    return { streams: [] };
  }

  const channels = await getMergedSportsChannels();
  const channel = channels.find(ch => ch.id === id);

  if (!channel || !channel.streamUrl) {
    return { streams: [] };
  }

  return {
    streams: [
      {
        title: `${channel.name} (${channel.source})`,
        url: channel.streamUrl
      }
    ]
  };
});

const PORT = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: PORT });

console.log(`KornDog Sports addon running on port ${PORT}`);
console.log(`Manifest: http://127.0.0.1:${PORT}/manifest.json`);
