<script lang="ts">
import { onMount } from "svelte";
import { puzzleDate } from "./game/date";
import { addDays, judge, MAX_LENGTH, praise, puzzleFor, rankFor, ranksFor, score } from "./game/puzzle";
import { loadProgress, type Progress, saveProgress } from "./game/store";
import Hints from "./ui/Hints.svelte";
import Hive from "./ui/Hive.svelte";
import HowToPlay from "./ui/HowToPlay.svelte";
import Modal from "./ui/Modal.svelte";
import ProgressBar from "./ui/Progress.svelte";
import Rankings from "./ui/Rankings.svelte";
import Splash from "./ui/Splash.svelte";
import Toolbar, { type Panel } from "./ui/Toolbar.svelte";
import WordList from "./ui/WordList.svelte";
import Yesterday from "./ui/Yesterday.svelte";

type Dialog = Panel | "rankings" | "genius" | "queen";
type Message = { text: string; kind: "error" | "praise" | "pangram"; points?: number };

let date = $state(puzzleDate());
const puzzle = $derived(puzzleFor(date));
const yesterday = $derived(puzzleFor(addDays(date, -1)));
let progress = $state<Progress>(loadProgress(puzzleDate()));
const points = $derived(progress.found.reduce((sum, word) => sum + score(word), 0));
const ranks = $derived(ranksFor(puzzle.maxScore));
const rank = $derived(rankFor(points, puzzle.maxScore));

let playing = $state(false);
let outer = $state<string[]>(puzzleFor(puzzleDate()).outer);
let input = $state("");
let message = $state<Message | null>(null);
let shaking = $state(false);
let shuffling = $state(false);
let listOpen = $state(false);
let modal = $state<Dialog | null>(null);
let pressed = $state<{ letter: string; n: number } | null>(null);
let wide = $state(false);

let messageTimer: ReturnType<typeof setTimeout> | undefined;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

const letters = $derived(new Set([puzzle.center, ...puzzle.outer]));

function show(next: Message, ms = 1000) {
  clearTimeout(messageTimer);
  message = next;
  messageTimer = setTimeout(() => (message = null), ms);
}

/** Ends a pending error at once, so typing after a miss starts a fresh word. */
function settle() {
  if (clearTimer === undefined) return;
  clearTimeout(clearTimer);
  clearTimer = undefined;
  shaking = false;
  input = "";
  message = null;
}

function type(letter: string) {
  settle();
  if (input.length >= MAX_LENGTH + 1) return;
  input += letter;
}

function erase() {
  settle();
  input = input.slice(0, -1);
}

function shuffle() {
  if (shuffling) return;
  shuffling = true;
  setTimeout(() => {
    let next = outer;
    while (next.join("") === outer.join("")) next = [...outer].sort(() => Math.random() - 0.5);
    outer = next;
    shuffling = false;
  }, 200);
}

function submit() {
  if (clearTimer !== undefined || input === "") return;
  const verdict = judge(input, puzzle, progress.found);
  if (!verdict.ok) {
    shaking = true;
    show({ text: verdict.message, kind: "error" });
    clearTimer = setTimeout(() => {
      clearTimer = undefined;
      shaking = false;
      input = "";
    }, 1000);
    return;
  }
  input = "";
  const before = rank.name;
  progress.found = [...progress.found, verdict.word];
  show({ text: praise(verdict.word), kind: verdict.pangram ? "pangram" : "praise", points: verdict.points });
  const after = rankFor(points, puzzle.maxScore).name;
  if (after !== before && after === "Queen Bee" && !progress.queen) {
    progress.queen = true;
    setTimeout(() => (modal = "queen"), 1100);
  } else if (after !== before && after === "Genius" && !progress.genius) {
    progress.genius = true;
    setTimeout(() => (modal = "genius"), 1100);
  }
  saveProgress(date, $state.snapshot(progress));
}

function keydown(event: KeyboardEvent) {
  if (!playing || modal || event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key;
  if (key === "Enter") {
    event.preventDefault();
    submit();
  } else if (key === "Backspace") {
    event.preventDefault();
    erase();
  } else if (key === " ") {
    event.preventDefault();
    shuffle();
  } else if (/^[a-zA-Z]$/.test(key)) {
    event.preventDefault();
    const letter = key.toLowerCase();
    type(letter);
    pressed = { letter, n: (pressed?.n ?? 0) + 1 };
  }
}

/** A tab left open past 3 a.m. Eastern moves on to the new puzzle. */
function refresh() {
  const today = puzzleDate();
  if (today === date) return;
  date = today;
  progress = loadProgress(today);
  outer = puzzleFor(today).outer;
  input = "";
  message = null;
}

onMount(() => {
  const query = window.matchMedia("(min-width: 768px)");
  const update = () => (wide = query.matches);
  update();
  query.addEventListener("change", update);
  const tick = setInterval(refresh, 60_000);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    query.removeEventListener("change", update);
    clearInterval(tick);
    document.removeEventListener("visibilitychange", refresh);
  };
});

const chars = $derived(
  [...input].map((c) => ({ c, kind: c === puzzle.center ? "center" : letters.has(c) ? "ok" : "bad" })),
);
</script>

<svelte:window onkeydown={keydown} />

