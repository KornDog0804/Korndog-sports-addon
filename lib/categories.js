// lib/categories.js
// Maps a channel's visible name to one of the KornDog Sports catalog
// categories. Pure keyword matching against the name - no dependency on
// any provider's internal category IDs, since those aren't reliable
// across providers (see pluto.js notes).

const CATEGORY_RULES = [
  { category: 'Combat Sports', keywords: ['ufc', 'mma', 'fight', 'wrestl', 'boxing', 'combat'] },
  { category: 'Motorsports', keywords: ['nascar', 'racing', 'motor', 'f1', 'formula', 'indycar', 'rally'] },
  { category: 'Football', keywords: ['nfl', 'football', 'gridiron'] },
  { category: 'Basketball', keywords: ['nba', 'basketball', 'wnba', 'hoops'] },
  { category: 'Baseball', keywords: ['mlb', 'baseball'] },
  { category: 'Soccer', keywords: ['soccer', 'fifa', 'premier league', 'la liga', 'uefa', 'mls', 'football club', ' fc ', 'real madrid'] },
  { category: 'Golf', keywords: ['golf', 'pga'] },
  { category: 'Tennis', keywords: ['tennis', 'atp', 'wta'] },
  { category: 'Hunting', keywords: ['hunt', 'mossy oak', 'realtree', 'pursuit channel'] },
  { category: 'Fishing', keywords: ['fish', 'bassmaster', 'bass fishing', 'wild tv'] },
  { category: 'Outdoor', keywords: ['outdoor', 'wild', 'wilderness', 'adventure sport'] },
  { category: 'Classic Sports', keywords: ['classic', 'retro sport', 'throwback'] },
  { category: 'International', keywords: ['international', 'world sport'] }
];

function categorize(name) {
  if (!name) return 'Featured';
  const lower = name.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return rule.category;
    }
  }

  return 'Featured';
}

module.exports = { categorize, CATEGORY_RULES };
