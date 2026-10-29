// sync-app.js: runs the sheet sync on the habits page: the settings panel, the queue, the
// periodic pull and the push after each change. The page keeps owning the items.

import { createSheetClient } from "./sheet-client.js";
import { mergeSheetRows, opsBetween } from "./sheet-rows.js";
import { enqueueOps } from "./sync-store.js";
import { translate } from "../i18n.js";

const PULL_EVERY_MS = 5 * 60 * 1000;

/**
 * @typedef {object} SheetSyncDeps
 * @property {ReturnType<typeof import("./sync-store.js").createSyncStore>} store
 * @property {HTMLElement} panel the settings panel (form + status)
 * @property {() => import("../items-store.js").HabitItem[]} items
 * @property {(items: import("../items-store.js").HabitItem[], renamed: Record<string, string>) => void} applyItems
 *   the page replaces its list without pushing again
 * @property {() => "en" | "pt"} lang
 * @property {typeof fetch} [fetchFn]
 */

/**
 * @param {SheetSyncDeps} deps
 * @returns {{ configured: () => boolean, afterChange: (before: import("../items-store.js").HabitItem[], after: import("../items-store.js").HabitItem[]) => void, syncNow: () => Promise<void>, render: () => void }}
 * @example const sync = startSheetSync({ store, panel, items, applyItems, lang })
 */
export function startSheetSync(deps) {
  const client = createSheetClient(deps.fetchFn ?? ((url, init) => fetch(url, init)));
  let settings = deps.store.load();
  let status = {
    key: settings.url ? "syncIdle" : "syncOff",
    values: /** @type {Record<string, string | number>} */ ({}),
  };
  let busy = false;

  /** @param {import("./sync-store.js").SyncSettings} next */
  function commit(next) {
    settings = next;
    deps.store.save(next);
    render();
  }

  function render() {
    const lang = deps.lang();
    const form = /** @type {HTMLFormElement | null} */ (deps.panel.querySelector("form"));
    if (form && document.activeElement?.closest("form") !== form) {
      /** @type {HTMLInputElement} */ (form.elements.namedItem("url")).value = settings.url;
      /** @type {HTMLInputElement} */ (form.elements.namedItem("token")).value = settings.token;
    }
    const line = /** @type {HTMLElement} */ (deps.panel.querySelector("[data-sync-status]"));
    const pending = settings.queue.length
      ? ` · ${translate(lang, "syncPending", { count: settings.queue.length })}`
      : "";
    line.textContent = translate(lang, status.key, status.values) + pending;
  }

  /**
   * @param {import("../items-store.js").HabitItem[]} before
   * @param {import("../items-store.js").HabitItem[]} after
   */
  function afterChange(before, after) {
    if (!settings.url) return;
    const ops = opsBetween(before, after);
    if (ops.length === 0) return;
    commit({ ...settings, queue: enqueueOps(settings.queue, ops) });
    syncNow();
  }

  async function syncNow() {
    if (!settings.url || busy) return;
    busy = true;
    const sent = settings.queue;
    const result = await client.exchange(settings, sent);
    busy = false;
    if ("error" in result) {
      status = { key: "syncError", values: { error: result.error } };
      return render();
    }
    const merged = mergeSheetRows(
      deps.items(),
      result.rows,
      settings.queue.filter((op) => !sent.includes(op)),
    );
    commit({
      ...settings,
      queue: settings.queue.filter((op) => !sent.includes(op)),
      lastSyncAt: new Date().toISOString(),
    });
    status = { key: "syncOk", values: { count: merged.items.length } };
    deps.applyItems(merged.items, merged.renamed);
    render();
  }

  /** @param {HTMLFormElement} form */
  function onSave(form) {
    const fields = new FormData(form);
    const url = String(fields.get("url") ?? "").trim();
    const token = String(fields.get("token") ?? "").trim();
    status = { key: url ? "syncIdle" : "syncOff", values: {} };
    commit({ ...settings, url, token, queue: url ? settings.queue : [] });
    if (url) syncNow();
  }

  deps.panel.addEventListener("submit", (event) => {
    event.preventDefault();
    onSave(/** @type {HTMLFormElement} */ (event.target));
  });
  deps.panel.addEventListener("click", (event) => {
    const button = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (event.target).closest("[data-sync]"));
    if (button?.dataset.sync === "now") syncNow();
    if (button?.dataset.sync === "disconnect") {
      status = { key: "syncOff", values: {} };
      commit({ url: "", token: "", queue: [], lastSyncAt: "" });
    }
  });
  setInterval(() => syncNow(), PULL_EVERY_MS);
  render();
  return { configured: () => settings.url !== "", afterChange, syncNow, render };
}
