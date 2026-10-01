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
};

type NhlRosterResponse = {
  forwards?: NhlRosterPlayer[];
  defensemen?: NhlRosterPlayer[];
  goalies?: NhlRosterPlayer[];
};

type DailyFaceoffPlayer = {
  name?: string;
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
    position: player.positionCode,
  };
}

function dailyFaceoffPlayer(player: DailyFaceoffPlayer): LineupPlayerData {
  const status = player.injuryStatus?.toLowerCase();
  return {
    name: player.name ?? "Unknown Player",
    number: player.jerseyNumber ?? 0,
    position: player.positionName,
    status: status?.includes("out") || status?.includes("ir") ? "out" : player.gameTimeDecision ? "day-to-day" : undefined,
    note: player.latestNews?.details,
  };
}

function dailyFaceoffSlug(teamName: string): string {
  return teamName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function getDailyFaceoffLineup(teamName: string): Promise<TeamLineupData> {
  const slug = dailyFaceoffSlug(teamName);
  const response = await fetch(`https://www.dailyfaceoff.com/teams/${slug}/line-combinations`, {
    headers: { Accept: "text/html", "User-Agent": FETCH_HEADERS["User-Agent"] },
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    throw new Error(`Daily Faceoff ${slug} failed (${response.status})`);
  }
  const html = await response.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`Daily Faceoff ${slug} did not include lineup data`);
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

export async function getTeamLineups(): Promise<Record<string, TeamLineupData>> {
  const entries = await Promise.all(
    NHL_TEAMS.map(async (team) => {
      try {
        return [team.abbrev, await getDailyFaceoffLineup(team.name)] as const;
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
          }] as const;
        } catch {
          return [team.abbrev, { forwards: [], defense: [], goalies: [], powerPlay: [], injuries: [], sourceLabel: "Lineup data unavailable" }] as const;
        }
      }
    }),
  );
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

export async function getStartingGoalies(dateParam?: string): Promise<StartingGoaliesData> {
  try {
    const datePath = dateParam ? `/${dateParam}` : "";
    const response = await fetch(`https://www.dailyfaceoff.com/starting-goalies${datePath}`, {
      headers: { Accept: "text/html", "User-Agent": FETCH_HEADERS["User-Agent"] },
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`Daily Faceoff starting goalies failed (${response.status})`);
    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) throw new Error("Daily Faceoff starting goalies data was not embedded");
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
