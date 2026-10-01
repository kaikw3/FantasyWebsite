import { NHL_TEAMS, TEAM_BY_ABBREV } from "./teams";
import {
  addDays,
  clampWeek,
  enumerateMondays,
  formatIsoDate,
  mondayOf,
  parseIsoDate,
  todayIsoInEastern,
} from "./dates";

const NHL_API = "https://api-web.nhle.com/v1";
const FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent": "fantasy-hockey-schedule/0.1",
};

export type GameType = 1 | 2 | 3;

export type DayGame = {
  id: number;
  opponentAbbrev: string;
  opponentName: string;
  opponentLogo: string;
  isHome: boolean;
  gameType: GameType;
  startTimeUTC: string;
  gameState: string;
  venue: string;
};

export type TeamWeekRow = {
  abbrev: string;
  name: string;
  commonName: string;
  logo: string;
  wins: number;
  losses: number;
  otLosses: number;
  gamesByDate: Record<string, DayGame[]>;
  gameCount: number;
};

export type WeekDay = {
  date: string;
  gameCount: number;
};

export type WeekOption = {
  monday: string;
  label: string;
  isCurrent: boolean;
};

export type WeeklyScheduleData = {
  weekStart: string;
  weekEnd: string;
  days: WeekDay[];
  teams: TeamWeekRow[];
  weeks: WeekOption[];
  seasonLabel: string;
  preSeasonStartDate: string;
  regularSeasonStartDate: string;
  regularSeasonEndDate: string;
  playoffEndDate: string;
};

export type LineupPlayerData = {
  name: string;
  number: number;
  headshotUrl?: string;
  position?: string;
  status?: "healthy" | "day-to-day" | "out";
  note?: string;
};

export type LineupGroupData = {
  label: string;
  players: LineupPlayerData[];
};

export type TeamLineupData = {
  forwards: LineupGroupData[];
  defense: LineupGroupData[];
  goalies: LineupGroupData[];
  powerPlay: LineupGroupData[];
  injuries: LineupPlayerData[];
  sourceLabel: string;
  updatedAt?: string;
};

export type StartingGoalie = {
  name: string;
  headshotUrl: string;
  status: string;
  details?: string;
  savePercentage: string;
  goalsAgainstAverage: string;
};

export type StartingGoalieGame = {
  dateGmt: string;
  time: string;
  homeTeam: { name: string; logo: string; goalie: StartingGoalie };
  awayTeam: { name: string; logo: string; goalie: StartingGoalie };
};

export type StartingGoaliesData = {
  date: string;
  games: StartingGoalieGame[];
  confirmedCount: number;
  sourceLabel: string;
};

export type FantasyPlayerStats = {
  goals: number;
  assists: number;
  powerPlayPoints: number;
  averageToi: number | null;
  shots: number;
  hits: number | null;
  blocks: number;
  fantasyPoints: number;
};

export type FantasyPointsMap = Record<string, FantasyPlayerStats>;

type NhlTeamBlock = {
  abbrev: string;
  commonName?: { default?: string };
  placeName?: { default?: string };
  logo?: string;
};

type NhlGame = {
  id: number;
  gameType: number;
  startTimeUTC: string;
  gameState: string;
  venue?: { default?: string };
  awayTeam: NhlTeamBlock;
  homeTeam: NhlTeamBlock;
};

type NhlScheduleResponse = {
  preSeasonStartDate: string;
  regularSeasonStartDate: string;
  regularSeasonEndDate: string;
  playoffEndDate?: string;
  gameWeek: Array<{
    date: string;
    numberOfGames?: number;
    games?: NhlGame[];
  }>;
};

type NhlStandingsResponse = {
  standings: Array<{
    teamAbbrev: { default: string };
    wins: number;
    losses: number;
    otLosses: number;
  }>;
};

type NhlRosterPlayer = {
  firstName?: { default?: string };
  lastName?: { default?: string };
  sweaterNumber?: number;
  positionCode?: string;
  headshot?: string;
};

type NhlRosterResponse = {
  forwards?: NhlRosterPlayer[];
  defensemen?: NhlRosterPlayer[];
  goalies?: NhlRosterPlayer[];
};

type DailyFaceoffPlayer = {
  name?: string;
  fantasydataFaceUrl?: string;
  jerseyNumber?: number | null;
  positionName?: string;
  groupIdentifier?: string;
  groupName?: string;
  categoryIdentifier?: string;
  injuryStatus?: string | null;
  gameTimeDecision?: boolean;
  latestNews?: { details?: string } | null;
};

