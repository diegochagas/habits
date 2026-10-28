// today-view.js: the daily habit log. Good habits add XP to a track, bad habits remove it.

import { DEFAULT_HABITS } from "./catalog.js";
import { gameText } from "./game-i18n.js";
import { capitalize } from "./hero-panel.js";
import { escapeHtml } from "../linkify.js";

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @param {string} today
 * @returns {string}
 */
export function renderTodayView(hero, lang, today) {
  const all = [
    ...DEFAULT_HABITS.map((habit) => ({ ...habit, label: gameText(lang, `habit.${habit.id}`) })),
    ...hero.customHabits,
  ];
  const good = all.filter((habit) => habit.good);
  const bad = all.filter((habit) => !habit.good);
  return `<div class="today-grid">
  <section class="panel panel-tilt-left"><h3 class="panel-title">${gameText(lang, "goodHabits")}</h3>${renderHabitButtons(good, "good")}</section>
  <section class="panel panel-tilt-right"><h3 class="panel-title">${gameText(lang, "badHabits")}</h3>${renderHabitButtons(bad, "bad")}</section>
  <section class="panel">${renderCustomForm(lang)}</section>
  <section class="panel"><h3 class="panel-title">${gameText(lang, "todayLog")}</h3>${renderTodayLog(hero, lang, today)}</section>
</div>`;
}

/**
 * @param {{ id: string, label: string, track: string, xp: number }[]} habits
 * @param {"good" | "bad"} kind
 * @returns {string}
 */
function renderHabitButtons(habits, kind) {
  const buttons = habits.map(
    (habit) =>
      `<button type="button" class="habit-button habit-${kind} track-${habit.track}" data-action="log-habit" data-habit="${escapeHtml(habit.id)}">
        <span>${escapeHtml(habit.label)}</span><b>${habit.xp > 0 ? "+" : ""}${habit.xp} ${trackTag(habit.track)}</b></button>`,
  );
  return `<div class="habit-buttons">${buttons.join("")}</div>`;
}

/**
 * @param {string} track
 * @returns {string}
 */
function trackTag(track) {
  return track.charAt(0).toUpperCase();
}

/**
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderCustomForm(lang) {
  const options = ["poder", "habilidade", "resistencia"].map(
    (track) => `<option value="${track}">${gameText(lang, `track${capitalize(track)}`)}</option>`,
  );
  return `<h3 class="panel-title">${gameText(lang, "customHabit")}</h3>
  <form class="custom-habit-form" data-form="custom-habit">
    <label>${gameText(lang, "customName")} <input type="text" name="label" maxlength="60" required /></label>
    <label>${gameText(lang, "customTrack")} <select name="track">${options.join("")}</select></label>
    <label>${gameText(lang, "customXp")} <input type="number" name="xp" min="1" max="3" value="1" /></label>
    <label><input type="radio" name="good" value="1" checked /> ${gameText(lang, "customGood")}</label>
    <label><input type="radio" name="good" value="0" /> ${gameText(lang, "customBad")}</label>
    <button type="submit" class="stamp stamp-small">${gameText(lang, "customAdd")}</button>
    <p class="form-error" data-error="custom-habit" hidden></p>
  </form>`;
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @param {string} today
 * @returns {string}
 */
function renderTodayLog(hero, lang, today) {
  const entries = hero.habitLog.filter((entry) => entry.date === today);
  if (entries.length === 0) return `<p class="muted">${gameText(lang, "nothingToday")}</p>`;
  const rows = entries.map((entry) => {
    const label = entry.label ?? gameText(lang, `habit.${entry.habitId}`);
    return `<li class="${entry.good ? "log-good" : "log-bad"}">${escapeHtml(label)} <b>${entry.xp > 0 ? "+" : ""}${entry.xp}</b></li>`;
  });
  return `<ul class="today-log">${rows.reverse().join("")}</ul>`;
}

/**
 * Build a custom habit from the form.
 * @param {FormData} fields
 * @param {() => string} makeId
 * @returns {{ habit: import("./hero-sheet.js").Hero["customHabits"][number] } | { error: "customError" }}
 */
export function customHabitFromForm(fields, makeId) {
  const label = String(fields.get("label") ?? "").trim();
  if (!label) return { error: "customError" };
  const good = String(fields.get("good")) === "1";
  const xp = Math.max(1, Math.min(3, Number(fields.get("xp")) || 1));
  const track = /** @type {import("./catalog.js").Track} */ (String(fields.get("track") ?? "resistencia"));
  return { habit: { id: makeId(), label, track, xp: good ? xp : -xp, good, pvHit: good ? undefined : xp } };
}
