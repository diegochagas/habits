// render-item-editor.js: the inline edit form a card turns into when its Edit button is pressed.
// Same fields as the add form (name, category, the Today-habit checkbox with its XP per day,
// description) plus the date. No state here: app.js keeps `editingId` and handles the submit.

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
  ${renderHabitFields(lang, item.daily, item.xp)}
  <label class="field"><span>${translate(lang, "fieldDescription")}</span>
    <textarea name="description" rows="3" maxlength="2000">${escapeHtml(item.description)}</textarea></label>
  <label class="field"><span>${translate(lang, "fieldUrl")}</span>
    <input type="url" name="url" maxlength="2000" value="${escapeHtml(item.url ?? "")}" /></label>
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
 * The Today-habit checkbox and the XP-per-day field it reveals (see toggleHabitFields).
 * @param {import("./i18n.js").Lang} lang
 * @param {boolean} [daily]
 * @param {number} [xp]
 * @returns {string}
 * @example renderHabitFields("en", true, 2)
 */
export function renderHabitFields(lang, daily = false, xp = 1) {
  return `<div class="item-editor-row" data-habit-fields>
    <label class="field field-check" title="${translate(lang, "daily")}"><input type="checkbox" name="daily"${daily ? " checked" : ""} /> <span>${translate(lang, "fieldDaily")}</span></label>
    <label class="field" data-xp-field${daily ? "" : " hidden"}><span>${translate(lang, "fieldXp")}</span><input type="number" name="xp" min="1" max="3" value="${xp}" /></label>
  </div>`;
}

/**
 * Show the XP-per-day field of a form while its Today-habit box is ticked.
 * @param {HTMLFormElement} form the add form or an editor
 */
export function toggleHabitFields(form) {
  const daily = /** @type {HTMLInputElement | null} */ (form.querySelector("input[name='daily']"));
  const xpField = /** @type {HTMLElement | null} */ (form.querySelector("[data-xp-field]"));
  if (daily && xpField) xpField.hidden = !daily.checked;
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
    url: String(fields.get("url") ?? ""),
    date: String(fields.get("date") ?? ""),
    daily: fields.get("daily") === "on",
    xp: String(fields.get("xp") ?? ""),
  };
}
