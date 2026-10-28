// battle-scene.js: draws one frame of a fight (backdrop, hero, foe, HP bars) on a 160x90 logical
// canvas. Pure drawing; the state comes from the caller each frame.

import { drawCharacter } from "./character-sprite.js";
import { ENEMY_MAPS, ENEMY_PALETTE } from "./enemy-pixels.js";
import { createPainter } from "./pixel-painter.js";

export const SCENE_W = 160;
export const SCENE_H = 90;

const BACKDROPS = {
  gym: {
    sky: "#fff",
    floor: "#e6e6e6",
    props: [
      [10, 36, 6, 24],
      [120, 42, 14, 18],
      [140, 30, 4, 30],
    ],
  },
  library: {
    sky: "#fafafa",
    floor: "#dcdcdc",
    props: [
      [0, 20, 24, 40],
      [40, 24, 20, 36],
      [110, 18, 50, 42],
    ],
  },
  foodcourt: {
    sky: "#fff",
    floor: "#eaeaea",
    props: [
      [8, 40, 30, 20],
      [60, 30, 12, 30],
      [120, 40, 30, 20],
    ],
  },
  mall: {
    sky: "#f4f4f4",
    floor: "#d9d9d9",
    props: [
      [0, 10, 10, 50],
      [30, 16, 24, 44],
      [120, 12, 40, 48],
    ],
  },
  tower: {
    sky: "#ededed",
    floor: "#cfcfcf",
    props: [
      [70, 0, 20, 60],
      [20, 20, 8, 40],
      [130, 10, 8, 50],
    ],
  },
  mirror: { sky: "#f7f7f7", floor: "#bdbdbd", props: [[0, 0, 160, 60]] },
};

/**
 * @typedef {object} SceneFrame
 * @property {string} palette
 * @property {import("./character-sprite.js").CharacterLook} look
 * @property {import("./character-sprite.js").Pose} heroPose
 * @property {string} foeSprite
 * @property {"idle" | "hurt" | "down"} foePose
 * @property {{ pv: number, max: number }} heroBar
 * @property {{ pv: number, max: number }} foeBar
 * @property {number} tick
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {SceneFrame} frame
 */
export function drawBattleFrame(ctx, frame) {
  const scale = ctx.canvas.width / SCENE_W;
  const p = createPainter(ctx, scale);
  drawBackdrop(p, frame.palette, frame.tick);
  drawCharacter(p, 20, 30, frame.look, frame.heroPose, frame.tick);
  drawFoe(p, frame);
  drawBar(p, 4, 4, frame.heroBar, "#111");
  drawBar(p, SCENE_W - 52, 4, frame.foeBar, "#c0392b");
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {string} palette
 * @param {number} tick
 */
function drawBackdrop(p, palette, tick) {
  const style = BACKDROPS[palette] ?? BACKDROPS.gym;
  p.rect(0, 0, SCENE_W, SCENE_H, style.sky);
  p.halftone(0, 0, SCENE_W, 60, "#cfcfcf", 4);
  for (const [x, y, w, h] of style.props) {
    p.rect(x, y, w, h, "#111");
    p.rect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2), "#f1f1f1");
    p.halftone(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2), "#9a9a9a", 3);
  }
  p.rect(0, 60, SCENE_W, 30, style.floor);
  p.rect(0, 60, SCENE_W, 1, "#111");
  const slide = tick % 12;
  for (let x = -12 + slide; x < SCENE_W; x += 12) p.rect(x, 74, 6, 1, "#9a9a9a");
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {SceneFrame} frame
 */
function drawFoe(p, frame) {
  const rows = ENEMY_MAPS[frame.foeSprite] ?? ENEMY_MAPS.halter;
  const bob = frame.foePose === "idle" ? Math.floor(frame.tick / 10) % 2 : 0;
  const shake = frame.foePose === "hurt" ? (Math.floor(frame.tick / 3) % 2 ? 2 : -2) : 0;
  const scaleUp = frame.foeSprite.length > 0 && rows.length > 13 ? 3 : 3;
  const x = 108 + shake;
  const y = frame.foePose === "down" ? 62 - rows.length * scaleUp + 10 : 60 - rows.length * scaleUp + bob;
  if (frame.foePose === "down") p.rect(x - 4, y + rows.length * scaleUp - 6, rows[0].length * scaleUp + 8, 2, "#999");
  const palette = frame.foePose === "hurt" ? { ...ENEMY_PALETTE, "#": "#c0392b" } : ENEMY_PALETTE;
  const big = createPainterScaled(p, scaleUp);
  big.map(x, y, rows, palette);
}

/**
 * A painter that draws each map pixel as a `factor` square, for the 3x enemies.
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} factor
 * @returns {{ map: import("./pixel-painter.js").Painter["map"] }}
 */
function createPainterScaled(p, factor) {
  return {
    map: (x, y, rows, palette) =>
      rows.forEach((row, rowIndex) => {
        for (let column = 0; column < row.length; column += 1) {
          const color = palette[row[column]];
          if (color) p.rect(x + column * factor, y + rowIndex * factor, factor, factor, color);
        }
      }),
  };
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {{ pv: number, max: number }} bar
 * @param {string} color
 */
function drawBar(p, x, y, bar, color) {
  const width = 48;
  const filled = bar.max > 0 ? Math.round((width - 2) * Math.max(0, Math.min(1, bar.pv / bar.max))) : 0;
  p.rect(x, y, width, 6, "#111");
  p.rect(x + 1, y + 1, width - 2, 4, "#fff");
  p.rect(x + 1, y + 1, filled, 4, color);
}
