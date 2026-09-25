<script lang="ts">
import type { Rank } from "../game/puzzle";

let { ranks, points, onopen }: { ranks: Rank[]; points: number; onopen: () => void } = $props();

// Queen Bee stays off the bar. It shows only once reached, in place of Genius.
const steps = $derived(ranks.slice(0, -1));
const reached = $derived(steps.reduce((last, rank, i) => (points >= rank.min ? i : last), 0));
const queen = $derived(points >= (ranks.at(-1)?.min ?? Number.POSITIVE_INFINITY));
const name = $derived(queen ? "Queen Bee" : (steps[reached]?.name ?? ""));
const final = $derived(reached === steps.length - 1);
const at = (i: number) => (i / (steps.length - 1)) * 100;

/** The name that was showing before the latest rank change, so it can slide away. */
let previous = $state<string | null>(null);
let shown = "";
let bounce = $state(false);
$effect(() => {
  const next = name;
  if (shown && next !== shown && !final) {
    previous = shown;
    bounce = true;
    const timer = setTimeout(() => {
      previous = null;
      bounce = false;
    }, 1300);
    shown = next;
    return () => clearTimeout(timer);
  }
  shown = next;
});
</script>

<button type="button" class="progress" onclick={onopen} aria-label={`Rank: ${name}, ${points} points. See rankings.`}>
  <span class="rank" aria-hidden="true">
    {#if previous}<span class="old">{previous}</span>{/if}
    <span class="now" class:bounce>
      {#each [...name] as ch, i (i)}<span style:animation-delay="{267 + i * 77}ms, {440 + i * 77}ms">{ch === " " ? " " : ch}</span>{/each}
    </span>
  </span>
  <span class="bar">
    <span class="line"></span>
    <span class="dots">
      {#each steps as step, i (step.name)}
        <span class="dot" class:done={i < reached} class:last={i === steps.length - 1} style:left="{at(i)}%"></span>
      {/each}
    </span>
    <span class="marker" class:final style:left="{at(reached)}%">{points}</span>
  </span>
</button>

<style>
  .progress {
    display: flex;
    align-items: center;
    width: 100%;
    height: 50px;
    padding: 0;
    border: 0;
    background: none;
    text-align: left;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .rank {
    position: relative;
    display: block;
    min-width: 5em;
    font-size: var(--text-md);
    font-weight: 700;
    white-space: nowrap;
  }

  .old {
    position: absolute;
    top: 0;
    left: 0;
    animation: slide-away 466ms 267ms ease-in both;
  }

  .now span {
    display: inline-block;
  }

  .bounce span {
    animation:
      slow-bounce-up 173ms ease-out both,
      slow-bounce-down 157ms ease-in forwards;
  }

  .bar {
    position: relative;
    display: block;
    flex: 1;
    height: 100%;
    margin: 0 12px 0 12px;
  }

  .line {
    position: absolute;
    top: 50%;
    right: 0;
    left: 0;
    height: 1px;
    background: var(--progress);
  }

  .dot {
    position: absolute;
    top: 50%;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--progress);
    transform: translate(-50%, -50%);
    transition: background-color 200ms 100ms;
  }

  .dot.last {
    border-radius: 0;
  }

  .dot.done {
    background: var(--bee);
  }

  .marker {
    position: absolute;
    top: 50%;
    display: flex;
    width: 1.875em;
    height: 1.875em;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--bee);
    color: var(--bee-ink);
    font-size: var(--text-xs);
    font-weight: 500;
    letter-spacing: -0.03125em;
    font-variant-numeric: tabular-nums;
    transform: translate(-50%, -50%);
    transition: left 200ms ease;
  }

  .marker.final {
    border-radius: 0;
  }

  @keyframes slide-away {
    to {
      opacity: 0;
      transform: translateY(-100%);
    }
  }

  @keyframes slow-bounce-up {
    from {
      opacity: 0;
      transform: translateY(40%);
    }
    to {
      opacity: 1;
      transform: translateY(-20%);
    }
  }

  @keyframes slow-bounce-down {
    from {
      transform: translateY(-20%);
    }
    to {
      transform: translateY(0);
    }
  }
</style>
