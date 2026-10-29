// battle-scene.js: RPG Maker 2003 style side-view battle on the 320x240 screen: backdrop, the foe
// on the left, the hero on the right (both chibis at 2x), and two status windows at the bottom.

import { drawChibi } from "./chibi-sprite.js";
import { createPainter } from "./pixel-painter.js";
import { SCREEN_H, SCREEN_W } from "./stage-maps.js";

const INK = "#111";
const RED = "#c0392b";
const FLOOR_Y = 120;
const WINDOW_Y = 174;

/** @type {Record<string, { sky: string, floor: string, props: number[][] }>} */
const BACKDROPS = {
  gym: {
    sky: "#fff",
    floor: "#e6e6e6",
    props: [
      [20, 72, 12, 48],
      [240, 84, 28, 36],
      [280, 60, 8, 60],
    ],
  },
  library: {
    sky: "#fafafa",
    floor: "#dcdcdc",
    props: [
      [0, 40, 48, 80],
      [80, 48, 40, 72],
      [220, 36, 100, 84],
    ],
  },
  foodcourt: {
    sky: "#fff",
    floor: "#eaeaea",
    props: [
      [16, 80, 60, 40],
      [120, 60, 24, 60],
      [240, 80, 60, 40],
    ],
  },
  mall: {
    sky: "#f4f4f4",
    floor: "#d9d9d9",
    props: [
      [0, 20, 20, 100],
      [60, 32, 48, 88],
      [240, 24, 80, 96],
    ],
  },
  tower: {
    sky: "#ededed",
    floor: "#cfcfcf",
    props: [
      [140, 0, 40, 120],
      [40, 40, 16, 80],
      [260, 20, 16, 100],
    ],
  },
  mirror: { sky: "#f7f7f7", floor: "#bdbdbd", props: [[0, 0, 320, 120]] },
};

/**
 * @typedef {object} BattleFrame
 * @property {string} palette
 * @property {import("./chibi-sprite.js").ChibiLook} heroLook
 * @property {import("./chibi-sprite.js").ChibiPose} heroPose
 * @property {import("./chibi-sprite.js").ChibiLook} foeLook
 * @property {import("./chibi-sprite.js").ChibiPose} foePose
 * @property {boolean} foeVisible false once a beaten foe has faded
 * @property {{ pv: number, max: number }} heroBar
 * @property {{ pm: number, max: number }} heroPm
 * @property {{ pa: number, max: number }} heroPa
 * @property {{ pv: number, max: number }} foeBar
 * @property {number} tick
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {BattleFrame} frame
 */
export function drawBattleFrame(ctx, frame) {
  const scale = ctx.canvas.width / SCREEN_W;
  const p = createPainter(ctx, scale);
  const big = createPainter(ctx, scale * 2);
  drawBackdrop(p, frame.palette);
  const breath = Math.floor(frame.tick / 24) % 2;
  if (frame.foeVisible)
    drawChibi(big, 30, 44 + idleBob(frame.foePose, breath), frame.foeLook, battlePose(frame, "foe"));
  drawChibi(big, 110, 44 + idleBob(frame.heroPose, breath), frame.heroLook, battlePose(frame, "hero"));
  drawStatusWindows(p, frame);
}

/**
 * @param {import("./chibi-sprite.js").ChibiPose} pose
 * @param {number} breath
 * @returns {number}
 */
const idleBob = (pose, breath) => (pose === "stand" ? breath : 0);

/**
 * @param {BattleFrame} frame
 * @param {"hero" | "foe"} who
 * @returns {import("./chibi-sprite.js").ChibiFrame}
 */
function battlePose(frame, who) {
  const pose = who === "hero" ? frame.heroPose : frame.foePose;
  return { dir: who === "hero" ? "left" : "right", pose, step: 0, tick: frame.tick };
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {string} palette
 */
function drawBackdrop(p, palette) {
  const style = BACKDROPS[palette] ?? BACKDROPS.gym;
  p.rect(0, 0, SCREEN_W, SCREEN_H, style.sky);
  p.halftone(0, 0, SCREEN_W, FLOOR_Y, "#d4d4d4", 4);
  for (const [x, y, w, h] of style.props) {
    p.rect(x, y, w, h, INK);
    p.rect(x + 2, y + 2, Math.max(0, w - 4), Math.max(0, h - 4), "#f1f1f1");
    p.halftone(x + 2, y + 2, Math.max(0, w - 4), Math.max(0, h - 4), "#9a9a9a", 3);
  }
  p.rect(0, FLOOR_Y, SCREEN_W, WINDOW_Y - FLOOR_Y, style.floor);
  p.rect(0, FLOOR_Y, SCREEN_W, 1, INK);
  for (let x = 0; x < SCREEN_W; x += 24) p.rect(x, FLOOR_Y + 30, 12, 1, "#9a9a9a");
}

/**
 * Two RPG Maker style windows: the foe's PV on the left, the hero's PV/PM/PA on the right.
 * @param {import("./pixel-painter.js").Painter} p
 * @param {BattleFrame} frame
 */
function drawStatusWindows(p, frame) {
  p.rect(0, WINDOW_Y - 2, SCREEN_W, SCREEN_H - WINDOW_Y + 2, "#fff");
  drawWindow(p, 4, WINDOW_Y, 150, 62);
  drawWindow(p, 166, WINDOW_Y, 150, 62);
  drawBar(p, 14, WINDOW_Y + 12, 130, "PV", frame.foeBar.pv, frame.foeBar.max, RED);
  drawBar(p, 176, WINDOW_Y + 8, 130, "PV", frame.heroBar.pv, frame.heroBar.max, INK);
  drawBar(p, 176, WINDOW_Y + 26, 130, "PM", frame.heroPm.pm, frame.heroPm.max, "#777");
  drawGlyphs(p, 176, WINDOW_Y + 44, "PA");
  for (let i = 0; i < frame.heroPa.max; i += 1)
    p.rect(196 + i * 8, WINDOW_Y + 44, 5, 5, i < frame.heroPa.pa ? INK : "#ccc");
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
function drawWindow(p, x, y, w, h) {
  p.rect(x, y, w, h, INK);
  p.rect(x + 2, y + 2, w - 4, h - 4, "#fff");
  p.rect(x + 3, y + 3, w - 6, h - 6, INK);
  p.rect(x + 4, y + 4, w - 8, h - 8, "#fff");
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {string} label
 * @param {number} value
 * @param {number} max
 * @param {string} colour
 */
function drawBar(p, x, y, w, label, value, max, colour) {
  drawGlyphs(p, x, y, label);
  const barX = x + 20;
  const barW = w - 20;
  const filled = max > 0 ? Math.round((barW - 2) * Math.max(0, Math.min(1, value / max))) : 0;
  p.rect(barX, y - 1, barW, 7, INK);
  p.rect(barX + 1, y, barW - 2, 5, "#fff");
  p.rect(barX + 1, y, filled, 5, colour);
}

/** 3x5 pixel glyphs for the status labels. */
const GLYPHS = {
  P: ["###", "#.#", "###", "#..", "#.."],
  V: ["#.#", "#.#", "#.#", "#.#", ".#."],
  M: ["#.#", "###", "###", "#.#", "#.#"],
  A: [".#.", "#.#", "###", "#.#", "#.#"],
};

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {string} text letters from GLYPHS
 */
function drawGlyphs(p, x, y, text) {
  [...text].forEach((letter, i) => p.map(x + i * 4, y, GLYPHS[letter] ?? [], { "#": INK }));
}
