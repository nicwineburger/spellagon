<script lang="ts">
import { onMount } from "svelte";
import { puzzleDate } from "./game/date";
import { addDays, EPOCH, judge, MAX_LENGTH, praise, puzzleFor, rankFor, ranksFor, score } from "./game/puzzle";
import { loadProgress, mergeProgress, type Progress, saveProgress } from "./game/store";
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

type Dialog = Panel | "genius" | "queen";
type Message = { id: number; text: string; kind: "error" | "praise" | "pangram"; points?: number };

const startDate = puzzleDate();
let date = $state(startDate);
const puzzle = $derived(puzzleFor(date));
const yesterdayDate = $derived(addDays(date, -1));
const yesterday = $derived(yesterdayDate < EPOCH ? null : puzzleFor(yesterdayDate));
let progress = $state<Progress>(loadProgress(startDate));
const points = $derived(progress.found.reduce((sum, word) => sum + score(word), 0));
const ranks = $derived(ranksFor(puzzle.maxScore));
const rank = $derived(rankFor(points, puzzle.maxScore));

let playing = $state(false);
let outer = $state<string[]>(puzzleFor(startDate).outer);
let input = $state("");
let message = $state<Message | null>(null);
let shaking = $state(false);
let shuffling = $state(false);
let listOpen = $state(false);
let modal = $state<Dialog | null>(null);
/** The on-screen button a held key lights up: Enter, Delete or Shuffle. */
let activeKey = $state<"enter" | "delete" | "shuffle" | null>(null);
let messageId = 0;
let wide = $state(false);

let messageTimer: ReturnType<typeof setTimeout> | undefined;
let clearTimer: ReturnType<typeof setTimeout> | undefined;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
/** A Genius or Queen Bee notice waiting for the open dialog to close. */
let pendingNotice: "genius" | "queen" | null = null;

const letters = $derived(new Set([puzzle.center, ...puzzle.outer]));

/** Errors stay 1100ms and clear the word with them. Praise stays 900ms. */
const ERROR_MS = 1100;
const PRAISE_MS = 900;

function show(next: Omit<Message, "id">) {
  clearTimeout(messageTimer);
  messageId += 1;
  message = { ...next, id: messageId };
  messageTimer = setTimeout(() => (message = null), next.kind === "error" ? ERROR_MS : PRAISE_MS);
}

function fail(text: string) {
  shaking = true;
  show({ text, kind: "error" });
  clearTimer = setTimeout(() => {
    clearTimer = undefined;
    shaking = false;
    input = "";
  }, ERROR_MS);
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
  input += letter;
  if (input.length > MAX_LENGTH) fail("Too long");
}

function erase() {
  settle();
  input = input.slice(0, -1);
}

function shuffle() {
  if (shuffling) return;
  shuffling = true;
  // The outer letters fade out over 300ms, swap, and fade back in over 300ms.
  setTimeout(() => {
    let next = outer;
    while (next.join("") === outer.join("")) next = [...outer].sort(() => Math.random() - 0.5);
    outer = next;
    setTimeout(() => (shuffling = false), 10);
  }, 300);
}

function submit() {
  if (clearTimer !== undefined || input === "") return;
  const verdict = judge(input, puzzle, progress.found);
  if (!verdict.ok) {
    fail(verdict.message);
    return;
  }
  input = "";
  const before = rank.name;
  // Another tab may have found words since this one loaded. Merge before saving so neither loses any.
  progress = mergeProgress(loadProgress(date), {
    ...$state.snapshot(progress),
    found: [...progress.found, verdict.word],
  });
  show({ text: praise(verdict.word), kind: verdict.pangram ? "pangram" : "praise", points: verdict.points });
  const after = rankFor(points, puzzle.maxScore).name;
  if (after !== before && after === "Queen Bee" && !progress.queen) notice("queen");
  else if (after !== before && after === "Genius" && !progress.genius) notice("genius");
  saveProgress(date, $state.snapshot(progress));
}

/** Shows a rank notice once the praise has had its moment, or after the open dialog closes. */
function notice(kind: "genius" | "queen") {
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    if (modal) pendingNotice = kind;
    else openNotice(kind);
  }, 1100);
}

function openNotice(kind: "genius" | "queen") {
  modal = kind;
  progress[kind] = true;
  saveProgress(date, $state.snapshot(progress));
}

function closeModal() {
  modal = null;
  if (pendingNotice) {
    const kind = pendingNotice;
    pendingNotice = null;
    openNotice(kind);
  }
}

const KEY_BUTTONS: Record<string, "enter" | "delete" | "shuffle"> = {
  Enter: "enter",
  Backspace: "delete",
  Delete: "delete",
  " ": "shuffle",
};

