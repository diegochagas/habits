// items-store.js: the list itself. Pure functions over an array of items plus a thin
// storage wrapper (the server's state or localStorage, see state-storage.js). The seed
// (data/seed.json) is copied into storage on first visit so sheet items and user items are
// edited the same way.

import { isCategory } from "./categories.js";

/**
 * @typedef {object} HabitItem
 * @property {string} id
 * @property {string} name
 * @property {import("./categories.js").Category} category
 * @property {string} description
 * @property {string} date  ISO yyyy-mm-dd (sheet queue date, or the day it was added)
 * @property {boolean} done
 * @property {string} doneAt yyyy-mm-dd of the last Done ("" while to do); daily items reset the next day
 * @property {string} createdAt ISO timestamp
 * @property {true} [daily] comes back every morning (rollDailyItems); XP once a day
 */

/** @typedef {{ name: string, category: string, description: string, date?: string, daily?: boolean }} ItemFields */

export const STORAGE_KEY = "habits:v1";

/**
 * Validate one raw object into a HabitItem, or explain why it isn't one.
 * @param {unknown} raw
 * @returns {{ item: HabitItem } | { error: string }}
 */
export function parseItem(raw) {
  if (typeof raw !== "object" || raw === null) return { error: `item ${JSON.stringify(raw)}: expected an object` };
  const candidate = /** @type {Record<string, unknown>} */ (raw);
  if (typeof candidate.id !== "string" || !candidate.id)
    return { error: `id ${JSON.stringify(candidate.id)}: expected a non-empty string` };
  if (typeof candidate.name !== "string" || !candidate.name.trim())
    return { error: `name ${JSON.stringify(candidate.name)}: expected a non-empty string` };
  if (typeof candidate.category !== "string" || !isCategory(candidate.category)) {
    return { error: `category ${JSON.stringify(candidate.category)}: expected Read, Watch, Side Hustle or Personal` };
  }
  return { item: normalizeItem(candidate) };
}

/**
 * @param {Record<string, unknown>} candidate already checked for id/name/category
 * @returns {HabitItem}
 */
function normalizeItem(candidate) {
  return {
    id: String(candidate.id),
    name: String(candidate.name).trim(),
    category: /** @type {import("./categories.js").Category} */ (candidate.category),
    description: typeof candidate.description === "string" ? candidate.description : "",
    date: typeof candidate.date === "string" ? candidate.date : "",
    done: candidate.done === true,
    doneAt: typeof candidate.doneAt === "string" ? candidate.doneAt : "",
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : "",
    ...(candidate.daily === true ? { daily: true } : {}),
  };
}

/**
 * Parse a whole list; the first invalid entry fails the import.
 * @param {unknown} raw
 * @returns {{ items: HabitItem[] } | { error: string }}
 */
export function parseItemList(raw) {
  if (!Array.isArray(raw)) return { error: `list ${typeof raw}: expected an array of items` };
  const items = [];
  for (const entry of raw) {
    const parsed = parseItem(entry);
    if ("error" in parsed) return parsed;
    items.push(parsed.item);
  }
  return { items };
}

/**
 * The add/edit form's fields, trimmed and checked.
 * @param {ItemFields} fields
 * @returns {{ fields: ItemFields } | { error: "errorName" | "errorCategory" | "errorDate" }}
 */
export function checkItemFields(fields) {
  const name = fields.name.trim();
  if (!name) return { error: "errorName" };
  if (!isCategory(fields.category)) return { error: "errorCategory" };
  const date = (fields.date ?? "").trim();
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "errorDate" };
  const checked = { name, category: fields.category, description: fields.description.trim(), date };
  return { fields: fields.daily ? { ...checked, daily: true } : checked };
}

/**
 * Build a new item from the add form.
 * @param {ItemFields} fields
 * @param {{ id: () => string, now: () => Date }} clock injected so tests are deterministic
 * @returns {{ item: HabitItem } | { error: "errorName" | "errorCategory" | "errorDate" }}
 * @example createItem({ name: "Bleach", category: "Watch", description: "" }, { id: () => "x", now: () => new Date() })
 */
export function createItem(fields, clock) {
  const checked = checkItemFields(fields);
  if ("error" in checked) return checked;
  const now = clock.now();
  const base = {
    id: clock.id(),
    name: checked.fields.name,
    category: /** @type {import("./categories.js").Category} */ (checked.fields.category),
    description: checked.fields.description,
    date: checked.fields.date || now.toISOString().slice(0, 10),
    done: false,
    doneAt: "",
    createdAt: now.toISOString(),
  };
  return { item: checked.fields.daily ? { ...base, daily: true } : base };
}

/**
 * Replace an item's editable fields (name, category, description, date, daily).
 * @param {HabitItem[]} items
 * @param {string} id
 * @param {ItemFields} fields
 * @returns {{ items: HabitItem[] } | { error: "errorName" | "errorCategory" | "errorDate" }}
 * @example updateItem(items, "a", { name: "Bleach", category: "Watch", description: "", daily: true })
 */
export function updateItem(items, id, fields) {
  const checked = checkItemFields(fields);
  if ("error" in checked) return checked;
  return {
    items: items.map((item) => {
      if (item.id !== id) return item;
      const { daily: _wasDaily, ...rest } = item;
      const next = { ...rest, ...checked.fields, date: checked.fields.date || item.date };
      return /** @type {HabitItem} */ (checked.fields.daily ? { ...next, daily: true } : next);
    }),
  };
}

/**
 * Daily items marked done on an earlier day come back as to do.
 * @param {HabitItem[]} items
 * @param {string} today yyyy-mm-dd
 * @returns {{ items: HabitItem[], changed: number }}
 * @example rollDailyItems(items, "2026-10-30").changed // 3
 */
export function rollDailyItems(items, today) {
  let changed = 0;
  const rolled = items.map((item) => {
    if (!item.daily || !item.done || item.doneAt === today) return item;
    changed += 1;
    return { ...item, done: false, doneAt: "" };
  });
  return { items: rolled, changed };
}

/**
 * @param {HabitItem[]} items
 * @param {string} id
 * @param {string} [today] yyyy-mm-dd stamped as doneAt
 * @returns {HabitItem[]}
 */
export function toggleDone(items, id, today = "") {
  return items.map((item) => (item.id === id ? { ...item, done: !item.done, doneAt: item.done ? "" : today } : item));
}

/**
 * @param {HabitItem[]} items
 * @param {string} id
 * @returns {HabitItem[]}
 */
export function removeItem(items, id) {
  return items.filter((item) => item.id !== id);
}

/**
 * localStorage access behind one object so tests pass a fake.
 * @param {{ getItem: (k: string) => string | null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void }} storage
 */
export function createItemStore(storage) {
  return {
    /** @returns {HabitItem[] | null} null when nothing (valid) is saved yet */
    load() {
      const saved = storage.getItem(STORAGE_KEY);
      if (!saved) return null;
      const parsed = safeParseJson(saved);
      const list = parseItemList(parsed);
      return "items" in list ? list.items : null;
    },
    /** @param {HabitItem[]} items */
    save(items) {
      storage.setItem(STORAGE_KEY, JSON.stringify(items));
    },
    clear() {
      storage.removeItem(STORAGE_KEY);
    },
  };
}

/**
 * @param {string} text
 * @returns {unknown}
 */
function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
