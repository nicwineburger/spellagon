<script lang="ts">
import { isPangram } from "../game/puzzle";

let {
  found,
  open = false,
  wide = false,
  ontoggle,
}: {
  /** Words in the order they were found. */
  found: string[];
  open?: boolean;
  /** Desktop layout: always open, no toggle. */
  wide?: boolean;
  ontoggle: () => void;
} = $props();

const sorted = $derived([...found].sort());
const recent = $derived([...found].reverse());
const heading = $derived(`You have found ${found.length} ${found.length === 1 ? "word" : "words"}`);
const expanded = $derived(wide || open);
</script>

<div class="wordlist" class:wide class:open={expanded}>
  {#if !wide}
    <button type="button" class="summary" aria-expanded={open} onclick={ontoggle}>
      {#if open}
        <span class="heading">{heading}</span>
      {:else if found.length === 0}
        <span class="placeholder">Your words ...</span>
      {:else}
        <span class="recent">
          {#each recent as word (word)}<span class:pangram={isPangram(word)}>{word}</span>{/each}
        </span>
      {/if}
      <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      <span class="sr-only">{open ? "Hide" : "Show"} your words</span>
    </button>
  {/if}
  {#if expanded}
    <div class="panel">
      {#if wide}<h2 class="heading">{heading}</h2>{/if}
      <ul class="words" aria-label="Found words">
        {#each sorted as word (word)}<li class:pangram={isPangram(word)}>{word}</li>{/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .wordlist {
    position: relative;
    border: 1px solid var(--rule);
    border-radius: var(--radius-box);
    background: var(--bg);
  }

  .summary {
    display: flex;
    align-items: center;
    width: 100%;
    height: 46px;
    padding: 0 var(--space-3);
    border: 0;
    background: none;
    text-align: left;
    cursor: pointer;
  }

  .placeholder {
    flex: 1;
    color: var(--ink-muted);
  }

  .recent {
    display: flex;
    flex: 1;
    gap: 0.6em;
    overflow: hidden;
    white-space: nowrap;
  }

  .recent span,
  .words li {
    text-transform: capitalize;
  }

  .pangram {
    font-weight: 700;
  }

  .chevron {
    flex: none;
    width: 24px;
    height: 24px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
    transition: transform 200ms;
  }

  .open .chevron {
    transform: rotate(180deg);
  }

  .heading {
    flex: 1;
    font-size: var(--text-md);
    font-weight: 400;
  }

  .wordlist:not(.wide).open {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
  }

  .panel {
    flex: 1;
    overflow-y: auto;
    padding: 0 var(--space-4) var(--space-4);
  }

  .wide .panel {
    height: 100%;
    padding: var(--space-5) var(--space-5) var(--space-4);
  }

  .wide .heading {
    display: block;
    margin-bottom: var(--space-3);
  }

  .words {
    column-count: 2;
    column-gap: var(--space-5);
  }

  .wide .words {
    column-count: 3;
  }

  .words li {
    padding: 6px 0;
    border-bottom: 1px solid var(--rule);
    break-inside: avoid;
  }
</style>
