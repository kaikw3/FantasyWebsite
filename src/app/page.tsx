import { WeeklySchedule } from "@/components/WeeklySchedule";
import { getWeeklySchedule } from "@/lib/nhl";

export const revalidate = 300;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; goalieDate?: string; tab?: string }>;
}) {
  const { week, goalieDate, tab } = await searchParams;
  const data = await getWeeklySchedule(week);

  return (
    <main className="flex-1">
      <WeeklySchedule data={data} initialTab={tab} initialGoalieDate={goalieDate} />
    </main>
  );
}
