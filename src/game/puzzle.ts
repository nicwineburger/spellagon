import archiveText from "./archive.txt?raw";
import puzzleText from "./puzzles.txt?raw";
import wordText from "./words.txt?raw";

export interface Puzzle {
  /** Puzzle date as YYYY-MM-DD. */
  date: string;
  center: string;
  /** The six outer letters, in their starting order. */
  outer: string[];
  answers: string[];
  pangrams: string[];
  maxScore: number;
}

export interface Rank {
  name: string;
  /** Share of the maximum score needed, from 0 to 1. */
  share: number;
  /** Minimum points for this puzzle. */
  min: number;
}

/** The first daily puzzle's date. Every later day takes the next line of `puzzles.txt`. */
export const EPOCH = "2026-09-01";
export const MIN_LENGTH = 4;
export const MAX_LENGTH = 19;
export const PANGRAM_BONUS = 7;

const RANKS: [string, number][] = [
  ["Beginner", 0],
  ["Good Start", 0.02],
  ["Moving Up", 0.05],
  ["Good", 0.08],
  ["Solid", 0.15],
  ["Nice", 0.25],
  ["Great", 0.4],
  ["Amazing", 0.5],
  ["Genius", 0.7],
  ["Queen Bee", 1],
];

const schedule = puzzleText.trim().split("\n");
/** Days before `EPOCH`, newest first: line 1 is the day before `EPOCH`. */
const archive = archiveText.trim().split("\n");
const dictionary = wordText.trim().split("\n");

export const isPangram = (word: string): boolean => new Set(word).size === 7;

/** Four letters score 1. Longer words score one per letter, and a pangram adds 7. */
export function score(word: string): number {
  return (word.length === MIN_LENGTH ? 1 : word.length) + (isPangram(word) ? PANGRAM_BONUS : 0);
}

/** Whole days from `from` to `to`, both YYYY-MM-DD. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** The earliest date with a puzzle, the far end of the archive. */
export const FIRST_DATE = addDays(EPOCH, -archive.length);

/** Letters for a date: center first, then the six outer letters. Dates before `FIRST_DATE` get the first puzzle. */
export function lettersFor(date: string): string {
  const offset = daysBetween(EPOCH, date);
  if (offset < 0) return archive[Math.min(-offset, archive.length) - 1] ?? "";
  return schedule[offset % schedule.length] ?? "";
}

/** Whether a date has a puzzle: from `FIRST_DATE` through `today`. */
export function hasPuzzle(date: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < FIRST_DATE || date > today) return false;
  // Reject dates that do not exist, like February 30.
  const time = Date.parse(`${date}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(date);
}

export function answersFor(letters: string, words: readonly string[] = dictionary): string[] {
  const allowed = new Set(letters);
  const center = letters[0] ?? "";
  return words.filter((word) => word.includes(center) && [...word].every((c) => allowed.has(c)));
}

export function puzzleFor(date: string): Puzzle {
  const letters = lettersFor(date);
  const answers = answersFor(letters);
  return {
    date,
    center: letters[0] ?? "",
    outer: [...letters.slice(1)],
    answers,
    pangrams: answers.filter(isPangram),
    maxScore: answers.reduce((sum, word) => sum + score(word), 0),
  };
}

export function ranksFor(maxScore: number): Rank[] {
  return RANKS.map(([name, share]) => ({ name, share, min: Math.round(share * maxScore) }));
}

/** The highest rank reached. Queen Bee needs every point. */
export function rankFor(points: number, maxScore: number): Rank {
  const ranks = ranksFor(maxScore);
  let reached = ranks[0] as Rank;
  for (const rank of ranks) if (points >= rank.min) reached = rank;
  return reached;
}

export type Verdict = { ok: true; word: string; points: number; pangram: boolean } | { ok: false; message: string };

/** Judges a typed word in the order the game reports problems. */
export function judge(input: string, puzzle: Puzzle, found: readonly string[]): Verdict {
  const word = input.toLowerCase();
  const letters = new Set([puzzle.center, ...puzzle.outer]);
  if (word.length < MIN_LENGTH) return { ok: false, message: "Too short" };
  if (word.length > MAX_LENGTH) return { ok: false, message: "Too long" };
  if (![...word].every((c) => letters.has(c))) return { ok: false, message: "Bad letters" };
  if (!word.includes(puzzle.center)) return { ok: false, message: "Missing center letter" };
  if (found.includes(word)) return { ok: false, message: "Already found" };
  if (!puzzle.answers.includes(word)) return { ok: false, message: "Not in word list" };
  return { ok: true, word, points: score(word), pangram: isPangram(word) };
}

/** A found word as the lists show it: "Pangram". Done in text, since Safari's capitalize runs across adjacent spans. */
export const titleCase = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/** Praise for a found word, by its points: "Good!" for 1, "Nice!" up to 6, "Awesome!" from 7, or "Pangram!". */
export function praise(word: string): string {
  if (isPangram(word)) return "Pangram!";
  const points = score(word);
  if (points >= 7) return "Awesome!";
  if (points > 1) return "Nice!";
  return "Good!";
}
