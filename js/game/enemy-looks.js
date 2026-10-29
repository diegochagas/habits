// enemy-looks.js: every enemy as a humanoid chibi (see chibi-sprite.js). Keys match
// EnemyDefinition.sprite in stages.js; the name strings live in game-i18n.js ("foe.<key>").

/** @type {import("./chibi-sprite.js").ChibiLook} */
const BASE_LOOK = {
  build: 0.4,
  skin: "#e8b48c",
  hair: "#2b1a10",
  beard: null,
  glasses: null,
  shirt: "#8a8a8a",
  pants: "#333",
  legs: "#333",
  shoes: "#1b1b1b",
  shoeTrim: "#1b1b1b",
  eyes: "ink",
  hat: null,
  held: null,
  cape: false,
  vest: false,
  headband: false,
  tall: false,
  aura: 0,
};

/** @type {Record<string, Partial<import("./chibi-sprite.js").ChibiLook>>} */
export const ENEMY_LOOKS = {
  halter: { build: 0.9, shirt: "#fff", held: "dumbbell", headband: true, hair: null },
  elastico: { build: 0.1, shirt: "#ddd", held: "band", hair: "#555" },
  sofa: {
    build: 1.2,
    shirt: "#5a5a5a",
    pants: "#2a2a2a",
    legs: "#2a2a2a",
    held: "remote",
    hat: "cap",
    eyes: "red",
    tall: true,
  },
  traca: {
    build: 0.2,
    skin: "#cfd6c2",
    hair: null,
    hat: "antenna",
    held: "book",
    shirt: "#aab39c",
    pants: "#6f7566",
    legs: "#6f7566",
  },
  marcador: { build: 0.3, shirt: "#c0392b", hat: "cap", held: "bookmark", hair: "#111" },
  pilha: {
    build: 0.6,
    hat: "books",
    glasses: "#111",
    shirt: "#444",
    held: "book",
    eyes: "red",
    tall: true,
    hair: "#9a9a9a",
  },
  hamburguer: { build: 0.7, hat: "burger", shirt: "#fff", vest: true, hair: "#5a3a1a" },
  batata: { build: 0.5, hat: "fries", shirt: "#c0392b", hair: "#111" },
  reiFastFood: { build: 1.2, hat: "crown", cape: true, shirt: "#c0392b", eyes: "red", tall: true, beard: "#5a3a1a" },
  promocao: { build: 0.3, shirt: "#fff", pants: "#fff", legs: "#fff", held: "sign", hair: "#f2c94c" },
  sacola: { build: 0.8, held: "bags", shirt: "#bbb", hair: "#111" },
  fatura: {
    build: 0.2,
    shirt: "#111",
    pants: "#444",
    legs: "#444",
    held: "bill",
    eyes: "red",
    tall: true,
    hair: "#111",
    glasses: "#111",
  },
  notificacao: { build: 0.3, hat: "phone", held: "phone", shirt: "#ddd", hair: null },
  algoritmo: {
    build: 0.8,
    skin: "#8a8a8a",
    hair: null,
    hat: "visor",
    eyes: "red",
    shirt: "#555",
    pants: "#444",
    legs: "#444",
    tall: true,
  },
  sombra: {
    build: 0.6,
    skin: "#111",
    hair: "#111",
    shirt: "#111",
    pants: "#111",
    legs: "#111",
    shoes: "#111",
    eyes: "white",
  },
  antigoEu: {
    build: 1.2,
    skin: "#cdb39f",
    beard: "#3b2a1c",
    glasses: "#111",
    shirt: "#444",
    pants: "#555",
    legs: "#cdb39f",
    eyes: "red",
    tall: true,
    aura: -5,
  },
};

/**
 * Full look for an enemy sprite key (unknown keys get the base look).
 * @param {string} key
 * @returns {import("./chibi-sprite.js").ChibiLook}
 * @example enemyLook("sofa").held // "remote"
 */
export function enemyLook(key) {
  return { ...BASE_LOOK, ...(ENEMY_LOOKS[key] ?? {}) };
}
