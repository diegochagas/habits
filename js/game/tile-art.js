// tile-art.js: the 16x16 tiles of the stage maps, drawn in the site's ink style (paper, grey
// tones, screentone dots). One drawer per map legend char (stage-maps.js); unknown chars = floor.

const INK = "#111";
const RED = "#c0392b";
const PAPER = "#f4f4f4";

/** @typedef {{ tx: number, ty: number, tick: number, outdoor: boolean }} TileContext */
/** @typedef {(p: import("./pixel-painter.js").Painter, x: number, y: number, c: TileContext) => void} TileDrawer */

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {string} char legend char
 * @param {number} x screen px
 * @param {number} y
 * @param {TileContext} c
 * @example drawTile(painter, "T", 0, 0, { tx: 0, ty: 0, tick: 0, outdoor: true })
 */
export function drawTile(p, char, x, y, c) {
  const drawer = TILES[char] ?? drawFloor;
  if (FLOOR_UNDER.has(char)) drawFloor(p, x, y, c);
  drawer(p, x, y, c);
}

const FLOOR_UNDER = new Set(["T", "t", "o", "M"]);

/** @type {TileDrawer} */
function drawFloor(p, x, y, c) {
  p.rect(x, y, 16, 16, PAPER);
  if (!c.outdoor) {
    p.rect(x, y, 16, 1, "#e2e2e2");
    p.rect(x, y, 1, 16, "#e2e2e2");
    return;
  }
  p.halftone(x, y, 16, 16, "#d6d6d6", 4);
  if ((c.tx * 7 + c.ty * 3) % 6 !== 0) return;
  p.rect(x + 5, y + 9, 1, 2, "#9a9a9a");
  p.rect(x + 7, y + 8, 1, 3, "#9a9a9a");
  p.rect(x + 9, y + 9, 1, 2, "#9a9a9a");
}

/** @type {TileDrawer} */
function drawPath(p, x, y) {
  p.rect(x, y, 16, 16, "#e4e4e4");
  p.halftone(x, y, 16, 16, "#cfcfcf", 6);
}

/** @type {TileDrawer} */
function drawWater(p, x, y, c) {
  p.rect(x, y, 16, 16, "#d2d2d2");
  const phase = (Math.floor(c.tick / 10) + c.tx) % 4;
  p.rect(x + 2, y + 3 + phase, 6, 1, "#fff");
  p.rect(x + 9, y + 11 - phase, 5, 1, "#fff");
  p.halftone(x, y, 16, 16, "#b8b8b8", 5);
}

/** @type {TileDrawer} */
function drawTree(p, x, y) {
  p.rect(x + 6, y + 11, 4, 5, "#333");
  p.rect(x + 3, y + 1, 10, 2, INK);
  p.rect(x + 1, y + 3, 14, 8, INK);
  p.rect(x + 3, y + 11, 10, 1, INK);
  p.halftone(x + 2, y + 3, 12, 8, "#8a8a8a", 3);
}

/** @type {TileDrawer} */
function drawBush(p, x, y) {
  p.rect(x + 4, y + 5, 8, 1, "#333");
  p.rect(x + 3, y + 6, 10, 8, "#333");
  p.halftone(x + 4, y + 6, 8, 7, "#aaa", 3);
}

/** @type {TileDrawer} */
function drawWall(p, x, y) {
  p.rect(x, y, 16, 16, "#bdbdbd");
  p.rect(x, y, 16, 1, "#777");
  p.rect(x, y + 7, 16, 1, "#777");
  p.rect(x + 7, y + 1, 1, 6, "#777");
  p.rect(x + 3, y + 8, 1, 8, "#777");
  p.rect(x + 11, y + 8, 1, 8, "#777");
}

/** @type {TileDrawer} */
function drawRoof(p, x, y) {
  p.rect(x, y, 16, 16, "#3a3a3a");
  p.halftone(x, y, 16, 15, "#777", 3);
  p.rect(x, y + 15, 16, 1, "#999");
}

/** @type {TileDrawer} */
function drawDoor(p, x, y, c) {
  drawWall(p, x, y, c);
  p.rect(x + 3, y + 2, 10, 14, INK);
  p.rect(x + 4, y + 1, 8, 1, INK);
  p.rect(x + 5, y + 4, 6, 5, "#555");
  p.rect(x + 10, y + 11, 1, 1, "#fff");
}

/** @type {TileDrawer} */
function drawShelf(p, x, y) {
  p.rect(x, y, 16, 16, "#444");
  for (const row of [2, 9])
    for (let i = 0; i < 4; i += 1) p.rect(x + 2 + i * 3, y + row, 2, 5, i % 2 ? "#fff" : "#aaa");
}

/** @type {TileDrawer} */
function drawTable(p, x, y) {
  p.rect(x + 3, y + 4, 10, 8, INK);
  p.rect(x + 4, y + 5, 8, 6, "#fff");
  p.rect(x + 4, y + 12, 1, 3, INK);
  p.rect(x + 11, y + 12, 1, 3, INK);
}

/** @type {TileDrawer} */
function drawMonitor(p, x, y, c) {
  p.rect(x + 2, y + 2, 12, 9, INK);
  p.rect(x + 3, y + 3, 10, 7, "#555");
  p.rect(x + 11, y + 4, 1, 1, Math.floor(c.tick / 20) % 2 ? RED : "#555");
  p.rect(x + 7, y + 11, 2, 3, INK);
  p.rect(x + 5, y + 14, 6, 1, INK);
}

/** @type {Record<string, TileDrawer>} */
const TILES = {
  ".": drawFloor,
  ",": drawPath,
  "~": drawWater,
  T: drawTree,
  t: drawBush,
  "#": drawWall,
  R: drawRoof,
  D: drawDoor,
  H: drawShelf,
  o: drawTable,
  M: drawMonitor,
};
