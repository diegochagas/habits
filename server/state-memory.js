// state-memory.js: the state store in RAM, for tests and e2e (HABITS_STORE=memory). Same shape
// as state-postgres.js.

/**
 * @typedef {object} StateStore
 * @property {() => Promise<Record<string, unknown>>} loadAll every key with its JSON value
 * @property {(key: string, value: unknown) => Promise<void>} save
 * @property {(key: string) => Promise<void>} remove
 * @property {() => Promise<void>} wipe
 * @property {() => Promise<void>} close
 */

/**
 * @param {Record<string, unknown>} [initial]
 * @returns {StateStore}
 * @example const state = createMemoryState(); await state.save("habits:v1", [])
 */
export function createMemoryState(initial = {}) {
  const entries = new Map(Object.entries(initial));
  return {
    async loadAll() {
      return Object.fromEntries(entries);
    },
    async save(key, value) {
      entries.set(key, value);
    },
    async remove(key) {
      entries.delete(key);
    },
    async wipe() {
      entries.clear();
    },
    async close() {},
  };
}
