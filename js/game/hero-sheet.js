// hero-sheet.js: Diego's starting Ficha and the derived sheet (attributes + desvantagens from weight).
// Starting build (12 pts = 10 + 2 from the weight desvantagens): P2 H2 R2; Luta, Máquinas, Saber;
// Devoto, Foco, Inventário (Pequeno); Lento, Frágil.

import { maxResources, tierForPoints, XP_PER_POINT } from "./rules.js";
import { STARTING_WEIGHT_KG, weightDesvantagens } from "./weight.js";

/**
 * @typedef {object} Hero
 * @property {number} version
 * @property {number} weightKg
 * @property {{ date: string, kg: number }[]} weightLog
 * @property {{ P: number, H: number, R: number }} attributes
 * @property {string[]} owned shop ids and starting perícias/vantagens (stackables repeat)
 * @property {Record<string, number>} pools XP available per track
 * @property {number} xpEarned lifetime XP earned (never decreases)
 * @property {number} xpSpent
 * @property {{ pv: number, pm: number, pa: number }} current
 * @property {string} lastRestDate yyyy-mm-dd of the last full recovery
 * @property {{ date: string, habitId: string, xp: number, track: string, good: boolean, label?: string }[]} habitLog
 * @property {{ id: string, label: string, track: string, xp: number, good: boolean, pvHit?: number }[]} customHabits
 * @property {string[]} creditedListItemIds
 * @property {Record<string, { minions: number, bossBeaten: boolean, lastClearDate: string }>} stages
 */

export const HERO_VERSION = 1;
export const STARTING_OWNED = [
  "pericia.luta",
  "pericia.maquinas",
  "pericia.saber",
  "vantagem.devoto",
  "vantagem.foco",
  "vantagem.inventario",
];

/**
 * @param {string} today yyyy-mm-dd
 * @returns {Hero}
 */
export function createStartingHero(today) {
  const attributes = { P: 2, H: 2, R: 2 };
  return {
    version: HERO_VERSION,
    weightKg: STARTING_WEIGHT_KG,
    weightLog: [{ date: today, kg: STARTING_WEIGHT_KG }],
    attributes,
    owned: [...STARTING_OWNED],
    pools: { poder: 0, habilidade: 0, resistencia: 0 },
    xpEarned: 0,
    xpSpent: 0,
    current: maxResources(attributes),
    lastRestDate: today,
    habitLog: [],
    customHabits: [],
    creditedListItemIds: [],
    stages: {},
  };
}

/**
 * Everything the UI and combat need, computed from the stored hero.
 * @param {Hero} hero
 * @returns {{ attributes: Hero["attributes"], max: { pv: number, pm: number, pa: number }, desvantagens: string[],
 *   points: number, tier: string, owns: (id: string) => boolean, count: (id: string) => number }}
 */
export function deriveSheet(hero) {
  const desvantagens = weightDesvantagens(hero.weightKg);
  const max = maxResources(hero.attributes);
  max.pa += 2 * countOwned(hero, "vantagem.maisAcao");
  const points = 12 + Math.floor(hero.xpSpent / XP_PER_POINT);
  return {
    attributes: hero.attributes,
    max,
    desvantagens,
    points,
    tier: tierForPoints(points),
    owns: (id) => hero.owned.includes(id),
    count: (id) => countOwned(hero, id),
  };
}

/**
 * @param {Hero} hero
 * @param {string} id
 * @returns {number}
 */
export function countOwned(hero, id) {
  return hero.owned.filter((owned) => owned === id).length;
}

/**
 * Clamp current resources to the maxima (after buying R, or losing weight).
 * @param {Hero} hero
 * @returns {Hero}
 */
export function clampResources(hero) {
  const max = deriveSheet(hero).max;
  return {
    ...hero,
    current: {
      pv: Math.max(0, Math.min(max.pv, hero.current.pv)),
      pm: Math.max(0, Math.min(max.pm, hero.current.pm)),
      pa: Math.max(0, Math.min(max.pa, hero.current.pa)),
    },
  };
}

/**
 * Full recovery (8 hours of sleep), once per calendar day.
 * @param {Hero} hero
 * @param {string} today
 * @returns {{ hero: Hero, rested: boolean }}
 */
export function restHero(hero, today) {
  if (hero.lastRestDate === today) return { hero, rested: false };
  return { hero: { ...hero, current: deriveSheet(hero).max, lastRestDate: today }, rested: true };
}
