<script lang="ts">
import { longDate } from "../game/date";
import Logo from "./Logo.svelte";

let {
  date,
  ready = true,
  waiting = false,
  count,
  onplay,
  onarchive,
}: {
  date: string;
  /** False while the day's puzzle is loading. */
  ready?: boolean;
  /** True when today's puzzle has not arrived yet, just after 3 a.m. Eastern. */
  waiting?: boolean;
  count: number;
  onplay: () => void;
  onarchive: () => void;
} = $props();

const back = $derived(count > 0);
</script>

<main class="splash">
  <Logo size={72} />
  {#if waiting}
    <h1>Spellagon</h1>
    <p class="line">Today’s puzzle is on its way. Check back in a few minutes.</p>
  {:else if back}
    <h1>Welcome Back</h1>
    <p class="line">You’ve found {count} {count === 1 ? "word" : "words"}.</p>
    <button type="button" class="pill solid" disabled={!ready} onclick={onplay}>Continue</button>
  {:else}
    <h1>Spellagon</h1>
    <p class="line">How many words can you make with 7 letters?</p>
    <button type="button" class="pill solid" disabled={!ready} onclick={onplay}>Play</button>
  {/if}
  <button type="button" class="pill secondary" onclick={onarchive}>Past Puzzles</button>
  <p class="date">{longDate(date)}</p>
  <p class="fine">A fan project, not affiliated with The New York Times.</p>
</main>

<style>
  .splash {
    display: flex;
    min-height: 100dvh;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-6) var(--space-4);
    background: var(--bee);
    color: #000;
    text-align: center;
    --bg: var(--bee);
    --ink: #000;
  }

  h1 {
    margin-top: var(--space-4);
    font-family: var(--font-display);
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1.05;
  }

  .line {
    max-width: 18em;
    margin: var(--space-3) 0 var(--space-6);
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 400;
    line-height: 1.15;
  }

  .pill {
    min-width: 10em;
    border-color: #000;
    background: #000;
    color: #fff;
  }

  .pill.secondary {
    margin-top: var(--space-3);
    border-color: #000;
    background: transparent;
    color: #000;
    font-weight: 600;
  }

  .pill:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .date {
    margin-top: var(--space-5);
    font-weight: 700;
  }

  .fine {
    margin-top: var(--space-1);
    font-size: var(--text-sm);
  }
</style>
