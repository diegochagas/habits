// free-time-gate.js: the play pages (Arcas, puzzles) spend the free time earned by finished
// Pomodoros, one second per second while the tab is visible, and lock the page when it runs out.

import { formatClock, rollDay, selectMode, spendFreeTime } from "./pomodoro-clock.js";
import { pomodoroText } from "./pomodoro-i18n.js";
import { loadOrCreatePomodoro } from "./pomodoro-store.js";

/**
 * @typedef {object} FreeTimeGateDeps
 * @property {ReturnType<typeof import("./pomodoro-store.js").createPomodoroStore>} store
 * @property {HTMLElement} badge shows the time left
 * @property {HTMLElement} overlay shown when the time is over
 * @property {() => "en" | "pt"} lang
 * @property {() => string} today
 * @property {number} secondsPerMinute
 * @property {() => boolean} [visible] defaults to the document's visibility
 * @property {() => void} onExpired called when the time runs out while the page is open; a page
 *   that starts with none checks `active()` on its first render instead
 */

/**
 * @param {FreeTimeGateDeps} deps
 * @returns {{ active: () => boolean, remaining: () => number, render: () => void }}
 * @example const gate = startFreeTimeGate({ store, badge, overlay, lang, today, secondsPerMinute: 60, onExpired })
 */
export function startFreeTimeGate(deps) {
  let state = rollDay(loadOrCreatePomodoro(deps.store, deps.today(), deps.secondsPerMinute), deps.today());
  const visible = deps.visible ?? (() => document.visibilityState === "visible");

  function render() {
    const lang = deps.lang();
    deps.badge.textContent = `⏱ ${pomodoroText(lang, "freeTime")} ${formatClock(state.freeSeconds)}`;
    deps.overlay.innerHTML = `<h2 class="panel-title">${pomodoroText(lang, "freeTimeOver")}</h2>
<p>${pomodoroText(lang, "freeTimeOverHint")}</p>
<a class="stamp stamp-big" href="index.html#pomodoro">${pomodoroText(lang, "backToHabits")}</a>`;
    deps.overlay.hidden = state.freeSeconds > 0;
  }

  function tick() {
    if (state.freeSeconds <= 0 || !visible()) return;
    state = spendFreeTime(rollDay(state, deps.today()), 1);
    if (state.freeSeconds <= 0) state = backToWork(state);
    deps.store.save(state);
    render();
    if (state.freeSeconds <= 0) deps.onExpired();
  }

  /**
   * The break is spent: the habits page opens on the Pomodoro mode, ready for the next block
   * (an idle clock only; a break running there keeps counting).
   * @param {import("./pomodoro-clock.js").PomodoroState} spent
   * @returns {import("./pomodoro-clock.js").PomodoroState}
   */
  function backToWork(spent) {
    return spent.running ? spent : selectMode(spent, "work", deps.secondsPerMinute);
  }

  render();
  setInterval(tick, 1000);
  return { active: () => state.freeSeconds > 0, remaining: () => state.freeSeconds, render };
}
