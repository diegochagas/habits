// chibi-gear.js: hats and held items for chibi-sprite.js, drawn relative to the head box
// (x, y, w = head top-left and width) or the front hand (x, y). Keys are ChibiLook.hat / .held.

const INK = "#111";
const GOLD = "#f2c94c";
const RED = "#c0392b";

/** @param {number} w @returns {number} */
const half = (w) => Math.floor(w / 2);

/** @type {Record<string, (p: import("./pixel-painter.js").Painter, x: number, y: number, w: number) => void>} */
export const HATS = {
  crown: (p, x, y, w) => {
    p.rect(x + 1, y - 1, w - 2, 2, GOLD);
    for (const dx of [1, half(w) - 1, w - 3]) p.rect(x + dx, y - 2, 1, 1, GOLD);
  },
  burger: (p, x, y, w) => {
    p.rect(x + 1, y - 3, w - 2, 2, "#d9a066");
    p.rect(x + 1, y - 1, w - 2, 1, RED);
    p.rect(x + 2, y, w - 4, 1, "#5a8f3c");
  },
  fries: (p, x, y, w) => {
    p.rect(x + 2, y - 2, w - 4, 3, RED);
    for (const dx of [3, 5, 7]) p.rect(x + dx, y - 5, 1, 3, GOLD);
  },
  books: (p, x, y, w) => {
    for (let i = 0; i < 3; i += 1) {
      p.rect(x + 1, y - 2 - i * 3, w - 2, 3, INK);
      p.rect(x + 2, y - 1 - i * 3, w - 4, 1, i % 2 ? "#ddd" : "#fff");
    }
  },
  phone: (p, x, y, w) => {
    p.rect(x + 2, y - 5, w - 4, 6, INK);
    p.rect(x + 3, y - 4, w - 6, 4, "#fff");
    p.rect(x + w - 4, y - 5, 2, 2, RED);
  },
  cap: (p, x, y, w) => {
    p.rect(x, y - 1, w, 2, RED);
    p.rect(x - 1, y + 1, w + 2, 1, RED);
  },
  antenna: (p, x, y, w) => {
    p.rect(x + 2, y - 4, 1, 4, INK);
    p.rect(x + w - 3, y - 4, 1, 4, INK);
    p.rect(x + 1, y - 5, 2, 1, INK);
    p.rect(x + w - 3, y - 5, 2, 1, INK);
  },
  visor: (p, x, y, w) => {
    p.rect(x, y + 7, w, 2, INK);
    p.rect(x + 1, y + 7, w - 2, 1, RED);
  },
};

/** @type {Record<string, (p: import("./pixel-painter.js").Painter, x: number, y: number) => void>} */
export const HELD = {
  dumbbell: (p, x, y) => {
    p.rect(x - 2, y + 1, 6, 1, "#666");
    p.rect(x - 2, y, 1, 3, INK);
    p.rect(x + 3, y, 1, 3, INK);
  },
  band: (p, x, y) => {
    p.rect(x - 3, y + 1, 8, 1, "#9a9a9a");
    p.rect(x - 3, y, 1, 1, INK);
    p.rect(x + 4, y + 2, 1, 1, INK);
  },
  remote: (p, x, y) => {
    p.rect(x, y - 3, 2, 6, INK);
    p.rect(x, y - 2, 2, 1, RED);
  },
  book: (p, x, y) => {
    p.rect(x - 1, y - 2, 5, 5, INK);
    p.rect(x, y - 1, 3, 3, "#fff");
  },
  bookmark: (p, x, y) => {
    p.rect(x, y - 6, 2, 9, RED);
    p.rect(x, y + 2, 1, 1, "#fff");
  },
  sign: (p, x, y) => {
    p.rect(x - 3, y - 11, 8, 7, INK);
    p.rect(x - 2, y - 10, 6, 5, "#fff");
    p.rect(x - 1, y - 9, 1, 1, RED);
    p.rect(x, y - 8, 1, 1, RED);
    p.rect(x + 1, y - 7, 1, 1, RED);
    p.rect(x + 2, y - 6, 1, 1, RED);
    p.rect(x, y - 4, 1, 5, INK);
  },
  bags: (p, x, y) => {
    p.rect(x - 3, y, 3, 4, "#e0e0e0");
    p.rect(x + 2, y, 3, 4, "#e0e0e0");
    p.rect(x - 2, y - 1, 1, 1, INK);
    p.rect(x + 3, y - 1, 1, 1, INK);
  },
  bill: (p, x, y) => {
    p.rect(x - 1, y - 6, 5, 12, INK);
    p.rect(x, y - 5, 3, 10, "#fff");
    p.rect(x + 1, y - 3, 1, 1, INK);
    p.rect(x + 1, y - 1, 1, 1, INK);
    p.rect(x + 1, y + 2, 1, 1, RED);
  },
  phone: (p, x, y) => {
    p.rect(x, y - 3, 3, 6, INK);
    p.rect(x + 1, y - 2, 1, 4, "#fff");
  },
};
