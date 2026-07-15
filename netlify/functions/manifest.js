const { CATALOGS } = require('../../lib/catalogs');

const MANIFEST = {
  id: 'org.korndog.sports',
  version: '0.5.3',
  name: 'KornDog Sports',
  description:
    'Verified live sports, combat, motorsports, hunting, fishing and outdoor channels, plus Concert Corner unplugged sessions and live sets.',
  logo: 'https://korndogrecords.com/favicon.png',
  resources: ['catalog', 'meta', 'stream'],
  types: ['tv'],
  catalogs: CATALOGS.map(catalog => ({
    type: 'tv',
    id: catalog.id,
    name: catalog.name
  })),
  idPrefixes: ['pluto-', 'iptvorg-', 'plex-', 'concert-']
};

exports.handler = async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300'
  },
  body: JSON.stringify(MANIFEST)
});
