import { type Puzzle, rankFor, score } from "./puzzle";

/** Our own one-line send-offs for yesterday's rank. Rank names match the game. */
const QUIPS: Record<string, string> = {
  Beginner: "Every hive starts with one word.",
  "Good Start": "A fine first step.",
  "Moving Up": "You found your footing.",
  Good: "A good day in the hive.",
  Solid: "Steady, solid work.",
  Nice: "Nicely done.",
  Great: "A great showing.",
  Amazing: "That was a strong day.",
  Genius: "Sharp work yesterday.",
  "Queen Bee": "Every last word. Well played.",
};

/** The rank a player ended a puzzle on and its quip, or null when they found nothing. */
export function finalRank(puzzle: Puzzle, found: readonly string[]): { rank: string; quip: string } | null {
  const words = found.filter((word) => puzzle.answers.includes(word));
  if (words.length === 0) return null;
  const points = words.reduce((sum, word) => sum + score(word), 0);
  const rank = rankFor(points, puzzle.maxScore).name;
  return { rank, quip: QUIPS[rank] ?? "" };
}