function keydown(event: KeyboardEvent) {
  if (!playing || modal || event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key;
  // A focused control outside the hive keeps Enter and Space, so the keyboard can reach every button.
  const target = event.target as HTMLElement | null;
  const control = target?.closest("button, a, input, [tabindex]");
  if (control && !control.closest(".hive") && (key === "Enter" || key === " ")) return;
  const button = KEY_BUTTONS[key];
  if (button) {
    event.preventDefault();
    activeKey = button;
    if (button === "enter" && !event.repeat) submit();
    else if (button === "delete") erase();
    else if (button === "shuffle" && !event.repeat) shuffle();
  } else if (/^[a-zA-Z]$/.test(key)) {
    event.preventDefault();
    // Typing means playing: let go of any clicked button so the next Enter submits the word.
    if (control && !control.closest(".hive")) (control as HTMLElement).blur();
    type(key.toLowerCase());
  }
}

function keyup(event: KeyboardEvent) {
  if (KEY_BUTTONS[event.key] === activeKey) activeKey = null;
}

/** Holding Delete repeats, first after 350ms and then every 90ms. */
let repeatTimer: ReturnType<typeof setTimeout> | undefined;
function holdDelete(event: PointerEvent) {
  event.preventDefault();
  erase();
  const again = (ms: number) => {
    repeatTimer = setTimeout(() => {
      erase();
      again(90);
    }, ms);
  };
  again(350);
}
function releaseDelete() {
  clearTimeout(repeatTimer);
}

/** A tab left open past 3 a.m. Eastern moves on to the new puzzle. */
function refresh() {
  const today = puzzleDate();
  if (today === date) {
    progress = mergeProgress(progress, loadProgress(date));
    return;
  }
  clearTimeout(noticeTimer);
  pendingNotice = null;
  date = today;
  progress = loadProgress(today);
  outer = puzzleFor(today).outer;
  input = "";
  message = null;
  if (modal === "genius" || modal === "queen") modal = null;
}

/** Another tab saved progress for this puzzle. */
function storage(event: StorageEvent) {
  if (event.key === `spellagon:${date}`) progress = mergeProgress(progress, loadProgress(date));
}

onMount(() => {
  const query = window.matchMedia("(min-width: 768px)");
  const update = () => (wide = query.matches);
  update();
  query.addEventListener("change", update);
  const tick = setInterval(refresh, 60_000);
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener("storage", storage);
    query.removeEventListener("change", update);
    clearInterval(tick);
    document.removeEventListener("visibilitychange", refresh);
  };
});

/** A long word shrinks to fit the input's width instead of running off the screen. */
let inputBox = $state<HTMLElement>();
let inputContent = $state<HTMLElement>();
$effect(() => {
  void input;
  if (!inputBox || !inputContent) return;
  inputContent.style.fontSize = "";
  const room = inputBox.clientWidth - 8;
  const needed = inputContent.scrollWidth;
  if (needed > room) {
    const base = Number.parseFloat(getComputedStyle(inputContent).fontSize);
    inputContent.style.fontSize = `${Math.floor((base * room) / needed)}px`;
  }
});
const chars = $derived(
  [...input].map((c) => ({ c, kind: c === puzzle.center ? "center" : letters.has(c) ? "ok" : "bad" })),
);
</script>

<svelte:window onkeydown={keydown} onkeyup={keyup} onblur={() => (activeKey = null)} onpointerup={releaseDelete} />

