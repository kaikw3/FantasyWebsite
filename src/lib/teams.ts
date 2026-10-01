export type NhlTeam = {
  id: number;
  abbrev: string;
  name: string;
  commonName: string;
  logo: string;
};

export const NHL_TEAMS: NhlTeam[] = [
  { id: 24, abbrev: "ANA", name: "Anaheim Ducks", commonName: "Ducks", logo: "https://assets.nhle.com/logos/nhl/svg/ANA_light.svg" },
  { id: 6, abbrev: "BOS", name: "Boston Bruins", commonName: "Bruins", logo: "https://assets.nhle.com/logos/nhl/svg/BOS_light.svg" },
  { id: 7, abbrev: "BUF", name: "Buffalo Sabres", commonName: "Sabres", logo: "https://assets.nhle.com/logos/nhl/svg/BUF_light.svg" },
  { id: 20, abbrev: "CGY", name: "Calgary Flames", commonName: "Flames", logo: "https://assets.nhle.com/logos/nhl/svg/CGY_light.svg" },
  { id: 12, abbrev: "CAR", name: "Carolina Hurricanes", commonName: "Hurricanes", logo: "https://assets.nhle.com/logos/nhl/svg/CAR_light.svg" },
  { id: 16, abbrev: "CHI", name: "Chicago Blackhawks", commonName: "Blackhawks", logo: "https://assets.nhle.com/logos/nhl/svg/CHI_light.svg" },
  { id: 21, abbrev: "COL", name: "Colorado Avalanche", commonName: "Avalanche", logo: "https://assets.nhle.com/logos/nhl/svg/COL_light.svg" },
  { id: 29, abbrev: "CBJ", name: "Columbus Blue Jackets", commonName: "Blue Jackets", logo: "https://assets.nhle.com/logos/nhl/svg/CBJ_light.svg" },
  { id: 25, abbrev: "DAL", name: "Dallas Stars", commonName: "Stars", logo: "https://assets.nhle.com/logos/nhl/svg/DAL_light.svg" },
  { id: 17, abbrev: "DET", name: "Detroit Red Wings", commonName: "Red Wings", logo: "https://assets.nhle.com/logos/nhl/svg/DET_light.svg" },
  { id: 22, abbrev: "EDM", name: "Edmonton Oilers", commonName: "Oilers", logo: "https://assets.nhle.com/logos/nhl/svg/EDM_light.svg" },
  { id: 13, abbrev: "FLA", name: "Florida Panthers", commonName: "Panthers", logo: "https://assets.nhle.com/logos/nhl/svg/FLA_light.svg" },
  { id: 26, abbrev: "LAK", name: "Los Angeles Kings", commonName: "Kings", logo: "https://assets.nhle.com/logos/nhl/svg/LAK_light.svg" },
  { id: 30, abbrev: "MIN", name: "Minnesota Wild", commonName: "Wild", logo: "https://assets.nhle.com/logos/nhl/svg/MIN_light.svg" },
  { id: 8, abbrev: "MTL", name: "Montreal Canadiens", commonName: "Canadiens", logo: "https://assets.nhle.com/logos/nhl/svg/MTL_light.svg" },
  { id: 18, abbrev: "NSH", name: "Nashville Predators", commonName: "Predators", logo: "https://assets.nhle.com/logos/nhl/svg/NSH_light.svg" },
  { id: 1, abbrev: "NJD", name: "New Jersey Devils", commonName: "Devils", logo: "https://assets.nhle.com/logos/nhl/svg/NJD_light.svg" },
  { id: 2, abbrev: "NYI", name: "New York Islanders", commonName: "Islanders", logo: "https://assets.nhle.com/logos/nhl/svg/NYI_light.svg" },
  { id: 3, abbrev: "NYR", name: "New York Rangers", commonName: "Rangers", logo: "https://assets.nhle.com/logos/nhl/svg/NYR_light.svg" },
  { id: 9, abbrev: "OTT", name: "Ottawa Senators", commonName: "Senators", logo: "https://assets.nhle.com/logos/nhl/svg/OTT_light.svg" },
  { id: 4, abbrev: "PHI", name: "Philadelphia Flyers", commonName: "Flyers", logo: "https://assets.nhle.com/logos/nhl/svg/PHI_light.svg" },
  { id: 5, abbrev: "PIT", name: "Pittsburgh Penguins", commonName: "Penguins", logo: "https://assets.nhle.com/logos/nhl/svg/PIT_light.svg" },
  { id: 28, abbrev: "SJS", name: "San Jose Sharks", commonName: "Sharks", logo: "https://assets.nhle.com/logos/nhl/svg/SJS_light.svg" },
  { id: 55, abbrev: "SEA", name: "Seattle Kraken", commonName: "Kraken", logo: "https://assets.nhle.com/logos/nhl/svg/SEA_light.svg" },
  { id: 19, abbrev: "STL", name: "St. Louis Blues", commonName: "Blues", logo: "https://assets.nhle.com/logos/nhl/svg/STL_light.svg" },
  { id: 14, abbrev: "TBL", name: "Tampa Bay Lightning", commonName: "Lightning", logo: "https://assets.nhle.com/logos/nhl/svg/TBL_light.svg" },
  { id: 10, abbrev: "TOR", name: "Toronto Maple Leafs", commonName: "Maple Leafs", logo: "https://assets.nhle.com/logos/nhl/svg/TOR_light.svg" },
  { id: 68, abbrev: "UTA", name: "Utah Mammoth", commonName: "Mammoth", logo: "https://assets.nhle.com/logos/nhl/svg/UTA_light.svg" },
  { id: 23, abbrev: "VAN", name: "Vancouver Canucks", commonName: "Canucks", logo: "https://assets.nhle.com/logos/nhl/svg/VAN_light.svg" },
  { id: 54, abbrev: "VGK", name: "Vegas Golden Knights", commonName: "Golden Knights", logo: "https://assets.nhle.com/logos/nhl/svg/VGK_light.svg" },
  { id: 15, abbrev: "WSH", name: "Washington Capitals", commonName: "Capitals", logo: "https://assets.nhle.com/logos/nhl/svg/WSH_light.svg" },
  { id: 52, abbrev: "WPG", name: "Winnipeg Jets", commonName: "Jets", logo: "https://assets.nhle.com/logos/nhl/svg/WPG_light.svg" },
];

export const TEAM_BY_ABBREV = Object.fromEntries(
  NHL_TEAMS.map((team) => [team.abbrev, team]),
) as Record<string, NhlTeam>;
