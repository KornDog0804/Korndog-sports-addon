// lib/pluto.js
const fetch = require('node-fetch');

const PLUTO_BOOT_URL = 'https://boot.pluto.tv/v4/start';

const SPORTS_CATEGORY_MATCHERS = [
  'sport', 'combat', 'mma', 'fight', 'wrestl', 'motor', 'racing', 'nascar', 'action sports'
];

function isSportsCategory(categoryName) {
  if (!categoryName) return false;
  const lower = categoryName.toLowerCase();
  return SPORTS_CATEGORY_MATCHERS.some(match => lower.includes(match));
}

function buildBootParams() {
  const params = new URLSearchParams({
    appName: 'web',
    appVersion: 'unknown',
    deviceVersion: 'unknown',
    deviceModel: 'web',
    deviceMake: 'chrome',
    deviceType: 'web',
    clientID: 'korndog-sports-addon',
    clientModelNumber: '1.0'
  });
  return params.toString();
}

async function fetchPlutoChannels() {
  const url = `${PLUTO_BOOT_URL}?${buildBootParams()}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });

  if (!res.ok) {
    throw new Error(`Pluto boot request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const rawChannels = (data && data.EPG) || (data && data.channels) || [];

  if (!Array.isArray(rawChannels) || rawChannels.length === 0) {
    console.warn('[pluto] No channels found in boot response - endpoint shape may have changed.');
    return [];
  }

  return rawChannels;
}

function normalizeChannel(raw) {
  const id = raw.slug || raw._id || raw.id;
  const name = raw.name || raw.title || 'Unknown Channel';
  const logo = (raw.images && raw.images.find(i => i.type === 'colorLogoPNG')?.url)
    || (raw.logo && raw.logo.path)
    || null;

  const streamUrl = (raw.stitched && raw.stitched.urls && raw.stitched.urls[0] && raw.stitched.urls[0].url)
    || raw.hls
    || null;

  const category = raw.category || (raw.categoryIDs && raw.categoryIDs[0]) || '';

  return {
    id: `pluto-${id}`,
    name,
    logo,
    category,
    source: 'pluto',
    streamUrl,
    description: raw.summary || raw.description || ''
  };
}

async function getSportsChannels() {
  const raw = await fetchPlutoChannels();

  return raw
    .filter(ch => isSportsCategory(ch.category) || isSportsCategory((ch.categoryIDs || [])[0]))
    .map(normalizeChannel)
    .filter(ch => ch.streamUrl);
}

module.exports = { getSportsChannels, isSportsCategory };
