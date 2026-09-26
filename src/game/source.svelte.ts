import { addDays, type Puzzle, puzzleFor, puzzleFromEntry } from "./puzzle";

/**
 * The original's puzzles, one file per month in `public/puzzles/YYYY-MM.json`, fetched from this site only
 * when needed. `public/puzzles/index.json` lists the months that exist. The daily `puzzles` workflow writes
 * all of them. A day with no entry falls back to our own puzzle.
 */
type Month = Record<string, string>;

let months = new Set<string>();
let indexJob: Promise<void> | null = null;
/** True while the last attempt to read the index failed on the network. */
let indexFailed = false;
const loadedMonths = new Map<string, Month | null>();
const pending = new Map<string, Promise<void>>();
const built = new Map<string, Puzzle>();

/** Bumps whenever data arrives, so anything that read a puzzle reads it again. */
export const loaded = $state({ version: 0 });

const monthOf = (date: string) => date.slice(0, 7);
const base = () => `${import.meta.env.BASE_URL}puzzles/`;

/** The parsed file, `null` when the site answered without one, or `undefined` when the network failed. */
function getJson<T>(url: string, fresh: boolean): Promise<T | null | undefined> {
  return fetch(url, fresh ? { cache: "no-cache" } : undefined)
    .then((response) => (response.ok ? (response.json() as Promise<T>).catch(() => null) : null))
    .catch(() => undefined);
}

function loadIndex(fresh = false): Promise<void> {
  indexJob = getJson<{ months?: unknown }>(`${base()}index.json`, fresh).then((data) => {
    // Offline: forget the attempt so the next call tries again.
    indexFailed = data === undefined;
    if (indexFailed) indexJob = null;
    const list = Array.isArray(data?.months) ? data.months.filter((m): m is string => typeof m === "string") : [];
    months = new Set(list);
  });
  return indexJob;
}

function fetchMonth(month: string, fresh = false): Promise<void> {
  const job = (months.has(month) ? getJson<Month>(`${base()}${month}.json`, fresh) : Promise.resolve(null))
    .then((data) => {
      // Offline: leave the month unloaded so the next call tries again. A missing file is remembered.
      if (data === undefined) return;
      loadedMonths.set(month, data && typeof data === "object" ? data : null);
      for (const key of built.keys()) if (key.startsWith(month)) built.delete(key);
      loaded.version += 1;
    })
    .finally(() => pending.delete(month));
  pending.set(month, job);
  return job;
}

/** Loads the months these dates fall in. Resolves even when a file is missing or the network is down. */
export async function ensure(...dates: string[]): Promise<void> {
  await (indexJob ?? loadIndex());
  await Promise.all(
    [...new Set(dates.map(monthOf))].map((month) =>
      loadedMonths.has(month) ? undefined : (pending.get(month) ?? fetchMonth(month)),
    ),
  );
}

/**
 * Months among these dates that the site lists but could not load, say offline. A month with no file is not
 * counted: that day simply has no original puzzle.
 */
export function unloaded(...dates: string[]): string[] {
  const all = [...new Set(dates.map(monthOf))];
  if (indexFailed) return all;
  return all.filter((month) => months.has(month) && !loadedMonths.has(month));
}

/** Loads the index and a month again past the browser cache, for when the day's puzzle was not there yet. */
export async function refetch(date: string): Promise<void> {
  await loadIndex(true);
  await (pending.get(monthOf(date)) ?? fetchMonth(monthOf(date), true));
}

/** The puzzle for a date: the original's when loaded, otherwise our own. Reactive through `loaded.version`. */
export function puzzleOn(date: string): Puzzle {
  void loaded.version;
  const entry = loadedMonths.get(monthOf(date))?.[date];
  if (!entry) return puzzleFor(date);
  const cached = built.get(date);
  if (cached) return cached;
  const puzzle = puzzleFromEntry(date, entry) ?? puzzleFor(date);
  built.set(date, puzzle);
  return puzzle;
}

/**
 * True when the original's puzzles are in use but today's has not been fetched yet, in the minutes after
 * 3 a.m. Eastern. The game then waits for it rather than showing a stand-in that would change under the player.
 */
export function awaitingToday(date: string, today: string): boolean {
  void loaded.version;
  if (date !== today) return false;
  const yesterday = addDays(today, -1);
  const hasYesterday = Boolean(loadedMonths.get(monthOf(yesterday))?.[yesterday]);
  const hasToday = Boolean(loadedMonths.get(monthOf(today))?.[today]);
  return hasYesterday && !hasToday;
}
