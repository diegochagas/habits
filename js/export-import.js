// export-import.js: JSON backup of the list, since localStorage is per browser.

import { parseItemList } from "./items-store.js";

/**
 * Trigger a download of the list as JSON.
 * @param {import("./items-store.js").HabitItem[]} items
 * @param {Document} document
 * @returns {void}
 */
export function downloadItemsJson(items, document) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `habits-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Read a JSON file chosen by the user and validate it as an item list.
 * @param {File} file
 * @returns {Promise<{ items: import("./items-store.js").HabitItem[] } | { error: string }>}
 */
export async function readItemsJson(file) {
  const text = await file.text();
  try {
    return parseItemList(JSON.parse(text));
  } catch (cause) {
    return { error: `file ${file.name}: expected JSON (${String(cause)})` };
  }
}