{#if !playing}
  <Splash {date} rank={rank.name} count={progress.found.length} onplay={() => (playing = true)} />
{:else}
  <Toolbar {date} onopen={(panel) => (modal = panel)} />
  <main class="game" class:wide>
    <section class="status">
      <ProgressBar {ranks} {points} onopen={() => (modal = "rankings")} />
      <WordList found={progress.found} open={listOpen} {wide} ontoggle={() => (listOpen = !listOpen)} />
    </section>

    <section class="play" aria-label="Hive">
      <div class="message-area" aria-live="polite">
        {#if message}
          <div class="message {message.kind}">
            <span class="text">{message.text}</span>
            {#if message.points}<span class="points">+{message.points}</span>{/if}
          </div>
        {/if}
      </div>

      <div class="input" class:shake={shaking} class:long={input.length > 12} aria-label="Your word" role="textbox" aria-readonly="true">
        <span class="content">
          {#each chars as ch, i (i)}<span class={ch.kind}>{ch.c}</span>{/each}
        </span><span class="caret" aria-hidden="true"></span>
      </div>

      <div class="hive-wrap">
        <Hive center={puzzle.center} {outer} hidden={shuffling} {pressed} onletter={type} />
      </div>

      <div class="actions">
        <button type="button" class="pill" onclick={erase}>Delete</button>
        <button type="button" class="pill round" aria-label="Shuffle" onclick={shuffle}>
          <svg viewBox="0 0 24 24" aria-hidden="true"
            ><path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9" /><path d="M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2" /></svg
          >
        </button>
        <button type="button" class="pill" onclick={submit}>Enter</button>
      </div>
    </section>
  </main>

  {#if modal === "help"}
    <Modal title="How to Play" onclose={() => (modal = null)}><HowToPlay /></Modal>
  {:else if modal === "rankings"}
    <Modal title="Rankings" onclose={() => (modal = null)}><Rankings {ranks} {points} /></Modal>
  {:else if modal === "hints"}
    <Modal title="Hints" onclose={() => (modal = null)}><Hints {puzzle} found={progress.found} /></Modal>
  {:else if modal === "yesterday"}
    <Modal title="Yesterday's Answers" onclose={() => (modal = null)}>
      <Yesterday puzzle={yesterday} found={loadProgress(yesterday.date).found} />
    </Modal>
  {:else if modal === "genius"}
    <Modal title="Genius" onclose={() => (modal = null)}>
      <p class="celebrate">You reached the top rank with {points} points. Can you find every word?</p>
      <button type="button" class="pill solid" onclick={() => (modal = null)}>Keep Playing</button>
    </Modal>
  {:else if modal === "queen"}
    <Modal title="Queen Bee" onclose={() => (modal = null)}>
      <p class="celebrate">You found all {puzzle.answers.length} words. Come back tomorrow for a new puzzle.</p>
      <button type="button" class="pill solid" onclick={() => (modal = null)}>Done</button>
    </Modal>
  {/if}
{/if}

<style>
  .game {
    display: flex;
    flex-direction: column;
    max-width: 1080px;
    margin: 0 auto;
    padding: var(--space-3) var(--space-4) var(--space-5);
  }

  .status {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .game:not(.wide) .status {
    z-index: 3;
  }

  .game:not(.wide) .status :global(.wordlist.open) {
    position: absolute;
    top: 56px;
    right: 0;
    left: 0;
    height: calc(100dvh - var(--toolbar) - 100px);
  }

  .play {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 360px;
    margin: 0 auto;
  }

  .wide {
    flex-direction: row-reverse;
    align-items: flex-start;
    gap: var(--space-7);
    padding-top: var(--space-6);
  }

  .wide .status {
    flex: 1;
    min-width: 0;
  }

  .wide .status :global(.wordlist) {
    height: 60vh;
    max-height: 580px;
  }

  .wide .play {
    flex: 1;
    max-width: 440px;
    margin: 0;
  }

  .message-area {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    margin-top: var(--space-3);
  }

  .message {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    animation: appear 150ms ease-out;
  }

  .message .text {
    padding: 0 var(--space-3);
    border: 1px solid var(--rule);
    border-radius: var(--radius-box);
    line-height: 34px;
    background: var(--bg);
  }

  .message.error .text {
    border-color: var(--toast);
    background: var(--toast);
    color: var(--toast-ink);
  }

  .message.pangram .text {
    border-color: var(--bee);
    background: var(--bee);
    color: var(--bee-ink);
    font-weight: 700;
  }

  .points {
    font-weight: 700;
  }

  .input {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 50px;
    font-size: var(--text-input);
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .input.long {
    font-size: 1.4rem;
  }

  .input .center {
    color: var(--bee);
  }

  .input .bad {
    color: var(--invalid);
  }

  .caret {
    display: inline-block;
    width: 2px;
    height: 1.1em;
    margin-left: 1px;
    background: var(--bee);
    animation: blink 1s step-end infinite;
  }

  .shake {
    animation: shake 300ms linear;
  }

  .hive-wrap {
    width: 100%;
    max-width: 300px;
    margin: var(--space-4) auto var(--space-5);
  }

  .wide .hive-wrap {
    max-width: 340px;
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: var(--space-3);
  }

  .round {
    width: 3em;
    min-width: 3em;
    padding: 0;
    border-radius: 50%;
  }

  .round svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .celebrate {
    margin: var(--space-2) 0 var(--space-5);
    font-size: var(--text-lg);
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20%,
    60% {
      transform: translateX(-8px);
    }
    40%,
    80% {
      transform: translateX(8px);
    }
  }

  @keyframes appear {
    from {
      opacity: 0;
    }
  }
</style>
