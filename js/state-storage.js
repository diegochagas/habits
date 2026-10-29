// state-storage.js: the pages' storage. Served by server/ the state lives in its database
// (/api/state, one JSON document per key); served as plain files (a static server, the e2e
// fallback) it lives in localStorage. Both look like localStorage to the stores:
// getItem/setItem/removeItem are synchronous on a cache, writes go to the server in the
// background (coalesced per key, retried until they land, flushed when the page hides).

const STATE_URL = "api/state";
const FLUSH_DELAY_MS = 250;
const RETRY_DELAY_MS = 5000;
// Browsers cap the bytes in flight for `keepalive` fetches at 64 KiB (all of them together) and
// refuse a bigger body outright; the list passed that around 315 items on 2026-10-29 and its
// PUTs never landed. A big write goes without keepalive: it is retried while the page lives.
const KEEPALIVE_MAX_BYTES = 32_000;

/**
 * @typedef {object} StateStorage
 * @property {(key: string) => string | null} getItem
 * @property {(key: string, value: string) => void} setItem
 * @property {(key: string) => void} removeItem
 * @property {() => Promise<void>} flush send every pending write now
 * @property {"server" | "browser"} kind
 */

/**
 * Try the server; fall back to the browser's localStorage when there is none.
 * @param {{ fetchFn?: typeof fetch, fallback?: Storage, document?: Document }} [deps]
 * @returns {Promise<StateStorage>}
 * @example const storage = await connectStateStorage()
 */
export async function connectStateStorage(deps = {}) {
  const fetchFn = deps.fetchFn ?? ((url, init) => fetch(url, init));
  const initial = await loadServerState(fetchFn);
  if (initial === null) return browserStorage(deps.fallback ?? localStorage);
  const storage = createServerStorage(fetchFn, initial);
  deps.document?.addEventListener("visibilitychange", () => {
    if (deps.document?.visibilityState === "hidden") storage.flush();
  });
  return storage;
}

/**
 * @param {typeof fetch} fetchFn
 * @returns {Promise<Record<string, unknown> | null>} null when the server is not there
 */
async function loadServerState(fetchFn) {
  try {
    const response = await fetchFn(STATE_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const payload = await response.json();
    return typeof payload?.state === "object" && payload.state !== null ? payload.state : null;
  } catch {
    return null;
  }
}

/**
 * @param {Storage} storage
 * @returns {StateStorage}
 */
function browserStorage(storage) {
  return {
    kind: "browser",
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
    flush: async () => {},
  };
}

/**
 * @param {typeof fetch} fetchFn
 * @param {Record<string, unknown>} initial the server's documents, keyed
 * @param {{ setTimeout?: typeof setTimeout }} [timers]
 * @returns {StateStorage}
 * @example createServerStorage(fetch, { "habits:v1": [] }).getItem("habits:v1") // "[]"
 */
export function createServerStorage(fetchFn, initial, timers = {}) {
  const schedule = timers.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
  const cache = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  /** @type {Map<string, string | null>} key → JSON to PUT, or null to DELETE */
  const pending = new Map();
  let timer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
  let inFlight = /** @type {Promise<void> | null} */ (null);

  /** @param {number} delay */
  function queueFlush(delay) {
    if (timer !== null) return;
    timer = schedule(() => {
      timer = null;
      return flush();
    }, delay);
  }

  /** Sends what is pending; writes queued meanwhile go right after, failures wait RETRY_DELAY_MS. */
  async function flush() {
    if (inFlight) return inFlight;
    inFlight = sendPending(fetchFn, pending).then(async (failed) => {
      inFlight = null;
      if (pending.size === 0) return;
      if (failed) queueFlush(RETRY_DELAY_MS);
      else await flush();
    });
    return inFlight;
  }

  return {
    kind: "server",
    getItem: (key) => cache.get(key) ?? null,
    setItem(key, value) {
      cache.set(key, value);
      pending.set(key, value);
      queueFlush(FLUSH_DELAY_MS);
    },
    removeItem(key) {
      cache.delete(key);
      pending.set(key, null);
      queueFlush(FLUSH_DELAY_MS);
    },
    flush,
  };
}

/**
 * PUT/DELETE every pending key; a key that fails stays pending (retried by the caller).
 * @param {typeof fetch} fetchFn
 * @param {Map<string, string | null>} pending
 * @returns {Promise<boolean>} true when at least one write failed
 */
async function sendPending(fetchFn, pending) {
  let failed = false;
  for (const [key, value] of [...pending]) {
    const ok = await sendOne(fetchFn, key, value);
    failed ||= !ok;
    // Only forget the write if nothing newer was queued for the key meanwhile.
    if (ok && pending.get(key) === value) pending.delete(key);
  }
  return failed;
}

/**
 * @param {typeof fetch} fetchFn
 * @param {string} key
 * @param {string | null} value
 * @returns {Promise<boolean>}
 */
async function sendOne(fetchFn, key, value) {
  try {
    const url = `${STATE_URL}/${encodeURIComponent(key)}`;
    const response =
      value === null
        ? await fetchFn(url, { method: "DELETE", keepalive: true })
        : await fetchFn(url, {
            method: "PUT",
            body: value,
            headers: { "Content-Type": "application/json" },
            keepalive: new TextEncoder().encode(value).length <= KEEPALIVE_MAX_BYTES,
          });
    return response.ok;
  } catch {
    return false;
  }
}
