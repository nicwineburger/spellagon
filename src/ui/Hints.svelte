<script lang="ts">
import { hintGrid, isPerfectPangram, twoLetterList } from "../game/hints";
import type { Puzzle } from "../game/puzzle";

let { puzzle, found }: { puzzle: Puzzle; found: string[] } = $props();

const left = $derived(puzzle.answers.filter((word) => !found.includes(word)));
const full = $derived(hintGrid(puzzle.answers));
const grid = $derived(hintGrid(left));
const pairs = $derived(twoLetterList(left));
const letters = $derived([puzzle.center, ...[...puzzle.outer].sort()]);
const perfect = $derived(puzzle.pangrams.filter(isPerfectPangram).length);
const bingo = $derived(full.rows.length === 7);
const count = (letter: string, length: number) => {
  const row = grid.rows.find((r) => r.letter === letter);
  return row?.counts[grid.lengths.indexOf(length)] ?? 0;
};
const rowTotal = (letter: string) => grid.rows.find((r) => r.letter === letter)?.total ?? 0;
const lengthTotal = (length: number) => grid.totals[grid.lengths.indexOf(length)] ?? 0;
</script>

<p class="letters" aria-label="Letters, center first">
  {#each letters as letter, i (letter)}<span class:center={i === 0}>{letter}</span>{/each}
</p>
<p class="counts">
  Words: {puzzle.answers.length}, Points: {puzzle.maxScore}, Pangrams: {puzzle.pangrams.length}{#if perfect > 0}&nbsp;({perfect}
    Perfect){/if}{#if bingo}, Bingo{/if}
</p>
<p class="note">Counts show the words you have left to find. The center letter is in bold.</p>

<div class="scroll">
  <table>
    <thead>
      <tr>
        <th scope="col"><span class="sr-only">First letter</span></th>
        {#each full.lengths as length (length)}<th scope="col">{length}</th>{/each}
        <th scope="col">&Sigma;</th>
      </tr>
    </thead>
    <tbody>
      {#each full.rows as row (row.letter)}
        <tr>
          <th scope="row">{row.letter}:</th>
          {#each full.lengths as length (length)}<td>{count(row.letter, length) || "-"}</td>{/each}
          <td class="sum">{rowTotal(row.letter)}</td>
        </tr>
      {/each}
      <tr class="totals">
        <th scope="row">&Sigma;:</th>
        {#each full.lengths as length (length)}<td>{lengthTotal(length)}</td>{/each}
        <td class="sum">{grid.total}</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>Two letter list</h3>
{#if pairs.length === 0}
  <p>You found them all.</p>
{:else}
  <ul class="pairs">
    {#each pairs as pair (pair.start)}<li>{pair.start.toUpperCase()}-{pair.count}</li>{/each}
  </ul>
{/if}

<style>
  .letters {
    display: flex;
    gap: 0.5em;
    font-size: var(--text-lg);
    text-transform: uppercase;
  }

  .letters .center {
    font-weight: 700;
  }

  .counts {
    margin-top: var(--space-2);
    font-weight: 600;
  }

  .note {
    margin: var(--space-1) 0 var(--space-4);
    color: var(--ink-muted);
    font-size: var(--text-sm);
  }

  .scroll {
    overflow-x: auto;
  }

  table {
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }

  th,
  td {
    min-width: 2.5em;
    padding: var(--space-1) var(--space-2);
    text-align: right;
  }

  thead th,
  .totals {
    font-weight: 700;
  }

  tbody th {
    text-align: left;
    text-transform: uppercase;
  }

  .totals th,
  .totals td {
    border-top: 1px solid var(--rule);
  }

  .sum {
    font-weight: 700;
  }

  h3 {
    margin: var(--space-5) 0 var(--space-2);
    font-size: var(--text-md);
  }

  .pairs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-4);
    font-variant-numeric: tabular-nums;
  }
</style>
