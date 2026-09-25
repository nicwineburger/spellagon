<script lang="ts">
import { untrack } from "svelte";
import { FIRST_DATE, puzzleFor, rankFor, ranksFor, score } from "../game/puzzle";
import { loadProgress } from "../game/store";

let {
  today,
  current,
  onpick,
  onback,
}: {
  /** Today's puzzle date. Later days have no puzzle yet. */
  today: string;
  /** The puzzle open now, whose month shows first. */
  current: string;
  onpick: (date: string) => void;
  onback: () => void;
} = $props();

const MONTHS = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
const LONG = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** The first of the month on show, as YYYY-MM-01. */
let month = $state(untrack(() => `${current.slice(0, 7)}-01`));
const firstMonth = `${FIRST_DATE.slice(0, 7)}-01`;
const lastMonth = $derived(`${today.slice(0, 7)}-01`);

function shiftMonth(by: number) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const next = new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 10);
  if (next >= firstMonth && next <= lastMonth) month = next;
}

interface Day {
  date: string;
  day: number;
  open: boolean;
  /** How full the hive is, by rank steps toward Genius, 0 to 1, or null when not started. */
  fill: number | null;
  rank: string | null;
  points: number;
  queen: boolean;
}

const days = $derived.by((): (Day | null)[] => {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const cells: (Day | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= count; d++) {
    const date = `${month.slice(0, 8)}${String(d).padStart(2, "0")}`;
    const open = date >= FIRST_DATE && date <= today;
    const found = open ? loadProgress(date).found : [];
    let fill: number | null = null;
    let rank: string | null = null;
    let points = 0;
    let queen = false;
    if (found.length > 0) {
      // Only days with progress pay for working out the puzzle.
      const puzzle = puzzleFor(date);
      points = found.filter((w) => puzzle.answers.includes(w)).reduce((sum, w) => sum + score(w), 0);
      // The hive fills a step per rank, so early ranks still show. Genius and Queen Bee fill it.
      const ranks = ranksFor(puzzle.maxScore);
      const reached = rankFor(points, puzzle.maxScore);
      const step = Math.min(ranks.indexOf(reached), ranks.length - 2);
      fill = Math.max(0.12, step / (ranks.length - 2));
      rank = reached.name;
      queen = rank === "Queen Bee";
    }
    cells.push({ date, day: d, open, fill, rank, points, queen });
  }
  return cells;
});

function label(day: Day): string {
  const when = LONG.format(new Date(`${day.date}T00:00:00Z`));
  if (!day.open) return `${when}, no puzzle`;
  if (day.rank === null) return `${when}, not started`;
  return `${when}, ${day.rank}, ${day.points} ${day.points === 1 ? "point" : "points"}`;
}

// Flat-top hexagon, 24 wide and 20.78 tall, drawn around the day's number.
const HEX = "0,10.39 6,0 18,0 24,10.39 18,20.78 6,20.78";

// Keyboard users land on the open puzzle's day, or the back arrow when that day is in another month.
let grid = $state<HTMLElement>();
let back = $state<HTMLButtonElement>();
$effect(() => {
  const target = untrack(() => grid?.querySelector<HTMLButtonElement>(".day.current") ?? back);
  target?.focus({ preventScroll: true });
});
</script>

<header class="toolbar">
  <button type="button" class="back" aria-label="Back" onclick={onback} bind:this={back}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3.8L6.8 12l8.2 8.2" /></svg>
  </button>
  <h1>Past Puzzles</h1>
</header>

<main class="archive">
  <div class="month">
    <button
      type="button"
      class="arrow"
      aria-label="Previous month"
      disabled={month <= firstMonth}
      onclick={() => shiftMonth(-1)}
    >
      <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M11.5 3l-6 6 6 6" /></svg>
    </button>
    <h2 aria-live="polite">{MONTHS.format(new Date(`${month}T00:00:00Z`))}</h2>
    <button
      type="button"
      class="arrow"
      aria-label="Next month"
      disabled={month >= lastMonth}
      onclick={() => shiftMonth(1)}
    >
      <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M6.5 3l6 6-6 6" /></svg>
    </button>
  </div>

  <div class="grid" role="group" aria-label="Days" bind:this={grid}>
    {#each WEEKDAYS as weekday, i (i)}<span class="weekday" aria-hidden="true">{weekday}</span>{/each}
    {#each days as day, i (day?.date ?? `blank-${i}`)}
      {#if day}
        <button
          type="button"
          class="day"
          class:today={day.date === today}
          class:current={day.date === current}
          disabled={!day.open}
          aria-label={label(day)}
          onclick={() => onpick(day.date)}
        >
          <svg viewBox="-1 -1 26 22.78" aria-hidden="true">
            <defs>
              <clipPath id="fill-{day.date}">
                <rect x="-1" y={20.78 * (1 - (day.fill ?? 0))} width="26" height={20.78 * (day.fill ?? 0) + 1} />
              </clipPath>
            </defs>
            <polygon class="outline" class:started={day.fill !== null} points={HEX} />
            {#if day.fill}
              <polygon class="filled" points={HEX} clip-path="url(#fill-{day.date})" />
            {/if}
          </svg>
          <span class="number" class:queen={day.queen}>{day.day}</span>
        </button>
      {:else}
        <span class="blank"></span>
      {/if}
    {/each}
  </div>

  <p class="legend">The hive fills a step with each rank. A full hive is Genius, and a bold number is Queen Bee.</p>
  {#if current !== today}
    <button type="button" class="pill today-button" onclick={() => onpick(today)}>Play Today’s Puzzle</button>
  {/if}
</main>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: var(--toolbar);
    padding: 0 var(--space-3);
    border-bottom: 1px solid var(--rule);
  }

  .back {
    display: flex;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    margin-left: -7px;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  .back svg {
    width: 24px;
    height: 24px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 2.25;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
  }

  .archive {
    max-width: 480px;
    margin: 0 auto;
    padding: var(--space-5) var(--space-4) var(--space-6);
  }

  .month {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .month h2 {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
  }

  .arrow {
    display: flex;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  .arrow:disabled {
    opacity: 0.25;
    cursor: default;
  }

  .arrow svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.75;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 6px 2px;
  }

  .weekday {
    padding-bottom: var(--space-1);
    color: var(--ink-muted);
    font-size: var(--text-xs);
    font-weight: 700;
    text-align: center;
  }

  .day {
    position: relative;
    display: grid;
    height: 52px;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--radius-toast);
    background: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .day > * {
    grid-area: 1 / 1;
  }

  .day svg {
    width: 100%;
    max-width: 44px;
    height: 40px;
    overflow: visible;
  }

  .outline {
    fill: none;
    stroke: var(--rule);
    stroke-width: 1.25;
  }

  .outline.started {
    stroke: var(--bee);
  }

  .filled {
    fill: var(--bee);
  }

  .number {
    font-size: var(--text-sm);
    font-variant-numeric: tabular-nums;
  }

  .number.queen {
    font-weight: 800;
  }

  .day:disabled {
    cursor: default;
  }

  .day:disabled .number {
    color: var(--placeholder);
  }

  .day:disabled .outline {
    stroke: transparent;
  }

  .day.today .number {
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .day.current {
    background: var(--pressed);
  }

  @media (hover: hover) {
    .day:not(:disabled):hover {
      background: var(--pressed);
    }
  }

  .legend {
    margin-top: var(--space-5);
    color: var(--ink-muted);
    font-size: var(--text-sm);
    text-align: center;
  }

  .today-button {
    display: flex;
    margin: var(--space-4) auto 0;
  }
</style>
