// rules.js: the 3DeT Victory core, as pure functions.
// Sources: Manual 3DeT Victory (Jambô, 2024) ch.1 "Atributos"/"Recursos", ch.2 "3 Dados e Teste",
// "Acerto Crítico", "Rodada de Combate", ch.3 "XP".

/** @typedef {"P" | "H" | "R"} AttributeKey */
/** @typedef {{ P: number, H: number, R: number }} Attributes */

export const XP_PER_POINT = 10;
export const ATTRIBUTE_CAP_BEFORE_XP = 5;
export const XP_PER_ATTRIBUTE_ABOVE_CAP = 20;
export const STARTING_POINTS = 10;

/** Tiers from "Iniciantes, Heróis e Veteranos" (p.129). */
export const TIERS = [
  { key: "iniciante", minPoints: 0 },
  { key: "heroi", minPoints: 20 },
  { key: "veterano", minPoints: 35 },
];

/**
 * Recurso derivado: x5 (PV from R, PM from H), x1 for PA from P; an attribute 0 gives 1 point.
 * @param {number} attribute
 * @param {number} multiplier
 * @returns {number}
 * @example resourceFromAttribute(2, 5) // 10
 */
export function resourceFromAttribute(attribute, multiplier) {
  if (attribute <= 0) return 1;
  return attribute * multiplier;
}

/**
 * @param {Attributes} attributes
 * @returns {{ pv: number, pm: number, pa: number }}
 */
export function maxResources(attributes) {
  return {
    pv: resourceFromAttribute(attributes.R, 5),
    pm: resourceFromAttribute(attributes.H, 5),
    pa: resourceFromAttribute(attributes.P, 1),
  };
}

/**
 * How many dice a test rolls: 1 base, +1 with the perícia, +1 with a Ganho, -1 with a Perda,
 * always between 1 and 3. Ganhos and Perdas cancel one to one but never stack beyond one die.
 * @param {{ pericia?: boolean, ganhos?: number, perdas?: number }} modifiers
 * @returns {number}
 * @example diceForTest({ pericia: true, ganhos: 1 }) // 3
 */
export function diceForTest(modifiers) {
  const ganhos = modifiers.ganhos ?? 0;
  const perdas = modifiers.perdas ?? 0;
  const net = Math.max(-1, Math.min(1, ganhos - perdas));
  const dice = 1 + (modifiers.pericia ? 1 : 0) + net;
  return Math.max(1, Math.min(3, dice));
}

/**
 * @typedef {object} TestResult
 * @property {number[]} dice
 * @property {number} attribute
 * @property {number} crits
 * @property {number} total
 * @property {boolean} criticalFailure
 */

/**
 * Roll a test: dice + attribute, each die at or above `critFrom` adds the attribute again.
 * Desvantagens like Frágil cancel crits (`noCrit`). All 1s is a falha crítica.
 * @param {{ diceCount: number, attribute: number, critFrom?: number, noCrit?: boolean, autoCrits?: number }} spec
 * @param {() => number} rollDie returns 1..6
 * @returns {TestResult}
 */
export function rollTest(spec, rollDie) {
  const dice = Array.from({ length: spec.diceCount }, () => rollDie());
  const critFrom = Math.max(4, spec.critFrom ?? 6);
  const rolledCrits = spec.noCrit ? 0 : dice.filter((die) => die >= critFrom).length;
  const crits = rolledCrits + (spec.noCrit ? 0 : (spec.autoCrits ?? 0));
  const total = dice.reduce((sum, die) => sum + die, 0) + spec.attribute * (1 + crits);
  return { dice, attribute: spec.attribute, crits, total, criticalFailure: dice.every((die) => die === 1) };
}

/**
 * Damage of an attack against a defense: the difference, minimum 1, or 0 on a defesa perfeita
 * (defense at least double the attack).
 * @param {number} attackTotal
 * @param {number} defenseTotal
 * @returns {number}
 * @example damageDealt(10, 7) // 3 ; damageDealt(4, 8) // 0
 */
export function damageDealt(attackTotal, defenseTotal) {
  if (defenseTotal >= attackTotal * 2) return 0;
  return Math.max(1, attackTotal - defenseTotal);
}

/**
 * "Perto da derrota": PV at or below Resistência.
 * @param {number} pv
 * @param {number} resistencia
 * @returns {boolean}
 */
export function isNearDefeat(pv, resistencia) {
  return pv <= Math.max(1, resistencia);
}

/**
 * XP needed to raise an attribute by one: 10, or 20 above 5.
 * @param {number} currentValue
 * @returns {number}
 */
export function xpToRaiseAttribute(currentValue) {
  return currentValue >= ATTRIBUTE_CAP_BEFORE_XP ? XP_PER_ATTRIBUTE_ABOVE_CAP : XP_PER_POINT;
}

/**
 * Tier key for a total of character points.
 * @param {number} points
 * @returns {string}
 */
export function tierForPoints(points) {
  let tier = TIERS[0].key;
  for (const candidate of TIERS) if (points >= candidate.minPoints) tier = candidate.key;
  return tier;
}

/**
 * Six-sided die from a unit random function.
 * @param {() => number} random returns [0, 1)
 * @returns {() => number}
 */
export function dieFromRandom(random) {
  return () => 1 + Math.floor(random() * 6);
}

/**
 * Small seedable RNG (mulberry32) so fights and tests are reproducible.
 * @param {number} seed
 * @returns {() => number}
 */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
