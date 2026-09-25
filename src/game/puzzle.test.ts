import { describe, expect, it } from "vitest";
import {
  addDays,
  answersFor,
  daysBetween,
  EPOCH,
  judge,
  lettersFor,
  type Puzzle,
  praise,
  puzzleFor,
  rankFor,
  ranksFor,
  score,
} from "./puzzle";

const synthetic: Puzzle = {
  date: "2026-01-01",
  center: "a",
  outer: ["b", "c", "d", "e", "f", "g"],
  answers: ["abed", "faced", "cabbage", "badge"],
  pangrams: [],
  maxScore: 0,
};

describe("score", () => {
  it("gives 1 for four letters, the length for longer words, and 7 more for a pangram", () => {
    expect(score("abed")).toBe(1);
    expect(score("faced")).toBe(5);
    expect(score("cabbaged")).toBe(8);
    expect(score("fbcdegab")).toBe(8 + 7);
  });
});

describe("judge", () => {
  it("reports problems in order", () => {
    expect(judge("abc", synthetic, [])).toEqual({ ok: false, message: "Too short" });
    expect(judge("a".repeat(20), synthetic, [])).toEqual({ ok: false, message: "Too long" });
    expect(judge("abez", synthetic, [])).toEqual({ ok: false, message: "Bad letters" });
    expect(judge("bede", synthetic, [])).toEqual({ ok: false, message: "Missing center letter" });
    expect(judge("abed", synthetic, ["abed"])).toEqual({ ok: false, message: "Already found" });
    expect(judge("dace", synthetic, [])).toEqual({ ok: false, message: "Not in word list" });
  });

  it("accepts an answer in any case", () => {
    expect(judge("FACED", synthetic, [])).toEqual({ ok: true, word: "faced", points: 5, pangram: false });
  });
});

describe("praise", () => {
  it("follows word length", () => {
    expect(praise("abed")).toBe("Good!");
    expect(praise("faced")).toBe("Nice!");
    expect(praise("cabbage")).toBe("Awesome!");
    expect(praise("fbcdegab")).toBe("Pangram!");
  });
});

describe("ranks", () => {
  it("rounds each share of the maximum", () => {
    expect(ranksFor(100).map((r) => r.min)).toEqual([0, 2, 5, 8, 15, 25, 40, 50, 70, 100]);
    expect(ranksFor(133).map((r) => r.min)).toEqual([0, 3, 7, 11, 20, 33, 53, 67, 93, 133]);
  });

  it("picks the highest rank reached", () => {
    expect(rankFor(0, 100).name).toBe("Beginner");
    expect(rankFor(24, 100).name).toBe("Solid");
    expect(rankFor(70, 100).name).toBe("Genius");
    expect(rankFor(100, 100).name).toBe("Queen Bee");
  });
});

describe("dates", () => {
  it("counts whole days", () => {
    expect(daysBetween("2026-09-01", "2026-09-25")).toBe(24);
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
  });

  it("gives each day its own letters", () => {
    expect(lettersFor(EPOCH)).not.toBe(lettersFor(addDays(EPOCH, 1)));
    expect(lettersFor("2020-01-01")).toBe(lettersFor(EPOCH));
  });
});

describe("answersFor", () => {
  it("keeps words with the center letter and only puzzle letters", () => {
    expect(answersFor("abcdefg", ["abed", "bede", "abez", "cabbage"])).toEqual(["abed", "cabbage"]);
  });
});

describe("the schedule", () => {
  // Every puzzle for the next three years must be playable the way the game promises.
  const days = Array.from({ length: 3 * 366 }, (_, i) => addDays(EPOCH, i));
  const puzzles = days.map(puzzleFor);

  it("has seven distinct letters, no S, and at least one pangram every day", () => {
    for (const puzzle of puzzles) {
      const letters = [puzzle.center, ...puzzle.outer];
      expect(new Set(letters).size).toBe(7);
      expect(letters).not.toContain("s");
      expect(puzzle.pangrams.length).toBeGreaterThan(0);
    }
  });

  it("keeps word counts and scores in range", () => {
    for (const puzzle of puzzles) {
      expect(puzzle.answers.length).toBeGreaterThanOrEqual(20);
      expect(puzzle.answers.length).toBeLessThanOrEqual(70);
      expect(puzzle.maxScore).toBeGreaterThanOrEqual(70);
    }
  });

  it("never repeats a letter set", () => {
    const sets = puzzles.map((p) => [p.center, ...p.outer].sort().join(""));
    expect(new Set(sets).size).toBe(sets.length);
  });
});
