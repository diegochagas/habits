// items-store.js: the list itself. Pure functions over an array of items plus a thin
// storage wrapper (the server's state or localStorage, see state-storage.js). The seed
// (data/seed.json) is copied into storage on first visit so sheet items and user items are
// edited the same way.

import { isCategory, isLegacyDailyCategory, migrateCategory } from "./categories.js";

/**
 * @typedef {object} HabitItem
 * @property {string} id
 * @property {string} name
 * @property {import("./categories.js").Category} category the característica it trains (its XP track)
 * @property {boolean} daily a Today habit: on the Today tab, once a day, back every morning
 * @property {string} description
 * @property {string} [url] an http(s) link the card opens (a hyperlink on the sheet's Task cell); absent when none
 * @property {string} date  ISO yyyy-mm-dd (sheet queue date, or the day it was added)
 * @property {boolean} done
 * @property {string} doneAt yyyy-mm-dd of the last Done ("" while to do); daily items reset the next day
 * @property {string} createdAt ISO timestamp
 * @property {number} [xp] daily items: XP per day (1–3); any other item pays 1 once
 */

/** @typedef {{ name: string, category: string, description: string, url?: string, date?: string, daily?: boolean, xp?: number | string }} ItemFields */

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
  const category = migrateCategory(candidate.category, candidate.track);
  if (!category) {
    return { error: `category ${JSON.stringify(candidate.category)}: expected Poder, Habilidade or Resistência` };
  }
  return { item: normalizeItem(candidate, category) };
}

/**
 * @param {Record<string, unknown>} candidate already checked for id/name
 * @param {import("./categories.js").Category} category
 * @returns {HabitItem}
 */
function normalizeItem(candidate, category) {
  const base = {
    id: String(candidate.id),
    name: String(candidate.name).trim(),
    category,
    description: typeof candidate.description === "string" ? candidate.description : "",
    date: typeof candidate.date === "string" ? candidate.date : "",
    done: candidate.done === true,
    doneAt: typeof candidate.doneAt === "string" ? candidate.doneAt : "",
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : "",
  };
  // Items saved before 2026-10-29 said "Today" (or "Personal") as their category instead.
  const daily = candidate.daily === true || isLegacyDailyCategory(candidate.category);
  return withHabitFields(withUrl(base, candidate.url), daily, candidate.xp);
}

/**
 * Keep a link only when it is an http(s) URL (the card renders it as an href, so nothing else may in).
 * @template {object} T
 * @param {T} item
 * @param {unknown} url
 * @returns {T & { url?: string }}
 */
function withUrl(item, url) {
  return isWebUrl(url) ? { ...item, url: String(url).trim() } : item;
}

/**
 * @param {unknown} text
 * @returns {boolean} true for a non-blank text starting with http:// or https://
 */
export function isWebUrl(text) {
  return typeof text === "string" && /^https?:\/\/\S+$/.test(text.trim());
}

/**
 * A daily item (a Today habit) carries its XP per day (1–3, default 1); other items carry none.
 * @template {object} T
 * @param {T} item
 * @param {boolean} daily
 * @param {unknown} xp
 * @returns {T & { daily: boolean, xp?: number }}
 */
function withHabitFields(item, daily, xp) {
  if (!daily) return { ...item, daily: false };
  const amount = Math.round(Number(xp));
  return { ...item, daily: true, xp: amount >= 1 && amount <= 3 ? amount : 1 };
}

/**
 * @param {HabitItem} item
 * @returns {boolean} true for a daily item (a Today habit)
 */
export function isHabit(item) {
  return item.daily === true;
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
 * @returns {{ fields: ItemFields } | { error: "errorName" | "errorCategory" | "errorDate" | "errorUrl" }}
 */
export function checkItemFields(fields) {
  const name = fields.name.trim();
  if (!name) return { error: "errorName" };
  if (!isCategory(fields.category)) return { error: "errorCategory" };
  const date = (fields.date ?? "").trim();
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "errorDate" };
  const url = (fields.url ?? "").trim();
  if (url && !isWebUrl(url)) return { error: "errorUrl" };
  const checked = { name, category: fields.category, description: fields.description.trim(), date };
  return { fields: withHabitFields(withUrl(checked, url), fields.daily === true, fields.xp) };
}

/**
 * Build a new item from the add form.
 * @param {ItemFields} fields
 * @param {{ id: () => string, now: () => Date }} clock injected so tests are deterministic
 * @returns {{ item: HabitItem } | { error: "errorName" | "errorCategory" | "errorDate" | "errorUrl" }}
 * @example createItem({ name: "Bleach", category: "Resistência", description: "" }, { id: () => "x", now: () => new Date() })
 */
export function createItem(fields, clock) {
  const checked = checkItemFields(fields);
  if ("error" in checked) return checked;
  const now = clock.now();
  const item = {
    id: clock.id(),
    ...checked.fields,
    category: /** @type {import("./categories.js").Category} */ (checked.fields.category),
    date: checked.fields.date || now.toISOString().slice(0, 10),
    done: false,
    doneAt: "",
    createdAt: now.toISOString(),
  };
  return { item: /** @type {HabitItem} */ (item) };
}

/**
 * Replace an item's editable fields (name, category, description, link, date, daily and its XP).
 * @param {HabitItem[]} items
 * @param {string} id
 * @param {ItemFields} fields
 * @returns {{ items: HabitItem[] } | { error: "errorName" | "errorCategory" | "errorDate" | "errorUrl" }}
 * @example updateItem(items, "a", { name: "Gym", category: "Poder", description: "", daily: true, xp: 2 })
 */
export function updateItem(items, id, fields) {
  const checked = checkItemFields(fields);
  if ("error" in checked) return checked;
  return {
    items: items.map((item) => {
      if (item.id !== id) return item;
      const { xp: _xp, url: _url, ...rest } = item;
      return /** @type {HabitItem} */ ({ ...rest, ...checked.fields, date: checked.fields.date || item.date });
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
    if (!isHabit(item) || !item.done || item.doneAt === today) return item;
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