type DailyFaceoffPageData = {
  props?: {
    pageProps?: {
      combinations?: {
        sourceName?: string;
        updatedAt?: string;
        players?: DailyFaceoffPlayer[];
      };
    };
  };
};

type DailyFaceoffStartingGame = {
  homeTeamName?: string;
  homeTeamLogoSvg?: string;
  homeGoalieName?: string;
  homeGoalieHeadshotUrl?: string;
  homeNewsStrengthName?: string;
  homeNewsDetails?: string;
  homeGoalieSavePercentage?: string;
  homeGoalieGoalsAgainstAvg?: string;
  awayTeamName?: string;
  awayTeamLogoSvg?: string;
  awayGoalieName?: string;
  awayGoalieHeadshotUrl?: string;
  awayNewsStrengthName?: string;
  awayNewsDetails?: string;
  awayGoalieSavePercentage?: string;
  awayGoalieGoalsAgainstAvg?: string;
  dateGmt?: string;
  time?: string;
};

type DailyFaceoffStartingPageData = {
  props?: {
    pageProps?: {
      data?: DailyFaceoffStartingGame[];
      date?: string;
    };
  };
};

function asGameType(gameType: number): GameType {
  if (gameType === 1 || gameType === 3) {
    return gameType;
  }
  return 2;
}

function teamDisplayName(block: NhlTeamBlock): string {
  const known = TEAM_BY_ABBREV[block.abbrev];
  if (known) {
    return known.name;
  }
  const place = block.placeName?.default ?? "";
  const nick = block.commonName?.default ?? block.abbrev;
  return `${place} ${nick}`.trim();
}

function teamLogo(block: NhlTeamBlock): string {
  return (
    block.logo ||
    TEAM_BY_ABBREV[block.abbrev]?.logo ||
    `https://assets.nhle.com/logos/nhl/svg/${block.abbrev}_light.svg`
  );
}

async function nhlFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${NHL_API}${path}`, {
    headers: FETCH_HEADERS,
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    throw new Error(`NHL API ${path} failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function rosterPlayer(player: NhlRosterPlayer): LineupPlayerData {
  return {
    name: `${player.firstName?.default ?? "Unknown"} ${player.lastName?.default ?? "Player"}`.trim(),
    number: player.sweaterNumber ?? 0,
    headshotUrl: player.headshot,
    position: player.positionCode,
  };
}

function dailyFaceoffPlayer(player: DailyFaceoffPlayer): LineupPlayerData {
  const status = player.injuryStatus?.toLowerCase();
  return {
    name: player.name ?? "Unknown Player",
    number: player.jerseyNumber ?? 0,
    headshotUrl: player.fantasydataFaceUrl,
    position: player.positionName,
    status: status?.includes("out") || status?.includes("ir") ? "out" : player.gameTimeDecision ? "day-to-day" : undefined,
    note: player.latestNews?.details,
  };
}

function dailyFaceoffSlug(teamName: string): string {
  return teamName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function fetchDailyFaceoffDocument(path: string): Promise<string> {
  const urls = [
    `https://www.dailyfaceoff.com${path}`,
    `https://r.jina.ai/http://www.dailyfaceoff.com${path}`,
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml,text/plain",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(url.includes("r.jina.ai") ? 10000 : 5000),
        next: { revalidate: 300 },
      });
      if (response.ok) return response.text();
    } catch {
      // Try the next source.
    }
  }
  throw new Error(`Daily Faceoff could not load ${path}`);
}

function markdownPlayers(section: string): LineupPlayerData[] {
  const players: LineupPlayerData[] = [];
  const imagePattern = /!\[Image \d+: ([^\]]+)\]\(([^)]+)\)/g;
  for (const match of section.matchAll(imagePattern)) {
    const imageUrl = decodeURIComponent(match[2]);
    const numberMatch = imageUrl.match(/_[A-Za-z]*?(\d+)(?:_|\.)/);
    players.push({
      name: match[1],
      number: numberMatch ? Number(numberMatch[1]) : 0,
    });
  }
  return players;
}

