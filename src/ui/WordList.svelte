<script lang="ts">
import { isPangram, titleCase } from "../game/puzzle";

let {
  found,
  latest = null,
  open = false,
  wide = false,
  ontoggle,
}: {
  /** Words in the order they were found. */
  found: string[];
  /** The word just found in this tab, which slides in. Loaded or merged words do not. */
  latest?: string | null;
  open?: boolean;
  /** Desktop layout: always open, no toggle. */
  wide?: boolean;
  ontoggle: () => void;
} = $props();

/** One list row: 22px line, 4px padding above and below, 1px rule and 7px gap. */
const ROW = 38;
/** Space between columns, in px. Pages sit one gap apart. */
const GAP = 24;

const sorted = $derived([...found].sort());
const recent = $derived([...found].reverse());
const heading = $derived(`You have found ${found.length} ${found.length === 1 ? "word" : "words"}`);

const fresh = $derived(latest ?? undefined);

let broad = $state(false);
$effect(() => {
  const query = window.matchMedia("(min-width: 992px)");
  const update = () => (broad = query.matches);
  update();
  query.addEventListener("change", update);
  return () => query.removeEventListener("change", update);
});

let list = $state<HTMLUListElement>();
let height = $state(0);
let page = $state(0);
$effect(() => {
  if (!list) return;
  const observer = new ResizeObserver(() => {
    if (list) height = list.clientHeight;
  });
  observer.observe(list);
  return () => observer.disconnect();
});

const cols = $derived(wide && broad ? 3 : 2);
const rows = $derived(Math.max(1, Math.floor(height / ROW)));
const perPage = $derived(rows * cols);
const pages = $derived(Math.max(1, Math.ceil(sorted.length / perPage)));
const columnWidth = $derived(`calc((100% - ${(cols - 1) * GAP}px) / ${cols})`);

function onscroll() {
  if (!list) return;
  page = Math.round(list.scrollLeft / (list.clientWidth + GAP));
}

function go(to: number) {
  if (!list) return;
  const target = Math.min(pages - 1, Math.max(0, to));
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  list.scrollTo({ left: target * (list.clientWidth + GAP), behavior: smooth ? "smooth" : "auto" });
}
</script>

