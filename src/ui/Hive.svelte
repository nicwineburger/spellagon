<script lang="ts">
import { untrack } from "svelte";

let {
  center,
  outer,
  hidden = false,
  pressed = null,
  onletter,
}: {
  center: string;
  outer: string[];
  /** True while the outer letters fade for a shuffle. */
  hidden?: boolean;
  /** A letter typed on the keyboard, to press its cell. `n` changes on every key. */
  pressed?: { letter: string; n: number } | null;
  onletter: (letter: string) => void;
} = $props();

// Flat-top hexagon, 120 wide and 104 tall.
const HEX = "0,51.96 30,0 90,0 120,51.96 90,103.92 30,103.92";
const letters = $derived([center, ...outer]);

let tapped = $state<number | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
function press(index: number) {
  tapped = null;
  clearTimeout(timer);
  requestAnimationFrame(() => {
    tapped = index;
    timer = setTimeout(() => (tapped = null), 120);
  });
}

$effect(() => {
  if (!pressed) return;
  // Only a new key press should press a cell, not a shuffle that reorders the letters.
  const index = untrack(() => letters.indexOf(pressed.letter));
  if (index >= 0) press(index);
});

function tap(index: number) {
  press(index);
  onletter(letters[index] ?? "");
}
</script>

<div class="hive" role="group" aria-label="Letters">
  {#each letters as letter, i (i)}
    <button
      type="button"
      class="cell"
      class:center={i === 0}
      class:pressed={tapped === i}
      data-letter={letter}
      aria-label={i === 0 ? `${letter.toUpperCase()}, center letter` : letter.toUpperCase()}
      onpointerdown={(event) => {
        event.preventDefault();
        tap(i);
      }}
      onkeydown={(event) => {
        if (event.key === "Enter" || event.key === " ") event.stopPropagation();
      }}
      onclick={(event) => {
        // Pointer taps are handled on pointerdown. A click with no pointer comes from the keyboard.
        if (event.detail === 0) tap(i);
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
    width: 100%;
    padding-bottom: 100%;
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

  .pressed polygon,
  .pressed text {
    animation: push 120ms ease-out;
  }

  @keyframes push {
    50% {
      transform: scale(0.9);
    }
  }

  text {
    fill: var(--cell-ink);
    font-family: var(--font-ui);
    font-size: 1.875em;
    font-weight: 700;
    text-anchor: middle;
    text-transform: uppercase;
    transition: opacity 200ms;
    transform-origin: center;
    transform-box: fill-box;
    pointer-events: none;
  }

  .center text {
    fill: var(--bee-ink);
  }

  text.hidden {
    opacity: 0;
  }
</style>
