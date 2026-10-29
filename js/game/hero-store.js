// hero-store.js: the hero in localStorage, plus the bridge from Hero to a combat Combatant.

import { ITEM_EFFECTS } from "./catalog.js";
import { HERO_VERSION, createStartingHero, deriveSheet } from "./hero-sheet.js";
import { STARTING_HEIGHT_CM } from "./weight.js";
import { artefatoBonus, consumeItem } from "./progression.js";

export const HERO_KEY = "habits:hero:v1";

/**
 * @param {{ getItem: (k: string) => string | null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void }} storage
 */
export function createHeroStore(storage) {
  return {
    /** @returns {import("./hero-sheet.js").Hero | null} */
    load() {
      const saved = storage.getItem(HERO_KEY);
      if (!saved) return null;
      const parsed = safeParse(saved);
      return isHero(parsed) ? parsed : null;
    },
    /** @param {import("./hero-sheet.js").Hero} hero */
    save(hero) {
      storage.setItem(HERO_KEY, JSON.stringify(hero));
    },
    clear() {
      storage.removeItem(HERO_KEY);
    },
  };
}

/**
 * @param {string} text
 * @returns {unknown}
 */
function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * @param {unknown} raw
 * @returns {raw is import("./hero-sheet.js").Hero}
 */
export function isHero(raw) {
  if (typeof raw !== "object" || raw === null) return false;
  const hero = /** @type {Record<string, unknown>} */ (raw);
  return (
    hero.version === HERO_VERSION &&
    typeof hero.weightKg === "number" &&
    Array.isArray(hero.owned) &&
    typeof hero.pools === "object"
  );
}

/**
 * Load the hero or start Diego's sheet fresh.
 * @param {ReturnType<typeof createHeroStore>} store
 * @param {string} today
 * @returns {import("./hero-sheet.js").Hero}
 */
export function loadOrCreateHero(store, today) {
  const saved = store.load();
  // Heroes saved before the BMI rule (2026-10-29) have no height yet.
  if (saved) return { heightCm: STARTING_HEIGHT_CM, ...saved };
  const hero = createStartingHero(today);
  store.save(hero);
  return hero;
}

/**
 * The hero as the combat engine sees them.
 * @param {import("./hero-sheet.js").Hero} hero
 * @returns {import("./combat.js").Combatant}
 */
export function combatantFromHero(hero) {
  const sheet = deriveSheet(hero);
  return {
    attributes: hero.attributes,
    pv: hero.current.pv,
    pm: hero.current.pm,
    pa: hero.current.pa,
    luta: hero.owned.includes("pericia.luta"),
    traits: [...sheet.desvantagens, ...hero.owned],
    bonus: {
      attack: artefatoBonus(hero, "attack"),
      defense: artefatoBonus(hero, "defense"),
      initiative: artefatoBonus(hero, "initiative"),
    },
  };
}

/**
 * Write the duel's PV/PM/PA back into the hero after a fight.
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {import("./combat.js").Combatant} fighter
 * @returns {import("./hero-sheet.js").Hero}
 */
export function heroAfterDuel(hero, fighter) {
  const max = deriveSheet(hero).max;
  return {
    ...hero,
    current: { pv: Math.min(max.pv, fighter.pv), pm: Math.min(max.pm, fighter.pm), pa: Math.min(max.pa, fighter.pa) },
  };
}

/**
 * Use a consumable outside or inside a fight: restores PV/PM/PA up to the maxima.
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {string} itemId
 * @returns {import("./hero-sheet.js").Hero}
 */
export function useConsumable(hero, itemId) {
  const effect = ITEM_EFFECTS[itemId];
  if (!effect || !hero.owned.includes(itemId)) return hero;
  const max = deriveSheet(hero).max;
  const current = {
    pv: Math.min(max.pv, hero.current.pv + (effect.pv ?? 0)),
    pm: Math.min(max.pm, hero.current.pm + (effect.pm ?? 0)),
    pa: Math.min(max.pa, hero.current.pa + (effect.pa ?? 0)),
  };
  return { ...consumeItem(hero, itemId), current };
}
