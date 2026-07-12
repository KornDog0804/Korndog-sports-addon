// netlify/functions/manifest.js

const MANIFEST = {
  id: 'org.korndog.sports',
  version: '0.2.0',
  name: 'KornDog Sports',
  description: 'Free live sports and outdoor channels from multiple public providers, merged into one KornDog catalog.',
  logo: 'https://korndogrecords.com/favicon.png',
  resources: ['catalog', 'stream'],
  types: ['tv'],
  catalogs: [
    {
      type: 'tv',
      id: 'korndog-sports',
      name: 'KornDog Sports',
      extra: [
        {
          name: 'genre',
          options: [
            'Featured',
            'Combat Sports',
            'Motorsports',
            'Football',
            'Basketball',
            'Baseball',
            'Soccer',
            'Golf',
            'Tennis',
            'Hunting',
            'Fishing',
            'Outdoor',
            'Classic Sports',
            'International'
          ],
          isRequired: false
        }
      ]
    }
  ],
  idPrefixes: ['pluto-', 'iptvorg-']
};

exports.handler = async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  },
  body: JSON.stringify(MANIFEST)
});
