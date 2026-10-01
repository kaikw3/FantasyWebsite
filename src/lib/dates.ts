const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function mondayOf(date: Date): Date {
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return new Date(date.getTime() + offset * MS_PER_DAY);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function todayIsoInEastern(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatWeekLabel(mondayIso: string): string {
  const monday = parseIsoDate(mondayIso);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(monday);
}

export function formatDayHeading(iso: string): { weekday: string; monthDay: string } {
  const date = parseIsoDate(iso);
  return {
    weekday: new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
    })
      .format(date)
      .toUpperCase(),
    monthDay: new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
    })
      .format(date)
      .toUpperCase(),
  };
}

export function formatEasternTime(startTimeUTC: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startTimeUTC));
}

export function enumerateMondays(startIso: string, endIso: string): string[] {
  const mondays: string[] = [];
  let cursor = mondayOf(parseIsoDate(startIso));
  const end = parseIsoDate(endIso);
  while (cursor.getTime() <= end.getTime()) {
    mondays.push(formatIsoDate(cursor));
    cursor = addDays(cursor, 7);
  }
  return mondays;
}

export function clampWeek(week: string | undefined, mondays: string[]): string {
  if (week && mondays.includes(week)) {
    return week;
  }
  const todayMonday = formatIsoDate(mondayOf(parseIsoDate(todayIsoInEastern())));
  if (mondays.includes(todayMonday)) {
    return todayMonday;
  }
  if (todayMonday < mondays[0]) {
    return mondays[0];
  }
  return mondays[mondays.length - 1];
}