function markdownSection(markdown: string, title: string, nextTitles: string[]): string {
  const start = markdown.indexOf(`\n${title}\n`);
  if (start < 0) return "";
  const content = markdown.slice(start + title.length + 2);
  const endPositions = nextTitles.map((nextTitle) => content.indexOf(`\n${nextTitle}\n`)).filter((position) => position >= 0);
  const end = endPositions.length > 0 ? Math.min(...endPositions) : content.length;
  return content.slice(0, end);
}

function parseMarkdownLineup(markdown: string): TeamLineupData {
  const sectionTitles = [
    "Forwards",
    "Defensive Pairings",
    "1st Powerplay Unit",
    "2nd Powerplay Unit",
    "1st Penalty Kill Unit",
    "2nd Penalty Kill Unit",
    "Goalies",
    "Injuries",
  ];
  const section = (title: string) => markdownSection(markdown, title, sectionTitles.filter((nextTitle) => nextTitle !== title));
  const chunkGroups = (players: LineupPlayerData[], size: number, label: string): LineupGroupData[] => {
    const groups: LineupGroupData[] = [];
    for (let index = 0; index < players.length; index += size) {
      groups.push({ label: `${label} ${groups.length + 1}`, players: players.slice(index, index + size) });
    }
    return groups;
  };
  const forwards = markdownPlayers(section("Forwards"));
  const defense = markdownPlayers(section("Defensive Pairings"));
  const powerPlay = ["1st Powerplay Unit", "2nd Powerplay Unit"].flatMap((title) => ({
    label: title.replace(" Powerplay Unit", " PP"),
    players: markdownPlayers(section(title)),
  })).filter((group) => group.players.length > 0);
  const injuryText = section("Injuries");
  const injuryStatuses = [...injuryText.matchAll(/\n(out|ir|day-to-day)\n/gi)].map((match) => match[1].toLowerCase());
  const injuries = markdownPlayers(injuryText).map((player, index) => {
    const status: LineupPlayerData["status"] = injuryStatuses[index] === "ir" || injuryStatuses[index] === "out" ? "out" : "day-to-day";
    return { ...player, status };
  });
  return {
    forwards: chunkGroups(forwards, 3, "Line"),
    defense: chunkGroups(defense, 2, "Pair"),
    goalies: [{ label: "Goalies", players: markdownPlayers(section("Goalies")) }].filter((group) => group.players.length > 0),
    powerPlay,
    injuries,
    sourceLabel: "Daily Faceoff · Proxy data",
  };
}

async function getDailyFaceoffLineup(teamName: string): Promise<TeamLineupData> {
  const slug = dailyFaceoffSlug(teamName);
  const html = await fetchDailyFaceoffDocument(`/teams/${slug}/line-combinations`);
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return parseMarkdownLineup(html);
  const page = JSON.parse(match[1]) as DailyFaceoffPageData;
  const combinations = page.props?.pageProps?.combinations;
  if (!combinations?.players?.length) throw new Error(`Daily Faceoff ${slug} returned no players`);

  const groups = (category: string, prefix?: string): LineupGroupData[] => {
    const grouped = new Map<string, LineupPlayerData[]>();
    for (const player of combinations.players ?? []) {
      if (player.categoryIdentifier !== category || (prefix && !player.groupName?.startsWith(prefix))) continue;
      const label = player.groupName ?? "Roster";
      const players = grouped.get(label) ?? [];
      players.push(dailyFaceoffPlayer(player));
      grouped.set(label, players);
    }
    return [...grouped].map(([label, players]) => ({ label, players }));
  };

  const injuries = (combinations.players ?? [])
    .filter((player) => player.injuryStatus || player.gameTimeDecision)
    .map(dailyFaceoffPlayer);
  return {
    forwards: groups("ev", "Forwards"),
    defense: groups("ev", "Defense"),
    goalies: groups("ev", "Goalies"),
    powerPlay: groups("pp"),
    injuries,
    sourceLabel: `Daily Faceoff · ${combinations.sourceName ?? "Latest update"}`,
    updatedAt: combinations.updatedAt,
  };
}

