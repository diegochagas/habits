// server-config.js: the server's settings from the environment. Nothing here has a real value as
// a default: the database URL comes from .env / .env.docker (gitignored, see .env.example).

/**
 * @typedef {object} ServerConfig
 * @property {number} port
 * @property {"postgres" | "memory"} store "memory" keeps everything in RAM (tests, e2e)
 * @property {string} databaseUrl postgresql://user:password@host:5432/db (postgres store only)
 * @property {string} siteRoot folder with index.html, css/, js/, data/
 */

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} siteRoot
 * @returns {ServerConfig}
 * @example readServerConfig({ HABITS_STORE: "memory", PORT: "4180" }, "/srv/habits")
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
  return { port, store, databaseUrl, siteRoot };
}
