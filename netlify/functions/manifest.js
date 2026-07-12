// netlify/functions/manifest.js

const MANIFEST = {
  id: 'org.korndog.sports',
  version: '0.1.0',
  name: 'KornDog Sports',
  description: 'Free live sports channels from Pluto TV, Samsung TV+, Xumo and Plex, merged into one KornDog catalog.',
  logo: 'https://korndogrecords.com/favicon.png',
  resources: ['catalog', 'stream'],
  types: ['tv'],
  catalogs: [
    {
      type: 'tv',
      id: 'korndog-sports',
      name: 'KornDog Sports'
    }
  ],
  idPrefixes: ['pluto-']
};

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(MANIFEST)
  };
};
