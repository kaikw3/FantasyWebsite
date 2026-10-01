import { WeeklySchedule } from "@/components/WeeklySchedule";
import { getFantasyPoints, getStartingGoalies, getTeamLineups, getWeeklySchedule } from "@/lib/nhl";

export const revalidate = 300;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; goalieDate?: string; tab?: string }>;
}) {
  const { week, goalieDate, tab } = await searchParams;
  const [data, lineups, startingGoalies, fantasyPoints] = await Promise.all([
    getWeeklySchedule(week),
    getTeamLineups(),
    getStartingGoalies(goalieDate),
    getFantasyPoints(),
  ]);

  return (
    <main className="flex-1">
      <WeeklySchedule data={data} lineups={lineups} startingGoalies={startingGoalies} fantasyPoints={fantasyPoints} initialTab={tab} />
    </main>
  );
}
