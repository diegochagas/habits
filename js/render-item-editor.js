// render-item-editor.js: the inline edit form a card turns into when its Edit button is pressed.
// Same fields as the add form (name, category, description) plus the date and the daily flag.
// No state here: app.js keeps `editingId` and handles the form's submit.

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
  <label class="field"><span>${translate(lang, "fieldDescription")}</span>
    <textarea name="description" rows="3" maxlength="2000">${escapeHtml(item.description)}</textarea></label>
  <div class="item-editor-row">
    <label class="field"><span>${translate(lang, "fieldDate")}</span>
      <input type="date" name="date" value="${escapeHtml(item.date)}" /></label>
    <label class="field field-check"><input type="checkbox" name="daily" ${item.daily ? "checked" : ""} />
      <span>${translate(lang, "fieldDaily")}</span></label>
  </div>
  <p class="form-error" data-edit-error role="alert" hidden></p>
  <span class="card-actions">
    <button type="submit" class="stamp stamp-small">${translate(lang, "editSave")}</button>
    <button type="button" class="stamp stamp-small" data-action="cancel-edit">${translate(lang, "editCancel")}</button>
  </span>
</form>`;
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
    daily: fields.get("daily") === "on",
  };
}
