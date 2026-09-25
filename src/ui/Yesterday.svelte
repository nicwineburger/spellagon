<script lang="ts">
import { longDate } from "../game/date";
import { isPangram, type Puzzle } from "../game/puzzle";
import { finalRank } from "../game/quips";

let { puzzle, found }: { puzzle: Puzzle; found: string[] } = $props();

const result = $derived(finalRank(puzzle, found));
</script>

<p class="date">{longDate(puzzle.date)}</p>
<p class="letters" aria-label="Letters, center first">
  <span class="center">{puzzle.center}</span>{puzzle.outer.join("")}
</p>
{#if result}
  <p class="rank"><em>Rank: {result.rank}.</em> {result.quip}</p>
{/if}
<ul class="answers">
  {#each puzzle.answers as word (word)}
    {@const got = found.includes(word)}
    <li class:pangram={isPangram(word)} class:found={got}>
      {word}{#if got}<span class="sr-only">, found</span>{/if}
    </li>
  {/each}
</ul>

<style>
  .date {
    color: var(--ink);
    font-weight: 600;
  }

  .letters {
    margin: var(--space-3) 0 var(--space-4);
    font-size: var(--text-lg);
    font-weight: 800;
    letter-spacing: 0.4em;
    text-transform: uppercase;
  }

  .letters .center {
    color: var(--check);
  }

  .rank {
    margin-bottom: var(--space-4);
  }

  .answers {
    column-count: 2;
    column-gap: var(--space-5);
  }

  li {
    position: relative;
    padding: 7px 0 0 24px;
    line-height: 1.5;
    text-transform: capitalize;
    break-inside: avoid;
  }

  /* The check mark: a short L turned 45 degrees. */
  li.found::before {
    position: absolute;
    top: 11px;
    left: 5px;
    width: 6px;
    height: 12px;
    border: solid var(--check);
    border-width: 0 3px 3px 0;
    transform: rotate(45deg);
    content: "";
  }

  .pangram {
    font-weight: 700;
  }

  @media (min-width: 768px) {
    .answers {
      column-count: 3;
    }
  }
</style>
