// lib/providers/concerts.js
// Pulls from the Concert Corner deploy's episodes.json.
//
// Real shape (confirmed via Termux, July 2026): the top-level array has
// folders like "MTV Unplugged", "Tiny Desk", "Stitched Streams / Full
// Sessions" - these are FLAT (items directly have tracks).
//
// "Live Concerts" is different: it's a RECURSIVE tree - top-level items
// are letter-group folders (mode: "folder") containing artist folders
// (mode: "folder"), which finally contain the actual show items
// (mode: "fullshow" or "queue") with real tracks. So we need a recursive
// walk, not a flat map, to catch everything regardless of nesting depth.
//
// Also note: some folders (Monster Jam, Drag Racing) currently have 0
// items - harmless, they just contribute nothing until populated.
//
// URLs are YouTube links (youtu.be or youtube.com/watch) - NOT direct
// HLS/video files - so these are exposed to Stremio as external links
// (opens in YouTube app/browser) rather than inline streams. No
// extraction, no proxying.

const fetch = require('node-fetch');

const EPISODES_URL = 'https://mellifluous-tanuki-51d911.netlify.app/episodes.json';

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Recursively walks an "items" array. Any item with mode === "folder" gets
// recursed into via its own "items". Any item with a non-empty "tracks"
// array is a leaf - a real playable show/session - and gets collected.
function walkItems(items, folderLabel, pathParts, results) {
  for (const item of items) {
    if (item.mode === 'folder' && Array.isArray(item.items)) {
      walkItems(item.items, folderLabel, [...pathParts, item.title], results);
      continue;
    }

    const tracks = (item.tracks || []).filter(t => t && t.url);
    if (tracks.length === 0) continue;

    const idBase = slugify(
      `${item.artist || pathParts.join('-') || item.title}-${item.title}-${item.year || ''}`
    );

    results.push({
      id: `concert-${idBase}`,
      name: item.title || 'Untitled Session',
      logo: item.thumb || null,
      source: 'concert-corner',
      folder: folderLabel,
      description: [item.artist || pathParts[pathParts.length - 1], item.year]
        .filter(Boolean)
        .join(' · '),
      tracks: tracks.map(t => ({
        title: t.title || item.title,
        externalUrl: t.url
      }))
    });
  }
}

async function getConcertItems() {
  const res = await fetch(EPISODES_URL, { headers: { 'Accept': 'application/json' } });

  if (!res.ok) {
    throw new Error(`Concert Corner episodes fetch failed: ${res.status} ${res.statusText}`);
  }

  const folders = await res.json();

  if (!Array.isArray(folders)) {
    console.warn('[concerts] episodes.json did not return an array - shape may have changed.');
    return [];
  }

  const results = [];

  for (const folder of folders) {
    const items = folder.items || [];
    walkItems(items, folder.title || '', [], results);
  }

  return results;
}

module.exports = { getConcertItems };
