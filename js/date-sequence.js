// date-sequence.js: the list's date queue. Items that are not Today habits wait in a sequence
// two weeks apart (Diego, 2026-11-05): a new item goes 14 days after the latest one, and removing
// an item pulls the ones after it 14 days closer. Pure functions, no DOM.

import { isHabit } from "./items-store.js";

/** Days between two neighbours in the queue. */
export const SEQUENCE_STEP_DAYS = 14;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {string} isoDate yyyy-mm-dd
 * @param {number} days may be negative
 * @returns {string} yyyy-mm-dd
 * @example addDays("2026-11-05", 14) // "2026-11-19"
 */
export function addDays(isoDate, days) {
  if (!ISO_DATE.test(isoDate)) throw new Error(`date ${JSON.stringify(isoDate)}: expected yyyy-mm-dd`);
  const moved = new Date(`${isoDate}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

/**
 * @param {import("./items-store.js").HabitItem} item
 * @returns {boolean} true for a queued item: not a Today habit and with a valid date
 */
function isQueued(item) {
  return !isHabit(item) && ISO_DATE.test(item.date);
}

/**
 * The default date of a new item: 14 days after the latest queued item, today when the queue is empty.
 * @param {import("./items-store.js").HabitItem[]} items
 * @param {string} today yyyy-mm-dd
 * @returns {string} yyyy-mm-dd
 * @example nextQueueDate([{ date: "2026-11-05", daily: false }], "2026-11-01") // "2026-11-19"
 */
export function nextQueueDate(items, today) {
  const dates = items.filter(isQueued).map((item) => item.date);
  if (dates.length === 0) return today;
  return addDays(
    dates.reduce((a, b) => (a > b ? a : b)),
    SEQUENCE_STEP_DAYS,
  );
}

/**
 * Remove an item; when it was queued, every queued item dated after it moves 14 days earlier.
 * @param {import("./items-store.js").HabitItem[]} items
 * @param {string} id
 * @returns {import("./items-store.js").HabitItem[]}
 * @example removeAndCloseGap(items, "b") // the later items are 14 days closer
 */
export function removeAndCloseGap(items, id) {
  const removed = items.find((item) => item.id === id);
  const rest = items.filter((item) => item.id !== id);
  if (!removed || !isQueued(removed)) return rest;
  return rest.map((item) =>
    isQueued(item) && item.date > removed.date ? { ...item, date: addDays(item.date, -SEQUENCE_STEP_DAYS) } : item,
  );
}