{#if !playing}
  <Splash {date} count={progress.found.length} onplay={() => (playing = true)} />
{:else}
  <Toolbar inert={modal !== null} {date} onopen={(panel) => (modal = panel)} />
  <main class="game" class:wide inert={modal !== null}>
    <section class="status">
      <ProgressBar {ranks} {points} onopen={() => (modal = "rankings")} />
      <WordList found={progress.found} open={listOpen} {wide} ontoggle={() => (listOpen = !listOpen)} />
    </section>

    <section class="controls" class:faded={listOpen && !wide} aria-label="Hive">
      <div class="box">
        <div class="input-wrap">
          <div class="toast" aria-live="polite">
            {#if message}
              {#key message.id}
                <div class="message {message.kind}">
                  {message.text}{#if message.points}<span class="points">+{message.points}</span>{/if}
                </div>
              {/key}
            {/if}
          </div>
          <div class="input" class:shake={shaking} bind:this={inputBox} aria-label="Your word" role="textbox" aria-readonly="true">
            <span class="content" class:placeholder={input === "" && wide} bind:this={inputContent}>
              {#each chars as ch, i (i)}<span class={ch.kind}>{ch.c}</span>{/each}
            </span><span class="caret" class:typed={input !== ""} aria-hidden="true"></span>
          </div>
        </div>

        <Hive center={puzzle.center} {outer} hidden={shuffling} onletter={type} />

        <div class="actions">
          <button
            type="button"
            class="pill"
            class:active={activeKey === "delete"}
            onpointerdown={holdDelete}
            onpointerleave={releaseDelete}
            onclick={(event) => event.detail === 0 && erase()}>Delete</button
          >
          <button
            type="button"
            class="pill round"
            class:active={activeKey === "shuffle"}
            aria-label="Shuffle"
            onpointerdown={(event) => event.preventDefault()}
            onclick={shuffle}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"
              ><path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9" /><path d="M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2" /></svg
            >
          </button>
          <button
            type="button"
            class="pill"
            class:active={activeKey === "enter"}
            onpointerdown={(event) => event.preventDefault()}
            onclick={submit}>Enter</button
          >
        </div>
      </div>
    </section>
  </main>

  {#if modal === "help"}
    <Modal title="How to Play" onclose={closeModal}><HowToPlay /></Modal>
  {:else if modal === "rankings"}
    <Modal title="Rankings" onclose={closeModal}><Rankings {ranks} {points} /></Modal>
  {:else if modal === "hints"}
    <Modal title="Hints" onclose={closeModal}><Hints {puzzle} found={progress.found} /></Modal>
  {:else if modal === "yesterday"}
    <Modal title="Yesterday’s Answers" onclose={closeModal}>
      {#if yesterday}
        <Yesterday puzzle={yesterday} found={loadProgress(yesterday.date).found} />
      {:else}
        <p>There was no puzzle yesterday. This is the first one.</p>
      {/if}
    </Modal>
  {:else if modal === "genius"}
    <Modal title="Genius" onclose={closeModal}>
      <p class="celebrate">
        You found <em>{progress.found.length} {progress.found.length === 1 ? "word" : "words"}</em> worth
        <em>{points} points</em>.
      </p>
      <button type="button" class="pill solid" onclick={closeModal}>Keep playing</button>
    </Modal>
  {:else if modal === "queen"}
    <Modal title="Queen Bee" onclose={closeModal}>
      <p class="celebrate">
        You found everything! All <em>{puzzle.answers.length} words</em> worth <em>{points} points</em>.
      </p>
      <button type="button" class="pill solid" onclick={closeModal}>Keep playing</button>
    </Modal>
  {/if}
{/if}

<style>
  .game {
    display: flex;
    flex-direction: column;
    max-width: 1080px;
    min-height: calc(100dvh - var(--toolbar));
    margin: 0 auto;
  }

  .status {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    margin: 0 12px;
  }

  .controls {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    transition: opacity 150ms;
  }

  .controls.faded {
    opacity: 0;
  }

  .box {
    width: 80vw;
    max-width: 290px;
  }

  .wide {
    flex-direction: row-reverse;
    align-items: stretch;
  }

  .wide .status {
    width: 50%;
    margin: 24px 12px;
  }

  .wide .status :global(.wordlist) {
    flex: 1;
    max-height: 600px;
  }

  .input-wrap {
    position: relative;
  }

  .toast {
    position: absolute;
    top: -40px;
    right: 0;
    left: 0;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .message {
    position: relative;
    min-width: 65px;
    padding: 8px 14px;
    border: 1px solid var(--rule);
    border-radius: var(--radius-toast);
    background: var(--bg);
    font-size: 0.875em;
    text-align: center;
    animation: pop 780ms cubic-bezier(0.375, 0.25, 0.315, 0.89) forwards;
  }

  .message.error {
    border-color: var(--toast);
    background: var(--toast);
    color: var(--toast-ink);
    animation: fade-show 1100ms both;
  }

  .message.pangram {
    border-color: var(--bee);
    background: var(--bee);
    color: var(--bee-ink);
    font-weight: 700;
  }

  .points {
    position: absolute;
    right: -36px;
    bottom: 8px;
    font-weight: 700;
    animation: float-up 790ms ease-out forwards;
  }

  .input {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 1.25em;
    font-size: var(--text-input);
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .content {
    display: inline-block;
  }

  /* Generated content, so the placeholder is never read as part of the word. */
  .placeholder::before {
    content: "Type or click";
    color: var(--placeholder);
    font-size: 0.5em;
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
    vertical-align: middle;
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
    height: 1.25em;
    background: var(--bee);
    animation: blink 1s step-end infinite;
  }

  .caret.typed {
    margin-left: 4px;
  }

  .shake {
    animation: shake 0.7s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  .actions {
    display: flex;
    justify-content: center;
  }

  .actions .pill {
    margin: 0 8px;
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

  @media (max-width: 370px) {
    .input {
      font-size: 1.6em;
    }
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }

  @keyframes shake {
    20%,
    60% {
      transform: translateX(-1px);
    }
    40%,
    80% {
      transform: translateX(2px);
    }
  }

  @keyframes pop {
    0% {
      opacity: 0;
      transform: translateY(0);
    }
    20% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(-10px);
    }
  }

  @keyframes fade-show {
    0% {
      opacity: 0;
    }
    20%,
    70% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  @keyframes float-up {
    0% {
      opacity: 0;
      bottom: 8px;
    }
    50%,
    60% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      bottom: 23px;
    }
  }
</style>