function enrichLineupFaces(lineup: TeamLineupData, roster: NhlRosterResponse): TeamLineupData {
  const rosterFaces = new Map(
    [...(roster.forwards ?? []), ...(roster.defensemen ?? []), ...(roster.goalies ?? [])].map((player) => [
      `${player.firstName?.default ?? ""} ${player.lastName?.default ?? ""}`.toLowerCase().replace(/[^a-z0-9]/g, ""),
      player.headshot,
    ]),
  );
  const addFaces = (groups: LineupGroupData[]) => groups.map((group) => ({
    ...group,
    players: group.players.map((player) => ({
      ...player,
      headshotUrl: player.headshotUrl ?? rosterFaces.get(player.name.toLowerCase().replace(/[^a-z0-9]/g, "")),
    })),
  }));
  return {
    ...lineup,
    forwards: addFaces(lineup.forwards),
    defense: addFaces(lineup.defense),
    goalies: addFaces(lineup.goalies),
    powerPlay: addFaces(lineup.powerPlay),
    injuries: lineup.injuries.map((player) => ({
      ...player,
      headshotUrl: player.headshotUrl ?? rosterFaces.get(player.name.toLowerCase().replace(/[^a-z0-9]/g, "")),
    })),
  };
}

export async function getTeamLineups(): Promise<Record<string, TeamLineupData>> {
  const entries: Array<readonly [string, TeamLineupData]> = [];
  for (let index = 0; index < NHL_TEAMS.length; index += 6) {
    const batch = NHL_TEAMS.slice(index, index + 6);
    const batchEntries = await Promise.all(batch.map(async (team) => {
      try {
        const lineup = await getDailyFaceoffLineup(team.name);
        try {
          const roster = await nhlFetch<NhlRosterResponse>(`/roster/${team.abbrev}/current`);
          return [team.abbrev, enrichLineupFaces(lineup, roster)] as const;
        } catch {
          return [team.abbrev, lineup] as const;
        }
      } catch {
        try {
          const roster = await nhlFetch<NhlRosterResponse>(`/roster/${team.abbrev}/current`);
          return [team.abbrev, {
            forwards: [{ label: "Current roster", players: (roster.forwards ?? []).map(rosterPlayer) }],
            defense: [{ label: "Current roster", players: (roster.defensemen ?? []).map(rosterPlayer) }],
            goalies: [{ label: "Current roster", players: (roster.goalies ?? []).map(rosterPlayer) }],
            powerPlay: [],
            injuries: [],
            sourceLabel: "NHL public roster feed",
          }] as [string, TeamLineupData];
        } catch {
          return [team.abbrev, { forwards: [], defense: [], goalies: [], powerPlay: [], injuries: [], sourceLabel: "Lineup data unavailable" }] as [string, TeamLineupData];
        }
      }
    }));
    entries.push(...batchEntries);
  }
  return Object.fromEntries(entries);
}

function startingGoalie(
  game: DailyFaceoffStartingGame,
  side: "home" | "away",
): StartingGoalie {
  const prefix = side === "home" ? "home" : "away";
  return {
    name: game[`${prefix}GoalieName` as "homeGoalieName" | "awayGoalieName"] ?? "Unlisted goalie",
    headshotUrl: game[`${prefix}GoalieHeadshotUrl` as "homeGoalieHeadshotUrl" | "awayGoalieHeadshotUrl"] ?? "",
    status: game[`${prefix}NewsStrengthName` as "homeNewsStrengthName" | "awayNewsStrengthName"] ?? "Unconfirmed",
    details: game[`${prefix}NewsDetails` as "homeNewsDetails" | "awayNewsDetails"],
    savePercentage: game[`${prefix}GoalieSavePercentage` as "homeGoalieSavePercentage" | "awayGoalieSavePercentage"] ?? "-",
    goalsAgainstAverage: game[`${prefix}GoalieGoalsAgainstAvg` as "homeGoalieGoalsAgainstAvg" | "awayGoalieGoalsAgainstAvg"] ?? "-",
  };
}

function teamInfoByName(name: string): { name: string; logo: string } {
  const team = NHL_TEAMS.find((entry) => entry.name === name);
  return team
    ? { name: team.name, logo: team.logo }
    : { name, logo: "" };
}

