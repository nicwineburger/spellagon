<script lang="ts" module>
export type Panel = "yesterday" | "hints" | "help" | "rankings";
</script>

<script lang="ts">
  import { longDate } from "../game/date";

  let { date, inert = false, onopen }: { date: string; inert?: boolean; onopen: (panel: Panel) => void } = $props();

  let menuOpen = $state(false);
  let more: HTMLElement;
  let moreButton: HTMLButtonElement;

  function choose(panel: Panel) {
    // Focus More first, so the dialog hands focus back to it when it closes.
    moreButton.focus();
    menuOpen = false;
    onopen(panel);
  }

  // A dialog opening from anywhere closes the menu.
  $effect(() => {
    if (inert) menuOpen = false;
  });

  function focusout(event: FocusEvent) {
    if (menuOpen && !more.contains(event.relatedTarget as Node | null)) menuOpen = false;
  }

  function keydown(event: KeyboardEvent) {
    if (!menuOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      menuOpen = false;
      moreButton.focus();
    } else if (/^[a-zA-Z]$/.test(event.key) || event.key === "Backspace") {
      // Playing closes the menu.
      menuOpen = false;
    }
  }

  function pointerdown(event: PointerEvent) {
    if (menuOpen && !more.contains(event.target as Node)) menuOpen = false;
  }
</script>

<svelte:window onkeydown={keydown} onpointerdown={pointerdown} />

<header class="toolbar" {inert}>
  <div class="title">
    <h1>Spellagon</h1>
    <span class="date">{longDate(date)}</span>
  </div>
  <nav aria-label="Game">
    <button type="button" class="tool" onclick={() => onopen("yesterday")}>
      <span class="short">Yesterday</span><span class="long">Yesterday’s Answers</span>
    </button>
    <button type="button" class="tool" onclick={() => onopen("hints")}>Hints</button>
    <div class="more" bind:this={more} onfocusout={focusout}>
      <button
        type="button"
        class="tool"
        aria-expanded={menuOpen}
        aria-controls="more-menu"
        bind:this={moreButton}
        onclick={() => (menuOpen = !menuOpen)}
      >
        More<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" /></svg>
      </button>
      <ul id="more-menu" class="menu" hidden={!menuOpen}>
        <li><button type="button" onclick={() => choose("help")}>How to Play</button></li>
        <li><button type="button" onclick={() => choose("rankings")}>Rankings</button></li>
      </ul>
    </div>
  </nav>
</header>

<style>
  .toolbar {
    position: relative;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
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
    align-items: center;
  }

  button {
    border: 0;
    background: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .tool {
    display: flex;
    align-items: center;
    height: 44px;
    padding: 0 var(--space-3);
    font-size: var(--text-md);
    font-weight: 500;
    white-space: nowrap;
  }


  .short {
    display: none;
  }

  .tool svg {
    width: 12px;
    height: 12px;
    margin-left: 3px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.5;
    transition: transform 0.25s;
  }

  .tool[aria-expanded="true"] svg {
    transform: rotate(180deg);
  }

  .more {
    position: relative;
  }

  .menu {
    position: absolute;
    top: 100%;
    right: 0;
    min-width: 160px;
    padding: var(--space-1) 0;
    border: 1px solid var(--rule);
    border-radius: var(--radius-modal);
    background: var(--bg);
    box-shadow: var(--shadow);
  }

  .menu[hidden] {
    display: none;
  }

  .menu button {
    display: block;
    width: 100%;
    min-height: 44px;
    padding: 0 var(--space-4);
    font-size: var(--text-md);
    text-align: left;
    white-space: nowrap;
  }

  @media (hover: hover) {
    .tool:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .menu button:hover {
      background: var(--pressed);
    }
  }

  @media (max-width: 767px) {
    .toolbar {
      padding: 0 var(--space-2) 0 var(--space-4);
    }

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

    .short {
      display: inline;
    }

    .long {
      display: none;
    }

    .tool {
      padding: 0 var(--space-2);
      font-size: var(--text-sm);
    }
  }

  @media (max-width: 359px) {
    .toolbar {
      padding-left: var(--space-3);
    }

    .date {
      font-size: var(--text-xs);
    }

    .tool {
      padding: 0 6px;
    }
  }
</style>
