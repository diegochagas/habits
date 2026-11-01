// server-config.js: the server's settings from the environment. Nothing here has a real value as
// a default: the database URL comes from .env / .env.docker (gitignored, see .env.example).

import { resolve } from "node:path";

/** Where the list's CSV goes when HABITS_ITEMS_CSV is not set (the compose stack mounts ./state). */
const DEFAULT_ITEMS_CSV = "state/items.csv";

/**
 * @typedef {object} ServerConfig
 * @property {number} port
 * @property {"postgres" | "memory"} store "memory" keeps everything in RAM (tests, e2e)
 * @property {string} databaseUrl postgresql://user:password@host:5432/db (postgres store only)
 * @property {string} itemsCsv the list's CSV file (state-items-csv.js); "" keeps the list in the store
 * @property {string} siteRoot folder with index.html, css/, js/, data/
 */

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} siteRoot
 * @returns {ServerConfig}
 * @example readServerConfig({ HABITS_STORE: "memory", PORT: "4180" }, "/srv/habits")
 *   // { port: 4180, store: "memory", databaseUrl: "", itemsCsv: "", siteRoot: "/srv/habits" }
 */
export function readServerConfig(env, siteRoot) {
  const store = env.HABITS_STORE ?? "postgres";
  if (store !== "postgres" && store !== "memory")
    throw new Error(`HABITS_STORE "${store}": expected postgres or memory`);
  const port = Number(env.PORT ?? "4180");
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`PORT "${env.PORT}": expected an integer between 1 and 65535`);
  const databaseUrl = env.DATABASE_URL ?? "";
  if (store === "postgres" && !/^postgres(ql)?:\/\//.test(databaseUrl))
    throw new Error(`DATABASE_URL "${databaseUrl}": expected postgresql://user:password@host:5432/database`);
  return { port, store, databaseUrl, itemsCsv: itemsCsvPath(env, store, siteRoot), siteRoot };
}

/**
 * The postgres store keeps the list in the CSV unless told not to (HABITS_ITEMS_CSV=); the memory
 * store (tests, e2e) touches no file unless given one.
 * @param {Record<string, string | undefined>} env
 * @param {"postgres" | "memory"} store
 * @param {string} siteRoot
 * @returns {string} absolute path, or "" for no file
 */
function itemsCsvPath(env, store, siteRoot) {
  const given = env.HABITS_ITEMS_CSV;
  if (given !== undefined) return given.trim() ? resolve(siteRoot, given.trim()) : "";
  return store === "postgres" ? resolve(siteRoot, DEFAULT_ITEMS_CSV) : "";
}
