function parseAttributes(line) {
  const attributes = {};
  const regex = /([\w-]+)="([^"]*)"/g;
  let match;

  while ((match = regex.exec(line)) !== null) {
    attributes[match[1]] = match[2];
  }

  return attributes;
}

function findMetadataComma(line) {
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === ',' && !insideQuotes) {
      return index;
    }
  }

  return -1;
}

function parseM3U(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const channels = [];
  let pending = null;

  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) {
      const commaIndex = findMetadataComma(line);
      const info =
        commaIndex >= 0
          ? line.slice(0, commaIndex)
          : line;

      const name =
        commaIndex >= 0
          ? line.slice(commaIndex + 1).trim()
          : 'Unknown Channel';

      const attrs = parseAttributes(info);

      pending = {
        name,
        tvgId: attrs['tvg-id'] || '',
        logo: attrs['tvg-logo'] || '',
        group: attrs['group-title'] || '',
        language: attrs['tvg-language'] || '',
        country: attrs['tvg-country'] || ''
      };

      continue;
    }

    if (
      pending &&
      !line.startsWith('#') &&
      /^https?:\/\//i.test(line)
    ) {
      channels.push({
        ...pending,
        streamUrl: line
      });

      pending = null;
    }
  }

  return channels;
}

module.exports = {
  parseM3U,
  parseAttributes,
  findMetadataComma
};
