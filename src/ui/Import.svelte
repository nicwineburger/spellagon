<script lang="ts">
import { untrack } from "svelte";
import { puzzleDate } from "../game/date";
import { applyImport, type ImportResult, parseImport } from "../game/importer";
import { addDays, FIRST_DATE } from "../game/puzzle";
import { ensure, puzzleOn, unloaded } from "../game/source.svelte";
import { NYT_ORIGIN } from "../nyt/endpoints";
import { buildSnippet } from "../nyt/snippet";

let { onback, onimported }: { onback: () => void; onimported: () => void } = $props();

const LAST_IMPORT = "spellagon:lastImport";
const today = puzzleDate();

const clamp = (date: string) => (date < FIRST_DATE ? FIRST_DATE : date > today ? today : date);

/** A returning player needs only recent days, with two weeks of overlap for late finds. Otherwise a year. */
function defaultSince(): string {
  try {
    const last = localStorage.getItem(LAST_IMPORT);
    if (last && /^\d{4}-\d{2}-\d{2}$/.test(last)) return clamp(addDays(last, -14));
  } catch {
    // Storage blocked: fall back to a year.
  }
  return clamp(addDays(today, -365));
}

let since = $state(untrack(defaultSince));
let copied = $state(false);
let dragging = $state(false);
let busy = $state(false);
let error = $state("");
let result = $state<ImportResult | null>(null);
let input: HTMLInputElement | undefined = $state();
let heading: HTMLHeadingElement | undefined = $state();
$effect(() => heading?.focus());

const valid = $derived(/^\d{4}-\d{2}-\d{2}$/.test(since) && since >= FIRST_DATE && since <= today);
const snippet = $derived(valid ? buildSnippet(since) : "");
// About a third of a second per day for the lookup and its pause, and as much again per batch of 20.
const minutes = $derived.by(() => {
  if (!valid) return 0;
  const days = (Date.parse(today) - Date.parse(since)) / 86_400_000 + 1;
  return Math.max(1, Math.round((days * 0.35 + (days / 20) * 0.35) / 60));
});

async function copy() {
  try {
    await navigator.clipboard.writeText(snippet);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  } catch {
    error = "Copying was blocked. Select the code and copy it by hand.";
  }
}

