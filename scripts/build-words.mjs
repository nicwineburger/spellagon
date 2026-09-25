// Builds the word list and the puzzle schedule from SCOWL (via wordlist-english).
// Run with `pnpm words`. Output is committed, so the site never needs this package at runtime.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = new URL("..", import.meta.url);
const source = (dialect, tier) => require(`wordlist-english/${dialect}-words-${tier}.json`);

// SCOWL tiers: lower is more common. Answers come from the standard dictionary (tier 50).
// Pangrams, which set the letters, come from common words only, so every puzzle has a familiar anchor.
const ANSWER_TIERS = [10, 20, 35, 40, 50];
const PANGRAM_TIERS = [10, 20, 35];
const MIN_WORDS = 20;
const MAX_WORDS = 70;
const MIN_POINTS = 70;
const MAX_POINTS = 320;

const blockRules = readFileSync(new URL("scripts/blocklist.txt", root), "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));
const blocked = (word) =>
  blockRules.some((rule) => (rule.endsWith("*") ? word.startsWith(rule.slice(0, -1)) : word === rule));

/** Four or more lowercase letters, no S, at most seven distinct letters, and not blocked. */
const playable = (word) => /^[a-z]{4,}$/.test(word) && !word.includes("s") && new Set(word).size <= 7 && !blocked(word);

function collect(tiers) {
  const words = new Set();
  for (const tier of tiers) {
    for (const dialect of ["english", "american"]) {
      for (const word of source(dialect, tier)) if (playable(word)) words.add(word);
    }
  }
  return words;
}

const answers = [...collect(ANSWER_TIERS)].sort();
const common = collect(PANGRAM_TIERS);
const letterSet = (word) => [...new Set(word)].sort().join("");
const sets = [...new Set([...common].filter((word) => new Set(word).size === 7).map(letterSet))].sort();

const masks = new Map(answers.map((word) => [word, [...word].reduce((m, c) => m | (1 << (c.charCodeAt(0) - 97)), 0)]));
const score = (word) => (word.length === 4 ? 1 : word.length) + (new Set(word).size === 7 ? 7 : 0);

// A small seeded generator, so the schedule is the same on every run.
let seed = 0x5eed_b33;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const puzzles = [];
for (const set of sets) {
  const setMask = [...set].reduce((m, c) => m | (1 << (c.charCodeAt(0) - 97)), 0);
  const inSet = answers.filter((word) => (masks.get(word) & ~setMask) === 0);
  const centers = [...set].filter((center) => {
    const found = inSet.filter((word) => word.includes(center));
    const points = found.reduce((sum, word) => sum + score(word), 0);
    return found.length >= MIN_WORDS && found.length <= MAX_WORDS && points >= MIN_POINTS && points <= MAX_POINTS;
  });
  if (centers.length === 0) continue;
  const center = centers[Math.floor(random() * centers.length)];
  const outer = [...set].filter((c) => c !== center);
  for (let i = outer.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [outer[i], outer[j]] = [outer[j], outer[i]];
  }
  puzzles.push(center + outer.join(""));
}
for (let i = puzzles.length - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1));
  [puzzles[i], puzzles[j]] = [puzzles[j], puzzles[i]];
}

// Past days must never change, so an existing schedule is kept as is and new puzzles go on the end.
const scheduleFile = new URL("src/game/puzzles.txt", root);
let kept = [];
try {
  kept = readFileSync(scheduleFile, "utf8").trim().split("\n").filter(Boolean);
} catch {
  // First run: no schedule yet.
}
const used = new Set(kept.map(letterSet));
const schedule = [...kept, ...puzzles.filter((p) => !used.has(letterSet(p)))];

writeFileSync(new URL("src/game/words.txt", root), `${answers.join("\n")}\n`);
writeFileSync(scheduleFile, `${schedule.join("\n")}\n`);
console.log(`${answers.length} words, ${schedule.length} puzzles (${schedule.length - kept.length} new)`);
