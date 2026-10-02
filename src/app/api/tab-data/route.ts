import { getFantasyPoints, getStartingGoalies, getTeamLineups } from "@/lib/nhl";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab");

  if (tab === "lineup") {
    const team = searchParams.get("team") ?? "VAN";
    return Response.json({ lineups: await getTeamLineups(team) });
  }

  if (tab === "player-search") {
    return Response.json({ lineups: await getTeamLineups() });
  }

  if (tab === "streamers") {
    const [lineups, fantasyPoints] = await Promise.all([getTeamLineups(), getFantasyPoints()]);
    return Response.json({ lineups, fantasyPoints });
  }

  if (tab === "starting-goalies") {
    return Response.json({ startingGoalies: await getStartingGoalies(searchParams.get("date") ?? undefined) });
  }

  return Response.json({ error: "Unknown data tab" }, { status: 400 });
}
