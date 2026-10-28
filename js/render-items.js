// render-items.js: HTML for the item cards and the category tabs. No state here.

import { CATEGORIES, categoryI18nKey, categorySlug, categoryStamp } from "./categories.js";
import { translate } from "./i18n.js";
import { escapeHtml, linkifyDescription } from "./linkify.js";

/**
 * @param {import("./items-store.js").HabitItem} item
 * @param {import("./i18n.js").Lang} lang
 * @returns {string}
 */
export function renderItemCard(item, lang) {
  const doneClass = item.done ? " card-done" : "";
  return `<article class="card panel category-${categorySlug(item.category)}${doneClass}" data-id="${escapeHtml(item.id)}">
  <span class="card-stamp" aria-hidden="true">${categoryStamp(item.category)}</span>
  <span class="card-category">${translate(lang, categoryI18nKey(item.category))}</span>
  <h3 class="card-name">${escapeHtml(item.name)}</h3>
  ${renderDescription(item.description)}
  <footer class="card-footer">
    <time class="card-date" datetime="${escapeHtml(item.date)}">${formatDate(item.date)}</time>
    <span class="card-actions">
      <button type="button" class="stamp stamp-small" data-action="toggle">${translate(lang, item.done ? "markTodo" : "markDone")}</button>
      <button type="button" class="stamp stamp-small stamp-danger" data-action="remove">${translate(lang, "remove")}</button>
    </span>
  </footer>
</article>`;
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
 * @returns {string}
 */
export function renderItemGrid(items, lang) {
  return items.map((item) => renderItemCard(item, lang)).join("\n");
}

/**
 * @param {Record<string, number>} counts
 * @param {string} active
 * @param {import("./i18n.js").Lang} lang
 * @returns {string}
 */
export function renderCategoryTabs(counts, active, lang) {
  const tabs = ["All", ...CATEGORIES].map((category) =>
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
  const key =
    category === "All" ? "categoryAll" : categoryI18nKey(/** @type {import("./categories.js").Category} */ (category));
  const label = translate(lang, key);
  return `<button type="button" role="tab" class="tab${active ? " tab-active" : ""}" aria-selected="${active}" data-category="${escapeHtml(category)}">${label} <b>${count}</b></button>`;
}

/**
 * @param {import("./i18n.js").Lang} lang
 * @returns {string}
 */
export function renderCategoryOptions(lang) {
  return CATEGORIES.map(
    (category) => `<option value="${category}">${translate(lang, categoryI18nKey(category))}</option>`,
  ).join("");
}
