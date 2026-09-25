import { addDays } from "./puzzle";

/** New puzzles arrive at 3 a.m. on the Eastern clock, standard or daylight time. */
const RELEASE_HOUR = 3;

const eastern = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

/** Today's puzzle date as YYYY-MM-DD. */
export function puzzleDate(now: Date = new Date()): string {
  const parts = Object.fromEntries(eastern.formatToParts(now).map((part) => [part.type, part.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  return Number(parts.hour) < RELEASE_HOUR ? addDays(today, -1) : today;
}

/** The hour on the Eastern clock, 0 to 23. */
export function easternHour(now: Date = new Date()): number {
  const hour = eastern.formatToParts(now).find((part) => part.type === "hour")?.value;
  return Number(hour ?? 0);
}

const long = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });

/** "September 25, 2026". */
export function longDate(date: string): string {
  return long.format(new Date(`${date}T00:00:00Z`));
}
