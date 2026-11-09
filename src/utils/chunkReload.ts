// Recovery for stale lazy-loaded chunks after a deploy.
//
// Pages are code-split with React.lazy. When a new build is deployed, chunk
// file names change (content hash) and the old ones are gone. A browser still
// running the previous index.html then fails the dynamic import on the next
// navigation (e.g. /login -> /conversations right after login), React throws
// during render and the app is left blank until the user refreshes.
//
// We reload the page once to pick up the new index.html. The timestamp guard
// prevents a reload loop if the failure is not caused by a stale build.

const RELOAD_KEY = 'evo:stale-chunk-reload-at';
const RELOAD_WINDOW_MS = 30_000;

const CHUNK_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Unable to preload CSS/i;

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  return CHUNK_ERROR_PATTERN.test(message);
}

/**
 * Reloads the page unless a reload for the same reason happened in the last
 * RELOAD_WINDOW_MS. Returns true when a reload was triggered.
 */
export function reloadOnceForStaleChunks(): boolean {
  try {
    const lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - lastReloadAt < RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (privacy mode): still reload once per page load.
  }
  window.location.reload();
  return true;
}
