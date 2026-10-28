// items-store.js: the list itself. Pure functions over an array of items plus a thin
// localStorage wrapper. The seed (data/seed.json) is copied into storage on first visit
// so sheet items and user items are edited the same way.

import { isCategory } from "./categories.js";

/**
 * @typedef {object} HabitItem
 * @property {string} id
 * @property {string} name
 * @property {import("./categories.js").Category} category
 * @property {string} description
 * @property {string} date  ISO yyyy-mm-dd (sheet queue date, or the day it was added)
 * @property {boolean} done
 * @property {string} createdAt ISO timestamp
 */

export const STORAGE_KEY = "manga-habits:v1";

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
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : "",
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
 * Build a new item from the add form.
 * @param {{ name: string, category: string, description: string }} fields
 * @param {{ id: () => string, now: () => Date }} clock injected so tests are deterministic
 * @returns {{ item: HabitItem } | { error: "errorName" | "errorCategory" }}
 */
export function createItem(fields, clock) {
  const name = fields.name.trim();
  if (!name) return { error: "errorName" };
  if (!isCategory(fields.category)) return { error: "errorCategory" };
  const now = clock.now();
  return {
    item: {
      id: clock.id(),
      name,
      category: fields.category,
      description: fields.description.trim(),
      date: now.toISOString().slice(0, 10),
      done: false,
      createdAt: now.toISOString(),
    },
  };
}

/**
 * @param {HabitItem[]} items
 * @param {string} id
 * @returns {HabitItem[]}
 */
export function toggleDone(items, id) {
  return items.map((item) => (item.id === id ? { ...item, done: !item.done } : item));
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
