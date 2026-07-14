// lib/categories.js

const CATEGORY_RULES = [
  {
    category: 'International',
    keywords: [
      'alkass', 'al kass', 'arryadia', 'riyadiya', 'adjarasport',
      'a spor', 'bahrain sports', 'oman sports', 'ktv sport',
      'abu dhabi', 'dubai sports', 'belarus', 'беларусь',
      'матч', 'удар', 'футбол', 'спорт', 'sportitalia',
      'sportivnyy', 'tvr sport', 'tv cuatro', 'itv deportes',
      'claro sports', 'africa 24 sport', 'tyc sports',
      'ziggo sport', 'sport tv portugal'
    ]
  },
  {
    category: 'Hunting',
    keywords: [
      'hunt', 'hunting', 'sportsman', 'mossy oak', 'realtree',
      'pursuit', 'whitetail', 'deer', 'duck commander',
      'outdoor channel', 'wild tv'
    ]
  },
  {
    category: 'Fishing',
    keywords: [
      'fish', 'fishing', 'bassmaster', 'bass fishing',
      'world fishing', 'major league fishing', 'angler',
      'in-fisherman', 'saltwater'
    ]
  },
  {
    category: 'Motorsports',
    keywords: [
      'nascar', 'racing', 'racer', 'motor', 'motorsport',
      'f1', 'formula 1', 'formula one', 'indycar', 'indy car',
      'motogp', 'moto gp', 'motoamerica', 'nhra',
      'monster jam', 'rally', 'rallycross', 'dakar',
      'mavtv', 'powernation', 'auto racing', 'car racing',
      'red bull tv', 'vital drive'
    ]
  },
  {
    category: 'Combat Sports',
    keywords: [
      'ufc', 'mma', 'bellator', 'pfl', 'one championship',
      'fight', 'fighting', 'combat', 'boxing', 'boxeo',
      'wrestling', 'wrestl', 'tna', 'aew', 'wwe', 'njpw',
      'roh', 'glory', 'bkfc', 'hard knocks', 'fite', 'xFC'
    ]
  },
  {
    category: 'Football',
    keywords: [
      'nfl', 'football', 'gridiron', 'accdn', 'acc network',
      'sec network', 'big ten', 'big 10', 'big 12',
      'pac-12', 'pac 12', 'college football',
      'cfl', 'ufl', 'usfl', 'xfl', 'overtime'
    ]
  },
  {
    category: 'Basketball',
    keywords: [
      'nba', 'basketball', 'wnba', 'hoops',
      'college basketball', 'fiba'
    ]
  },
  {
    category: 'Baseball',
    keywords: [
      'mlb', 'baseball', 'minor league baseball',
      'college baseball'
    ]
  },
  {
    category: 'Soccer',
    keywords: [
      'soccer', 'fifa', 'fifa+', 'football club',
      'premier league', 'champions league', 'uefa',
      'la liga', 'serie a', 'bundesliga', 'ligue 1',
      'mls', 'golazo', 'gol tv', 'futbol'
    ]
  },
  {
    category: 'Hockey',
    keywords: [
      'nhl', 'hockey', 'flohockey'
    ]
  },
  {
    category: 'Cricket',
    keywords: [
      'cricket', 'willow sports'
    ]
  },
  {
    category: 'Golf',
    keywords: [
      'golf', 'pga', 'liv golf', 'golfpass'
    ]
  },
  {
    category: 'Tennis',
    keywords: [
      'tennis', 'atp', 'wta', 'tennis channel'
    ]
  },
  {
    category: 'Lacrosse',
    keywords: [
      'lacrosse'
    ]
  },
  {
    category: 'Darts',
    keywords: [
      'darts'
    ]
  },
  {
    category: 'Poker',
    keywords: [
      'poker', 'world poker tour', 'pokergo'
    ]
  },
  {
    category: 'Horse Racing',
    keywords: [
      'horse tv', 'horse racing', 'equestrian',
      'atg live', 'monterrico'
    ]
  },
  {
    category: 'Esports',
    keywords: [
      'esports', 'e-sports', 'gaming'
    ]
  },
  {
    category: 'Outdoor',
    keywords: [
      'outdoor', 'wild', 'wilderness', 'adventure',
      'waypoint', 'pbr ridepass', 'pbr', 'rodeo',
      'surf', 'ski', 'snowboard', 'nautical',
      'extreme sports', 'world of freesports',
      'fast&funbox'
    ]
  },
  {
    category: 'Classic Sports',
    keywords: [
      'classic', 'retro sport', 'throwback',
      'sports replay', 'sports archive', 'the ocho'
    ]
  }
];

function categorize(name) {
  if (!name) return 'General Sports';

  const lower = String(name).toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (
      rule.keywords.some(keyword =>
        lower.includes(keyword.toLowerCase())
      )
    ) {
      return rule.category;
    }
  }

  return 'General Sports';
}

module.exports = {
  categorize,
  CATEGORY_RULES
};
