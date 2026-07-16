// scripts/check-channels.js
// Read-only health check against the LIVE deployed site. Walks every
// catalog, resolves every channel's real stream URL, and HEAD-checks it.
// Writes a report to scripts/channel-health-report.json. Does NOT modify
// anything in the repo or the live site - pure diagnostics.
//
// Run with: node scripts/check-channels.js

const BASE_URL = 'https://korndog-sports-addon.netlify.app';
const TIMEOUT_MS = 8000;

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function checkUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeout);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: null, error: err.message };
  }
}

async function main() {
  console.log('Fetching manifest...');
  const manifest = await fetchJson(`${BASE_URL}/manifest.json`);

  const results = [];

  for (const catalog of manifest.catalogs) {
    console.log(`\nChecking catalog: ${catalog.name} (${catalog.id})`);
    const catalogData = await fetchJson(`${BASE_URL}/catalog/tv/${catalog.id}.json`);
    const metas = catalogData.metas || [];

    for (const meta of metas) {
      const streamData = await fetchJson(`${BASE_URL}/stream/tv/${encodeURIComponent(meta.id)}.json`);
      const stream = (streamData.streams || [])[0];

      if (!stream) {
        results.push({ catalog: catalog.id, id: meta.id, name: meta.name, status: 'NO_STREAM' });
        continue;
      }

      if (stream.externalUrl) {
        // Concert Corner items - skip HTTP checking, YouTube availability
        // isn't meaningfully checkable via HEAD request anyway.
        results.push({ catalog: catalog.id, id: meta.id, name: meta.name, status: 'SKIPPED_EXTERNAL' });
        continue;
      }

      const check = await checkUrl(stream.url);
      const status = check.ok ? 'OK' : 'DEAD';

      if (status === 'DEAD') {
        console.log(`  ✗ DEAD: ${meta.name} (${meta.id}) - ${check.status || check.error}`);
      }

      results.push({
        catalog: catalog.id,
        id: meta.id,
        name: meta.name,
        status,
        httpStatus: check.status,
        error: check.error
      });
    }
  }

  const dead = results.filter(r => r.status === 'DEAD');
  const ok = results.filter(r => r.status === 'OK');
  const skipped = results.filter(r => r.status === 'SKIPPED_EXTERNAL');

  console.log(`\n=== SUMMARY ===`);
  console.log(`OK: ${ok.length}`);
  console.log(`DEAD: ${dead.length}`);
  console.log(`Skipped (Concert Corner/external): ${skipped.length}`);

  const fs = require('fs');
  fs.writeFileSync(
    'scripts/channel-health-report.json',
    JSON.stringify({ generatedAt: new Date().toISOString(), summary: { ok: ok.length, dead: dead.length, skipped: skipped.length }, results }, null, 2)
  );
  console.log('\nFull report written to scripts/channel-health-report.json');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
