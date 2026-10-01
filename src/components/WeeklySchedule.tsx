"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DayGame, StartingGoaliesData, TeamLineupData, TeamWeekRow, WeeklyScheduleData } from "@/lib/nhl";
import { NHL_TEAMS } from "@/lib/teams";
import { formatDayHeading, formatEasternTime, todayIsoInEastern } from "@/lib/dates";

type SortKey = "name" | "games-desc" | "games-asc" | "off-days-desc" | "off-days-asc";
type GameFilter = "all" | "0" | "1" | "2" | "3" | "4" | "5+";
type CellMode = "logos" | "names";
type TabMode = "schedule" | "lineup" | "player-search" | "starting-goalies";

type LineupPlayer = {
  name: string;
  number: number;
  position?: string;
  status?: "healthy" | "day-to-day" | "out";
  note?: string;
};

type LineGroup = {
  label: string;
  players: LineupPlayer[];
};

type TeamLineup = {
  forwards: LineGroup[];
  defense: LineGroup[];
  goalies: LineGroup[];
  powerPlay: LineGroup[];
  injuries: LineupPlayer[];
};

type WeeklyScheduleProps = {
  data: WeeklyScheduleData;
  lineups: Record<string, TeamLineupData>;
  startingGoalies: StartingGoaliesData;
};

type PlayerSearchResult = {
  player: LineupPlayer;
  teamAbbrev: string;
  teamName: string;
  teamLogo: string;
  tags: string[];
};

function numberedTag(label: string, prefix: string): string {
  const number = label.match(/\d+/)?.[0] ?? "";
  return `${prefix}${number}`;
}

