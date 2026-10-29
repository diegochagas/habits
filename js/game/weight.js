// weight.js: body mass drives the physical desvantagens and how the sprite is drawn. Since
// 2026-10-29 (Diego) the measure is the BMI (kg / m²), not the kilos: Lento (Perda na
// iniciativa) from obesity (BMI 30) and Frágil (Perda e sem crítico em testes físicos de
// Resistência) from obesity class II (BMI 35), the WHO cut-offs. The book has no weight rule;
// both go away as the BMI drops. The hero's height is logged next to the weight.

export const FRAGIL_FROM_BMI = 35;
export const LENTO_FROM_BMI = 30;
export const ATHLETIC_BELOW_BMI = 25;
export const STARTING_WEIGHT_KG = 111.9;
export const STARTING_HEIGHT_CM = 170;

/**
 * Body mass index, one decimal.
 * @param {number} weightKg
 * @param {number} heightCm
 * @returns {number}
 * @example bodyMassIndex(111.9, 170) // 38.7
 */
export function bodyMassIndex(weightKg, heightCm) {
  const metres = heightCm / 100;
  return Math.round((weightKg / (metres * metres)) * 10) / 10;
}

/**
 * Desvantagem keys the current BMI imposes.
 * @param {number} weightKg
 * @param {number} heightCm
 * @returns {("lento" | "fragil")[]}
 * @example weightDesvantagens(111.9, 170) // ["lento", "fragil"]
 */
export function weightDesvantagens(weightKg, heightCm) {
  const bmi = bodyMassIndex(weightKg, heightCm);
  /** @type {("lento" | "fragil")[]} */
  const list = [];
  if (bmi >= LENTO_FROM_BMI) list.push("lento");
  if (bmi >= FRAGIL_FROM_BMI) list.push("fragil");
  return list;
}

/**
 * 0 = athletic (BMI 25), 1 = the starting BMI (or heavier). Linear in between.
 * @param {number} weightKg
 * @param {number} heightCm
 * @returns {number}
 */
export function bodyMassFactor(weightKg, heightCm) {
  const span = bodyMassIndex(STARTING_WEIGHT_KG, STARTING_HEIGHT_CM) - ATHLETIC_BELOW_BMI;
  const factor = (bodyMassIndex(weightKg, heightCm) - ATHLETIC_BELOW_BMI) / span;
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

/**
 * Validate a height typed by the player.
 * @param {unknown} raw
 * @returns {{ cm: number } | { error: string }}
 * @example parseHeight("1,70") // { cm: 170 }: metres are accepted too
 */
export function parseHeight(raw) {
  const typed = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
  const cm = typed > 0 && typed < 3 ? typed * 100 : typed;
  if (!Number.isFinite(cm) || cm < 100 || cm > 250)
    return { error: `height ${JSON.stringify(raw)}: expected 100–250 cm` };
  return { cm: Math.round(cm) };
}
