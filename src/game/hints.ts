export interface HintGrid {
  /** Word lengths that appear, ascending. */
  lengths: number[];
  /** One row per first letter, ascending, with a count per length and a row total. */
  rows: { letter: string; counts: number[]; total: number }[];
  /** Totals per length, then the grand total. */
  totals: number[];
  total: number;
}

/** Counts of the given words by first letter and length, as in the hint grid. */
export function hintGrid(words: readonly string[]): HintGrid {
  const lengths = [...new Set(words.map((w) => w.length))].sort((a, b) => a - b);
  const letters = [...new Set(words.map((w) => w[0] ?? ""))].sort();
  const rows = letters.map((letter) => {
    const counts = lengths.map((n) => words.filter((w) => w[0] === letter && w.length === n).length);
    return { letter, counts, total: counts.reduce((a, b) => a + b, 0) };
  });
  const totals = lengths.map((n) => words.filter((w) => w.length === n).length);
  return { lengths, rows, totals, total: words.length };
}

/** Counts of the given words by their first two letters, ascending. */
export function twoLetterList(words: readonly string[]): { start: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word.slice(0, 2), (counts.get(word.slice(0, 2)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([start, count]) => ({ start, count }));
}

/** A pangram that uses each letter exactly once. */
export const isPerfectPangram = (word: string): boolean => word.length === 7 && new Set(word).size === 7;
