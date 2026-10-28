// stages.js: the six Arcas. Each has three minions and a boss, with 3DeT stats calibrated so a
// 12-point Iniciante clears Arca 1 and needs more points for each later one. Every Arca can be
// entered at any level; `requiredPoints` is what makes it beatable.

/**
 * @typedef {object} EnemyDefinition
 * @property {string} id
 * @property {boolean} boss
 * @property {{ P: number, H: number, R: number }} attributes
 * @property {boolean} luta has the perícia Luta (rolls 2D)
 * @property {number} [critFrom] 5 for "crítico com 5 ou 6"
 * @property {number} [regen] PV recovered at the start of its turn
 * @property {string} sprite key in enemy-pixels.js
 */

/**
 * @typedef {object} StageDefinition
 * @property {string} id
 * @property {number} requiredPoints
 * @property {string} palette backdrop style key
 * @property {EnemyDefinition[]} minions
 * @property {EnemyDefinition} boss
 */

/**
 * @param {string} id
 * @param {number} P
 * @param {number} H
 * @param {number} R
 * @param {Partial<EnemyDefinition>} [extra]
 * @returns {EnemyDefinition}
 */
function enemy(id, P, H, R, extra = {}) {
  return { id, boss: false, attributes: { P, H, R }, luta: false, sprite: id, ...extra };
}

/** @type {StageDefinition[]} */
export const STAGES = [
  {
    id: "academia",
    requiredPoints: 12,
    palette: "gym",
    minions: [enemy("halter", 1, 1, 1), enemy("halter", 1, 1, 1), enemy("elastico", 1, 2, 1)],
    boss: enemy("sofa", 2, 1, 2, { boss: true, luta: true }),
  },
  {
    id: "biblioteca",
    requiredPoints: 15,
    palette: "library",
    minions: [
      enemy("traca", 1, 2, 1, { luta: true }),
      enemy("traca", 1, 2, 1, { luta: true }),
      enemy("marcador", 2, 1, 1, { luta: true }),
    ],
    boss: enemy("pilha", 2, 2, 3, { boss: true, luta: true }),
  },
  {
    id: "pracaAlimentacao",
    requiredPoints: 19,
    palette: "foodcourt",
    minions: [
      enemy("hamburguer", 2, 2, 2, { luta: true }),
      enemy("batata", 2, 2, 2, { luta: true }),
      enemy("hamburguer", 2, 2, 2, { luta: true }),
    ],
    boss: enemy("reiFastFood", 3, 2, 3, { boss: true, luta: true }),
  },
  {
    id: "shopping",
    requiredPoints: 24,
    palette: "mall",
    minions: [
      enemy("promocao", 2, 3, 3, { luta: true }),
      enemy("promocao", 2, 3, 3, { luta: true }),
      enemy("sacola", 3, 2, 3, { luta: true }),
    ],
    boss: enemy("fatura", 3, 3, 4, { boss: true, luta: true, critFrom: 5 }),
  },
  {
    id: "torreScroll",
    requiredPoints: 30,
    palette: "tower",
    minions: [
      enemy("notificacao", 3, 3, 3, { luta: true }),
      enemy("notificacao", 3, 3, 3, { luta: true }),
      enemy("notificacao", 3, 3, 3, { luta: true }),
    ],
    boss: enemy("algoritmo", 4, 3, 4, { boss: true, luta: true, critFrom: 5 }),
  },
  {
    id: "arcaFinal",
    requiredPoints: 36,
    palette: "mirror",
    minions: [
      enemy("sombra", 3, 4, 4, { luta: true }),
      enemy("sombra", 3, 4, 4, { luta: true }),
      enemy("sombra", 3, 4, 4, { luta: true }),
    ],
    boss: enemy("antigoEu", 5, 4, 5, { boss: true, luta: true, critFrom: 5, regen: 1 }),
  },
];

/**
 * @param {string} id
 * @returns {StageDefinition | undefined}
 */
export function stageById(id) {
  return STAGES.find((stage) => stage.id === id);
}

/**
 * Enemies of a stage in fight order: minions then boss.
 * @param {StageDefinition} stage
 * @returns {EnemyDefinition[]}
 */
export function stageEncounters(stage) {
  return [...stage.minions, stage.boss];
}

/**
 * XP for beating an encounter: objetivo menor (1) for a minion, objetivo maior (5) for a boss.
 * Replays of an already-beaten boss pay 1, and a day's minions pay only once.
 * @param {EnemyDefinition} foe
 * @param {{ bossBeaten: boolean, lastClearDate: string }} progress
 * @param {string} today
 * @returns {number}
 */
export function encounterXp(foe, progress, today) {
  if (foe.boss) return progress.bossBeaten ? 1 : 5;
  return progress.lastClearDate === today ? 0 : 1;
}

/**
 * Character points of an enemy (attributes + Luta), for the "pontuação" comparison.
 * @param {EnemyDefinition} foe
 * @returns {number}
 */
export function enemyPoints(foe) {
  const { P, H, R } = foe.attributes;
  return P + H + R + (foe.luta ? 1 : 0) + (foe.critFrom ? 1 : 0) + (foe.regen ? 1 : 0);
}
