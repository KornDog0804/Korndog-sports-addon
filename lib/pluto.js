// lib/pluto.js
// Pulls Pluto TV's public channel lineup and normalizes sports-adjacent
// channels (sports, combat/MMA, wrestling, motorsports) into a common shape.
//
// NOTE: This hits Pluto's undocumented boot endpoint. It can change without
// notice - if fetchPlutoChannels() starts returning empty, check the response
// shape at https://boot.pluto.tv/v4/start first before assuming your code broke.
//
// IMPORTANT (learned from real response, July 2026): Pluto's channel objects
// carry "categoryIDs" as opaque database IDs (e.g. "618c3cc5..."), NOT human
// -readable category names. There's no reliable "category name" string on the
// channel object itself. So instead of matching category names, we match
// against the channel's visible NAME (e.g. "Pluto TV Sports", "Pluto TV Fight
// Network"). Also, "stitched.path" is only a relative URL - it has to be
// combined with the stitcher server base URL + stitcherParams query string to
// become an actually playable HLS link.

const fetch = require('node-fetch');

const PLUTO_BOOT_URL = 'https://boot.pluto.tv/v4/start';

// Keywords matched against the channel NAME (lowercased, partial match).
const SPORTS_NAME_MATCHERS = [
  'sport',
  'combat',
  'mma',
  'ufc',
  'fight',
  'wrestl',
  'motor',
  'racing',
  'nascar',
  'action sports'
];

function isSportsChannelName(name) {
  if (!name) return false;
  const lower = name.toLowerCase();
  return SPORTS_NAME_MATCHERS.some(match => lower.includes(match));
}

// Builds the boot request. Pluto expects some basic device/session params -
// these are loose/generic values that work for anonymous/guest sessions.
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

async function fetchPlutoBoot() {
  const url = `${PLUTO_BOOT_URL}?${buildBootParams()}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`Pluto boot request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  const rawChannels = (data && data.EPG) || [];
  const stitcherBase = (data && data.servers && data.servers.stitcher) || '';
  const stitcherParams = (data && data.stitcherParams) || '';

  if (!Array.isArray(rawChannels) || rawChannels.length === 0) {
    console.warn('[pluto] No channels found in boot response - endpoint shape may have changed.');
  }

  return { rawChannels, stitcherBase, stitcherParams };
}

// Normalizes a raw Pluto channel object into the addon's common channel shape:
// { id, name, logo, source, streamUrl, description }
// stitcherBase + stitcherParams are needed here because raw.stitched.path is
// only a relative URL on its own.
function normalizeChannel(raw, stitcherBase, stitcherParams) {
  const id = raw.slug || raw._id || raw.id;
  const name = raw.name || raw.title || 'Unknown Channel';
  const logo = (raw.images && raw.images.find(i => i.type === 'colorLogoPNG')?.url)
    || null;

  let streamUrl = null;
  if (raw.stitched && raw.stitched.path && stitcherBase) {
    streamUrl = `${stitcherBase}${raw.stitched.path}${stitcherParams ? `?${stitcherParams}` : ''}`;
  }

  return {
    id: `pluto-${id}`,
    name,
    logo,
    source: 'pluto',
    streamUrl,
    description: raw.summary || raw.description || ''
  };
}

// Public entry point used by index.js: returns only sports-relevant channels,
// already normalized and ready to merge with other sources.
async function getSportsChannels() {
  const { rawChannels, stitcherBase, stitcherParams } = await fetchPlutoBoot();

  return rawChannels
    .filter(ch => isSportsChannelName(ch.name))
    .map(ch => normalizeChannel(ch, stitcherBase, stitcherParams))
    .filter(ch => ch.streamUrl); // drop anything we couldn't resolve a stream for
}

module.exports = {
  getSportsChannels,
  isSportsChannelName // exported for testing/debugging in Termux
};
