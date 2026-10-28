// filters.js: which items show, in what order. Pure, so the view is a function of state.

/**
 * @typedef {object} ListFilter
 * @property {"All" | import("./categories.js").Category} category
 * @property {string} search
 * @property {"all" | "todo" | "done"} status
 */

/** @type {ListFilter} */
export const DEFAULT_FILTER = { category: "All", search: "", status: "all" };

/**
 * @param {import("./items-store.js").HabitItem} item
 * @param {ListFilter} filter
 * @returns {boolean}
 */
export function matchesFilter(item, filter) {
  if (filter.category !== "All" && item.category !== filter.category) return false;
  if (filter.status === "todo" && item.done) return false;
  if (filter.status === "done" && !item.done) return false;
  return matchesSearch(item, filter.search);
}

/**
 * @param {import("./items-store.js").HabitItem} item
 * @param {string} search
 * @returns {boolean}
 */
function matchesSearch(item, search) {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return `${item.name}\n${item.description}`.toLowerCase().includes(needle);
}

/**
 * Items to show: filtered, to-do before done, then by date, then by name.
 * @param {import("./items-store.js").HabitItem[]} items
 * @param {ListFilter} filter
 * @returns {import("./items-store.js").HabitItem[]}
 */
export function visibleItems(items, filter) {
  return items.filter((item) => matchesFilter(item, filter)).sort(compareItems);
}

/**
 * @param {import("./items-store.js").HabitItem} a
 * @param {import("./items-store.js").HabitItem} b
 * @returns {number}
 */
export function compareItems(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.name.localeCompare(b.name);
}

/**
 * How many items each category has (plus "All"), for the tab badges.
 * @param {import("./items-store.js").HabitItem[]} items
 * @returns {Record<string, number>}
 */
export function countByCategory(items) {
  /** @type {Record<string, number>} */
  const counts = { All: items.length };
  for (const item of items) counts[item.category] = (counts[item.category] ?? 0) + 1;
  return counts;
}
