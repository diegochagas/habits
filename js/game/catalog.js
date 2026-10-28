// catalog.js: everything the hero can earn or buy, each tied to the habit track that pays for it.
// Tracks: "poder" (gym, sport, fights), "habilidade" (reading, study, code, languages),
// "resistencia" (devotional, food, sleep, finances). Names are the book's own.

/** @typedef {"poder" | "habilidade" | "resistencia"} Track */

/**
 * @typedef {object} HabitDefinition
 * @property {string} id
 * @property {Track} track
 * @property {number} xp positive for good habits, negative for bad ones
 * @property {boolean} good
 * @property {number} [pvHit] PV lost today when a bad habit is logged
 */

/** @type {HabitDefinition[]} */
export const DEFAULT_HABITS = [
  { id: "gym", track: "poder", xp: 2, good: true },
  { id: "walk", track: "poder", xp: 1, good: true },
  { id: "read", track: "habilidade", xp: 1, good: true },
  { id: "study", track: "habilidade", xp: 1, good: true },
  { id: "code", track: "habilidade", xp: 1, good: true },
  { id: "language", track: "habilidade", xp: 1, good: true },
  { id: "devotional", track: "resistencia", xp: 1, good: true },
  { id: "healthyMeal", track: "resistencia", xp: 1, good: true },
  { id: "sleep", track: "resistencia", xp: 1, good: true },
  { id: "budget", track: "resistencia", xp: 1, good: true },
  { id: "junkFood", track: "resistencia", xp: -2, good: false, pvHit: 3 },
  { id: "spending", track: "resistencia", xp: -2, good: false },
  { id: "skipGym", track: "poder", xp: -1, good: false },
  { id: "doomscroll", track: "habilidade", xp: -1, good: false },
  { id: "badSleep", track: "resistencia", xp: -1, good: false, pvHit: 2 },
  { id: "sugar", track: "resistencia", xp: -1, good: false, pvHit: 1 },
];

/** Track credited when an item of the Habits list is marked done (+1 XP, objetivo menor). */
export const LIST_CATEGORY_TRACK = {
  Read: "habilidade",
  Watch: "habilidade",
  "Side Hustle": "habilidade",
  Personal: "resistencia",
};

/**
 * @typedef {object} ShopEntry
 * @property {string} id
 * @property {"pericia" | "vantagem" | "item" | "artefato"} kind
 * @property {Track} track
 * @property {number} xp
 * @property {string[]} [requires] ids that must already be owned
 * @property {string[]} [excludes] desvantagem keys that block it (Frágil blocks Vigoroso, etc.)
 * @property {number} [stack] how many times it can be bought (default 1)
 */

/** @type {ShopEntry[]} */
export const SHOP = [
  { id: "pericia.esporte", kind: "pericia", track: "poder", xp: 10 },
  { id: "pericia.arte", kind: "pericia", track: "habilidade", xp: 10 },
  { id: "pericia.influencia", kind: "pericia", track: "habilidade", xp: 10 },
  { id: "pericia.mistica", kind: "pericia", track: "resistencia", xp: 10 },
  { id: "pericia.medicina", kind: "pericia", track: "resistencia", xp: 10 },
  { id: "vantagem.forte", kind: "vantagem", track: "poder", xp: 10, excludes: ["fracote"] },
  { id: "vantagem.agil", kind: "vantagem", track: "poder", xp: 10 },
  { id: "vantagem.maisAcao", kind: "vantagem", track: "poder", xp: 10, stack: 3 },
  { id: "vantagem.ataqueEspecial", kind: "vantagem", track: "poder", xp: 10, requires: ["pericia.luta"] },
  { id: "vantagem.maestriaLuta", kind: "vantagem", track: "poder", xp: 10, requires: ["pericia.luta"] },
  { id: "vantagem.genio", kind: "vantagem", track: "habilidade", xp: 10 },
  { id: "vantagem.foco", kind: "vantagem", track: "habilidade", xp: 10 },
  { id: "vantagem.mentorSaber", kind: "vantagem", track: "habilidade", xp: 10, requires: ["pericia.saber"] },
  { id: "vantagem.vigoroso", kind: "vantagem", track: "resistencia", xp: 10, excludes: ["fragil"] },
  { id: "vantagem.resoluto", kind: "vantagem", track: "resistencia", xp: 10 },
  { id: "vantagem.regeneracao", kind: "vantagem", track: "resistencia", xp: 10, stack: 2 },
  { id: "vantagem.cura", kind: "vantagem", track: "resistencia", xp: 10 },
  { id: "vantagem.defesaEspecial", kind: "vantagem", track: "resistencia", xp: 10, requires: ["pericia.luta"] },
  { id: "vantagem.riqueza", kind: "vantagem", track: "resistencia", xp: 20 },
  { id: "artefato.halter", kind: "artefato", track: "poder", xp: 10 },
  { id: "artefato.oculos", kind: "artefato", track: "habilidade", xp: 10 },
  { id: "artefato.colete", kind: "artefato", track: "resistencia", xp: 10 },
  { id: "item.marmita", kind: "item", track: "resistencia", xp: 2, stack: 5 },
  { id: "item.cafe", kind: "item", track: "habilidade", xp: 2, stack: 5 },
  { id: "item.whey", kind: "item", track: "poder", xp: 5, stack: 3 },
  { id: "item.agua", kind: "item", track: "resistencia", xp: 1, stack: 5 },
];

/** Effects of consumables (used by combat and the sheet). */
export const ITEM_EFFECTS = {
  "item.marmita": { pv: 5 },
  "item.cafe": { pa: 1 },
  "item.whey": { pv: 10 },
  "item.agua": { pm: 3 },
};

/** Artefato bonuses: attribute bonus applied in the matching test. */
export const ARTEFATO_BONUS = {
  "artefato.halter": { attack: 1 },
  "artefato.oculos": { initiative: 1 },
  "artefato.colete": { defense: 1 },
};

/** Attributes raised from each track. */
export const TRACK_ATTRIBUTE = { poder: "P", habilidade: "H", resistencia: "R" };

/**
 * @param {string} id
 * @returns {ShopEntry | undefined}
 */
export function shopEntry(id) {
  return SHOP.find((entry) => entry.id === id);
}

/**
 * @param {string} id
 * @returns {HabitDefinition | undefined}
 */
export function habitDefinition(id) {
  return DEFAULT_HABITS.find((habit) => habit.id === id);
}