function parseMarkdownStartingGoalies(markdown: string): StartingGoaliesData {
  const imagePattern = /!\[Image \d+: ([^\]]+)\]\(([^)]+)\)/g;
  const images = [...markdown.matchAll(imagePattern)].filter((match) => match[2].includes("/uploads/player/headshot/"));
  const games: StartingGoalieGame[] = [];
  for (let index = 0; index + 1 < images.length; index += 2) {
    const first = images[index];
    const second = images[index + 1];
    const before = markdown.slice(0, first.index ?? 0);
    const matchupMatches = [...before.matchAll(/^(.+?) at (.+)$/gm)];
    const matchup = matchupMatches.at(-1);
    if (!matchup) continue;
    const dateMatch = [...before.matchAll(/^([A-Z][a-z]{2} \d{1,2}, \d{4} \| .+)$/gm)].at(-1);
    const segment = markdown.slice(first.index ?? 0, second.index ?? markdown.length);
    const firstStatus = segment.match(/\n(Confirmed|Likely|Unconfirmed)\n/)?.[1] ?? "Unconfirmed";
    const afterSecond = markdown.slice(second.index ?? 0);
    const secondStatus = afterSecond.match(/\n(Confirmed|Likely|Unconfirmed)\n/)?.[1] ?? "Unconfirmed";
    const parsedDate = dateMatch?.[1] ? new Date(dateMatch[1].replace(" | ", " ")) : null;
    const dateGmt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : "";
    const awayTeam = teamInfoByName(matchup[1].trim());
    const homeTeam = teamInfoByName(matchup[2].trim());
    games.push({
      dateGmt,
      time: dateMatch?.[1] ?? "",
      awayTeam: {
        ...awayTeam,
        goalie: { name: first[1], headshotUrl: first[2], status: firstStatus, savePercentage: "-", goalsAgainstAverage: "-" },
      },
      homeTeam: {
        ...homeTeam,
        goalie: { name: second[1], headshotUrl: second[2], status: secondStatus, savePercentage: "-", goalsAgainstAverage: "-" },
      },
    });
  }
  return {
    date: "",
    games,
    confirmedCount: games.reduce((total, game) => total + Number(game.homeTeam.goalie.status === "Confirmed") + Number(game.awayTeam.goalie.status === "Confirmed"), 0),
    sourceLabel: "Daily Faceoff · Proxy data",
  };
}

export async function getStartingGoalies(dateParam?: string): Promise<StartingGoaliesData> {
  try {
    const datePath = dateParam ? `/${dateParam}` : "";
    const html = await fetchDailyFaceoffDocument(`/starting-goalies${datePath}`);
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) return parseMarkdownStartingGoalies(html);
    const page = JSON.parse(match[1]) as DailyFaceoffStartingPageData;
    const games = (page.props?.pageProps?.data ?? []).map((game) => ({
      dateGmt: game.dateGmt ?? "",
      time: game.time ?? "",
      homeTeam: {
        name: game.homeTeamName ?? "Home team",
        logo: game.homeTeamLogoSvg ?? "",
        goalie: startingGoalie(game, "home"),
      },
      awayTeam: {
        name: game.awayTeamName ?? "Away team",
        logo: game.awayTeamLogoSvg ?? "",
        goalie: startingGoalie(game, "away"),
      },
    }));
    return {
      date: page.props?.pageProps?.date ?? "",
      games,
      confirmedCount: games.reduce((total, game) => total + Number(game.homeTeam.goalie.status === "Confirmed") + Number(game.awayTeam.goalie.status === "Confirmed"), 0),
      sourceLabel: "Daily Faceoff · Starting Goalies",
    };
  } catch {
    return { date: "", games: [], confirmedCount: 0, sourceLabel: "Daily Faceoff · Starting Goalies unavailable" };
  }
}

