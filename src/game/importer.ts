import { type Puzzle, rankFor, score } from "./puzzle";
import { loadProgress, mergeProgress, saveProgress } from "./store";

/** One day from the sync file: the words the player found in the original. */
export interface ImportedDay {
  date: string;
  found: string[];
}

const obj = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" ? (v as Record<string, unknown>) : {};

/** Reads spellagon.json from the sync. Throws a message the import page can show as is. */
export function parseImport(input: unknown): ImportedDay[] {
  const rows = obj(input).days;
  if (!Array.isArray(rows)) throw new Error("This is not a Spellagon sync file. Run the sync again.");
  const days: ImportedDay[] = [];
  for (const raw of rows) {
    const row = obj(raw);
    const date = typeof row.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : null;
    const found = Array.isArray(row.found)
      ? row.found.filter((w): w is string => typeof w === "string").map((w) => w.toLowerCase())
      : [];
    if (date && found.length > 0) days.push({ date, found });
  }
  if (days.length === 0) throw new Error("No found words in this file. Sign in to nytimes.com and run the sync again.");
  return days;
}

export interface ImportResult {
  days: number;
  /** The latest day applied, or null when none was. */
  latest: string | null;
  /** Words new to this browser. Words already found here are not counted again. */
  words: number;
  /** Days with no original puzzle on this site, or after today, so nothing to import into. */
  skipped: number;
}

/**
 * Adds imported words to each day's saved progress for the original's puzzle. Words already found here stay,
 * in their order, and new ones follow. Words that are not answers are dropped. A day already at Genius or
 * Queen Bee is marked as notified, so the game does not announce a rank the player reached elsewhere.
 */
export function applyImport(
  days: readonly ImportedDay[],
  puzzleOn: (date: string) => Puzzle,
  today: string,
  storage: Storage | undefined = globalThis.localStorage,
): ImportResult {
  const result: ImportResult = { days: 0, latest: null, words: 0, skipped: 0 };
  for (const day of days) {
    // A day after today has no puzzle to play yet, whatever the file says.
    const puzzle = day.date <= today ? puzzleOn(day.date) : null;
    if (puzzle?.source !== "nyt") {
      result.skipped += 1;
      continue;
    }
    const answers = new Set(puzzle.answers);
    const found = day.found.filter((w) => answers.has(w));
    if (found.length === 0) continue;
    const before = loadProgress(puzzle.id, storage);
    const merged = mergeProgress(before, { found, genius: false, queen: false });
    const points = merged.found.reduce((sum, w) => sum + score(w), 0);
    const rank = rankFor(points, puzzle.maxScore).name;
    merged.genius ||= rank === "Genius" || rank === "Queen Bee";
    merged.queen ||= rank === "Queen Bee";
    saveProgress(puzzle.id, merged, storage);
    result.days += 1;
    if (!result.latest || day.date > result.latest) result.latest = day.date;
    result.words += merged.found.length - before.found.length;
  }
  return result;
}
