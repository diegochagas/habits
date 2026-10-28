// weight.js: body weight drives the physical desvantagens and how the sprite is drawn.
// The book has no weight rule; Lento (Perda na iniciativa) and Frágil (Perda e sem crítico em
// testes físicos de Resistência) are the closest fits, and both go away as the kilos drop.

export const FRAGIL_FROM_KG = 105;
export const LENTO_FROM_KG = 95;
export const ATHLETIC_BELOW_KG = 88;
export const STARTING_WEIGHT_KG = 111.9;

/**
 * Desvantagem keys the current weight imposes.
 * @param {number} weightKg
 * @returns {("lento" | "fragil")[]}
 * @example weightDesvantagens(111.9) // ["lento", "fragil"]
 */
export function weightDesvantagens(weightKg) {
  /** @type {("lento" | "fragil")[]} */
  const list = [];
  if (weightKg >= LENTO_FROM_KG) list.push("lento");
  if (weightKg >= FRAGIL_FROM_KG) list.push("fragil");
  return list;
}

/**
 * 0 = athletic, 1 = starting weight (or heavier). Linear between the athletic and starting marks.
 * @param {number} weightKg
 * @returns {number}
 */
export function bodyMassFactor(weightKg) {
  const span = STARTING_WEIGHT_KG - ATHLETIC_BELOW_KG;
  const factor = (weightKg - ATHLETIC_BELOW_KG) / span;
  return Math.max(0, Math.min(1.2, factor));
}

/**
 * Validate a weight typed by the player.
 * @param {unknown} raw
 * @returns {{ kg: number } | { error: string }}
 */
export function parseWeight(raw) {
  const kg = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
  if (!Number.isFinite(kg) || kg < 30 || kg > 400)
    return { error: `weight ${JSON.stringify(raw)}: expected 30–400 kg` };
  return { kg: Math.round(kg * 10) / 10 };
}
