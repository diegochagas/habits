// items-csv.js: the list as the CSV Diego edits by hand (README "The list file"): one row per
// item, the columns in reading order, id and createdAt last because the server fills them in
// for a row typed by hand. Reading is forgiving (any column order, yes/x/1 for true, blank id);
// writing is canonical (every column, true/false) so the file stays diff-friendly.

import { parseItem } from "../js/items-store.js";
import { formatCsv, parseCsv } from "./csv-text.js";

export const ITEMS_CSV_COLUMNS = [
  "name",
  "category",
  "daily",
  "xp",
  "date",
  "done",
  "doneAt",
  "url",
  "description",
  "id",
  "createdAt",
];
const TRUE_WORDS = new Set(["true", "yes", "y", "x", "1", "sim", "s"]);

/** @typedef {import("../js/items-store.js").HabitItem} HabitItem */
/** @typedef {{ id: () => string, now: () => Date }} ItemClock */

/**
 * @typedef {object} ItemsCsvRead
 * @property {HabitItem[]} items
 * @property {{ line: number, error: string }[]} skipped rows that are not an item (the caller logs them)
 * @property {number} completed rows the server finished (blank id, date or createdAt): rewrite the file
 */

/**
 * Read the file's rows into items. Blank lines are ignored; a row that is not an item is skipped,
 * not fatal, so one typo never blanks the list.
 * @param {string} text
 * @param {ItemClock} clock stamps the id, date and createdAt a hand-typed row lacks
 * @returns {ItemsCsvRead | { error: string }} error when the header is not the list's
 * @example itemsFromCsv("name,category\nGym,Poder\n", clock).items[0].name // "Gym"
 */
export function itemsFromCsv(text, clock) {
  const rows = parseCsv(text);
  if (rows.length === 0) return { items: [], skipped: [], completed: 0 };
  const columns = rows[0].map((header) => header.trim());
  if (!columns.includes("name") || !columns.includes("category"))
    return { error: `header "${rows[0].join(",")}": expected the columns ${ITEMS_CSV_COLUMNS.join(", ")}` };
  /** @type {ItemsCsvRead} */
  const read = { items: [], skipped: [], completed: 0 };
  rows.slice(1).forEach((row, index) => readItemRow(read, columns, row, index + 2, clock));
  return read;
}

/**
 * @param {ItemsCsvRead} read
 * @param {string[]} columns
 * @param {string[]} row
 * @param {number} line 1-based line of the row in the file (the header is line 1)
 * @param {ItemClock} clock
 */
function readItemRow(read, columns, row, line, clock) {
  if (row.every((field) => field.trim() === "")) return;
  const raw = rawItemFromRow(columns, row);
  read.completed += completeRow(raw, clock);
  const parsed = parseItem(raw);
  if ("error" in parsed) read.skipped.push({ line, error: parsed.error });
  else read.items.push(parsed.item);
}

/**
 * @param {string[]} columns
 * @param {string[]} row
 * @returns {Record<string, unknown>} the row as the object parseItem reads
 */
function rawItemFromRow(columns, row) {
  /** @type {Record<string, string>} */
  const text = {};
  columns.forEach((column, index) => {
    if (column) text[column] = (row[index] ?? "").trim();
  });
  return {
    ...text,
    description: row[columns.indexOf("description")] ?? "",
    daily: isTrueWord(text.daily),
    done: isTrueWord(text.done),
    xp: text.xp ? Number(text.xp) : undefined,
  };
}

/**
 * A row typed by hand has no id (and often no date): give it the same ids the page would.
 * @param {Record<string, unknown>} raw mutated
 * @param {ItemClock} clock
 * @returns {number} 1 when something was filled in
 */
function completeRow(raw, clock) {
  let filled = 0;
  if (!raw.id) {
    raw.id = clock.id();
    filled = 1;
  }
  if (!raw.date) {
    raw.date = clock.now().toISOString().slice(0, 10);
    filled = 1;
  }
  if (!raw.createdAt) {
    raw.createdAt = clock.now().toISOString();
    filled = 1;
  }
  return filled;
}

/**
 * @param {string | undefined} word
 * @returns {boolean}
 */
function isTrueWord(word) {
  return TRUE_WORDS.has((word ?? "").toLowerCase());
}

/**
 * @param {HabitItem[]} items
 * @returns {string} the canonical file: header + one row per item
 * @example itemsToCsv([]) // "name,category,daily,xp,date,done,doneAt,url,description,id,createdAt\n"
 */
export function itemsToCsv(items) {
  return formatCsv([ITEMS_CSV_COLUMNS, ...items.map(itemRow)]);
}

/**
 * @param {HabitItem} item
 * @returns {string[]}
 */
function itemRow(item) {
  return [
    item.name,
    item.category,
    String(item.daily),
    item.daily ? String(item.xp ?? 1) : "",
    item.date,
    String(item.done),
    item.doneAt,
    item.url ?? "",
    item.description,
    item.id,
    item.createdAt,
  ];
}
