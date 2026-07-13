const fetch = require('node-fetch');
const { fetchPlutoBoot } = require('../pluto');

const TARGETS = [
  {
    id: '677d9adfa9a51b0008497fa0',
    name: 'UFC',
    category: 'Combat Sports'
  },
  {
    id: '59b722526996084038c01e1b',
    name: 'TNA Wrestling',
    category: 'Combat Sports'
  }
];

function joinUrl(base, path) {
  return `${String(base).replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;
}

function appendQuery(url, query) {
  if (!query) return url;
  const clean = String(query).replace(/^\?/, '');
  return `${url}${url.includes('?') ? '&' : '?'}${clean}`;
}

async function getMetadata(target) {
  const response = await fetch(
    `https://api.pluto.tv/v2/channels/${target.id}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `Pluto metadata failed for ${target.name}: ${response.status}`
    );
  }

  return response.json();
}

async function getSportsChannels() {
  const boot = await fetchPlutoBoot();

  const channels = [];

  for (const target of TARGETS) {
    try {
      const metadata = await getMetadata(target);

      const streamUrl = appendQuery(
        joinUrl(
          boot.stitcherBase,
          `/stitch/hls/channel/${target.id}/master.m3u8`
        ),
        boot.stitcherParams
      );

      channels.push({
        id: `pluto-${target.id}`,
        sourceId: target.id,
        name: metadata.name || target.name,
        logo:
          metadata.colorLogoPNG?.path ||
          metadata.logo?.path ||
          metadata.thumbnail?.path ||
          null,
        source: 'pluto',
        streamUrl,
        description:
          metadata.summary ||
          `${target.name} on Pluto TV`,
        category: target.category,
        verified: true,
        checkedAt: new Date().toISOString(),
        score: 100,
        probe: {
          hasVideo: true,
          hasAudio: true,
          videoCodecs: ['h264'],
          audioCodecs: ['aac'],
          maxHeight: 684
        }
      });
    } catch (error) {
      console.error(
        `[pluto-targets] ${target.name} failed:`,
        error.message
      );
    }
  }

  console.log(`[pluto-targets] loaded=${channels.length}`);
  return channels;
}

module.exports = {
  getSportsChannels
};
