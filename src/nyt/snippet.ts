import { PUZZLE_PATH, REQUEST_GAP_MS, STATE_BATCH, STATE_PATH } from "./endpoints";

/**
 * The sync the player pastes into the console on nytimes.com. It runs on NYT's own origin, so the browser
 * attaches the session cookie itself. The token is never read, copied or sent anywhere. It downloads
 * spellagon.json with the words found each day, and makes no request to any other host.
 */
export function buildSnippet(since: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error("since must be YYYY-MM-DD");
  return `(async () => {
  const since = "${since}", DAY = 864e5, log = (m) => console.log("spellagon: " + m);
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  const pause = () => new Promise((r) => setTimeout(r, ${REQUEST_GAP_MS}));
  const get = async (u) => {
    const r = await fetch(u, { credentials: "include" });
    if (!r.ok) throw new Error(r.status + " from " + u);
    return r.json();
  };
  const probe = { errors: [], keys: [], schemas: [], noId: 0 };
  // Saved progress for many puzzles in one request. A failed batch is retried one id at a time.
  const states = async (ids) => {
    try {
      const body = await get("${STATE_PATH}?puzzle_ids=" + ids.join(","));
      return body.states || [];
    } catch (e) {
      if (ids.length === 1) { probe.errors.push(e.message); return []; }
      const out = [];
      for (const id of ids) { out.push(...(await states([id]))); await pause(); }
      return out;
    }
  };
  // The last day is today's puzzle on the page when there is one, else today's date.
  const page = (typeof window !== "undefined" && window.gameData && window.gameData.today) || null;
  const last = Date.parse((page && page.printDate) || iso(Date.now()));
  const byId = new Map();
  let looked = 0;
  log("syncing back to " + since + ". Keep this tab open.");
  for (let t = Date.parse(since); t <= last; t += DAY) {
    const date = iso(t);
    try {
      const puzzle = await get("${PUZZLE_PATH}" + date + ".json");
      if (puzzle && puzzle.id != null) byId.set(String(puzzle.id), date);
      else probe.noId++;
    } catch (e) {
      probe.errors.push(e.message);
    }
    if (++looked % 100 === 0) log(looked + " days looked up, now at " + date);
    await pause();
  }
  const ids = [...byId.keys()], days = [];
  for (let i = 0; i < ids.length; i += ${STATE_BATCH}) {
    for (const s of await states(ids.slice(i, i + ${STATE_BATCH}))) {
      const game = (typeof s.game_data === "string" ? JSON.parse(s.game_data) : s.game_data) || {};
      for (const k of Object.keys(game)) if (!probe.keys.includes(k)) probe.keys.push(k);
      if (!probe.schemas.includes(s.schema_version)) probe.schemas.push(s.schema_version);
      const found = Array.isArray(game.answers) ? game.answers.filter((w) => typeof w === "string") : [];
      const date = byId.get(String(s.puzzle_id));
      // Keep only the words and whether the answers were revealed. Nothing else about the account.
      if (date && found.length) days.push({ date, found, revealed: game.isRevealed === true, timestamp: s.timestamp });
    }
    await pause();
  }
  days.sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!days.length) console.warn("spellagon: no saved words came back. Sign in to nytimes.com and run this again.");
  const file = { version: 1, exportedAt: new Date().toISOString(), since, days, probe };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
  a.download = "spellagon.json";
  a.click();
  const words = days.reduce((n, d) => n + d.found.length, 0);
  log("done. " + days.length + " days, " + words + " words. Check your downloads.");
})();`;
}
