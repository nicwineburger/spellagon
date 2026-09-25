<script lang="ts">
import type { Rank } from "../game/puzzle";

let { ranks, points, onopen }: { ranks: Rank[]; points: number; onopen: () => void } = $props();

// Queen Bee stays off the bar. It shows only once reached, in place of Genius.
const steps = $derived(ranks.slice(0, -1));
const reached = $derived(steps.reduce((last, rank, i) => (points >= rank.min ? i : last), 0));
const queen = $derived(points >= (ranks.at(-1)?.min ?? Number.POSITIVE_INFINITY));
const name = $derived(queen ? "Queen Bee" : (steps[reached]?.name ?? ""));
const fill = $derived((reached / (steps.length - 1)) * 100);
</script>

<button type="button" class="progress" onclick={onopen} aria-label={`Rank: ${name}, ${points} points. See rankings.`}>
  <h2 class="rank">{name}</h2>
  <div class="bar">
    <div class="line"><div class="filled" style:width="{fill}%"></div></div>
    <div class="dots">
      {#each steps as step, i (step.name)}
        <span
          class="dot"
          class:done={i < reached}
          class:current={i === reached}
          class:last={i === steps.length - 1}
          style:left="{(i / (steps.length - 1)) * 100}%"
        >
          {#if i === reached}<span class="score">{points}</span>{/if}
        </span>
      {/each}
    </div>
  </div>
</button>

<style>
  .progress {
    display: flex;
    align-items: center;
    width: 100%;
    height: 48px;
    padding: 0;
    border: 0;
    background: none;
    text-align: left;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .rank {
    min-width: 6.5em;
    padding-right: var(--space-3);
    font-size: var(--text-md);
    font-weight: 700;
    white-space: nowrap;
  }

  .bar {
    position: relative;
    flex: 1;
    height: 100%;
    margin: 0 var(--space-3);
  }

  .line {
    position: absolute;
    top: 50%;
    right: 0;
    left: 0;
    height: 1px;
    background: var(--rule);
  }

  .filled {
    height: 100%;
    background: var(--bee);
    transition: width 300ms;
  }

  .dot {
    position: absolute;
    top: 50%;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--rule);
    transform: translate(-50%, -50%);
  }

  .dot.last {
    border-radius: 0;
  }

  .dot.done {
    background: var(--bee);
  }

  .dot.current {
    display: flex;
    align-items: center;
    justify-content: center;
    width: auto;
    min-width: 1.875em;
    height: 1.875em;
    padding: 0 0.3em;
    border-radius: 1em;
    background: var(--bee);
    color: var(--bee-ink);
    font-size: var(--text-xs);
    font-weight: 400;
    font-variant-numeric: tabular-nums;
  }
</style>
