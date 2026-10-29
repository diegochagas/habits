// render-item-editor.js: the inline edit form a card turns into when its Edit button is pressed.
// Same fields as the add form (name, category, description, track + XP for Today items) plus
// the date. No state here: app.js keeps `editingId` and handles the form's submit.

import { HABIT_TRACKS, TODAY_CATEGORY } from "./categories.js";
import { renderCategoryOptions } from "./render-items.js";
import { translate } from "./i18n.js";
import { escapeHtml } from "./linkify.js";

/**
 * @param {import("./items-store.js").HabitItem} item
 * @param {import("./i18n.js").Lang} lang
 * @returns {string}
 * @example renderItemEditor(item, "en") // <form data-form="edit-item" ...>
 */
export function renderItemEditor(item, lang) {
  return `<form class="item-editor" data-form="edit-item" novalidate>
  <label class="field"><span>${translate(lang, "fieldName")}</span>
    <input type="text" name="name" required maxlength="200" value="${escapeHtml(item.name)}" /></label>
  <label class="field"><span>${translate(lang, "fieldCategory")}</span>
    <select name="category">${renderCategoryOptions(lang, item.category)}</select></label>
  ${renderHabitFields(lang, item.track, item.xp, item.category === TODAY_CATEGORY)}
  <label class="field"><span>${translate(lang, "fieldDescription")}</span>
    <textarea name="description" rows="3" maxlength="2000">${escapeHtml(item.description)}</textarea></label>
  <label class="field"><span>${translate(lang, "fieldDate")}</span>
    <input type="date" name="date" value="${escapeHtml(item.date)}" /></label>
  <p class="form-error" data-edit-error role="alert" hidden></p>
  <span class="card-actions">
    <button type="submit" class="stamp stamp-small">${translate(lang, "editSave")}</button>
    <button type="button" class="stamp stamp-small" data-action="cancel-edit">${translate(lang, "editCancel")}</button>
  </span>
</form>`;
}

/**
 * Track + XP fields, shown only while the category is Today (see toggleHabitFields).
 * @param {import("./i18n.js").Lang} lang
 * @param {string} [track]
 * @param {number} [xp]
 * @param {boolean} [shown]
 * @returns {string}
 * @example renderHabitFields("en", "poder", 2, true)
 */
export function renderHabitFields(lang, track = "resistencia", xp = 1, shown = false) {
  const options = HABIT_TRACKS.map(
    (name) => `<option value="${name}"${name === track ? " selected" : ""}>${translate(lang, `track.${name}`)}</option>`,
  );
  return `<div class="item-editor-row" data-habit-fields${shown ? "" : " hidden"}>
    <label class="field"><span>${translate(lang, "fieldTrack")}</span><select name="track">${options.join("")}</select></label>
    <label class="field"><span>${translate(lang, "fieldXp")}</span><input type="number" name="xp" min="1" max="3" value="${xp}" /></label>
  </div>`;
}

/**
 * Show the track + XP fields of a form while its category select says Today.
 * @param {HTMLFormElement} form the add form or an editor
 */
export function toggleHabitFields(form) {
  const category = /** @type {HTMLSelectElement | null} */ (form.querySelector("select[name='category']"));
  const fields = /** @type {HTMLElement | null} */ (form.querySelector("[data-habit-fields]"));
  if (category && fields) fields.hidden = category.value !== TODAY_CATEGORY;
}

/**
 * The fields of a submitted editor (or the add form).
 * @param {HTMLFormElement} form
 * @returns {import("./items-store.js").ItemFields}
 */
export function itemFieldsFromForm(form) {
  const fields = new FormData(form);
  return {
    name: String(fields.get("name") ?? ""),
    category: String(fields.get("category") ?? ""),
    description: String(fields.get("description") ?? ""),
    date: String(fields.get("date") ?? ""),
    track: String(fields.get("track") ?? ""),
    xp: String(fields.get("xp") ?? ""),
  };
}
