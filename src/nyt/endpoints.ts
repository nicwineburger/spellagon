// Every NYT path the import touches. These are undocumented and can move.
export const NYT_ORIGIN = "https://www.nytimes.com";
/** One day's puzzle, public, as `${PUZZLE_PATH}YYYY-MM-DD.json`. Its `id` keys the saved state. */
export const PUZZLE_PATH = "/svc/spelling-bee/v1/";
/**
 * Saved progress for a comma-separated list of puzzle ids, read with the signed-in session cookie.
 * The original game reads and writes its state through this path, keyed `spelling_bee`. Its game_data holds
 * `answers`, the words found, and `isRevealed`.
 */
export const STATE_PATH = "/svc/games/state/spelling_bee/latests";
export const STATE_BATCH = 20;
export const REQUEST_GAP_MS = 150;
/** Day lookups in flight at once. They are small public files, so a handful at a time is gentle. */
export const LOOKUP_WORKERS = 8;
/** State batches in flight at once. */
export const STATE_WORKERS = 3;
