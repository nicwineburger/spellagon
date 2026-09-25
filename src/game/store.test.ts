import { describe, expect, it } from "vitest";
import { emptyProgress, loadProgress, saveProgress } from "./store";

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

describe("progress", () => {
  it("round-trips per date", () => {
    const storage = memoryStorage();
    saveProgress("2026-09-25", { found: ["abed"], genius: true, queen: false }, storage);
    expect(loadProgress("2026-09-25", storage)).toEqual({ found: ["abed"], genius: true, queen: false });
    expect(loadProgress("2026-09-26", storage)).toEqual(emptyProgress());
  });

  it("survives bad data", () => {
    const storage = memoryStorage();
    storage.setItem("spellagon:2026-09-25", "{not json");
    expect(loadProgress("2026-09-25", storage)).toEqual(emptyProgress());
    storage.setItem("spellagon:2026-09-25", JSON.stringify({ found: ["abed", 3] }));
    expect(loadProgress("2026-09-25", storage).found).toEqual(["abed"]);
  });
});
