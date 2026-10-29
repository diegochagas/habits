// hero-look.js: Diego's ChibiLook from the hero sheet, drawn by diego-sprite.js (his own pixel
// sheet): weight sets the build, the last week of habits sets skin/aura, owned items add
// glasses/dumbbell/vest/headband, the tier adds cape/crown.

import { deriveSheet } from "./hero-sheet.js";
import { auraScore } from "./progression.js";
import { bodyMassFactor } from "./weight.js";

const GOLD = "#f2c94c";

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {string} today
 * @returns {import("./chibi-sprite.js").ChibiLook}
 * @example heroLook(hero, "2026-10-28").build // 1 at 111.9 kg
 */
export function heroLook(hero, today) {
  const aura = auraScore(hero, today);
  const tier = deriveSheet(hero).tier;
  const owned = hero.owned;
  const skin = aura < -1 ? "#cdb39f" : "#e8a862";
  return {
    sheet: "diego",
    build: bodyMassFactor(hero.weightKg),
    skin,
    hair: "#3a2416",
    beard: "#1a1a1a",
    glasses: owned.includes("artefato.oculos") ? GOLD : "#111",
    shirt: "#1c1c1c",
    pants: "#232323",
    legs: skin,
    shoes: "#1b1b1b",
    shoeTrim: "#c0392b",
    eyes: "ink",
    hat: tier === "veterano" ? "crown" : null,
    held: owned.includes("artefato.halter") ? "dumbbell" : null,
    cape: tier !== "iniciante",
    vest: owned.includes("artefato.colete"),
    headband: owned.includes("vantagem.forte"),
    tall: false,
    aura,
  };
}
