// sheet-rows.js: the shape the Apps Script speaks ({ id, date dd/mm/yyyy, task, notes, source })
// ↔ list items, and the merge that makes the sheet the source of truth.

import { isWebUrl } from "../items-store.js";
import { isLegacyCategory, isLegacyDailyCategory, migrateCategory } from "../categories.js";

/**
 * @typedef {object} SheetRow
 * @property {string} id
 * @property {string} date dd/mm/yyyy
 * @property {string} task
 * @property {string} notes
 * @property {string} source
 * @property {string} [url] hyperlink on the Task (or Notes) cell; undefined from an older Apps Script
 * @property {boolean} [daily] the Done cell is a checkbox (a daily row): Done ticks it, the site unticks it each morning
 * @property {boolean} [done] the checkbox's state (daily rows only)
 */
/** @typedef {{ op: "delete", id: string } | { op: "upsert", id: string, date: string, name: string, description: string, category: string, daily: boolean, url: string }} SyncOp */

/**
 * "29/10/2026" → "2026-10-29"; an ISO date passes through; anything else stays as it is.
 * @param {string} text
 * @returns {string}
 * @example sheetDateToIso("29/10/2026") // "2026-10-29"
 */
export function sheetDateToIso(text) {
  const match = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return text.trim();
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

/**
 * A row becomes an item; rows without a valid Source are skipped (null). A row with a checkbox
 * in Done (or an old "Today" / "Personal" Source) is a daily item whose checkbox is its `done`
 * (stamped with `today`). The sheet knows no XP: a daily row gets 1, and mergeSheetRows keeps
 * the local amount.
 * @param {SheetRow} row
 * @param {string} [today] yyyy-mm-dd
 * @returns {import("../items-store.js").HabitItem | null}
 */
export function rowToItem(row, today = "") {
  const category = migrateCategory(row.source);
  if (!row.id || !row.task.trim() || !category) return null;
  const daily = row.daily === true || isLegacyDailyCategory(row.source);
  const done = daily && row.done === true;
  return {
    id: row.id,
    name: row.task.trim(),
    category,
    daily,
    description: row.notes ?? "",
    ...(isWebUrl(row.url) ? { url: String(row.url).trim() } : {}),
    date: sheetDateToIso(row.date ?? ""),
    done,
    doneAt: done ? today : "",
    createdAt: "",
    ...(daily ? { xp: 1 } : {}),
  };
}

/**
 * @param {import("../items-store.js").HabitItem} item
 * @returns {SyncOp}
 */
export function upsertOp(item) {
  return {
    op: "upsert",
    id: item.id,
    date: item.date,
    name: item.name,
    description: item.description,
    category: item.category,
    daily: item.daily,
    url: item.url ?? "",
  };
}

/**
 * The ops that turn the sheet from `before` into `after`: Done and Remove delete the row, Undo,
 * Add and an edit (name, description, category or date changed) write it.
 * @param {import("../items-store.js").HabitItem[]} before
 * @param {import("../items-store.js").HabitItem[]} after
 * @returns {SyncOp[]}
 * @example opsBetween([item], [{ ...item, done: true }]) // [{ op: "delete", id: item.id }]
 */
export function opsBetween(before, after) {
  const previous = new Map(before.map((item) => [item.id, item]));
  const ops = /** @type {SyncOp[]} */ ([]);
  for (const item of after) {
    const old = previous.get(item.id);
    if (item.done && !old?.done) ops.push({ op: "delete", id: item.id });
    else if (!item.done && (!old || old.done || fieldsChanged(old, item))) ops.push(upsertOp(item));
    previous.delete(item.id);
  }
  for (const gone of previous.values()) if (!gone.done) ops.push({ op: "delete", id: gone.id });
  return ops;
}

/**
 * Sheet wins: the result is the sheet's rows, except that items with a queued op keep their
 * local state (a pending delete stays done, a pending upsert stays present). A daily row's
 * checkbox decides its done state and the local XP survives; a row whose Source is one of the
 * sheet's old values (Read, Watch, Side Hustle, Today, Personal) keeps the local category, since
 * the característica is the site's call. Local items that match a row by text (the first sync,
 * before ids existed) are replaced by the row's id.
 * @param {import("../items-store.js").HabitItem[]} local
 * @param {SheetRow[]} rows
 * @param {SyncOp[]} pending
 * @param {string} [today] yyyy-mm-dd, stamped on daily rows ticked in the sheet
 * @returns {{ items: import("../items-store.js").HabitItem[], renamed: Record<string, string> }} renamed = old id → row id
 */
export function mergeSheetRows(local, rows, pending, today = "") {
  const pendingById = new Map(pending.map((op) => [op.id, op]));
  const byId = new Map(local.map((item) => [item.id, item]));
  const byText = new Map(local.map((item) => [textKey(item), item]));
  const renamed = /** @type {Record<string, string>} */ ({});
  const items = [];
  for (const row of rows) {
    const fromRow = rowToItem(row, today);
    if (!fromRow) continue;
    const known = byId.get(row.id) ?? byText.get(textKey(fromRow));
    if (known && known.id !== row.id) renamed[known.id] = row.id;
    const localDone = fromRow.daily ? fromRow.done : (known?.done ?? false);
    const done = pendingById.get(row.id)?.op === "delete" || localDone;
    const category = known && isLegacyCategory(row.source) ? known.category : fromRow.category;
    const xp = fromRow.daily ? { xp: known?.xp ?? 1 } : {};
    const url = keepLocalUrl(row, known);
    items.push({ ...fromRow, category, ...xp, ...url, done, doneAt: done ? known?.doneAt || today : "" });
  }
  const present = new Set(items.map((item) => item.id));
  for (const op of pending)
    if (op.op === "upsert" && !present.has(op.id) && byId.has(op.id)) items.push(byId.get(op.id));
  return { items, renamed };
}

/**
 * An older Apps Script sends no `url` at all: keep the local link then, instead of wiping it.
 * @param {SheetRow} row
 * @param {import("../items-store.js").HabitItem | undefined} known
 * @returns {{ url?: string }}
 */
function keepLocalUrl(row, known) {
  return row.url === undefined && known?.url ? { url: known.url } : {};
}

/**
 * @param {import("../items-store.js").HabitItem} old
 * @param {import("../items-store.js").HabitItem} item
 * @returns {boolean}
 */
function fieldsChanged(old, item) {
  return (
    old.name !== item.name ||
    old.description !== item.description ||
    old.category !== item.category ||
    (old.url ?? "") !== (item.url ?? "") ||
    old.daily !== item.daily ||
    old.date !== item.date
  );
}

/**
 * @param {{ name: string, description: string, category: string }} item
 * @returns {string}
 */
function textKey(item) {
  return `${item.name.trim()}\n${item.description.trim()}\n${item.category}`;
}
