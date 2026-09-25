/** New puzzles arrive at 3 a.m. Eastern, so the puzzle date is Eastern time three hours back. */
const RELEASE_HOUR = 3;

const eastern = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's puzzle date as YYYY-MM-DD. */
export function puzzleDate(now: Date = new Date()): string {
  return eastern.format(new Date(now.getTime() - RELEASE_HOUR * 3_600_000));
}

const long = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });

/** "September 25, 2026". */
export function longDate(date: string): string {
  return long.format(new Date(`${date}T00:00:00Z`));
}
