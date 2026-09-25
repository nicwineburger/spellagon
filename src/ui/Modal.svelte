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
    {@render children()}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--backdrop);
    animation: fade 150ms ease-out;
  }

  .modal {
    position: relative;
    width: min(100%, 600px);
    max-height: 90vh;
    overflow-y: auto;
    padding: var(--space-6) var(--space-6) var(--space-5);
    border-radius: var(--radius-box);
    background: var(--bg);
    box-shadow: var(--shadow);
    animation: rise 200ms ease-out;
  }

  .modal:focus {
    outline: none;
  }

  .close {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
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
    margin-bottom: var(--space-3);
    padding-right: var(--space-6);
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.1;
  }

  @media (max-width: 767px) {
    .backdrop {
      align-items: stretch;
    }

    .modal {
      width: 100%;
      max-height: none;
      border-radius: 0;
      box-shadow: none;
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
  }
</style>
