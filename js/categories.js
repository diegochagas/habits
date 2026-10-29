// categories.js: the Source column of the "ToDo List" sheet. "Today" replaced "Personal" on
// 2026-10-29 (Diego): a Today item is a habit, listed on the Today tab, done once a day and
// back every morning; it carries its own XP track and amount.

/** @typedef {"Read" | "Watch" | "Side Hustle" | "Today"} Category */
/** @typedef {"poder" | "habilidade" | "resistencia"} HabitTrack */

/** @type {Category[]} */
export const CATEGORIES = ["Read", "Watch", "Side Hustle", "Today"];
export const TODAY_CATEGORY = "Today";
/** The sheet's old name for the Today column; still read, never written. */
export const LEGACY_PERSONAL = "Personal";
/** @type {HabitTrack[]} */
export const HABIT_TRACKS = ["poder", "habilidade", "resistencia"];
export const DEFAULT_HABIT_TRACK = "resistencia";

/** i18n key for each category label. */
const CATEGORY_I18N_KEYS = {
  Read: "categoryRead",
  Watch: "categoryWatch",
  "Side Hustle": "categorySideHustle",
  Today: "categoryToday",
};

/** Short "sound effect" stamp drawn on each card. */
const CATEGORY_STAMPS = {
  Read: "読",
  Watch: "観",
  "Side Hustle": "業",
  Today: "今",
};

/**
 * @param {string} value
 * @returns {value is Category}
 */
export function isCategory(value) {
  return CATEGORIES.includes(/** @type {Category} */ (value));
}

/**
 * @param {string} value
 * @returns {value is HabitTrack}
 */
export function isHabitTrack(value) {
  return HABIT_TRACKS.includes(/** @type {HabitTrack} */ (value));
}

/**
 * A stored category as it is today: "Personal" rows and items with the old `daily` flag are
 * Today items now.
 * @param {unknown} category
 * @param {boolean} [daily] the pre-2026-10-29 flag
 * @returns {Category | null} null when it is none of the categories
 * @example migrateCategory("Personal") // "Today"
 */
export function migrateCategory(category, daily = false) {
  if (category === LEGACY_PERSONAL || daily) return TODAY_CATEGORY;
  return typeof category === "string" && isCategory(category) ? category : null;
}

/**
 * @param {Category} category
 * @returns {string}
 */
export function categoryI18nKey(category) {
  return CATEGORY_I18N_KEYS[category];
}

/**
 * @param {Category} category
 * @returns {string}
 */
export function categoryStamp(category) {
  return CATEGORY_STAMPS[category];
}

/**
 * CSS-friendly slug: "Side Hustle" → "side-hustle".
 * @param {Category} category
 * @returns {string}
 */
export function categorySlug(category) {
  return category.toLowerCase().replace(/\s+/g, "-");
}