<div class="wordlist" class:wide class:open={wide || open}>
  <div class="frame">
    {#if !wide}
      <button type="button" class="summary" aria-expanded={open} onclick={ontoggle}>
        <span class="layers">
          <span class="layer" class:shown={open} aria-hidden={!open}>{heading}</span>
          <span class="layer" class:shown={!open} aria-hidden={open}>
            {#if found.length === 0}
              <span class="placeholder">Your words …</span>
            {:else}
              <span class="recent">
                {#each recent as word (word)}<span class:pangram={isPangram(word)} class:fresh={word === fresh}
                    >{titleCase(word)}</span
                  >{/each}
              </span>
            {/if}
          </span>
        </span>
        <svg class="chevron" viewBox="0 0 22 22" aria-hidden="true"><path d="M4 8l7 7 7-7" /></svg>
        <span class="sr-only">{open ? "Hide" : "Show"} your words</span>
      </button>
    {/if}
    <div class="panel">
      <div class="inner">
        {#if wide}<h2 class="heading">{heading}</h2>{/if}
        <ul
          class="words"
          aria-label="Found words"
          bind:this={list}
          {onscroll}
          style:grid-template-columns="repeat({pages * cols}, {columnWidth})"
          style:grid-template-rows="repeat({rows}, auto)"
        >
          {#each sorted as word, i (word)}
            <li class:pangram={isPangram(word)} class:start={i % perPage === 0}>{titleCase(word)}</li>
          {/each}
        </ul>
        <!-- The pager always holds its space, so the rows per page never depend on whether it showed before. -->
        <div class="pager" class:idle={pages <= 1} aria-hidden={pages <= 1}>
            <button type="button" class="arrow" aria-label="Previous page" disabled={page === 0} onclick={() => go(page - 1)}>
              <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M11.5 3l-6 6 6 6" /></svg>
            </button>
            <span class="dots" aria-label="Page {page + 1} of {pages}" role="img">
              {#each { length: pages }, i (i)}<span class="dot" class:active={i === page}></span>{/each}
            </span>
            <button
              type="button"
              class="arrow"
              aria-label="Next page"
              disabled={page >= pages - 1}
              onclick={() => go(page + 1)}
            >
              <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M6.5 3l6 6-6 6" /></svg>
            </button>
          </div>
      </div>
    </div>
  </div>
</div>

<style>
  .wordlist {
    position: relative;
  }

  .frame {
    border: 1px solid var(--rule);
    border-radius: var(--radius-box);
    background: var(--bg);
  }

  /* On a phone the list holds its bar's place and opens as a drawer over the hive. */
  .wordlist:not(.wide) {
    height: 47px;
  }

  .wordlist:not(.wide) .frame {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
  }

  .summary {
    display: flex;
    align-items: center;
    width: 100%;
    height: 45px;
    padding: 0 12px 0 18px;
    border: 0;
    background: none;
    text-align: left;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .layers {
    position: relative;
    flex: 1;
    min-width: 0;
    height: 45px;
  }

  .layer {
    position: absolute;
    inset: 0;
    line-height: 45px;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 270ms,
      visibility 0s 270ms;
  }

  .layer.shown {
    opacity: 1;
    visibility: visible;
    transition: opacity 270ms;
  }

  .placeholder {
    color: var(--placeholder);
  }

  /* Newest first. A word that does not fit wraps onto a hidden line instead of being cut. */
  .recent {
    display: block;
    height: 45px;
    overflow: hidden;
  }

  .recent span {
    float: left;
    padding-right: 7px;
  }

  .recent .fresh {
    overflow: hidden;
    white-space: nowrap;
    animation: squishin 700ms;
  }

  .chevron {
    flex: none;
    width: 22px;
    height: 22px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
    transition: transform 0.25s;
  }

  .open .chevron {
    transform: rotate(180deg);
  }

  .panel {
    overflow: hidden;
  }

  .wordlist:not(.wide) .panel {
    max-height: 0;
    visibility: hidden;
    transition:
      max-height 200ms,
      visibility 0s 200ms;
  }

  .wordlist:not(.wide).open .panel {
    max-height: calc(68vh - 47px);
    visibility: visible;
    transition: max-height 200ms;
  }

  .inner {
    display: flex;
    flex-direction: column;
    height: calc(68vh - 47px);
    padding: 0 16px 12px;
  }

  .wide .frame,
  .wide .panel,
  .wide .inner {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .wide .frame,
  .wide .panel {
    flex: 1;
  }

  .wide .inner {
    padding: 25px;
  }

  .heading {
    flex: none;
    height: 35px;
    font-size: var(--text-md);
    font-weight: 400;
  }

  /* Alphabetical, top to bottom and column by column. Full pages scroll sideways. */
  .words {
    display: grid;
    flex: 1;
    grid-auto-flow: column;
    align-content: start;
    column-gap: 24px;
    min-height: 0;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .words::-webkit-scrollbar {
    display: none;
  }

  .words li {
    min-width: 0;
    margin-bottom: 7px;
    padding: 4px 0;
    overflow: hidden;
    border-bottom: 1px solid var(--rule);
    font-weight: 500;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .words li.start {
    scroll-snap-align: start;
  }

  .pangram,
  .words li.pangram {
    font-weight: 700;
  }

  .pager.idle {
    visibility: hidden;
  }

  .pager {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  .arrow:disabled {
    cursor: default;
    opacity: 0.3;
  }

  .arrow svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.5;
  }

  .dots {
    display: flex;
    gap: 8px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--page-dot);
  }

  .dot.active {
    background: var(--ink);
  }

  @keyframes squishin {
    from {
      max-width: 0;
      opacity: 0;
    }
    to {
      max-width: 200px;
      opacity: 1;
    }
  }
</style>
