// categories.js: the Source column of the "ToDo List" sheet. Since 2026-10-29 (Diego) the
// categories are the three 3DeT características, so every item done pays XP to the track it
// trains: Poder (doing, shipping, sport), Habilidade (reading, courses, code, languages),
// Resistência (devotional, finances, health, rest). The sheet's old values (Read, Watch,
// Side Hustle, Today, Personal) are still read, never written. Whether an item is a Today
// habit (once a day, back every morning) is the separate `daily` flag.

/** @typedef {"Poder" | "Habilidade" | "Resistência"} Category */
/** @typedef {"poder" | "habilidade" | "resistencia"} HabitTrack */

/** @type {Category[]} */
export const CATEGORIES = ["Poder", "Habilidade", "Resistência"];
/** The list tab that shows the daily items; not a category. */
export const TODAY_FILTER = "Today";
/** @type {HabitTrack[]} */
export const HABIT_TRACKS = ["poder", "habilidade", "resistencia"];
export const DEFAULT_CATEGORY = /** @type {Category} */ ("Resistência");

/** @type {Record<Category, HabitTrack>} */
const CATEGORY_TRACK = { Poder: "poder", Habilidade: "habilidade", Resistência: "resistencia" };
/** @type {Record<HabitTrack, Category>} */
const TRACK_CATEGORY = { poder: "Poder", habilidade: "Habilidade", resistencia: "Resistência" };
/** The sheet's pre-2026-10-29 Source values and the característica they train by default. */
const LEGACY_CATEGORY = /** @type {Record<string, Category>} */ ({
  Read: "Habilidade",
  Watch: "Resistência",
  "Side Hustle": "Poder",
});
/** The old "a Today item is a category" model ("Personal" before that): the daily flag now. */
const LEGACY_DAILY_CATEGORIES = ["Today", "Personal"];

/** i18n key for each category label. */
const CATEGORY_I18N_KEYS = {
  Poder: "categoryPoder",
  Habilidade: "categoryHabilidade",
  Resistência: "categoryResistencia",
};

/** Short "sound effect" stamp drawn on each card. */
const CATEGORY_STAMPS = { Poder: "力", Habilidade: "技", Resistência: "耐" };

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
 * @param {unknown} value
 * @returns {boolean} true for "Today" or "Personal", the old daily categories
 */
export function isLegacyDailyCategory(value) {
  return typeof value === "string" && LEGACY_DAILY_CATEGORIES.includes(value);
}

/**
 * @param {unknown} value
 * @returns {boolean} true for any pre-2026-10-29 Source value (its característica is a guess)
 */
export function isLegacyCategory(value) {
  return isLegacyDailyCategory(value) || (typeof value === "string" && value in LEGACY_CATEGORY);
}

/**
 * The XP track an item of this category trains.
 * @param {string} category
 * @returns {HabitTrack | undefined} undefined for an unknown category
 * @example categoryTrack("Resistência") // "resistencia"
 */
export function categoryTrack(category) {
  return CATEGORY_TRACK[/** @type {Category} */ (category)];
}

/**
 * A stored category as it is today: Read → Habilidade, Watch → Resistência, Side Hustle →
 * Poder; a Today/Personal item follows the track it had (Resistência without one).
 * @param {unknown} category
 * @param {unknown} [track] the old Today items' own track
 * @returns {Category | null} null when it is none of the categories, old or new
 * @example migrateCategory("Today", "poder") // "Poder"
 */
export function migrateCategory(category, track) {
  if (typeof category !== "string") return null;
  if (isCategory(category)) return category;
  if (isLegacyDailyCategory(category)) return isHabitTrack(String(track)) ? TRACK_CATEGORY[track] : DEFAULT_CATEGORY;
  return LEGACY_CATEGORY[category] ?? null;
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
 * CSS-friendly slug, the track name: "Resistência" → "resistencia".
 * @param {Category} category
 * @returns {string}
 */
export function categorySlug(category) {
  return CATEGORY_TRACK[category];
}