function shiftIsoDate(dateString: string, amount: number): string {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function StartingGoalieCard({
  team,
  goalie,
  side,
}: {
  team: { name: string; logo: string };
  goalie: StartingGoaliesData["games"][number]["homeTeam"]["goalie"];
  side: "home" | "away";
}) {
  const statusClass = goalie.status === "Confirmed"
    ? "bg-emerald-100 text-emerald-700"
    : goalie.status === "Likely"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-200 text-slate-600";

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <img src={goalie.headshotUrl} alt={goalie.name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <img src={team.logo} alt="" className="h-5 w-5 shrink-0 object-contain" />
          <span className="truncate text-xs font-semibold text-slate-500">{side === "home" ? "Home" : "Away"} · {team.name}</span>
        </div>
        <div className="mt-1 break-words text-sm font-bold leading-tight text-slate-800">{goalie.name}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass}`}>{goalie.status}</span>
          <span className="text-[10px] text-slate-500">GAA {goalie.goalsAgainstAverage} · SV% {goalie.savePercentage}</span>
        </div>
      </div>
    </div>
  );
}

const TEAM_LINEUP_FALLBACK: Record<string, TeamLineup> = {
  VAN: {
    forwards: [
      { label: "1st Line", players: [{ name: "J. Miller", number: 9 }, { name: "E. Pettersson", number: 40 }, { name: "P. Brock", number: 19 }] },
      { label: "2nd Line", players: [{ name: "A. Hoglander", number: 96 }, { name: "T. Blueger", number: 83 }, { name: "D. Joshua", number: 81 }] },
      { label: "3rd Line", players: [{ name: "S. Garland", number: 23 }, { name: "N. Raty", number: 90 }, { name: "I. Cole", number: 18 }] },
      { label: "4th Line", players: [{ name: "K. Fucale", number: 72 }, { name: "C. Di Giuseppe", number: 71 }, { name: "D. Sprong", number: 91 }] },
    ],
    defense: [
      { label: "1st Pair", players: [{ name: "Q. Hughes", number: 43 }, { name: "N. Myers", number: 42 }] },
      { label: "2nd Pair", players: [{ name: "T. Poolman", number: 55 }, { name: "M. Juulsen", number: 24 }] },
      { label: "3rd Pair", players: [{ name: "L. Hughes", number: 2 }, { name: "T. Dermott", number: 25 }] },
    ],
    goalies: [
      { label: "Starter", players: [{ name: "T. Demko", number: 35 }] },
      { label: "Backup", players: [{ name: "K. Lankinen", number: 32 }] },
    ],
    powerPlay: [
      { label: "PP1", players: [{ name: "E. Pettersson", number: 40 }, { name: "J. Miller", number: 9 }, { name: "Q. Hughes", number: 43 }, { name: "P. Brock", number: 19 }, { name: "T. Demko", number: 35 }] },
      { label: "PP2", players: [{ name: "A. Hoglander", number: 96 }, { name: "D. Joshua", number: 81 }, { name: "L. Hughes", number: 2 }, { name: "S. Garland", number: 23 }, { name: "K. Lankinen", number: 32 }] },
    ],
    injuries: [
      { name: "D. Joshua", number: 81, status: "day-to-day", note: "Upper body" },
      { name: "P. Brock", number: 19, status: "healthy", note: "Available" },
    ],
  },
  TOR: {
    forwards: [
      { label: "1st Line", players: [{ name: "M. Matthews", number: 34 }, { name: "W. Nylander", number: 88 }, { name: "M. Marner", number: 16 }] },
      { label: "2nd Line", players: [{ name: "J. Tavares", number: 91 }, { name: "P. Bertuzzi", number: 59 }, { name: "N. Tavares", number: 91 }] },
      { label: "3rd Line", players: [{ name: "C. Domi", number: 64 }, { name: "A. Kerfoot", number: 15 }, { name: "N. Robertson", number: 21 }] },
      { label: "4th Line", players: [{ name: "E. Kapanen", number: 29 }, { name: "D. Kampf", number: 64 }, { name: "C. Marners", number: 16 }] },
    ],
    defense: [
      { label: "1st Pair", players: [{ name: "M. Rielly", number: 44 }, { name: "T. Mikkola", number: 17 }] },
      { label: "2nd Pair", players: [{ name: "J. Benoit", number: 77 }, { name: "B. McCabe", number: 22 }] },
      { label: "3rd Pair", players: [{ name: "S. O'Neill", number: 70 }, { name: "M. Lorentz", number: 67 }] },
    ],
    goalies: [
      { label: "Starter", players: [{ name: "I. Samsonov", number: 35 }] },
      { label: "Backup", players: [{ name: "F. Joseph", number: 31 }] },
    ],
    powerPlay: [
      { label: "PP1", players: [{ name: "M. Matthews", number: 34 }, { name: "M. Marner", number: 16 }, { name: "W. Nylander", number: 88 }, { name: "M. Rielly", number: 44 }, { name: "I. Samsonov", number: 35 }] },
      { label: "PP2", players: [{ name: "J. Tavares", number: 91 }, { name: "P. Bertuzzi", number: 59 }, { name: "N. Robertson", number: 21 }, { name: "B. McCabe", number: 22 }, { name: "F. Joseph", number: 31 }] },
    ],
    injuries: [{ name: "N. Robertson", number: 21, status: "day-to-day", note: "Upper body" }],
  },
  BOS: {
    forwards: [
      { label: "1st Line", players: [{ name: "D. Pastrnak", number: 88 }, { name: "C. Coyle", number: 13 }, { name: "B. Marchand", number: 63 }] },
      { label: "2nd Line", players: [{ name: "T. Hall", number: 71 }, { name: "P. Zacha", number: 18 }, { name: "L. Lindholm", number: 13 }] },
      { label: "3rd Line", players: [{ name: "J. Beecher", number: 19 }, { name: "C. Geekie", number: 33 }, { name: "M. Heinen", number: 43 }] },
      { label: "4th Line", players: [{ name: "M. van Riemsdyk", number: 21 }, { name: "O. Wahlstrom", number: 27 }, { name: "G. Trenin", number: 14 }] },
    ],
    defense: [
      { label: "1st Pair", players: [{ name: "M. Grzelcyk", number: 48 }, { name: "H. Lindholm", number: 27 }] },
      { label: "2nd Pair", players: [{ name: "J. McAvoy", number: 73 }, { name: "C. Carlo", number: 25 }] },
      { label: "3rd Pair", players: [{ name: "B. Clifton", number: 75 }, { name: "M. Peeke", number: 20 }] },
    ],
    goalies: [
      { label: "Starter", players: [{ name: "L. Ullmark", number: 35 }] },
      { label: "Backup", players: [{ name: "J. Swayman", number: 1 }] },
    ],
    powerPlay: [
      { label: "PP1", players: [{ name: "D. Pastrnak", number: 88 }, { name: "P. Zacha", number: 18 }, { name: "M. Grzelcyk", number: 48 }, { name: "C. Coyle", number: 13 }, { name: "L. Ullmark", number: 35 }] },
      { label: "PP2", players: [{ name: "B. Marchand", number: 63 }, { name: "T. Hall", number: 71 }, { name: "J. McAvoy", number: 73 }, { name: "L. Lindholm", number: 13 }, { name: "J. Swayman", number: 1 }] },
    ],
    injuries: [{ name: "B. Marchand", number: 63, status: "healthy", note: "Available" }],
  },
};

function buildGenericLineup(teamName: string): TeamLineup {
  const baseName = teamName.replace(/\s+(Hockey|Club)$/i, "");
  const city = baseName.split(" ")[0] ?? baseName;
  const generic = (slot: string, number: number) => ({ name: `${city} ${slot}`, number });

  return {
    forwards: [
      { label: "1st Line", players: [generic("LW", 17), generic("C", 18), generic("RW", 19)] },
      { label: "2nd Line", players: [generic("LW", 20), generic("C", 21), generic("RW", 22)] },
      { label: "3rd Line", players: [generic("LW", 23), generic("C", 24), generic("RW", 25)] },
      { label: "4th Line", players: [generic("LW", 26), generic("C", 27), generic("RW", 28)] },
    ],
    defense: [
      { label: "1st Pair", players: [generic("LD", 44), generic("RD", 45)] },
      { label: "2nd Pair", players: [generic("LD", 46), generic("RD", 47)] },
      { label: "3rd Pair", players: [generic("LD", 48), generic("RD", 49)] },
    ],
    goalies: [
      { label: "Starter", players: [{ name: `${city} Starter`, number: 30 }] },
      { label: "Backup", players: [{ name: `${city} Backup`, number: 31 }] },
    ],
    powerPlay: [
      { label: "PP1", players: [generic("1", 11), generic("2", 12), generic("3", 13), generic("4", 14), generic("5", 15)] },
      { label: "PP2", players: [generic("A", 16), generic("B", 17), generic("C", 18), generic("D", 19), generic("E", 20)] },
    ],
    injuries: [{ name: `${city} Skater`, number: 98, status: "day-to-day", note: "No update" }],
  };
}

function lineupForTeam(teamAbbrev: string): TeamLineup {
  const seed = TEAM_LINEUP_FALLBACK[teamAbbrev];
  if (seed) return seed;
  const team = NHL_TEAMS.find((entry) => entry.abbrev === teamAbbrev) ?? NHL_TEAMS[0];
  return buildGenericLineup(team.name);
}

function PlayerBadge({ player }: { player: LineupPlayer }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
        {player.number}
      </div>
      <div className="min-w-0 flex-1">
        <div className="break-words text-xs font-semibold leading-tight text-slate-800">{player.name}</div>
        {player.position ? <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{player.position}</div> : null}
      </div>
    </div>
  );
}

function LineCard({ title, groups }: { title: string; groups: LineGroup[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">{title}</h3>
      </div>
      <div className="space-y-3">
        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            Not published by the NHL roster feed.
          </div>
        ) : null}
        {groups.map((group) => (
          <div key={group.label} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{group.label}</div>
            <div
              className={
                group.players.length === 3
                  ? "grid grid-cols-3 gap-2"
                  : group.players.length === 2
                    ? "grid grid-cols-2 gap-2"
                    : group.players.length >= 4
                      ? "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
                      : "space-y-2"
              }
            >
              {group.players.map((player) => (
                <PlayerBadge key={`${group.label}-${player.name}-${player.number}`} player={player} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function sortKeyName(name: string): string {
  return name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function gameTypeBadge(gameType: DayGame["gameType"]): string | null {
  if (gameType === 1) return "PS";
  if (gameType === 3) return "PO";
  return null;
}

function GameCell({
  games,
  mode,
}: {
  games: DayGame[];
  mode: CellMode;
}) {
  if (games.length === 0) {
    return <span className="text-slate-600">—</span>;
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      {games.map((game) => {
        const badge = gameTypeBadge(game.gameType);
        const title = `${game.isHome ? "vs" : "@"} ${game.opponentName} · ${formatEasternTime(game.startTimeUTC)} ET${badge ? ` · ${badge === "PS" ? "Preseason" : "Playoffs"}` : ""}`;
        return (
          <div key={game.id} className="flex items-center justify-center gap-1.5" title={title}>
            <span className="w-3 text-right text-[10px] font-semibold text-cyan-600">
              {game.isHome ? "" : "@"}
            </span>
            {mode === "logos" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={game.opponentLogo}
                alt={game.opponentAbbrev}
                className="h-11 w-11 object-contain drop-shadow-sm"
              />
            ) : (
              <span className="text-[11px] font-semibold tracking-wide text-slate-700">
                {game.opponentAbbrev}
              </span>
            )}
            {badge ? (
              <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-700">
                {badge}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function WeeklySchedule({ data, lineups, startingGoalies }: WeeklyScheduleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sort, setSort] = useState<SortKey>("name");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [mode, setMode] = useState<CellMode>("logos");
  const [query, setQuery] = useState("");
  const [showRemainingOnly, setShowRemainingOnly] = useState(false);
  const today = todayIsoInEastern();
  const isCurrentWeekSelected = data.weeks.some((week) => week.isCurrent && week.monday === data.weekStart);

  const visibleDays = useMemo(() => {
    if (!showRemainingOnly || !isCurrentWeekSelected) {
      return data.days;
    }
    return data.days.filter((day) => day.date >= today);
  }, [data.days, isCurrentWeekSelected, showRemainingOnly, today]);
  const offDayDates = useMemo(
    () => visibleDays.filter((day) => day.gameCount <= 10).map((day) => day.date),
    [visibleDays],
  );

  const getDisplayGameCount = useCallback(
    (team: TeamWeekRow) => {
      if (!showRemainingOnly || !isCurrentWeekSelected) {
        return team.gameCount;
      }
      return visibleDays.reduce((total, day) => total + (team.gamesByDate[day.date]?.length ?? 0), 0);
    },
    [isCurrentWeekSelected, showRemainingOnly, visibleDays],
  );
  const getOffDayCount = useCallback(
    (team: TeamWeekRow) => offDayDates.reduce((total, date) => total + (team.gamesByDate[date]?.length ?? 0), 0),
    [offDayDates],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = data.teams.filter((team) => {
      const displayGameCount = getDisplayGameCount(team);
      if (q && !`${team.name} ${team.abbrev} ${team.commonName}`.toLowerCase().includes(q)) {
        return false;
      }
      if (gameFilter === "all") return true;
      if (gameFilter === "5+") return displayGameCount >= 5;
      return displayGameCount === Number(gameFilter);
    });

    const sorted = [...filtered].sort((a, b) => {
      const aCount = getDisplayGameCount(a);
      const bCount = getDisplayGameCount(b);
      const aOffDayCount = getOffDayCount(a);
      const bOffDayCount = getOffDayCount(b);
      if (sort === "games-desc") {
        return bCount - aCount || sortKeyName(a.name).localeCompare(sortKeyName(b.name));
      }
      if (sort === "games-asc") {
        return aCount - bCount || sortKeyName(a.name).localeCompare(sortKeyName(b.name));
      }
      if (sort === "off-days-desc") {
        return bOffDayCount - aOffDayCount || sortKeyName(a.name).localeCompare(sortKeyName(b.name));
      }
      if (sort === "off-days-asc") {
        return aOffDayCount - bOffDayCount || sortKeyName(a.name).localeCompare(sortKeyName(b.name));
      }
      return sortKeyName(a.name).localeCompare(sortKeyName(b.name));
    });
    return sorted;
  }, [data.teams, gameFilter, getDisplayGameCount, getOffDayCount, query, sort]);

  const [activeTab, setActiveTab] = useState<TabMode>("schedule");
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedTeamAbbrev, setSelectedTeamAbbrev] = useState("VAN");
  const selectedTeam = useMemo(
    () => NHL_TEAMS.find((team) => team.abbrev === selectedTeamAbbrev) ?? NHL_TEAMS[0],
    [selectedTeamAbbrev],
  );
  const selectedLineup = useMemo<TeamLineup>(() => {
    const roster = lineups[selectedTeamAbbrev];
    if (!roster || (roster.forwards.length === 0 && roster.defense.length === 0 && roster.goalies.length === 0)) {
      return { forwards: [], defense: [], goalies: [], powerPlay: [], injuries: [] };
    }
    return roster;
  }, [lineups, selectedTeamAbbrev]);

  const playerSearchResults = useMemo(() => {
    const players = new Map<string, PlayerSearchResult>();
    const addGroups = (teamAbbrev: string, groups: LineGroup[], prefix: string) => {
      const team = NHL_TEAMS.find((entry) => entry.abbrev === teamAbbrev);
      if (!team) return;
      for (const group of groups) {
        const tag = numberedTag(group.label, prefix);
        for (const player of group.players) {
          const key = `${teamAbbrev}-${player.name}-${player.number}`;
          const existing = players.get(key);
          if (existing) {
            if (!existing.tags.includes(tag)) existing.tags.push(tag);
          } else {
            players.set(key, {
              player,
              teamAbbrev,
              teamName: team.name,
              teamLogo: team.logo,
              tags: [tag],
            });
          }
        }
      }
    };

    for (const team of NHL_TEAMS) {
      const lineup = lineups[team.abbrev];
      if (!lineup) continue;
      addGroups(team.abbrev, lineup.forwards, "L");
      addGroups(team.abbrev, lineup.defense, "D");
      addGroups(team.abbrev, lineup.powerPlay, "PP");
      addGroups(team.abbrev, lineup.goalies, "G");
    }

    const query = playerSearch.trim().toLowerCase();
    return [...players.values()]
      .filter((result) => !query || `${result.player.name} ${result.teamName} ${result.teamAbbrev}`.toLowerCase().includes(query))
      .sort((a, b) => a.player.name.localeCompare(b.player.name));
  }, [lineups, playerSearch]);

  const currentWeek = data.weeks.find((week) => week.monday === data.weekStart);
  const currentIndex = data.weeks.findIndex((week) => week.monday === data.weekStart);

  function goToWeek(monday: string) {
    startTransition(() => {
      router.push(monday === data.weeks.find((w) => w.isCurrent)?.monday ? "/" : `/?week=${monday}`);
    });
  }

  function goToGoalieDate(date: string) {
    startTransition(() => {
      router.push(date === todayIsoInEastern() ? "/" : `/?goalieDate=${date}`);
    });
  }

  function cycleGamesSort() {
    setSort((current) => {
      if (current === "name") return "games-desc";
      if (current === "games-desc") return "games-asc";
      return "name";
    });
  }

  function gamesHeaderLabel() {
    if (sort === "games-desc") return "Games ▾";
    if (sort === "games-asc") return "Games ▴";
    return "Games";
  }

  function cycleOffDaysSort() {
    setSort((current) => {
      if (current === "off-days-desc") return "off-days-asc";
      if (current === "off-days-asc") return "name";
      return "off-days-desc";
    });
  }

  function offDaysHeaderLabel() {
    if (sort === "off-days-desc") return "Off-Days ▾";
    if (sort === "off-days-asc") return "Off-Days ▴";
    return "Off-Days";
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-8">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
            Fantasy Hockey · {data.seasonLabel} season
          </p>
          <h1 className="mt-1 text-4xl font-semibold text-stone-950 sm:text-5xl">
            NHL Weekly Schedule
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Today highlighted
          <span className="ml-3 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
            PS
          </span>
          Preseason
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
            PO
          </span>
          Playoffs
        </div>
      </header>

      <div className="mb-7 flex flex-wrap items-center gap-1 border-b border-stone-300/80">
        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === "schedule" ? "border-rose-500 text-stone-950" : "border-transparent text-stone-500 hover:text-stone-950"}`}
        >
          Schedule
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("lineup")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === "lineup" ? "border-rose-500 text-stone-950" : "border-transparent text-stone-500 hover:text-stone-950"}`}
        >
          Team Lineup
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("player-search")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === "player-search" ? "border-rose-500 text-stone-950" : "border-transparent text-stone-500 hover:text-stone-950"}`}
        >
          Player Search
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("starting-goalies")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === "starting-goalies" ? "border-rose-500 text-stone-950" : "border-transparent text-stone-500 hover:text-stone-950"}`}
        >
          Starting Goalies
        </button>
      </div>

      {activeTab === "schedule" ? (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-[20px] border border-stone-200 bg-white p-5 shadow-[0_10px_30px_rgba(29,29,27,0.05)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={currentIndex <= 0 || pending}
                  onClick={() => goToWeek(data.weeks[currentIndex - 1].monday)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Prev
                </button>
                <label className="sr-only" htmlFor="week">
                  Fantasy week
                </label>
                <select
                  id="week"
                  value={data.weekStart}
                  disabled={pending}
                  onChange={(event) => goToWeek(event.target.value)}
                  className="min-w-[240px] rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none ring-rose-400/40 focus:ring-2"
                >
                  {data.weeks.map((week) => (
                    <option key={week.monday} value={week.monday}>
                      {week.label}
                      {week.isCurrent ? " (This Week)" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={currentIndex < 0 || currentIndex >= data.weeks.length - 1 || pending}
                  onClick={() => goToWeek(data.weeks[currentIndex + 1].monday)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
                {currentWeek && !currentWeek.isCurrent ? (
                  <button
                    type="button"
                    onClick={() => goToWeek(data.weeks.find((week) => week.isCurrent)?.monday ?? data.weekStart)}
                    className="rounded-lg bg-cyan-100 px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-200"
                  >
                    Jump to this week
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  placeholder="Search teams"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-40 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none ring-rose-400/40 placeholder:text-stone-500 focus:ring-2"
                />
                <select
                  value={gameFilter}
                  onChange={(event) => setGameFilter(event.target.value as GameFilter)}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none ring-rose-400/40 focus:ring-2"
                >
                  <option value="all">All game counts</option>
                  <option value="0">0 games</option>
                  <option value="1">1 game</option>
                  <option value="2">2 games</option>
                  <option value="3">3 games</option>
                  <option value="4">4 games</option>
                  <option value="5+">5+ games</option>
                </select>
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={showRemainingOnly}
                    onChange={(event) => setShowRemainingOnly(event.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 bg-stone-50 text-rose-600 focus:ring-rose-500"
                  />
                  Remaining games
                </label>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setMode("logos")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${mode === "logos" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                  >
                    Logos
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("names")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${mode === "names" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                  >
                    Names
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Showing {rows.length} of {data.teams.length} teams · {showRemainingOnly ? "remaining games only" : "all games this week"} · default order is alphabetical · click{" "}
              <span className="text-slate-700">Games</span> to rank by weekly volume.
            </p>
          </div>

          <div className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 shadow-[0_12px_20px_rgba(15,23,42,0.04)] ${pending ? "opacity-60" : ""}`}>
            <table className="w-full min-w-[780px] table-fixed border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 w-[170px] border-b border-slate-200 bg-slate-50 px-3 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => setSort("name")}
                      className="flex items-center gap-2 font-semibold text-slate-700"
                    >
                      Team {sort === "name" ? "▾" : ""}
                    </button>
                  </th>
                  {visibleDays.map((day) => {
                    const heading = formatDayHeading(day.date);
                    const isToday = day.date === today;
                    const isOffDay = day.gameCount <= 10;
                    return (
                      <th
                        key={day.date}
                        className={`border-b border-slate-200 px-1 py-2.5 text-center ${isOffDay ? "bg-rose-100" : isToday ? "bg-cyan-100" : "bg-slate-50"}`}
                      >
                        <div className={`text-[10px] font-bold tracking-wide ${isOffDay ? "text-rose-700" : isToday ? "text-cyan-700" : "text-slate-700"}`}>
                          {heading.weekday}
                        </div>
                        <div className={`text-[10px] font-semibold ${isOffDay ? "text-rose-700" : isToday ? "text-cyan-700" : "text-slate-500"}`}>
                          {heading.monthDay}
                        </div>
                        <div className="mt-1 text-[9px] font-medium text-slate-500">{day.gameCount} gms</div>
                      </th>
                    );
                  })}
                  <th className="w-[72px] border-b border-l-2 border-slate-300 bg-slate-50 px-2 py-3 text-center">
                    <button
                      type="button"
                      onClick={cycleGamesSort}
                      className="font-semibold text-cyan-700"
                    >
                      {gamesHeaderLabel()}
                    </button>
                  </th>
                  <th className="w-[88px] border-b border-slate-200 bg-rose-50 px-2 py-3 text-center text-xs font-semibold text-rose-700">
                    <button type="button" onClick={cycleOffDaysSort} className="font-semibold text-rose-700">
                      {offDaysHeaderLabel()}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((team, index) => (
                  <TeamRow
                    key={team.abbrev}
                    team={team}
                    days={visibleDays.map((day) => day.date)}
                    offDayDates={offDayDates}
                    today={today}
                    mode={mode}
                    zebra={index % 2 === 1}
                  />
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleDays.length + 3} className="px-4 py-12 text-center text-slate-400">
                      No teams match that filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === "lineup" ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-[0_12px_20px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img src={selectedTeam.logo} alt={selectedTeam.name} className="h-10 w-10 object-contain" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected team</p>
                <h2 className="text-2xl font-semibold text-slate-900">{selectedTeam.name}</h2>
                <p className="mt-1 text-xs text-slate-500">{lineups[selectedTeamAbbrev]?.sourceLabel ?? "Lineup source unavailable"}</p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <span>Team</span>
              <select
                value={selectedTeamAbbrev}
                onChange={(event) => setSelectedTeamAbbrev(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-cyan-400/40 focus:ring-2"
              >
                {NHL_TEAMS.map((team) => (
                  <option key={team.abbrev} value={team.abbrev}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <LineCard title="Forwards" groups={selectedLineup.forwards} />
            <LineCard title="Defense" groups={selectedLineup.defense} />
            <div className="xl:col-span-2">
              <LineCard title="Goalies" groups={selectedLineup.goalies} />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">Special teams</h3>
            </div>
            <div className="space-y-4">
              <LineCard title="Power play" groups={selectedLineup.powerPlay} />
              <div key={`injuries-${selectedTeamAbbrev}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">Injuries</h3>
                </div>
                <div className="space-y-2">
                  {selectedLineup.injuries.length > 0 ? (
                    selectedLineup.injuries.map((player) => (
                      <PlayerBadge key={`${player.name}-${player.number}`} player={player} />
                    ))
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                      No injury report for this team.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "player-search" ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_12px_20px_rgba(15,23,42,0.04)]">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">Daily Faceoff line data</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Player Search</h2>
            <p className="mt-1 text-sm text-slate-500">Search across current forward lines, defense pairs, goalies, and power-play units.</p>
          </div>

          <label className="sr-only" htmlFor="player-search">Search players</label>
          <input
            id="player-search"
            type="search"
            autoComplete="off"
            placeholder="Search by player or team"
            value={playerSearch}
            onChange={(event) => setPlayerSearch(event.target.value)}
            className="mb-5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none ring-cyan-400/40 placeholder:text-slate-500 focus:ring-2"
          />

          {playerSearchResults.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No players match “{playerSearch}”.
            </div>
          ) : (
            <div className="space-y-2">
              {playerSearchResults.map((result) => (
                <div key={`${result.teamAbbrev}-${result.player.name}-${result.player.number}`} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <img src={result.teamLogo} alt="" className="h-9 w-9 shrink-0 object-contain" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800">{result.player.name}</div>
                      <div className="text-xs text-slate-500">#{result.player.number} · {result.teamName}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-bold text-cyan-800">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_12px_20px_rgba(15,23,42,0.04)]">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">Daily Faceoff</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">Starting Goalies</h2>
              <p className="mt-1 text-sm text-slate-500">Projected and confirmed starters from the Daily Faceoff goalie board.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => goToGoalieDate(shiftIsoDate(startingGoalies.date || todayIsoInEastern(), -1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Previous
              </button>
              <div className="px-2 text-center text-sm text-slate-500">
                <div className="font-semibold text-slate-700">{startingGoalies.date || "Today"}</div>
                <div>{startingGoalies.confirmedCount} confirmed</div>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => goToGoalieDate(shiftIsoDate(startingGoalies.date || todayIsoInEastern(), 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>

          {startingGoalies.games.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Starting goalie data is currently unavailable.
            </div>
          ) : (
            <div className="space-y-4">
              {startingGoalies.games.map((game) => (
                <article key={`${game.dateGmt}-${game.homeTeam.name}-${game.awayTeam.name}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {game.dateGmt ? formatEasternTime(game.dateGmt) : game.time} ET
                  </div>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
                    <StartingGoalieCard team={game.awayTeam} goalie={game.awayTeam.goalie} side="away" />
                    <div className="flex items-center justify-center text-xs font-bold uppercase tracking-[0.16em] text-slate-400">at</div>
                    <StartingGoalieCard team={game.homeTeam} goalie={game.homeTeam.goalie} side="home" />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TeamRow({
  team,
  days,
  offDayDates,
  today,
  mode,
  zebra,
}: {
  team: TeamWeekRow;
  days: string[];
  offDayDates: string[];
  today: string;
  mode: CellMode;
  zebra: boolean;
}) {
  const rowBg = zebra ? "bg-slate-50" : "bg-white";
  const stickyBg = zebra ? "bg-slate-100" : "bg-slate-50";
  const gameTotal = days.reduce((total, date) => total + (team.gamesByDate[date]?.length ?? 0), 0);
  const offDayCount = offDayDates.reduce((total, date) => total + (team.gamesByDate[date]?.length ?? 0), 0);

  return (
    <tr className={rowBg}>
      <th className={`sticky left-0 z-10 border-b border-slate-200 px-3 py-2 text-left ${stickyBg}`}>
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={team.logo} alt="" className="h-10 w-10 shrink-0 object-contain" />
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-800">{team.name}</div>
            <div className="text-[11px] text-slate-500">
              {team.abbrev} · {team.wins}-{team.losses}-{team.otLosses}
            </div>
          </div>
        </div>
      </th>
      {days.map((date) => {
        const isToday = date === today;
        return (
          <td
            key={date}
            className={`border-b border-slate-200 px-0.5 py-1.5 text-center ${isToday ? "bg-cyan-50" : ""}`}
          >
            <GameCell games={team.gamesByDate[date] ?? []} mode={mode} />
          </td>
        );
      })}
      <td className="border-b border-l-2 border-slate-300 px-2 py-2 text-center">
        <span
          className={`inline-flex min-w-8 justify-center rounded-full px-2 py-1 text-sm font-bold ${
            gameTotal >= 4
              ? "bg-emerald-100 text-emerald-700"
              : gameTotal <= 1
                ? "bg-slate-200 text-slate-600"
                : "bg-cyan-100 text-cyan-700"
          }`}
        >
          {gameTotal}
        </span>
      </td>
      <td className="border-b border-slate-200 bg-rose-50/40 px-2 py-2 text-center">
        <span className="inline-flex min-w-8 justify-center rounded-full bg-rose-100 px-2 py-1 text-sm font-bold text-rose-700">
          {offDayCount}
        </span>
      </td>
    </tr>
  );
}
