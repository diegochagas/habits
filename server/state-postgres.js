// state-postgres.js: the state store on PostgreSQL, the only place `pg` is used. One table,
// habits_state(key, value jsonb, updated_at): each key is one JSON document the site saves
// (the list, the hero, the Pomodoro, the puzzle progress, the sheet sync settings).

import pg from "pg";

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS habits_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
)`;

/**
 * @typedef {object} PostgresOptions
 * @property {number} [retrySeconds] keep trying to connect this long (the Postgres container may
 *   still be starting after a host reboot; the compose stack would crash-loop otherwise)
 * @property {(ms: number) => Promise<void>} [sleep]
 * @property {(line: Record<string, unknown>) => void} [log]
 * @property {(connectionString: string) => { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }>, end: () => Promise<void> }} [createPool]
 */

/**
 * Connect (with retries), create the table if missing, and return the store.
 * @param {string} connectionString
 * @param {PostgresOptions} [options]
 * @returns {Promise<import("./state-memory.js").StateStore>}
 * @example const state = await createPostgresState(process.env.DATABASE_URL, { retrySeconds: 60 })
 */
export async function createPostgresState(connectionString, options = {}) {
  const pool = (options.createPool ?? defaultPool)(connectionString);
  await connectWithRetry(pool, options);
  return {
    async loadAll() {
      const result = await pool.query("SELECT key, value FROM habits_state");
      return Object.fromEntries(result.rows.map((row) => [row.key, row.value]));
    },
    async save(key, value) {
      await pool.query(
        `INSERT INTO habits_state (key, value, updated_at) VALUES ($1, $2::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, JSON.stringify(value)],
      );
    },
    async remove(key) {
      await pool.query("DELETE FROM habits_state WHERE key = $1", [key]);
    },
    async wipe() {
      await pool.query("DELETE FROM habits_state");
    },
    close: () => pool.end(),
  };
}

/** @param {string} connectionString */
function defaultPool(connectionString) {
  return new pg.Pool({ connectionString });
}

/**
 * @param {{ query: (text: string) => Promise<unknown> }} pool
 * @param {PostgresOptions} options
 */
async function connectWithRetry(pool, options) {
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const deadline = Date.now() + (options.retrySeconds ?? 0) * 1000;
  for (let attempt = 1; ; attempt += 1) {
    try {
      await pool.query(CREATE_TABLE);
      return;
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      options.log?.({ event: "db-retry", attempt, error: String(error) });
      await sleep(2000);
    }
  }
}
