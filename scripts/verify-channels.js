const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { getDiscoveredSportsChannels } = require('../lib/sources');

const execFileAsync = promisify(execFile);
const CONCURRENCY = Number(process.env.VERIFY_CONCURRENCY || 6);
const TIMEOUT_MS = Number(process.env.VERIFY_TIMEOUT_MS || 12000);
const DATA_DIR = path.join(__dirname, '..', 'data');
const TARGETS_FILE = path.join(DATA_DIR, 'channel-targets.json');
const VERIFIED_FILE = path.join(DATA_DIR, 'verified-channels.json');
const FAILED_FILE = path.join(DATA_DIR, 'failed-channels.json');

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function loadTargets() {
  try {
    const groups = JSON.parse(fs.readFileSync(TARGETS_FILE, 'utf8'));
    return Object.values(groups).flat().map(normalize).filter(Boolean);
  } catch {
    return [];
  }
}

function isPriority(channel, targets) {
  const name = normalize(channel.name);
  return targets.some(target => name.includes(target) || target.includes(name));
}

function scoreChannel(channel, probe, latencyMs, priority) {
  let score = 0;
  const url = channel.streamUrl || '';
  if (probe.hasVideo) score += 40;
  if (probe.videoCodecs.includes('h264')) score += 15;
  if (probe.audioCodecs.includes('aac')) score += 10;
  if (probe.maxHeight >= 1080) score += 15;
  else if (probe.maxHeight >= 720) score += 10;
  else if (probe.maxHeight >= 480) score += 5;
  if (url.startsWith('https://')) score += 10;
  if (/amagi|cloudfront|akamai|fastly|brightcove/i.test(url)) score += 10;
  if (/^http:\/\/\d{1,3}(?:\.\d{1,3}){3}/i.test(url)) score -= 30;
  if (latencyMs > 9000) score -= 10;
  if (priority) score += 15;
  return Math.max(0, score);
}

async function probeChannel(channel, targets) {
  const startedAt = Date.now();
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'stream=codec_name,codec_type,width,height,sample_rate,channels',
      '-of', 'json',
      channel.streamUrl
    ], { timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 });

    const parsed = JSON.parse(stdout || '{"streams":[]}');
    const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
    const videos = streams.filter(stream => stream.codec_type === 'video');
    const audios = streams.filter(stream => stream.codec_type === 'audio');
    if (!videos.length) throw new Error('No decodable video stream');

    const probe = {
      hasVideo: true,
      hasAudio: audios.length > 0,
      videoCodecs: [...new Set(videos.map(v => v.codec_name).filter(Boolean))],
      audioCodecs: [...new Set(audios.map(a => a.codec_name).filter(Boolean))],
      maxWidth: Math.max(0, ...videos.map(v => Number(v.width) || 0)),
      maxHeight: Math.max(0, ...videos.map(v => Number(v.height) || 0)),
      audioChannels: Math.max(0, ...audios.map(a => Number(a.channels) || 0))
    };

    const latencyMs = Date.now() - startedAt;
    const priority = isPriority(channel, targets);
    return { ...channel, verified: true, priority, checkedAt: new Date().toISOString(), latencyMs, score: scoreChannel(channel, probe, latencyMs, priority), probe };
  } catch (error) {
    return {
      ...channel,
      verified: false,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      failure: error.killed ? `Timeout after ${TIMEOUT_MS}ms` : String(error.stderr || error.message || 'Unknown error').trim().slice(0, 500)
    };
  }
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runner() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      const item = items[index];
      console.log(`[${index + 1}/${items.length}] ${item.name}`);
      results[index] = await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runner));
  return results;
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const targets = loadTargets();
  const channels = await getDiscoveredSportsChannels();
  console.log(`Discovered ${channels.length} channels`);
  const results = await runPool(channels, channel => probeChannel(channel, targets), CONCURRENCY);
  const verified = results.filter(r => r.verified).sort((a, b) => Number(b.priority) - Number(a.priority) || b.score - a.score || a.name.localeCompare(b.name));
  const failed = results.filter(r => !r.verified).sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(VERIFIED_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), discoveredCount: channels.length, verifiedCount: verified.length, channels: verified }, null, 2) + '\n');
  fs.writeFileSync(FAILED_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), failedCount: failed.length, channels: failed }, null, 2) + '\n');

  console.log('');
  console.log(`DISCOVERED: ${channels.length}`);
  console.log(`VERIFIED:   ${verified.length}`);
  console.log(`FAILED:     ${failed.length}`);
  console.log('');
  verified.slice(0, 25).forEach((channel, index) => console.log(`${index + 1}. ${channel.name} | score=${channel.score} | ${channel.probe.maxHeight}p`));
}

main().catch(error => {
  console.error('[verify] Fatal error:', error);
  process.exit(1);
});
