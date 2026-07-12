const MANIFEST = {
  id: 'org.korndog.sports',
  version: '0.3.0',
  name: 'KornDog Sports',
  description:
    'Verified working sports, combat, motorsports, hunting, fishing and outdoor channels.',
  logo: 'https://korndogrecords.com/favicon.png',
  resources: ['catalog', 'meta', 'stream'],
  types: ['tv'],
  catalogs: [
    {
      type: 'tv',
      id: 'korndog-sports',
      name: 'KornDog Sports Verified',
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
        },
        {
          name: 'skip',
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
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300'
  },
  body: JSON.stringify(MANIFEST)
});
