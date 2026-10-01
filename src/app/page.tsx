import { WeeklySchedule } from "@/components/WeeklySchedule";
import { getStartingGoalies, getTeamLineups, getWeeklySchedule } from "@/lib/nhl";

export const revalidate = 300;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; goalieDate?: string }>;
}) {
  const { week, goalieDate } = await searchParams;
  const [data, lineups, startingGoalies] = await Promise.all([
    getWeeklySchedule(week),
    getTeamLineups(),
    getStartingGoalies(goalieDate),
  ]);

  return (
    <main className="flex-1">
      <WeeklySchedule data={data} lineups={lineups} startingGoalies={startingGoalies} />
    </main>
  );
}