function fantasyPlayerKey(name: string, teamAbbrev: string): string {
  return `${teamAbbrev}:${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

export async function getFantasyPoints(): Promise<FantasyPointsMap> {
  try {
    const response = await fetch("https://fantasydata.com/nhl/fantasy-hockey-leaders", {
      headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(7000),
      next: { revalidate: 900 },
    });
    if (!response.ok) throw new Error(`FantasyData failed (${response.status})`);
    const html = await response.text();
    const points: FantasyPointsMap = {};
    for (const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
      const values = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) =>
        match[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
      );
      if (values.length < 17) continue;
      const fantasyPoints = Number(values.at(-1));
      if (values[1] && values[2] && Number.isFinite(fantasyPoints)) {
        points[fantasyPlayerKey(values[1], values[2])] = {
          goals: Number(values[5]) || 0,
          assists: Number(values[6]) || 0,
          powerPlayPoints: Number(values[10]) || 0,
          averageToi: null,
          shots: Number(values[8]) || 0,
          hits: null,
          blocks: Number(values[13]) || 0,
          fantasyPoints,
        };
      }
    }
    return points;
  } catch {
    return {};
  }
}

function seasonLabel(regularSeasonStartDate: string): string {
  const startYear = Number(regularSeasonStartDate.slice(0, 4));
  return `${startYear}/${String(startYear + 1).slice(2)}`;
}

function weekOptions(mondays: string[], currentMonday: string): WeekOption[] {
  return mondays.map((monday) => {
    const labelDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(parseIsoDate(monday));
    return {
      monday,
      label: `Week of ${labelDate}`,
      isCurrent: monday === currentMonday,
    };
  });
}

export async function getWeeklySchedule(
  weekParam?: string,
): Promise<WeeklyScheduleData> {
  const nowSchedule = await nhlFetch<NhlScheduleResponse>("/schedule/now");
  const rangeEnd = nowSchedule.playoffEndDate ?? nowSchedule.regularSeasonEndDate;
  const mondays = enumerateMondays(nowSchedule.preSeasonStartDate, rangeEnd);
  const currentWeekMonday = formatIsoDate(
    mondayOf(parseIsoDate(todayIsoInEastern())),
  );
  const weekStart = clampWeek(weekParam, mondays);

  const [weekSchedule, standings] = await Promise.all([
    nhlFetch<NhlScheduleResponse>(`/schedule/${weekStart}`),
    nhlFetch<NhlStandingsResponse>("/standings/now").catch(() => ({
      standings: [],
    })),
  ]);

  const records = new Map(
    standings.standings.map((row) => [
      row.teamAbbrev.default,
      { wins: row.wins, losses: row.losses, otLosses: row.otLosses },
    ]),
  );

  const days: WeekDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = formatIsoDate(addDays(parseIsoDate(weekStart), index));
    const apiDay = weekSchedule.gameWeek.find((day) => day.date === date);
    return {
      date,
      gameCount: apiDay?.games?.length ?? apiDay?.numberOfGames ?? 0,
    };
  });

  const teams: TeamWeekRow[] = NHL_TEAMS.map((team) => ({
    ...team,
    wins: records.get(team.abbrev)?.wins ?? 0,
    losses: records.get(team.abbrev)?.losses ?? 0,
    otLosses: records.get(team.abbrev)?.otLosses ?? 0,
    gamesByDate: Object.fromEntries(days.map((day) => [day.date, []])),
    gameCount: 0,
  }));

  const teamIndex = new Map(teams.map((team) => [team.abbrev, team]));
  const datesInWeek = new Set(days.map((day) => day.date));

  for (const day of weekSchedule.gameWeek) {
    if (!datesInWeek.has(day.date)) {
      continue;
    }
    for (const game of day.games ?? []) {
      const away = teamIndex.get(game.awayTeam.abbrev);
      const home = teamIndex.get(game.homeTeam.abbrev);
      const type = asGameType(game.gameType);
      if (away) {
        away.gamesByDate[day.date].push({
          id: game.id,
          opponentAbbrev: game.homeTeam.abbrev,
          opponentName: teamDisplayName(game.homeTeam),
          opponentLogo: teamLogo(game.homeTeam),
          isHome: false,
          gameType: type,
          startTimeUTC: game.startTimeUTC,
          gameState: game.gameState,
          venue: game.venue?.default ?? "",
        });
        away.gameCount += 1;
      }
      if (home) {
        home.gamesByDate[day.date].push({
          id: game.id,
          opponentAbbrev: game.awayTeam.abbrev,
          opponentName: teamDisplayName(game.awayTeam),
          opponentLogo: teamLogo(game.awayTeam),
          isHome: true,
          gameType: type,
          startTimeUTC: game.startTimeUTC,
          gameState: game.gameState,
          venue: game.venue?.default ?? "",
        });
        home.gameCount += 1;
      }
    }
  }

  return {
    weekStart,
    weekEnd: days[6].date,
    days,
    teams,
    weeks: weekOptions(mondays, currentWeekMonday),
    seasonLabel: seasonLabel(nowSchedule.regularSeasonStartDate),
    preSeasonStartDate: nowSchedule.preSeasonStartDate,
    regularSeasonStartDate: nowSchedule.regularSeasonStartDate,
    regularSeasonEndDate: nowSchedule.regularSeasonEndDate,
    playoffEndDate: rangeEnd,
  };
}
