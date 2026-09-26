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
  const pause = (ms = ${REQUEST_GAP_MS}) => new Promise((r) => setTimeout(r, ms));
  const get = async (u) => {
    const r = await fetch(u, { credentials: "include" });
    if (!r.ok) {
      const e = new Error(r.status + " from " + u);
      e.status = r.status;
      throw e;
    }
    return r.json();
  };
  const SIGNED_OUT = [401, 403];
  const probe = { errors: [], keys: [], schemas: [], noId: 0 };
  // Saved progress for many puzzles in one request. A batch that fails for another reason is retried
  // one id at a time. Signed out, every request would fail the same way, so the sync stops instead.
  const states = async (ids) => {
    try {
      const body = await get("${STATE_PATH}?puzzle_ids=" + ids.join(","));
      return Array.isArray(body.states) ? body.states : [];
    } catch (e) {
      if (SIGNED_OUT.includes(e.status)) throw e;
      if (e.status === 429) { await pause(5000); }
      if (ids.length === 1) { probe.errors.push(e.message); return []; }
      const out = [];
      for (const id of ids) { out.push(...(await states([id]))); await pause(); }
      return out;
    }
  };
  // Today's puzzle date: the Eastern calendar day, turning over at 3 a.m., as the game counts it.
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date()).map((p) => [p.type, p.value]));
  const eastern = Date.parse(parts.year + "-" + parts.month + "-" + parts.day);
  const last = Number(parts.hour) < 3 ? eastern - DAY : eastern;
  const byId = new Map();
  try {
    // One state request first: signed out, stop now rather than after every lookup.
    // Any other failure here is only noted; the loop below looks today up again.
    let todayId = null;
    try {
      const today = await get("${PUZZLE_PATH}" + iso(last) + ".json");
      todayId = today && today.id != null ? today.id : null;
    } catch (e) { probe.errors.push(e.message); }
    if (todayId != null) {
      try { await get("${STATE_PATH}?puzzle_ids=" + todayId); }
      catch (e) { if (SIGNED_OUT.includes(e.status)) throw e; probe.errors.push(e.message); }
    }
    log("syncing back to " + since + ". Keep this tab open.");
    let looked = 0;
    for (let t = Date.parse(since); t <= last; t += DAY) {
      const date = iso(t);
      try {
        const puzzle = await get("${PUZZLE_PATH}" + date + ".json");
        if (puzzle && puzzle.id != null) byId.set(String(puzzle.id), date);
        else probe.noId++;
      } catch (e) {
        probe.errors.push(e.message);
      }
      if (++looked % 30 === 0) log(looked + " days looked up, now at " + date);
      await pause();
    }
    const ids = [...byId.keys()], days = [];
    for (let i = 0; i < ids.length; i += ${STATE_BATCH}) {
      for (const s of await states(ids.slice(i, i + ${STATE_BATCH}))) {
        // One odd entry is noted and skipped, never allowed to lose the rest of the sync.
        try {
          if (!s || typeof s !== "object") continue;
          const game = (typeof s.game_data === "string" ? JSON.parse(s.game_data) : s.game_data) || {};
          for (const k of Object.keys(game)) if (!probe.keys.includes(k)) probe.keys.push(k);
          if (!probe.schemas.includes(s.schema_version)) probe.schemas.push(s.schema_version);
          const found = Array.isArray(game.answers) ? game.answers.filter((w) => typeof w === "string") : [];
          const date = byId.get(String(s.puzzle_id));
          // Keep only the date and the words. Nothing else about the account.
          if (date && found.length) days.push({ date, found });
        } catch (e) {
          probe.errors.push("state for " + (s && s.puzzle_id) + ": " + e.message);
        }
      }
      log("read saved words for " + Math.min(i + ${STATE_BATCH}, ids.length) + " of " + ids.length + " days");
      await pause();
    }
    days.sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!days.length) console.warn("spellagon: no saved words came back for these dates.");
    const file = { version: 1, exportedAt: new Date().toISOString(), since, days, probe };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
    a.download = "spellagon.json";
    a.click();
    const words = days.reduce((n, d) => n + d.found.length, 0);
    log("done. " + days.length + " days, " + words + " words. Check your downloads.");
  } catch (e) {
    if (SIGNED_OUT.includes(e.status)) console.error("spellagon: you are signed out. Sign in to nytimes.com, reload, and run this again.");
    else console.error("spellagon: the sync stopped. " + e.message);
  }
})();`;
}
