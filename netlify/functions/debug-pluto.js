// netlify/functions/debug-pluto.js

const {
  fetchPlutoBoot,
  getSportsChannels
} = require('../../lib/pluto');

exports.handler = async () => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  };

  try {
    const boot = await fetchPlutoBoot();
    const sports = await getSportsChannels();

    const sampleRaw = boot.rawChannels.slice(0, 5).map(channel => ({
      id: channel?.slug || channel?._id || channel?.id || null,
      name: channel?.name || channel?.title || null,
      keys: Object.keys(channel || {}),
      stitchedKeys: Object.keys(channel?.stitched || {})
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(
        {
          ok: true,
          bootKeys: Object.keys(boot.data || {}),
          rawChannelCount: boot.rawChannels.length,
          sportsChannelCount: sports.length,
          playableSportsCount: sports.filter(channel => channel.streamUrl).length,
          sampleRaw,
          sampleSports: sports.slice(0, 10).map(channel => ({
            id: channel.id,
            name: channel.name,
            hasLogo: Boolean(channel.logo),
            hasStreamUrl: Boolean(channel.streamUrl)
          }))
        },
        null,
        2
      )
    };
  } catch (error) {
    console.error('[debug-pluto] failed:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(
        {
          ok: false,
          error: error.message
        },
        null,
        2
      )
    };
  }
};
