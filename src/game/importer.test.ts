import { describe, expect, it } from "vitest";
import { applyImport, parseImport } from "./importer";
import { puzzleFor, puzzleFromEntry } from "./puzzle";
import { loadProgress, saveProgress } from "./store";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

// Made-up puzzles. 2026-01-01 comes from the original's data; 2026-01-02 has only our own puzzle.
const nyt = puzzleFromEntry("2026-01-01", "abcdefg fbcdegab abed faced badge cabbage");
const lookup = (date: string) => (date === "2026-01-01" && nyt ? nyt : puzzleFor(date));

describe("parseImport", () => {
  it("keeps days with words and lowercases them", () => {
    expect(
      parseImport({
        days: [
          { date: "2026-01-01", found: ["ABED", 3] },
          { date: "bad", found: ["abed"] },
          { date: "2026-01-03", found: [] },
        ],
      }),
    ).toEqual([{ date: "2026-01-01", found: ["abed"] }]);
  });

  it("explains a file it cannot use", () => {
    expect(() => parseImport({ puzzles: [] })).toThrow("not a Spellagon sync file");
    expect(() => parseImport({ days: [] })).toThrow("No found words");
  });
});

describe("applyImport", () => {
  it("adds new words after the ones found here, drops non-answers, and skips days without the original", () => {
    const storage = memoryStorage();
    saveProgress("2026-01-01/nyt", { found: ["faced"], genius: false, queen: false }, storage);
    const result = applyImport(
      [
        { date: "2026-01-01", found: ["abed", "faced", "zzzz"] },
        { date: "2026-01-02", found: ["abed"] },
      ],
      lookup,
      storage,
    );
    expect(result).toEqual({ days: 1, words: 1, skipped: 1 });
    expect(loadProgress("2026-01-01/nyt", storage).found).toEqual(["faced", "abed"]);
  });

  it("marks a rank reached elsewhere as already announced", () => {
    const storage = memoryStorage();
    applyImport([{ date: "2026-01-01", found: ["fbcdegab", "abed", "faced", "badge", "cabbage"] }], lookup, storage);
    expect(loadProgress("2026-01-01/nyt", storage)).toMatchObject({ genius: true, queen: true });
  });
});
