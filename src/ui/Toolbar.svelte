<script lang="ts" module>
export type Panel = "yesterday" | "hints" | "help" | "rankings" | "archive" | "import";
</script>

<script lang="ts">
  import { longDate } from "../game/date";

  let {
    date,
    past = false,
    inert = false,
    onback,
    onopen,
  }: { date: string; past?: boolean; inert?: boolean; onback: () => void; onopen: (panel: Panel) => void } = $props();

  const SHORT = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
  const NUMERIC = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "numeric", day: "numeric", year: "2-digit" });
  const shortDate = $derived(SHORT.format(new Date(`${date}T00:00:00Z`)));
  const numericDate = $derived(NUMERIC.format(new Date(`${date}T00:00:00Z`)));

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
  <button type="button" class="back" aria-label="Back" onclick={onback}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3.8L6.8 12l8.2 8.2" /></svg>
  </button>
  {#if past}<span class="past" aria-hidden="true"
      ><span class="wide-date">{shortDate}</span><span class="narrow-date">{numericDate}</span></span
    >{/if}
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
        More<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 3.5h10L6 9z" /></svg>
      </button>
      <ul id="more-menu" class="menu" hidden={!menuOpen}>
        <li><button type="button" onclick={() => choose("help")}>How to Play</button></li>
        <li><button type="button" onclick={() => choose("rankings")}>Rankings</button></li>
        <li><button type="button" onclick={() => choose("archive")}>Past Puzzles</button></li>
        <li><button type="button" onclick={() => choose("import")}>Import Progress</button></li>
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

  .back {
    display: flex;
    flex: none;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    margin-left: -7px;
    padding: 0;
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

  /* A past puzzle names its date beside the back arrow on a phone. Desktop shows the full date in the title. */
  .past {
    display: none;
    min-width: 0;
    font-weight: 600;
    white-space: nowrap;
  }

  .narrow-date {
    display: none;
  }

  .title {
    flex: 1;
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
    margin-left: 9px;
    fill: var(--ink);
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
      padding: 0 0 0 var(--space-3);
    }

    /* Phones show only the back arrow on the left, as the original does. The name stays for screen readers. */
    .title {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    nav {
      margin-left: auto;
    }

    .past {
      display: block;
      font-size: var(--text-sm);
    }

    .short {
      display: inline;
    }

    .long {
      display: none;
    }

    .tool {
      padding: 0 11px;
      font-size: var(--text-sm);
    }
  }

  /* Below 360px a past date shortens to 5/20/18 so the toolbar still fits. */
  @media (max-width: 359px) {
    .wide-date {
      display: none;
    }

    .narrow-date {
      display: inline;
    }
  }
</style>
