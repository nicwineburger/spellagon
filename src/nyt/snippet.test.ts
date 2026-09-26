import { expect, test, vi } from "vitest";
import { parseImport } from "../game/importer";
import { buildSnippet } from "./snippet";

test("rejects a malformed since date", () => {
  expect(() => buildSnippet("2026-1-1")).toThrow();
  expect(() => buildSnippet('"; alert(1); "')).toThrow();
});

/** Runs the snippet against a fake NYT with made-up puzzles. `failDay` answers 404 for one day's puzzle. */
async function runSnippet(
  days: number,
  options: { failDay?: string; failBatch?: boolean; signedOut?: boolean; badState?: boolean } = {},
) {
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
    if (options.signedOut) return { ok: false, status: 403, json: async () => ({}) };
    batchCalls += 1;
    if (options.failBatch && ids.length > 1 && batchCalls === 1)
      return { ok: false, status: 500, json: async () => ({}) };
    const odd = options.badState ? [null, { puzzle_id: ids[0], game_data: "{not json" }] : [];
    return json({
      user_id: 42,
      states: [
        ...odd,
        ...ids
          .filter((_, i) => i % 2 === 0)
          .map((id) => ({
            puzzle_id: id,
            user_id: 42,
            schema_version: "0.4.0",
            timestamp: 1789932431,
            game_data: { answers: ["abed", "faced"], isRevealed: false },
          })),
      ],
    });
  };
  const anchor = { click: vi.fn(), href: "", download: "" };
  const errors: string[] = [];
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
    { log: () => {}, warn: () => {}, error: (m: string) => errors.push(m) },
    (fn: () => void) => fn(),
    {},
  );
  return { urls, anchor, since, errors, text: blobs[0] ?? "{}", file: JSON.parse(blobs[0] ?? "{}") };
}

test("snippet looks up each day, batches state requests, and downloads a parseable file", async () => {
  const { urls, anchor, file, text, since } = await runSnippet(45);
  const lookups = new Set(urls.filter((u) => u.startsWith("/svc/spelling-bee/v1/")));
  const batches = urls.filter((u) => u.startsWith("/svc/games/state/spelling_bee/latests?puzzle_ids="));
  expect(urls.every((u) => u.startsWith("/svc/"))).toBe(true);
  // One day per date from since through today's puzzle date, which may lag the UTC date by a day.
  expect(lookups.size).toBeGreaterThanOrEqual(45);
  expect(lookups.size).toBeLessThanOrEqual(47);
  // One sign-in check for today's puzzle, then batches of 20.
  expect(batches).toHaveLength(1 + Math.ceil(lookups.size / 20));
  expect(anchor.click).toHaveBeenCalledOnce();
  expect(anchor.download).toBe("spellagon.json");
  expect(text).not.toContain("user_id");
  expect(file.probe.keys).toEqual(["answers", "isRevealed"]);
  expect(file.days[0].date >= since).toBe(true);
  // Every other id had saved state in the fake, so about half the days come back, each with its words.
  // The fake has saved state for every other id within each batch of 20.
  const full = Math.floor(lookups.size / 20);
  expect(file.days.length).toBe(full * 10 + Math.ceil((lookups.size % 20) / 2));
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

test("signed out, the sync stops after one state request and saves nothing", async () => {
  const { urls, anchor, errors } = await runSnippet(400, { signedOut: true });
  expect(urls.filter((u) => u.includes("puzzle_ids="))).toHaveLength(1);
  expect(urls.length).toBe(2);
  expect(anchor.click).not.toHaveBeenCalled();
  expect(errors[0]).toContain("signed out");
});

test("an odd saved entry is noted and the rest of the sync still downloads", async () => {
  const { anchor, file } = await runSnippet(30, { badState: true });
  expect(anchor.click).toHaveBeenCalledOnce();
  expect(file.days.length).toBeGreaterThan(0);
  expect(file.probe.errors.some((e: string) => e.startsWith("state for "))).toBe(true);
});

test("ids the Spelling Bee page already holds are not looked up again", async () => {
  const urls: string[] = [];
  const recent = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.now() - (i + 2) * 86_400_000).toISOString().slice(0, 10),
  );
  const fetchStub = async (url: string) => {
    urls.push(url);
    const date = url.match(/(\d{4}-\d{2}-\d{2})\.json$/)?.[1];
    if (date) return { ok: true, status: 200, json: async () => ({ id: Date.parse(date) / 86_400_000 }) };
    return { ok: true, status: 200, json: async () => ({ states: [] }) };
  };
  const since = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
  const pageData = {
    gameData: { pastPuzzles: { thisWeek: recent.map((printDate, i) => ({ printDate, id: 500 + i })) } },
  };
  const run = new Function(
    "fetch",
    "document",
    "URL",
    "Blob",
    "console",
    "setTimeout",
    "window",
    `return ${buildSnippet(since)}`,
  );
  await run(
    fetchStub,
    { createElement: () => ({ click() {} }) },
    { createObjectURL: () => "" },
    class {},
    { log() {}, warn() {}, error() {} },
    (fn: () => void) => fn(),
    pageData,
  );
  for (const date of recent) expect(urls).not.toContain(`/svc/spelling-bee/v1/${date}.json`);
  expect(urls.some((u) => u.includes("puzzle_ids=") && u.includes("500"))).toBe(true);
});
