// sync-store.js: the sync settings (web app URL + token) and the queue of ops not yet accepted
// by the sheet, in localStorage. Nothing here is ever committed to the repository.

export const SYNC_KEY = "habits:sync:v1";

/**
 * @typedef {object} SyncSettings
 * @property {string} url the Apps Script web app URL ("" = sync off)
 * @property {string} token
 * @property {import("./sheet-rows.js").SyncOp[]} queue ops waiting for the sheet
 * @property {string} lastSyncAt ISO timestamp of the last successful sync ("" = never)
 */

/** @returns {SyncSettings} */
export function createSyncSettings() {
  return { url: "", token: "", queue: [], lastSyncAt: "" };
}

/**
 * @param {{ getItem: (k: string) => string | null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void }} storage
 */
export function createSyncStore(storage) {
  return {
    /** @returns {SyncSettings} */
    load() {
      const saved = storage.getItem(SYNC_KEY);
      const parsed = saved ? safeParse(saved) : null;
      return isSyncSettings(parsed) ? parsed : createSyncSettings();
    },
    /** @param {SyncSettings} settings */
    save(settings) {
      storage.setItem(SYNC_KEY, JSON.stringify(settings));
    },
    clear() {
      storage.removeItem(SYNC_KEY);
    },
  };
}

/**
 * Add ops to the queue, one per id: a later op on the same id replaces the earlier one.
 * @param {import("./sheet-rows.js").SyncOp[]} queue
 * @param {import("./sheet-rows.js").SyncOp[]} ops
 * @returns {import("./sheet-rows.js").SyncOp[]}
 * @example enqueueOps([{ op: "delete", id: "a" }], [upsertA]) // [upsertA]
 */
export function enqueueOps(queue, ops) {
  const ids = new Set(ops.map((op) => op.id));
  return [...queue.filter((op) => !ids.has(op.id)), ...ops];
}

/**
 * @param {unknown} raw
 * @returns {raw is SyncSettings}
 */
export function isSyncSettings(raw) {
  if (typeof raw !== "object" || raw === null) return false;
  const settings = /** @type {Record<string, unknown>} */ (raw);
  return (
    typeof settings.url === "string" &&
    typeof settings.token === "string" &&
    Array.isArray(settings.queue) &&
    typeof settings.lastSyncAt === "string"
  );
}

/**
 * @param {string} text
 * @returns {unknown}
 */
function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