async function read(file: File | undefined) {
  if (!file) return;
  error = "";
  result = null;
  busy = true;
  try {
    const days = parseImport(JSON.parse(await file.text()));
    // Every month the file touches must be loaded, so each day is matched to the original's puzzle.
    const dates = days.map((d) => d.date);
    await ensure(...dates);
    // A month that failed to load is not a missing puzzle. Stop, so no day is wrongly left out.
    if (unloaded(...dates).length > 0) {
      throw new Error("Some puzzles could not be loaded. Check your connection and add the file again.");
    }
    result = applyImport(days, puzzleOn, today);
    // Remember only a day that was really applied, so the next sync never skips past one that was not.
    if (result.latest) {
      try {
        localStorage.setItem(LAST_IMPORT, result.latest);
      } catch {
        // Storage blocked: the next import just starts a year back.
      }
    }
    onimported();
  } catch (e) {
    error =
      e instanceof SyntaxError
        ? "That file is not JSON. Choose the spellagon.json from your downloads."
        : String((e as Error).message);
  } finally {
    busy = false;
    // Picking the same file again should import it again.
    if (input) input.value = "";
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  dragging = false;
  void read(event.dataTransfer?.files[0]);
}

const plural = (n: number, word: string) => `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;
const skippedNote = $derived(
  result && result.skipped > 0
    ? ` ${plural(result.skipped, "day")} had no puzzle here yet and ${result.skipped === 1 ? "was" : "were"} left out.`
    : "",
);
</script>

<header class="toolbar">
  <button type="button" class="back" aria-label="Back" onclick={onback}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3.8L6.8 12l8.2 8.2" /></svg>
  </button>
  <h1 tabindex="-1" bind:this={heading}>Import Your Progress</h1>
</header>

<main class="import">
  <p class="lead">
    Bring the words you found on nytimes.com into Spellagon. The sync runs in your own browser on nytimes.com and saves a
    file to your computer. It never reads your password or session, and it sends nothing to Spellagon.
  </p>

  <ol>
    <li>
      <h2>Sign In</h2>
      <p>
        On a computer, open <a href="{NYT_ORIGIN}/puzzles/spelling-bee" target="_blank" rel="noopener noreferrer"
          >nytimes.com/puzzles/spelling-bee</a
        > and sign in.
      </p>
    </li>
    <li>
      <h2>Open the Console</h2>
      <p>
        In Chrome, press Option Command J on a Mac or Control Shift J on Windows. The first time, Chrome asks you to
        type “allow pasting”.
      </p>
    </li>
    <li>
      <h2>Paste the Sync Code</h2>
      <label>
        Sync back to
        <input type="date" bind:value={since} min={FIRST_DATE} max={today} />
      </label>
      <p class="note">
        {#if valid}This takes about {plural(minutes, "minute")}. Keep the tab open; the console shows progress.{:else}Pick a
          date from May 9, 2018 to today.{/if}
      </p>
      <pre>{snippet}</pre>
      <button type="button" class="pill solid" onclick={copy} disabled={!snippet}>{copied ? "Copied" : "Copy Sync Code"}</button>
    </li>
    <li>
      <h2>Add the File</h2>
      <div
        class="drop"
        class:dragging
        role="group"
        aria-label="File drop area"
        ondragover={(e) => {
          e.preventDefault();
          dragging = true;
        }}
        ondragleave={() => (dragging = false)}
        ondrop={onDrop}
      >
        <p>Drop spellagon.json here.</p>
        <button type="button" class="pill" disabled={busy} onclick={() => input?.click()}>Choose File</button>
        <input
          bind:this={input}
          type="file"
          accept="application/json,.json"
          hidden
          onchange={() => read(input?.files?.[0])}
        />
      </div>
      <div class="outcome" aria-live="polite">
        {#if busy}
          <p>Importing…</p>
        {:else if error}
          <p role="alert">{error}</p>
        {:else if result}
          <p>
            Added {plural(result.words, "word")} across {plural(result.days, "day")}.{skippedNote}
          </p>
          <button type="button" class="pill" onclick={onback}>Back to the Game</button>
        {/if}
      </div>
    </li>
  </ol>
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

  h1:focus {
    outline: none;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
  }

  .import {
    max-width: 560px;
    margin: 0 auto;
    padding: var(--space-5) var(--space-4) var(--space-7);
    line-height: 1.5;
  }

  ol {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    margin-top: var(--space-5);
    padding: 0;
    list-style: none;
    counter-reset: step;
  }

  li {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding-top: var(--space-5);
    border-top: 1px solid var(--rule);
    counter-increment: step;
  }

  h2 {
    font-size: var(--text-md);
    font-weight: 700;
  }

  h2::before {
    content: counter(step) ". ";
  }

  label {
    font-size: var(--text-sm);
  }

  input[type="date"] {
    margin-left: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--rule);
    border-radius: var(--radius-toast);
    background: var(--bg);
    color: var(--ink);
    font: inherit;
  }

  .note {
    color: var(--ink-muted);
    font-size: var(--text-sm);
  }

  pre {
    max-height: 160px;
    margin: 0;
    padding: var(--space-3);
    overflow: auto;
    border-radius: var(--radius-toast);
    background: var(--cell);
    font-size: var(--text-xs);
    white-space: pre-wrap;
    word-break: break-all;
  }

  .pill {
    align-self: flex-start;
  }

  .pill:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-6) var(--space-4);
    border: 1px dashed var(--ink-muted);
    border-radius: var(--radius-box);
  }

  .drop .pill {
    align-self: center;
  }

  .drop.dragging {
    border-color: var(--ink);
    background: var(--pressed);
  }

  .outcome {
    min-height: 1.5em;
  }

  .outcome .pill {
    margin-top: var(--space-3);
  }
</style>
