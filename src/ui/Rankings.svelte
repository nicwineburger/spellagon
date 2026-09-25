<script lang="ts">
import type { Rank } from "../game/puzzle";

let { ranks, points }: { ranks: Rank[]; points: number } = $props();

const queen = $derived(ranks.at(-1));
const genius = $derived(ranks.at(-2));
const reachedQueen = $derived(queen !== undefined && points >= queen.min);
// Queen Bee stays hidden until it is reached. Highest rank first.
const shown = $derived((reachedQueen ? ranks : ranks.slice(0, -1)).toReversed());
const current = $derived(shown.find((rank) => points >= rank.min));
const next = $derived(ranks.find((rank) => rank.min > points));

/** The line under the current rank: how far to the next one and to Genius, or a congratulation. */
const subline = $derived.by(() => {
  if (reachedQueen) return "Congrats! You’ve found every single word!";
  if (!genius || !next) return "";
  if (points >= genius.min) return "Congrats! Can you spell even more words?";
  const toNext = next.min - points;
  if (next.name === "Genius") return `${toNext} ${toNext === 1 ? "point" : "points"} to Genius`;
  return `${toNext} ${toNext === 1 ? "point" : "points"} to next rank, ${genius.min - points} to Genius`;
});
</script>

<p>Ranks are based on a percentage of possible points in a puzzle.</p>
<table>
  <thead>
    <tr>
      <th scope="col"><span class="sr-only">Progress</span></th>
      <th scope="col">Rank</th>
      <th scope="col" class="num">Minimum score</th>
    </tr>
  </thead>
  <tbody>
    {#each shown as rank, i (rank.name)}
      {@const isCurrent = rank === current}
      <tr class:current={isCurrent}>
        <td class="track" class:first={i === 0} class:end={i === shown.length - 1}>
          {#if isCurrent}
            <span class="marker" class:square={rank.name === "Genius" || rank.name === "Queen Bee"}>{points}</span>
          {:else}
            <span class="dot" class:done={points >= rank.min} class:square={i === shown.length - 1}></span>
          {/if}
        </td>
        <td class="name">
          {rank.name}
          {#if isCurrent && subline}<span class="sub">{subline}</span>{/if}
        </td>
        <td class="num">{rank.min}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  table {
    width: 100%;
    margin-top: var(--space-4);
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }

  th {
    padding-bottom: var(--space-2);
    font-size: var(--text-sm);
    font-weight: 700;
    text-align: left;
  }

  td {
    height: 44px;
    padding: 0;
  }

  .num {
    text-align: right;
  }

  .track {
    position: relative;
    width: 40px;
  }

  .track::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 14px;
    width: 1px;
    background: var(--progress);
    content: "";
  }

  .track.first::before {
    top: 50%;
  }

  .track.end::before {
    bottom: 50%;
  }

  .dot,
  .marker {
    position: absolute;
    top: 50%;
    left: 14px;
    transform: translate(-50%, -50%);
  }

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--progress);
  }

  .dot.done {
    background: var(--bee);
  }

  .marker {
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
  }

  .square {
    border-radius: 0;
  }

  .current .name {
    font-weight: 700;
  }

  .sub {
    display: block;
    color: var(--ink-muted);
    font-size: var(--text-sm);
    font-weight: 400;
  }
</style>
