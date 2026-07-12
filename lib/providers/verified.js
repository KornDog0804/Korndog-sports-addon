const verifiedData = require('../../data/verified-channels.json');

async function getSportsChannels() {
  const channels = Array.isArray(verifiedData.channels)
    ? verifiedData.channels
    : [];

  console.log(`[verified] loaded=${channels.length}`);
  return channels.filter(channel =>
    channel.verified === true &&
    channel.id &&
    channel.name &&
    channel.streamUrl
  );
}

module.exports = {
  getSportsChannels
};
