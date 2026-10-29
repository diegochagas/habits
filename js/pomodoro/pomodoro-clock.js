// pomodoro-clock.js: the Pomodoro as a pure value. 25 minutes of work on one list item, then a
// 5 minute break (15 every 4th). A finished work block earns the break's length as free time,
// which the play pages spend second by second (see free-time-gate.js).

/** Minutes per mode, as in Cirillo's book and tecnicapomodoro.com.br. */
export const POMODORO_MINUTES = { work: 25, short: 5, long: 15 };
export const LONG_BREAK_EVERY = 4;

/**
 * @typedef {"work" | "short" | "long"} PomodoroMode
 * @typedef {object} PomodoroState
 * @property {PomodoroMode} mode
 * @property {boolean} running
 * @property {number | null} endsAt epoch ms while running
 * @property {number} remaining seconds left while paused or idle
 * @property {string | null} itemId list item being worked on
 * @property {string} videoUrl focus-music YouTube URL ("" = none)
 * @property {boolean} muted
 * @property {string} date yyyy-mm-dd the counters below belong to
 * @property {number} completed work blocks finished today
 * @property {number} freeSeconds play time earned and not yet spent today
 * @property {Record<string, number>} pomodoros finished work blocks per list item (all time)
 */

/**
 * @param {string} today yyyy-mm-dd
 * @param {number} [secondsPerMinute] 60; e2e passes a smaller value through `?fast=1`
 * @returns {PomodoroState}
 */
export function createPomodoro(today, secondsPerMinute = 60) {
  return {
    mode: "work",
    running: false,
    endsAt: null,
    remaining: modeSeconds("work", secondsPerMinute),
    itemId: null,
    videoUrl: "",
    muted: false,
    date: today,
    completed: 0,
    freeSeconds: 0,
    pomodoros: {},
  };
}

/**
 * @param {PomodoroMode} mode
 * @param {number} secondsPerMinute
 * @returns {number}
 */
export function modeSeconds(mode, secondsPerMinute) {
  const minutes = POMODORO_MINUTES[mode];
  if (minutes === undefined) throw new Error(`pomodoro mode "${mode}": expected work, short or long`);
  return Math.round(minutes * secondsPerMinute);
}

/**
 * Pick a mode: stops the clock and reloads that mode's full length.
 * @param {PomodoroState} state
 * @param {PomodoroMode} mode
 * @param {number} secondsPerMinute
 * @returns {PomodoroState}
 */
export function selectMode(state, mode, secondsPerMinute) {
  return { ...state, mode, running: false, endsAt: null, remaining: modeSeconds(mode, secondsPerMinute) };
}

/**
 * A work block needs a list item to work on (the "Working on" picker); breaks run on their own.
 * @param {PomodoroState} state
 * @returns {boolean}
 * @example needsItem(createPomodoro("2026-10-29")) // true
 */
export function needsItem(state) {
  return state.mode === "work" && !state.itemId;
}

/**
 * Starts the clock; a work block without an item stays idle (see `needsItem`).
 * @param {PomodoroState} state
 * @param {number} now epoch ms
 * @returns {PomodoroState}
 */
export function startClock(state, now) {
  if (state.running || needsItem(state)) return state;
  return { ...state, running: true, endsAt: now + state.remaining * 1000 };
}

/**
 * @param {PomodoroState} state
 * @param {number} now epoch ms
 * @returns {PomodoroState}
 */
export function pauseClock(state, now) {
  if (!state.running) return state;
  return { ...state, running: false, endsAt: null, remaining: remainingSeconds(state, now) };
}

/**
 * @param {PomodoroState} state
 * @param {number} secondsPerMinute
 * @returns {PomodoroState}
 */
export function resetClock(state, secondsPerMinute) {
  return selectMode(state, state.mode, secondsPerMinute);
}

/**
 * Seconds left, never negative.
 * @param {PomodoroState} state
 * @param {number} now epoch ms
 * @returns {number}
 */
export function remainingSeconds(state, now) {
  if (!state.running || state.endsAt === null) return state.remaining;
  return Math.max(0, Math.ceil((state.endsAt - now) / 1000));
}

/**
 * One tick: when the clock reaches zero the block is finished. A work block counts a pomodoro
 * (also on its item), earns the next break as free time and switches to that break; a break
 * switches back to work. The clock stops so the next block starts by hand.
 * @param {PomodoroState} state
 * @param {number} now epoch ms
 * @param {number} secondsPerMinute
 * @returns {{ state: PomodoroState, finished: PomodoroMode | null }}
 * @example tickClock(running, running.endsAt, 60) // { state: {...mode: "short"}, finished: "work" }
 */
export function tickClock(state, now, secondsPerMinute) {
  if (!state.running || remainingSeconds(state, now) > 0) return { state, finished: null };
  if (state.mode !== "work") return { state: selectMode(state, "work", secondsPerMinute), finished: state.mode };
  const completed = state.completed + 1;
  const nextBreak = completed % LONG_BREAK_EVERY === 0 ? "long" : "short";
  const pomodoros = state.itemId
    ? { ...state.pomodoros, [state.itemId]: (state.pomodoros[state.itemId] ?? 0) + 1 }
    : state.pomodoros;
  const earned = {
    ...state,
    completed,
    pomodoros,
    freeSeconds: state.freeSeconds + modeSeconds(nextBreak, secondsPerMinute),
  };
  return { state: selectMode(earned, nextBreak, secondsPerMinute), finished: "work" };
}

/**
 * Play pages call this once a second while a game is open.
 * @param {PomodoroState} state
 * @param {number} seconds
 * @returns {PomodoroState}
 */
export function spendFreeTime(state, seconds) {
  return { ...state, freeSeconds: Math.max(0, state.freeSeconds - seconds) };
}

/**
 * A new day resets today's counters and the unspent free time (it does not pile up overnight).
 * @param {PomodoroState} state
 * @param {string} today
 * @returns {PomodoroState}
 */
export function rollDay(state, today) {
  if (state.date === today) return state;
  return { ...state, date: today, completed: 0, freeSeconds: 0 };
}

/**
 * @param {number} seconds
 * @returns {string} mm:ss
 * @example formatClock(1500) // "25:00"
 */
export function formatClock(seconds) {
  const whole = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}
