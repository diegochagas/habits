// state-items-csv.js: the list (key habits:v1) lives in a CSV file edited by hand; every other
// document stays in the inner store (PostgreSQL). The file is read on every load, so an edit
// shows on the next page load or poll, and written back whole (atomically, tmp + rename) on
// every save from the page. A row the server had to complete (a hand-typed row has no id) is
// written back at once so the id stays the same on the next read.

import { chmod, chown, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { STORAGE_KEY as ITEMS_KEY, newItemId, parseItemList } from "../js/items-store.js";
import { itemsFromCsv, itemsToCsv } from "./items-csv.js";

/** The database row the list came from stays under this key: a fallback if the file is ever lost. */
const MOVED_KEY = `${ITEMS_KEY}:before-csv`;

/** @typedef {import("./state-memory.js").StateStore} StateStore */
/** @typedef {import("./items-csv.js").ItemClock} ItemClock */

/**
 * @typedef {object} ItemsCsvOptions
 * @property {(line: Record<string, unknown>) => void} [log]
 * @property {ItemClock} [clock] ids and dates for hand-typed rows (tests pass a fixed one)
 */

/**
 * Wrap a store so the list comes from and goes to the CSV. When the file does not exist yet but
 * the inner store has a list (saved before 2026-11-01), the file is created from it and the
 * database row renamed (MOVED_KEY), so the page sees one list and the old copy is still there
 * if the file is lost (a volume not mounted).
 * @param {StateStore} inner
 * @param {string} csvPath
 * @param {ItemsCsvOptions} [options]
 * @returns {Promise<StateStore>}
 * @example const state = await createItemsCsvState(await createPostgresState(url), "/srv/habits/state/items.csv")
 */
export async function createItemsCsvState(inner, csvPath, options = {}) {
  const log = options.log ?? (() => {});
  const clock = options.clock ?? pageLikeClock;
  await moveListToCsv(inner, csvPath, log);
  return {
    async loadAll() {
      const { [ITEMS_KEY]: _inDatabase, ...others } = await inner.loadAll();
      const items = await readItemsCsv(csvPath, clock, log);
      return items === null ? others : { ...others, [ITEMS_KEY]: items };
    },
    save: (key, value) => (key === ITEMS_KEY ? saveItemsCsv(csvPath, value) : inner.save(key, value)),
    remove: (key) => (key === ITEMS_KEY ? rm(csvPath, { force: true }) : inner.remove(key)),
    async wipe() {
      await inner.wipe();
      await rm(csvPath, { force: true });
    },
    close: () => inner.close(),
  };
}

/** The same id shape the page gives a new item, prefixed to show the row was typed in the file. */
const pageLikeClock = { id: () => newItemId("csv"), now: () => new Date() };

/**
 * @param {StateStore} inner
 * @param {string} csvPath
 * @param {(line: Record<string, unknown>) => void} log
 */
async function moveListToCsv(inner, csvPath, log) {
  if (await fileExists(csvPath)) return;
  const saved = (await inner.loadAll())[ITEMS_KEY];
  if (saved === undefined) return;
  const parsed = parseItemList(saved);
  if ("error" in parsed) {
    log({ event: "items-csv-skipped-database-list", error: parsed.error });
    return;
  }
  await writeItemsCsv(csvPath, parsed.items);
  await inner.save(MOVED_KEY, saved);
  await inner.remove(ITEMS_KEY);
  log({ event: "items-csv-created", path: csvPath, items: parsed.items.length, from: "database" });
}

/**
 * @param {string} csvPath
 * @param {ItemClock} clock
 * @param {(line: Record<string, unknown>) => void} log
 * @returns {Promise<import("../js/items-store.js").HabitItem[] | null>} null when there is no file
 */
async function readItemsCsv(csvPath, clock, log) {
  let text;
  try {
    text = await readFile(csvPath, "utf8");
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT") return null;
    throw error;
  }
  const read = itemsFromCsv(text, clock);
  if ("error" in read) throw new Error(`${csvPath}: ${read.error}`);
  for (const skipped of read.skipped) log({ event: "items-csv-row-skipped", path: csvPath, ...skipped });
  if (read.completed > 0) await writeItemsCsv(csvPath, read.items);
  return read.items;
}

/**
 * @param {string} csvPath
 * @param {unknown} value the page's PUT body
 */
async function saveItemsCsv(csvPath, value) {
  const parsed = parseItemList(value);
  if ("error" in parsed) throw new Error(`${ITEMS_KEY}: ${parsed.error}`);
  await writeItemsCsv(csvPath, parsed.items);
}

/**
 * Write the whole file through a temp name (unique: a read that completes rows and a PUT may
 * write at the same time) so a reader never sees half a list. The file takes the folder's owner
 * and group (the container runs as root, the folder is Diego's) and mode 664, so it can be
 * edited from the host without sudo.
 * @param {string} csvPath
 * @param {import("../js/items-store.js").HabitItem[]} items
 */
async function writeItemsCsv(csvPath, items) {
  const folder = dirname(csvPath);
  await mkdir(folder, { recursive: true });
  const temp = `${csvPath}.${newItemId("write")}.tmp`;
  await writeFile(temp, itemsToCsv(items), "utf8");
  await matchFolderOwner(temp, folder);
  await rename(temp, csvPath);
}

/**
 * @param {string} filePath
 * @param {string} folder
 */
async function matchFolderOwner(filePath, folder) {
  try {
    const owner = await stat(folder);
    await chown(filePath, owner.uid, owner.gid);
    await chmod(filePath, 0o664);
  } catch {
    // Not root (local dev): the file is already ours.
  }
}

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
