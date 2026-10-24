// lib/providers/team-radio.js
//
// Official, freely-available team radio broadcasts, wrapped in a
// KornDog-branded page (radio.html) so playback happens inside KornDog
// Sports with consistent chrome, instead of a bare browser tab.
//
// GhostKernel Provider Engine rule applies here same as everywhere else:
// only sources that are free and public with no login, subscription, or
// geo-wall go in this list. If a team's only live audio is gated (NFL
// affiliate blackout rules, a paid app, a login-walled stream), it does
// NOT belong here - leave it out rather than silently pointing at
// something that will fail or that requires credentials we won't enter.

const TEAM_RADIO_SOURCES = [
  {
    id: 'radio-lsu',
    team: 'LSU Tigers',
    league: 'NCAA Football',
    name: 'LSU Tigers Radio',
    description:
      'LSU Sports Radio Network — live play-by-play, free on lsusports.net.',
    logo: 'https://korndogrecords.com/favicon.png',
    sourceUrl: 'https://lsusports.net/leanstream'
  }

  // Tennessee Titans radio intentionally left out for now: the Titans'
  // live audio runs through local affiliates / the NFL app, and we
  // haven't confirmed a source that's actually free and unblocked
  // outside the broadcast market. Add it here once one is verified.
];

function getTeamRadioSources() {
  return TEAM_RADIO_SOURCES;
}

function findTeamRadioSource(id) {
  return TEAM_RADIO_SOURCES.find(source => source.id === id) || null;
}

module.exports = {
  TEAM_RADIO_SOURCES,
  getTeamRadioSources,
  findTeamRadioSource
};
