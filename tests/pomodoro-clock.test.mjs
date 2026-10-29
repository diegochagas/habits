import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createPomodoro,
  formatClock,
  modeSeconds,
  pauseClock,
  remainingSeconds,
  rollDay,
  selectMode,
  spendFreeTime,
  startClock,
  tickClock,
} from "../js/pomodoro/pomodoro-clock.js";
import { createPomodoroStore, loadOrCreatePomodoro } from "../js/pomodoro/pomodoro-store.js";

const TODAY = "2026-10-29";
const T0 = Date.UTC(2026, 9, 29, 9, 0, 0);

test("a fresh pomodoro is 25:00 of work, idle, with no free time", () => {
  const state = createPomodoro(TODAY);
  assert.deepEqual([state.mode, state.running, state.remaining, state.freeSeconds], ["work", false, 1500, 0]);
  assert.equal(formatClock(state.remaining), "25:00");
  assert.equal(modeSeconds("long", 60), 900);
  assert.throws(() => modeSeconds(/** @type {any} */ ("nap"), 60), /expected work, short or long/);
});

test("start, pause and resume keep the seconds; the clock never goes negative", () => {
  let state = startClock(createPomodoro(TODAY), T0);
  assert.equal(remainingSeconds(state, T0 + 61_000), 1439);
  state = pauseClock(state, T0 + 61_000);
  assert.deepEqual([state.running, state.remaining], [false, 1439]);
  state = startClock(state, T0 + 100_000);
  assert.equal(remainingSeconds(state, T0 + 100_000 + 2_000_000), 0);
  assert.equal(formatClock(remainingSeconds(state, T0 + 100_000 + 5_000)), "23:54");
});

test("a finished work block counts a pomodoro on its item, earns a 5 minute break and stops", () => {
  const state = startClock({ ...createPomodoro(TODAY), itemId: "sheet-001" }, T0);
  const early = tickClock(state, T0 + 1000, 60);
  assert.equal(early.finished, null);
  const done = tickClock(state, T0 + 1500_000, 60);
  assert.equal(done.finished, "work");
  assert.deepEqual([done.state.mode, done.state.running, done.state.remaining], ["short", false, 300]);
  assert.equal(done.state.freeSeconds, 300);
  assert.deepEqual(done.state.pomodoros, { "sheet-001": 1 });
  assert.equal(done.state.completed, 1);
});

test("every 4th pomodoro earns the 15 minute long break; a finished break goes back to work", () => {
  let state = { ...createPomodoro(TODAY), completed: 3 };
  state = tickClock(startClock(state, T0), T0 + 1500_000, 60).state;
  assert.deepEqual([state.mode, state.freeSeconds], ["long", 900]);
  const back = tickClock(startClock(state, T0), T0 + 900_000, 60);
  assert.deepEqual([back.finished, back.state.mode, back.state.remaining], ["long", "work", 1500]);
});

test("free time is spent down to zero and reset on a new day; picking a mode reloads it", () => {
  const rich = { ...createPomodoro(TODAY), freeSeconds: 10 };
  assert.equal(spendFreeTime(rich, 4).freeSeconds, 6);
  assert.equal(spendFreeTime(rich, 40).freeSeconds, 0);
  assert.equal(rollDay(rich, TODAY), rich);
  assert.deepEqual([rollDay(rich, "2026-10-30").freeSeconds, rollDay(rich, "2026-10-30").date], [0, "2026-10-30"]);
  assert.deepEqual(selectMode(startClock(rich, T0), "short", 60).remaining, 300);
  assert.equal(createPomodoro(TODAY, 0.1).remaining, 3, "fast mode for e2e: 25 'minutes' of 0.1 s");
});

class FakeStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.get(key) ?? null;
  }
  setItem(key, value) {
    this.map.set(key, value);
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

test("the store round-trips the state and ignores garbage", () => {
  const storage = new FakeStorage();
  const store = createPomodoroStore(storage);
  const fresh = loadOrCreatePomodoro(store, TODAY, 60);
  assert.equal(fresh.remaining, 1500);
  store.save({ ...fresh, freeSeconds: 42 });
  assert.equal(store.load()?.freeSeconds, 42);
  storage.setItem("habits:pomodoro:v1", "{not json");
  assert.equal(store.load(), null);
  storage.setItem("habits:pomodoro:v1", JSON.stringify({ mode: "nap" }));
  assert.equal(store.load(), null);
});

test("pomodoro and puzzle strings exist in both languages", async () => {
  const { missingPomodoroKeys } = await import("../js/pomodoro/pomodoro-i18n.js");
  const { missingPuzzleKeys } = await import("../js/puzzle/puzzle-i18n.js");
  assert.deepEqual(missingPomodoroKeys(), []);
  assert.deepEqual(missingPuzzleKeys(), []);
});
