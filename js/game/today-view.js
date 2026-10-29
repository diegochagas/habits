// today-view.js: the daily habit log. Good habits are the list's Today items (once a day each,
// edited on the List tab); bad habits come from the catalog plus the custom ones and remove XP.

import { DEFAULT_HABITS } from "./catalog.js";
import { gameText } from "./game-i18n.js";
import { escapeHtml } from "../linkify.js";
import { trackTag } from "../render-items.js";

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @param {string} today
 * @param {import("../items-store.js").HabitItem[]} [habits] the list's Today items
 * @returns {string}
 * @example renderTodayView(hero, "en", "2026-10-29", items.filter(isHabit))
 */
export function renderTodayView(hero, lang, today, habits = []) {
  const bad = [
    ...DEFAULT_HABITS.map((habit) => ({ ...habit, label: gameText(lang, `habit.${habit.id}`) })),
    ...hero.customHabits,
  ].filter((habit) => !habit.good);
  return `<div class="today-grid">
  <section class="panel panel-tilt-left today-habits"><h3 class="panel-title">${gameText(lang, "goodHabits")}</h3>
    <p class="muted">${gameText(lang, "goodHabitsHelp")}</p>${renderHabitItems(habits, lang)}</section>
  <section class="panel panel-tilt-right"><h3 class="panel-title">${gameText(lang, "badHabits")}</h3>${renderBadHabitButtons(bad)}</section>
  <section class="panel">${renderCustomForm(lang)}</section>
  <section class="panel"><h3 class="panel-title">${gameText(lang, "todayLog")}</h3>${renderTodayLog(hero, lang, today)}</section>
</div>`;
}

/**
 * One button per Today item; a done one is greyed and disabled until tomorrow.
 * @param {import("../items-store.js").HabitItem[]} items
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderHabitItems(items, lang) {
  if (items.length === 0) return `<p class="muted">${gameText(lang, "noTodayHabits")}</p>`;
  const buttons = items.map((item) => {
    const track = item.track ?? "resistencia";
    const state = item.done ? `<b>✓ ${gameText(lang, "doneToday")}</b>` : `<b>+${item.xp ?? 1} ${trackTag(track)}</b>`;
    return `<button type="button" class="habit-button habit-good track-${track}${item.done ? " habit-done" : ""}" data-action="done-item" data-id="${escapeHtml(item.id)}"${item.done ? " disabled" : ""}>
        <span>${escapeHtml(item.name)}</span>${state}</button>`;
  });
  return `<div class="habit-buttons">${buttons.join("")}</div>`;
}

/**
 * @param {{ id: string, label: string, track: string, xp: number }[]} habits
 * @returns {string}
 */
function renderBadHabitButtons(habits) {
  const buttons = habits.map(
    (habit) =>
      `<button type="button" class="habit-button habit-bad track-${habit.track}" data-action="log-habit" data-habit="${escapeHtml(habit.id)}">
        <span>${escapeHtml(habit.label)}</span><b>${habit.xp} ${trackTag(habit.track)}</b></button>`,
  );
  return `<div class="habit-buttons">${buttons.join("")}</div>`;
}

/**
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderCustomForm(lang) {
  const options = ["poder", "habilidade", "resistencia"].map(
    (track) => `<option value="${track}">${gameText(lang, `track${track.charAt(0).toUpperCase()}${track.slice(1)}`)}</option>`,
  );
  return `<h3 class="panel-title">${gameText(lang, "customHabit")}</h3>
  <form class="custom-habit-form" data-form="custom-habit">
    <label>${gameText(lang, "customName")} <input type="text" name="label" maxlength="60" required /></label>
    <label>${gameText(lang, "customTrack")} <select name="track">${options.join("")}</select></label>
    <label>${gameText(lang, "customXp")} <input type="number" name="xp" min="1" max="3" value="1" /></label>
    <label>${gameText(lang, "customPvHit")} <input type="number" name="pvHit" min="0" max="3" value="0" /></label>
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
 * Build a custom bad habit from the form (good habits are Today items on the list).
 * @param {FormData} fields
 * @param {() => string} makeId
 * @returns {{ habit: import("./hero-sheet.js").Hero["customHabits"][number] } | { error: "customError" }}
 * @example customHabitFromForm(form, () => "custom-1") // { habit: { ..., good: false, xp: -1 } }
 */
export function customHabitFromForm(fields, makeId) {
  const label = String(fields.get("label") ?? "").trim();
  if (!label) return { error: "customError" };
  const xp = Math.max(1, Math.min(3, Number(fields.get("xp")) || 1));
  const pvHit = Math.max(0, Math.min(3, Number(fields.get("pvHit")) || 0));
  const track = /** @type {import("./catalog.js").Track} */ (String(fields.get("track") ?? "resistencia"));
  return { habit: { id: makeId(), label, track, xp: -xp, good: false, ...(pvHit ? { pvHit } : {}) } };
}
