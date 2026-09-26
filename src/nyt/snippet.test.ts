import { expect, test, vi } from "vitest";
import { parseImport } from "../game/importer";
import { buildSnippet } from "./snippet";

test("rejects a malformed since date", () => {
  expect(() => buildSnippet("2026-1-1")).toThrow();
  expect(() => buildSnippet('"; alert(1); "')).toThrow();
});

/** Runs the snippet against a fake NYT with made-up puzzles. `failDay` answers 404 for one day's puzzle. */
async function runSnippet(days: number, options: { failDay?: string; failBatch?: boolean } = {}) {
  const urls: string[] = [];
  const blobs: string[] = [];
  const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
  let batchCalls = 0;
  const fetchStub = async (url: string, init: RequestInit) => {
    urls.push(url);
    expect(init.credentials).toBe("include");
    const date = url.match(/(\d{4}-\d{2}-\d{2})\.json$/)?.[1];
    if (date) {
      if (date === options.failDay) return { ok: false, status: 404, json: async () => ({}) };
      // Ids are not in date order in the real data, so the fake scrambles them too.
      return json({ id: 90_000 - Date.parse(date) / 86_400_000, center_letter: "a", outer_letters: "bcdefg" });
    }
    const ids = (new URL(url, "https://x").searchParams.get("puzzle_ids") ?? "").split(",");
    batchCalls += 1;
    if (options.failBatch && ids.length > 1 && batchCalls === 1)
      return { ok: false, status: 500, json: async () => ({}) };
    return json({
      user_id: 42,
      states: ids
        .filter((_, i) => i % 2 === 0)
        .map((id) => ({
          puzzle_id: id,
          user_id: 42,
          schema_version: "0.4.0",
          timestamp: 1789932431,
          game_data: { answers: ["abed", "faced"], isRevealed: false },
        })),
    });
  };
  const anchor = { click: vi.fn(), href: "", download: "" };
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  // The snippet is a string by design, so the test compiles it with stand-ins for the browser globals.
  const names = ["fetch", "document", "URL", "Blob", "console", "setTimeout", "window"];
  const run = new Function(...names, `return ${buildSnippet(since)}`);
  await run(
    fetchStub,
    { createElement: () => anchor },
    { createObjectURL: () => "blob:x" },
    class {
      constructor(parts: string[]) {
        blobs.push(parts.join(""));
      }
    },
    { log: () => {}, warn: () => {} },
    (fn: () => void) => fn(),
    {},
  );
  return { urls, anchor, since, text: blobs[0] ?? "{}", file: JSON.parse(blobs[0] ?? "{}") };
}

test("snippet looks up each day, batches state requests, and downloads a parseable file", async () => {
  const { urls, anchor, file, text, since } = await runSnippet(45);
  const lookups = urls.filter((u) => u.startsWith("/svc/spelling-bee/v1/"));
  const batches = urls.filter((u) => u.startsWith("/svc/games/state/spelling_bee/latests?puzzle_ids="));
  expect(urls.every((u) => u.startsWith("/svc/"))).toBe(true);
  expect(lookups.length).toBe(46);
  expect(batches).toHaveLength(Math.ceil(lookups.length / 20));
  expect(anchor.click).toHaveBeenCalledOnce();
  expect(anchor.download).toBe("spellagon.json");
  expect(text).not.toContain("user_id");
  expect(file.probe.keys).toEqual(["answers", "isRevealed"]);
  expect(file.days[0].date >= since).toBe(true);
  // Every other id had saved state in the fake, so about half the days come back, each with its words.
  expect(file.days.length).toBe(23);
  expect(parseImport(file).every((d) => d.found.join() === "abed,faced")).toBe(true);
});

test("a day that fails to load is reported and the rest still sync", async () => {
  const failDay = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
  const { file } = await runSnippet(10, { failDay });
  expect(file.probe.errors).toEqual([`404 from /svc/spelling-bee/v1/${failDay}.json`]);
  expect(file.days.length).toBeGreaterThan(0);
});

test("a failed batch is retried one id at a time", async () => {
  const { urls, file } = await runSnippet(10, { failBatch: true });
  const singles = urls.filter((u) => /puzzle_ids=\d+$/.test(u));
  expect(singles.length).toBeGreaterThan(0);
  expect(file.days.length).toBeGreaterThan(0);
});
