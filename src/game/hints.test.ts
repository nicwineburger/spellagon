import { describe, expect, it } from "vitest";
import { hintGrid, isPerfectPangram, twoLetterList } from "./hints";

const words = ["abed", "able", "bead", "blade", "bladed", "deal"];

describe("hintGrid", () => {
  it("counts by first letter and length", () => {
    const grid = hintGrid(words);
    expect(grid.lengths).toEqual([4, 5, 6]);
    expect(grid.rows).toEqual([
      { letter: "a", counts: [2, 0, 0], total: 2 },
      { letter: "b", counts: [1, 1, 1], total: 3 },
      { letter: "d", counts: [1, 0, 0], total: 1 },
    ]);
    expect(grid.totals).toEqual([4, 1, 1]);
    expect(grid.total).toBe(6);
  });
});

describe("twoLetterList", () => {
  it("counts first pairs in order", () => {
    expect(twoLetterList(words)).toEqual([
      { start: "ab", count: 2 },
      { start: "be", count: 1 },
      { start: "bl", count: 2 },
      { start: "de", count: 1 },
    ]);
  });
});

describe("isPerfectPangram", () => {
  it("needs seven letters, each once", () => {
    expect(isPerfectPangram("blanked")).toBe(true);
    expect(isPerfectPangram("blankedd")).toBe(false);
  });
});
