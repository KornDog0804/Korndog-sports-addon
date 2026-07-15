// lib/providers/concerts.js
// Pulls from the Concert Corner deploy's episodes.json.
//
// Shape: top-level array of folders. Some folders (MTV Unplugged, Tiny
// Desk, Stitched Streams) are flat - items directly have tracks. "Live
// Concerts" is a recursive tree - folders nested inside folders, actual
// shows at the leaves. We walk recursively to catch both.
//
// Thumbnails: only some items have an explicit "thumb" field. Instead of
// relying on that, we derive a thumbnail from the YouTube video ID itself
// (every public YouTube video has a predictable thumbnail URL) - so every
// item gets a poster now, not just the ones with "thumb" set manually.
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

// Pulls the 11-character YouTube video ID out of either URL format:
// https://youtu.be/VIDEOID  or  https://www.youtube.com/watch?v=VIDEOID
function extractYoutubeId(url) {
  if (!url) return null;

  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (longMatch) return longMatch[1];

  return null;
}

function thumbnailFor(url, explicitThumb) {
  if (explicitThumb) return explicitThumb;
  const videoId = extractYoutubeId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

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

    // Use the first track's video as the item-level poster/logo.
    const logo = thumbnailFor(tracks[0].url, item.thumb);

    results.push({
      id: `concert-${idBase}`,
      name: item.title || 'Untitled Session',
      logo,
      source: 'concert-corner',
      folder: folderLabel,
      description: [item.artist || pathParts[pathParts.length - 1], item.year]
        .filter(Boolean)
        .join(' · '),
      tracks: tracks.map(t => ({
        title: t.title || item.title,
        externalUrl: t.url,
        thumb: thumbnailFor(t.url, null)
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
