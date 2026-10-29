// pomodoro-view.js: HTML for the Pomodoro panel (modes, clock, controls, the item being worked
// on, the focus-music form and the free-time line). The video iframe lives outside this HTML
// so re-rendering never restarts it.

import { formatClock, remainingSeconds } from "./pomodoro-clock.js";
import { pomodoroText } from "./pomodoro-i18n.js";
import { escapeHtml } from "../linkify.js";

/**
 * @param {import("./pomodoro-clock.js").PomodoroState} state
 * @param {import("../items-store.js").HabitItem[]} items
 * @param {"en" | "pt"} lang
 * @param {number} now epoch ms
 * @returns {string}
 */
export function renderPomodoroPanel(state, items, lang, now) {
  return `${renderModes(state, lang)}
<p class="pomodoro-clock" id="pomodoro-clock" aria-live="off">${formatClock(remainingSeconds(state, now))}</p>
<div class="pomodoro-controls">
  <button type="button" class="stamp stamp-big" data-pomodoro="toggle">${pomodoroText(lang, state.running ? "pause" : "start")}</button>
  <button type="button" class="stamp" data-pomodoro="reset">${pomodoroText(lang, "reset")}</button>
</div>
${renderItemPicker(state, items, lang)}
${renderMusicForm(state, lang)}
${renderFreeTimeLine(state, lang)}`;
}

/**
 * @param {import("./pomodoro-clock.js").PomodoroState} state
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderModes(state, lang) {
  const modes = /** @type {const} */ (["work", "short", "long"]);
  const buttons = modes.map(
    (mode) =>
      `<button type="button" class="tab${state.mode === mode ? " tab-active" : ""}" data-pomodoro-mode="${mode}">${pomodoroText(lang, `mode${mode.charAt(0).toUpperCase()}${mode.slice(1)}`)}</button>`,
  );
  return `<div class="pomodoro-modes" role="tablist">${buttons.join("")}</div>`;
}

/**
 * @param {import("./pomodoro-clock.js").PomodoroState} state
 * @param {import("../items-store.js").HabitItem[]} items
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderItemPicker(state, items, lang) {
  const open = items.filter((item) => !item.done || item.id === state.itemId);
  const options = open.map(
    (item) =>
      `<option value="${escapeHtml(item.id)}"${item.id === state.itemId ? " selected" : ""}>${escapeHtml(item.name)}</option>`,
  );
  return `<label class="pomodoro-item field">${pomodoroText(lang, "workingOn")}
  <select data-pomodoro-select="item"><option value="">${pomodoroText(lang, "noItem")}</option>${options.join("")}</select></label>`;
}

/**
 * @param {import("./pomodoro-clock.js").PomodoroState} state
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderMusicForm(state, lang) {
  const muteButton = state.videoUrl
    ? `<button type="button" class="stamp stamp-small" data-pomodoro="mute" aria-pressed="${state.muted}">${state.muted ? "🔇 " + pomodoroText(lang, "unmute") : "🔊 " + pomodoroText(lang, "mute")}</button>`
    : "";
  return `<form class="pomodoro-music field" data-form="focus-music">
  <span>${pomodoroText(lang, "musicLabel")}</span>
  <div class="pomodoro-music-row">
    <input type="url" name="url" value="${escapeHtml(state.videoUrl)}" placeholder="${pomodoroText(lang, "musicPlaceholder")}" />
    <button type="submit" class="stamp stamp-small">${pomodoroText(lang, "musicSave")}</button>
    ${muteButton}
    ${state.videoUrl ? `<button type="button" class="stamp stamp-small stamp-danger" data-pomodoro="clear-music">${pomodoroText(lang, "musicClear")}</button>` : ""}
  </div>
  <p class="form-error" data-error="focus-music" hidden></p>
</form>`;
}

/**
 * @param {import("./pomodoro-clock.js").PomodoroState} state
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderFreeTimeLine(state, lang) {
  return `<div class="pomodoro-free">
  <span class="pomodoro-count">🍅 ${pomodoroText(lang, "completedToday", { count: state.completed })}</span>
  <span class="pomodoro-bank">⏱ ${pomodoroText(lang, "freeTime")} <b id="free-time-bank">${formatClock(state.freeSeconds)}</b></span>
  <a class="stamp stamp-small" href="game.html">${pomodoroText(lang, "playArcas")}</a>
  <a class="stamp stamp-small" href="puzzle.html">${pomodoroText(lang, "playPuzzles")}</a>
  <small class="muted">${pomodoroText(lang, "freeTimeHint")}</small>
</div>`;
}
