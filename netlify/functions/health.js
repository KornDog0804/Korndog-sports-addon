const { getMergedSportsChannels } = require('../../lib/sources');
const plex = require('../../lib/providers/plex');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body, null, 2)
  };
}

// Never returns a token or a tokenised URL - only source names and counts.
exports.handler = async event => {
  const started = Date.now();

  try {
    const channels = await getMergedSportsChannels();

    const bySource = {};
    for (const channel of channels) {
      const key = channel.source || 'unknown';
      bySource[key] = (bySource[key] || 0) + 1;
    }

    const plexChannels = channels.filter(c => c.source === 'plex');
    const result = {
      ok: channels.length > 0,
      checkedAt: new Date().toISOString(),
      totalChannels: channels.length,
      bySource,
      plex: {
        lineupSource: plex.state.lineupSource,
        lineupCount: plex.state.lineupCount,
        tokenSource: plex.state.tokenSource,
        channelsLoaded: plex.state.channelsLoaded,
        lastError: plex.state.lastError,
        playback: 'not probed (add ?probe=1)'
      }
    };

    // Optional live check: can we actually fetch one Plex channel's playlist?
    const query = (event && event.queryStringParameters) || {};

    if (query.probe && plexChannels.length) {
      const tokens = await plex.getPlexTokenCandidates();
      const target = plexChannels[0];
      let outcome = 'no token available';

      for (const entry of tokens) {
        const url = new URL(target.streamUrl);
        url.searchParams.set('X-Plex-Token', entry.token);

        try {
          const res = await fetch(url.toString(), {
            headers: { 'X-Plex-Token': entry.token }
          });

          outcome = `${target.name}: HTTP ${res.status} using ${entry.source} token`;
          if (res.ok) break;
        } catch (err) {
          outcome = `${target.name}: ${err.message}`;
        }
      }

      result.plex.playback = outcome;
    }

    result.tookMs = Date.now() - started;

    return json(200, result);
  } catch (error) {
    console.error('[health] failed:', error);

    return json(500, { ok: false, error: String(error && error.message || error) });
  }
};
