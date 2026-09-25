<script lang="ts">
import type { Rank } from "../game/puzzle";

let { ranks, points }: { ranks: Rank[]; points: number } = $props();

const queen = $derived(ranks.at(-1));
const reachedQueen = $derived(queen !== undefined && points >= queen.min);
// Queen Bee stays hidden until it is reached.
const shown = $derived((reachedQueen ? ranks : ranks.slice(0, -1)).toReversed());
const current = $derived(shown.find((rank) => points >= rank.min)?.name);
</script>

<p>Each rank is a share of the points available in today's puzzle. Here is the score you need for each one:</p>
<ul class="ranks">
  {#each shown as rank (rank.name)}
    <li class:current={rank.name === current}>
      <span class="name">{rank.name}</span>
      <span class="min">{rank.min}</span>
    </li>
  {/each}
</ul>

<style>
  .ranks {
    margin-top: var(--space-4);
  }

  li {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--rule);
    font-variant-numeric: tabular-nums;
  }

  li.current {
    border-radius: var(--radius-box);
    border-bottom-color: transparent;
    background: var(--bee);
    color: var(--bee-ink);
    font-weight: 700;
  }
</style>
