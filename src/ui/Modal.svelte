<script lang="ts">
import type { Snippet } from "svelte";

let { title, onclose, children }: { title: string; onclose: () => void; children: Snippet } = $props();

let dialog: HTMLDivElement;
const titleId = `modal-${Math.random().toString(36).slice(2, 8)}`;

$effect(() => {
  const previous = document.activeElement as HTMLElement | null;
  dialog.focus();
  return () => previous?.focus();
});

function keydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    onclose();
  }
}
</script>

<svelte:window onkeydown={keydown} />

<div class="backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && onclose()}>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabindex="-1" bind:this={dialog}>
    <button type="button" class="close" aria-label="Close" onclick={onclose}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
    <h2 class="title" id={titleId}>{title}</h2>
    <div class="content">{@render children()}</div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: stretch;
    justify-content: center;
    background: var(--backdrop);
    animation: fade 150ms ease-out;
  }

  /* On a phone the frame fills the screen and slides up from the bottom. */
  .modal {
    position: relative;
    width: 100%;
    overflow-y: auto;
    --pad-top: 32px;
    --pad-right: 32px;
    padding: var(--pad-top) var(--pad-right) 32px 32px;
    border-radius: var(--radius-modal);
    background: var(--bg);
    box-shadow: var(--shadow);
    animation: slide-up 150ms ease-out;
  }

  .modal:focus {
    outline: none;
  }

  /* Sticky, so the close button stays in reach while a long dialog scrolls. */
  .close {
    position: sticky;
    z-index: 1;
    top: 0;
    float: right;
    margin: calc(12px - var(--pad-top)) calc(12px - var(--pad-right)) 0 0;
    display: flex;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  .close svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
  }

  .title {
    margin: 0.5em 0 0.25em;
    padding-right: 32px;
    font-family: var(--font-display);
    font-size: 1.75em;
    font-weight: 700;
    line-height: 1.1;
  }

  .content {
    line-height: 1.5;
  }

  @media (min-width: 768px) {
    .backdrop {
      align-items: center;
    }

    .modal {
      width: 540px;
      max-height: min(600px, calc(100dvh - 32px));
      --pad-top: 44px;
      --pad-right: 44px;
      padding: 44px;
      box-shadow: var(--shadow-wide);
      animation: grow 150ms ease-out;
    }

    .title {
      margin-top: 0;
      padding-right: 0;
      font-size: 2em;
    }
  }

  @media (min-width: 992px) {
    .modal {
      width: 667px;
      --pad-top: 56px;
      --pad-right: 158px;
      padding: 56px 158px 56px 56px;
    }

    .title {
      font-size: 2.125em;
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
  }

  @keyframes grow {
    from {
      transform: scale(0.9);
    }
  }
</style>
