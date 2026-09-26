// Fetches the original's daily puzzles into public/puzzles/YYYY-MM.json, one entry per day:
// "<center><six outer letters> <answer> <answer> ...". Only missing days are fetched, oldest first,
// through today's puzzle date (3 a.m. Eastern). Run by the daily `puzzles` workflow; safe to rerun.
// Usage: node scripts/fetch-nyt.mjs [--days N | --from YYYY-MM-DD] [--max N]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const FIRST = "2018-05-09";
const DIR = process.env.PUZZLES_DIR
  ? new URL(`file://${process.env.PUZZLES_DIR.replace(/\/?$/, "/")}`)
  : new URL("../public/puzzles/", import.meta.url);
// PUZZLES_ENDPOINT points the script at a test server, with {date} standing for the day.
const ENDPOINT = (date) =>
  (process.env.PUZZLES_ENDPOINT ?? "https://www.nytimes.com/svc/spelling-bee/v1/{date}.json").replace("{date}", date);
const PAUSE_MS = 600;

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const max = Number(arg("--max") ?? Number.POSITIVE_INFINITY);

/** Today's puzzle date: the Eastern calendar day, turning over at 3 a.m. */
function puzzleDate(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  return Number(parts.hour) < 3 ? addDays(today, -1) : today;
}
const addDays = (date, days) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Turns one response into an entry, or explains why it cannot. */
function toEntry(data) {
  const center = data?.center_letter;
  const outer = data?.outer_letters;
  // The endpoint lists pangrams apart from the other answers, so the full answer list is both together.
  const pangrams = Array.isArray(data?.pangrams) ? data.pangrams : [];
  const answers = Array.isArray(data?.answers) ? [...new Set([...pangrams, ...data.answers])] : undefined;
  if (typeof center !== "string" || !/^[a-z]$/.test(center)) return { error: "bad center letter" };
  if (typeof outer !== "string" || !/^[a-z]{6}$/.test(outer)) return { error: "bad outer letters" };
  const letters = center + outer;
  if (new Set(letters).size !== 7) return { error: "repeated letters" };
  if (!Array.isArray(answers) || answers.length === 0) return { error: "no answers" };
  const allowed = new Set(letters);
  const fits = (w) => /^[a-z]{4,}$/.test(w) && w.includes(center) && [...w].every((c) => allowed.has(c));
  const all = answers.map((w) => String(w).toLowerCase());
  // A word the game could never accept is left out and reported. The day stays playable without it.
  const words = all.filter(fits);
  const dropped = all.filter((w) => !fits(w));
  if (!words.some((w) => new Set(w).size === 7)) return { error: "no pangram" };
  return { entry: [letters, ...words].join(" "), dropped };
}

async function fetchDay(date) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(ENDPOINT(date), {
        headers: { accept: "application/json", "user-agent": "spellagon-puzzles (github.com/nicwineburger/spellagon)" },
        signal: AbortSignal.timeout(15_000),
      });
      if (response.status === 404) return { missing: true };
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return toEntry(await response.json());
    } catch (error) {
      if (attempt === 3) return { error: String(error) };
      await sleep(attempt * 5_000);
    }
  }
  return { error: "unreachable" };
}

mkdirSync(DIR, { recursive: true });
const months = new Map();
for (const file of readdirSync(DIR).filter((f) => /^\d{4}-\d{2}\.json$/.test(f))) {
  months.set(file.slice(0, 7), JSON.parse(readFileSync(new URL(file, DIR), "utf8")));
}
const have = (date) => Boolean(months.get(date.slice(0, 7))?.[date]);

const last = puzzleDate();
// --days N limits a run to the last N days, as the scheduled runs do. A manual run with no flags backfills
// everything. Today comes first, the one day that matters most, then the rest oldest first.
const days = arg("--days");
const from = arg("--from") ?? (days ? addDays(last, -Number(days)) : FIRST);
const wanted = [];
for (let date = from; date < last; date = addDays(date, 1)) if (!have(date)) wanted.push(date);
if (!have(last)) wanted.unshift(last);

let added = 0;
const problems = [];
const changed = new Set();

/** Writes every changed month and the index, so a run cut short keeps what it fetched. */
function save() {
  for (const month of changed) {
    const entries = months.get(month);
    const sorted = Object.fromEntries(
      Object.keys(entries)
        .sort()
        .map((d) => [d, entries[d]]),
    );
    writeFileSync(new URL(`${month}.json`, DIR), `${JSON.stringify(sorted).replaceAll('","', '",\n"')}\n`);
  }
  changed.clear();
  // The index lists the months that have a file, so the site never asks for one that does not exist.
  const listed = [...months.keys()].filter((m) => Object.keys(months.get(m) ?? {}).length > 0).sort();
  writeFileSync(new URL("index.json", DIR), `${JSON.stringify({ months: listed })}\n`);
}
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    save();
    console.log(`Stopped by ${signal} after adding ${added} days. Saved what arrived.`);
    process.exit(1);
  });
}

for (const [i, date] of wanted.slice(0, max).entries()) {
  const result = await fetchDay(date);
  if (result.entry) {
    if (result.dropped?.length) problems.push(`${date}: left out ${result.dropped.join(", ")}`);
    const month = date.slice(0, 7);
    months.set(month, { ...(months.get(month) ?? {}), [date]: result.entry });
    changed.add(month);
    added += 1;
  } else {
    problems.push(`${date}: ${result.missing ? "not published" : result.error}`);
  }
  if (i % 50 === 49) save();
  await sleep(PAUSE_MS);
}
save();

console.log(`Added ${added} of ${Math.min(wanted.length, max)} missing days from ${from} through ${last}.`);
if (problems.length > 0) console.log(`Skipped:\n  ${problems.join("\n  ")}`);
// Today's puzzle missing is worth a failed run, so someone looks. Older gaps are only reported.
if (!have(last)) {
  console.error(`Today's puzzle (${last}) is still missing.`);
  process.exitCode = 1;
}
