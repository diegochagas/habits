// categories.js: the four columns of the original "ToDo List" sheet (Source column).

/** @typedef {"Read" | "Watch" | "Side Hustle" | "Personal"} Category */

/** @type {Category[]} */
export const CATEGORIES = ["Read", "Watch", "Side Hustle", "Personal"];

/** i18n key for each category label. */
const CATEGORY_I18N_KEYS = {
  Read: "categoryRead",
  Watch: "categoryWatch",
  "Side Hustle": "categorySideHustle",
  Personal: "categoryPersonal",
};

/** Short "sound effect" stamp drawn on each card. */
const CATEGORY_STAMPS = {
  Read: "読",
  Watch: "観",
  "Side Hustle": "業",
  Personal: "己",
};

/**
 * @param {string} value
 * @returns {value is Category}
 */
export function isCategory(value) {
  return CATEGORIES.includes(/** @type {Category} */ (value));
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
