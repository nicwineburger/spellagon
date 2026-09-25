import { describe, expect, it } from "vitest";
import type { Puzzle } from "./puzzle";
import { finalRank } from "./quips";

const puzzle: Puzzle = {
  date: "2026-09-01",
  source: "local",
  id: "2026-09-01",
  center: "a",
  outer: ["b", "c", "d", "e", "f", "g"],
  answers: ["abed", "badge", "cabbed", "fadeback"],
  pangrams: [],
  maxScore: 1 + 5 + 6 + 8,
};

describe("finalRank", () => {
  it("is null when nothing was found", () => {
    expect(finalRank(puzzle, [])).toBeNull();
  });

  it("ignores words that are not answers", () => {
    expect(finalRank(puzzle, ["zzzz"])).toBeNull();
  });

  it("names the rank reached and a quip", () => {
    expect(finalRank(puzzle, ["abed"])).toEqual({ rank: "Moving Up", quip: "You found your footing." });
    expect(finalRank(puzzle, puzzle.answers)).toEqual({ rank: "Queen Bee", quip: "Every last word. Well played." });
  });
});
