<script lang="ts">
let {
  center,
  outer,
  hidden = false,
  onletter,
}: {
  center: string;
  outer: string[];
  /** True while the outer letters fade for a shuffle. */
  hidden?: boolean;
  onletter: (letter: string) => void;
} = $props();

// Flat-top hexagon, 120 wide and 104 tall.
const HEX = "0,51.96 30,0 90,0 120,51.96 90,103.92 30,103.92";
const letters = $derived([center, ...outer]);

/** The cell held down by a pointer. Only its fill shrinks, as in the original. */
let held = $state<number | null>(null);
</script>

<svelte:window onpointerup={() => (held = null)} onpointercancel={() => (held = null)} />

<div class="hive" role="group" aria-label="Letters">
  {#each letters as letter, i (i)}
    <button
      type="button"
      class="cell"
      class:center={i === 0}
      class:held={held === i}
      data-letter={letter}
      aria-label={i === 0 ? `${letter.toUpperCase()}, center letter` : letter.toUpperCase()}
      onpointerdown={(event) => {
        event.preventDefault();
        held = i;
        onletter(letter);
      }}
      onkeydown={(event) => {
        if (event.key === "Enter" || event.key === " ") event.stopPropagation();
      }}
      onclick={(event) => {
        // Pointer taps are handled on pointerdown. A click with no pointer comes from the keyboard.
        if (event.detail === 0) onletter(letter);
      }}
    >
      <svg viewBox="0 0 120 103.92" aria-hidden="true">
        <polygon points={HEX} />
        <text x="50%" y="50%" dy="0.35em" class:hidden={hidden && i > 0}>{letter}</text>
      </svg>
    </button>
  {/each}
</div>

<style>
  .hive {
    position: relative;
    width: 90%;
    margin: 25px auto;
    padding-bottom: 103.923%;
  }

  .cell {
    position: absolute;
    top: calc(100% / 3);
    left: 30%;
    width: 40%;
    height: calc(100% / 3);
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
  }

  .cell:focus-visible {
    outline: none;
  }

  .cell:focus-visible polygon {
    stroke: var(--ink);
    stroke-width: 3;
  }

  .cell:nth-child(2) {
    transform: translate(0, -100%);
  }
  .cell:nth-child(3) {
    transform: translate(75%, -50%);
  }
  .cell:nth-child(4) {
    transform: translate(75%, 50%);
  }
  .cell:nth-child(5) {
    transform: translate(0, 100%);
  }
  .cell:nth-child(6) {
    transform: translate(-75%, 50%);
  }
  .cell:nth-child(7) {
    transform: translate(-75%, -50%);
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  polygon {
    fill: var(--cell);
    stroke: var(--bg);
    stroke-width: 7.5px;
    transition: transform 100ms;
    transform-origin: center;
    transform-box: fill-box;
  }

  .center polygon {
    fill: var(--bee);
  }

  .held polygon,
  .cell:active polygon {
    transform: scale(0.86);
  }

  text {
    fill: var(--cell-ink);
    font-family: var(--font-ui);
    font-size: 1.875em;
    font-weight: 700;
    text-anchor: middle;
    text-transform: uppercase;
    transition: opacity 300ms;
    pointer-events: none;
  }

  .center text {
    fill: var(--bee-ink);
  }

  text.hidden {
    opacity: 0;
  }

  @media (max-width: 375px) {
    .hive {
      width: 70%;
      margin: 4vh auto;
      padding-bottom: 80.829%;
    }

    text {
      font-size: 2.5em;
    }
  }
</style>
