// pomodoro-store.js: the Pomodoro state in localStorage, shared by the habits page (which runs
// the clock) and the play pages (which spend the free time).

import { createPomodoro } from "./pomodoro-clock.js";

export const POMODORO_KEY = "habits:pomodoro:v1";

/**
 * @param {{ getItem: (k: string) => string | null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void }} storage
 */
export function createPomodoroStore(storage) {
  return {
    /** @returns {import("./pomodoro-clock.js").PomodoroState | null} */
    load() {
      const saved = storage.getItem(POMODORO_KEY);
      if (!saved) return null;
      const parsed = safeParse(saved);
      return isPomodoroState(parsed) ? parsed : null;
    },
    /** @param {import("./pomodoro-clock.js").PomodoroState} state */
    save(state) {
      storage.setItem(POMODORO_KEY, JSON.stringify(state));
    },
    clear() {
      storage.removeItem(POMODORO_KEY);
    },
  };
}

/**
 * @param {ReturnType<typeof createPomodoroStore>} store
 * @param {string} today
 * @param {number} secondsPerMinute
 * @returns {import("./pomodoro-clock.js").PomodoroState}
 */
export function loadOrCreatePomodoro(store, today, secondsPerMinute) {
  return store.load() ?? createPomodoro(today, secondsPerMinute);
}

/**
 * @param {unknown} raw
 * @returns {raw is import("./pomodoro-clock.js").PomodoroState}
 */
export function isPomodoroState(raw) {
  if (typeof raw !== "object" || raw === null) return false;
  const state = /** @type {Record<string, unknown>} */ (raw);
  return (
    ["work", "short", "long"].includes(String(state.mode)) &&
    typeof state.running === "boolean" &&
    typeof state.remaining === "number" &&
    typeof state.freeSeconds === "number" &&
    typeof state.date === "string" &&
    typeof state.pomodoros === "object"
  );
}

/**
 * @param {string} text
 * @returns {unknown}
 */
function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
