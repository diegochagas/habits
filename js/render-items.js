// render-items.js: HTML for the item cards and the category tabs. No state here.

import { CATEGORIES, TODAY_FILTER, categoryI18nKey, categorySlug, categoryStamp } from "./categories.js";
import { translate } from "./i18n.js";
import { isHabit } from "./items-store.js";
import { escapeHtml, linkifyDescription } from "./linkify.js";

/** @typedef {{ pomodoros?: Record<string, number>, pomodoroLabel?: string, editingId?: string | null, editor?: string }} CardExtras */

/**
 * @param {import("./items-store.js").HabitItem} item
 * @param {import("./i18n.js").Lang} lang
 * @param {CardExtras} [extras] finished Pomodoros per item, the label of the "start one" button,
 *   and the card being edited (its editor HTML replaces the body)
 * @returns {string}
 */
export function renderItemCard(item, lang, extras = {}) {
  const doneClass = item.done ? (isHabit(item) ? " card-done card-done-today" : " card-done") : "";
  const editing = extras.editingId === item.id && extras.editor;
  return `<article class="card panel category-${categorySlug(item.category)}${doneClass}" data-id="${escapeHtml(item.id)}">
  <span class="card-stamp" aria-hidden="true">${categoryStamp(item.category)}</span>
  <span class="card-category">${translate(lang, categoryI18nKey(item.category))}</span>
  ${editing ? extras.editor : renderCardBody(item, lang, extras)}
</article>`;
}

/**
 * @param {import("./items-store.js").HabitItem} item
 * @param {import("./i18n.js").Lang} lang
 * @param {CardExtras} extras
 * @returns {string}
 */
function renderCardBody(item, lang, extras) {
  const count = extras.pomodoros?.[item.id] ?? 0;
  return `<h3 class="card-name">${renderName(item)}${isHabit(item) ? ` <span class="card-daily" title="${translate(lang, "daily")}">🔁 +${item.xp ?? 1}</span>` : ""}</h3>
  ${isHabit(item) && item.done ? `<p class="card-done-today-note">✓ ${translate(lang, "doneToday")}</p>` : ""}
  ${renderDescription(item.description)}
  <footer class="card-footer">
    <time class="card-date" datetime="${escapeHtml(item.date)}">${formatDate(item.date)}</time>${count > 0 ? `<span class="card-pomodoros" title="Pomodoros">🍅 ${count}</span>` : ""}
    <span class="card-actions">
      ${item.done || !extras.pomodoroLabel ? "" : `<button type="button" class="stamp stamp-small" data-action="pomodoro">🍅 ${escapeHtml(extras.pomodoroLabel)}</button>`}
      <button type="button" class="stamp stamp-small" data-action="toggle">${translate(lang, item.done ? "markTodo" : "markDone")}</button>
      <button type="button" class="stamp stamp-small" data-action="edit">${translate(lang, "edit")}</button>
      <button type="button" class="stamp stamp-small stamp-danger" data-action="remove">${translate(lang, "remove")}</button>
    </span>
  </footer>`;
}

/**
 * The card title: a link to the item's url when it has one (opens in a new tab).
 * @param {import("./items-store.js").HabitItem} item
 * @returns {string}
 */
function renderName(item) {
  if (!item.url) return escapeHtml(item.name);
  return `<a class="card-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)}</a>`;
}

/**
 * "poder" → "P": the track letter shown next to a habit's XP.
 * @param {string} [track]
 * @returns {string}
 */
export function trackTag(track = "resistencia") {
  return track.charAt(0).toUpperCase();
}

/**
 * @param {string} description
 * @returns {string}
 */
function renderDescription(description) {
  if (!description.trim()) return "";
  return `<p class="card-description">${linkifyDescription(description)}</p>`;
}

/**
 * yyyy-mm-dd → dd/mm/yyyy (the sheet's own format); anything else is shown as-is.
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDate(isoDate) {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : escapeHtml(isoDate);
}

/**
 * @param {import("./items-store.js").HabitItem[]} items
 * @param {import("./i18n.js").Lang} lang
 * @param {CardExtras} [extras]
 * @returns {string}
 */
export function renderItemGrid(items, lang, extras = {}) {
  return items.map((item) => renderItemCard(item, lang, extras)).join("\n");
}

/**
 * @param {Record<string, number>} counts
 * @param {string} active
 * @param {import("./i18n.js").Lang} lang
 * @returns {string}
 */
export function renderCategoryTabs(counts, active, lang) {
  const tabs = ["All", ...CATEGORIES, TODAY_FILTER].map((category) =>
    renderTab(category, counts[category] ?? 0, category === active, lang),
  );
  return tabs.join("");
}

/**
 * @param {string} category
 * @param {number} count
 * @param {boolean} active
 * @param {import("./i18n.js").Lang} lang
 * @returns {string}
 */
function renderTab(category, count, active, lang) {
  const key = tabI18nKey(category);
  const label = translate(lang, key);
  return `<button type="button" role="tab" class="tab${active ? " tab-active" : ""}" aria-selected="${active}" data-category="${escapeHtml(category)}">${label} <b>${count}</b></button>`;
}

/**
 * @param {string} tab "All", a category, or the Today filter
 * @returns {string}
 */
function tabI18nKey(tab) {
  if (tab === "All") return "categoryAll";
  if (tab === TODAY_FILTER) return "categoryToday";
  return categoryI18nKey(/** @type {import("./categories.js").Category} */ (tab));
}

/**
 * @param {import("./i18n.js").Lang} lang
 * @param {string} [selected] the category to mark selected
 * @returns {string}
 */
export function renderCategoryOptions(lang, selected = "") {
  return CATEGORIES.map(
    (category) =>
      `<option value="${category}"${category === selected ? " selected" : ""}>${translate(lang, categoryI18nKey(category))}</option>`,
  ).join("");
}
