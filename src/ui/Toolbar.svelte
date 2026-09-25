<script lang="ts" module>
export type Panel = "yesterday" | "hints" | "help";
</script>

<script lang="ts">
  import { longDate } from "../game/date";

  let { date, onopen }: { date: string; onopen: (panel: Panel) => void } = $props();
</script>

<header class="toolbar">
  <div class="title">
    <h1>Spellagon</h1>
    <span class="date">{longDate(date)}</span>
  </div>
  <nav aria-label="Game">
    <button type="button" onclick={() => onopen("yesterday")}>
      <svg viewBox="0 0 24 24" aria-hidden="true"
        ><rect x="4" y="5" width="16" height="15" rx="1" /><path d="M4 10h16M8 3v4M16 3v4" /></svg
      >
      <span class="label">Yesterday's Answers</span>
    </button>
    <button type="button" onclick={() => onopen("hints")}>
      <svg viewBox="0 0 24 24" aria-hidden="true"
        ><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg
      >
      <span class="label">Hints</span>
    </button>
    <button type="button" onclick={() => onopen("help")}>
      <svg viewBox="0 0 24 24" aria-hidden="true"
        ><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7" /><circle
          cx="12"
          cy="17"
          r="0.6"
        /></svg
      >
      <span class="label">How to Play</span>
    </button>
  </nav>
</header>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--toolbar);
    padding: 0 var(--space-4);
    border-bottom: 1px solid var(--rule);
  }

  .title {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    min-width: 0;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1;
  }

  .date {
    font-family: var(--font-display);
    font-size: 1.375rem;
    white-space: nowrap;
  }

  nav {
    display: flex;
    gap: var(--space-2);
  }

  button {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 44px;
    height: 44px;
    padding: 0 var(--space-2);
    border: 0;
    background: none;
    font-size: var(--text-sm);
    cursor: pointer;
  }

  button:hover .label {
    text-decoration: underline;
  }

  svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  @media (max-width: 767px) {
    .title {
      flex-direction: column;
      gap: 2px;
    }

    h1 {
      font-size: 1.375rem;
    }

    .date {
      font-size: var(--text-sm);
    }

    .label {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    button {
      justify-content: center;
      padding: 0;
    }
  }
</style>
