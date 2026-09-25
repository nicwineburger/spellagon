<script lang="ts">
import { longDate } from "../game/date";
import { isPangram, type Puzzle } from "../game/puzzle";

let { puzzle, found }: { puzzle: Puzzle; found: string[] } = $props();

const letters = $derived([puzzle.center, ...puzzle.outer]);
</script>

<p class="date">{longDate(puzzle.date)}</p>
<p class="letters" aria-label="Letters, center first">
  {#each letters as letter, i (letter)}<span class:center={i === 0}>{letter}</span>{/each}
</p>
<ul class="answers">
  {#each puzzle.answers as word (word)}
    <li class:pangram={isPangram(word)}>
      {word}{#if found.includes(word)}<span class="found" aria-label="found"> &#10003;</span>{/if}
    </li>
  {/each}
</ul>
<p class="note">Pangrams are in bold. A check marks a word you found.</p>

<style>
  .date {
    color: var(--ink-muted);
  }

  .letters {
    display: flex;
    gap: 0.5em;
    margin: var(--space-3) 0 var(--space-4);
    font-size: var(--text-lg);
    font-weight: 700;
    text-transform: uppercase;
  }

  .letters .center {
    padding: 0 0.3em;
    border-radius: 3px;
    background: var(--bee);
    color: var(--bee-ink);
  }

  .answers {
    column-width: 9em;
    column-gap: var(--space-5);
  }

  li {
    padding: 4px 0;
    border-bottom: 1px solid var(--rule);
    text-transform: capitalize;
    break-inside: avoid;
  }

  .pangram {
    font-weight: 700;
  }

  .found {
    color: var(--ink-muted);
  }

  .note {
    margin-top: var(--space-4);
    color: var(--ink-muted);
    font-size: var(--text-sm);
  }
</style>
