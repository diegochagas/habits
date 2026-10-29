import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { startFreeTimeGate } from "../js/pomodoro/free-time-gate.js";
import { createPomodoro } from "../js/pomodoro/pomodoro-clock.js";
import { createPomodoroStore } from "../js/pomodoro/pomodoro-store.js";

const TODAY = "2026-10-29";

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

/** Stands in for the badge and overlay nodes: the gate only writes text, HTML and `hidden`. */
class FakeNode {
  constructor() {
    this.textContent = "";
    this.innerHTML = "";
    this.hidden = false;
  }
}

/**
 * @param {Partial<import("../js/pomodoro/pomodoro-clock.js").PomodoroState>} saved
 * @param {() => void} onExpired
 */
function gateWith(saved, onExpired) {
  const store = createPomodoroStore(new FakeStorage());
  store.save({ ...createPomodoro(TODAY), ...saved });
  const overlay = new FakeNode();
  const badge = new FakeNode();
  const gate = startFreeTimeGate({
    store,
    badge,
    overlay,
    lang: () => "en",
    today: () => TODAY,
    secondsPerMinute: 60,
    visible: () => true,
    onExpired,
  });
  return { gate, store, overlay, badge };
}

test("when the free time runs out the clock is put back on the Pomodoro mode for the next block", () => {
  mock.timers.enable({ apis: ["setInterval"] });
  const expired = mock.fn();
  const { gate, store, overlay } = gateWith({ mode: "short", remaining: 300, freeSeconds: 2, itemId: "x" }, expired);
  assert.equal(gate.active(), true);
  assert.equal(overlay.hidden, true);
  mock.timers.tick(1000);
  assert.deepEqual([gate.remaining(), store.load()?.mode, expired.mock.callCount()], [1, "short", 0]);
  mock.timers.tick(1000);
  assert.deepEqual([gate.remaining(), gate.active(), expired.mock.callCount()], [0, false, 1]);
  assert.deepEqual([store.load()?.mode, store.load()?.remaining, store.load()?.itemId], ["work", 1500, "x"]);
  assert.equal(overlay.hidden, false);
  assert.match(overlay.innerHTML, /href="index\.html#pomodoro"/);
  mock.timers.reset();
});

test("a break still running on the habits page is not interrupted when the play time ends", () => {
  mock.timers.enable({ apis: ["setInterval"] });
  const running = { mode: "short", running: true, endsAt: Date.now() + 200_000, freeSeconds: 1 };
  const { store } = gateWith(running, () => {});
  mock.timers.tick(1000);
  assert.deepEqual([store.load()?.mode, store.load()?.running], ["short", true]);
  mock.timers.reset();
});

test("with no free time the overlay shows from the first render and nothing is spent", () => {
  mock.timers.enable({ apis: ["setInterval"] });
  const expired = mock.fn();
  const { gate, overlay, badge } = gateWith({ freeSeconds: 0 }, expired);
  assert.deepEqual([gate.active(), overlay.hidden, badge.textContent], [false, false, "⏱ Free time 00:00"]);
  mock.timers.tick(3000);
  assert.equal(expired.mock.callCount(), 0, "a page that opens locked checks active() instead");
  mock.timers.reset();
});
