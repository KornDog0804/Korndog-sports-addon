const verifiedData = require('../../data/verified-channels.json');
const { categorize } = require('../categories');

async function getSportsChannels() {
  const channels = Array.isArray(verifiedData.channels)
    ? verifiedData.channels
    : [];

  const normalized = channels
    .filter(channel =>
      channel.verified === true &&
      channel.id &&
      channel.name &&
      channel.streamUrl
    )
    .map(channel => ({
      ...channel,
      category: channel.category || categorize(channel.name)
    }));

  console.log(`[verified] loaded=${normalized.length}`);
  return normalized;
}

module.exports = {
  getSportsChannels
};
