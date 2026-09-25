/** Progress lives in localStorage, one entry per puzzle id (see `Puzzle.id`). Nothing leaves the browser. */
export interface Progress {
  /** Found words in the order they were found. */
  found: string[];
  /** Whether the Genius and Queen Bee notices were already shown. */
  genius: boolean;
  queen: boolean;
}

/** The localStorage key for a puzzle id, which the storage event also reports. */
export const storageKey = (id: string) => `spellagon:${id}`;

export const emptyProgress = (): Progress => ({ found: [], genius: false, queen: false });

/** Combines two copies of the same puzzle's progress, keeping every word either one found, in order. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  return {
    found: [...new Set([...a.found, ...b.found])],
    genius: a.genius || b.genius,
    queen: a.queen || b.queen,
  };
}

export function loadProgress(id: string, storage: Storage | undefined = globalThis.localStorage): Progress {
  try {
    const raw = storage?.getItem(storageKey(id));
    if (!raw) return emptyProgress();
    const data = JSON.parse(raw) as Partial<Progress>;
    return {
      found: Array.isArray(data.found) ? data.found.filter((word) => typeof word === "string") : [],
      genius: data.genius === true,
      queen: data.queen === true,
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(id: string, progress: Progress, storage: Storage | undefined = globalThis.localStorage) {
  try {
    storage?.setItem(storageKey(id), JSON.stringify(progress));
  } catch {
    // Storage can be full or blocked. The game still plays, it just will not remember.
  }
}
