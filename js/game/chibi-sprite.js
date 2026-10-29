// chibi-sprite.js: one RPG Maker style charset drawer (24x32 box, four facings, 4-step walk)
// shared by the hero and every enemy. Everything comes from a ChibiLook, so weight, items, hats
// and held things change the sprite without sprite sheets.

import { HATS, HELD } from "./chibi-gear.js";

export const CHIBI_W = 24;
export const CHIBI_H = 32;
const INK = "#111";
const GOLD = "#f2c94c";
const RED = "#c0392b";
const GHOST = "#cfcfcf";
const VEST = "#5b5b5b";
const SWEAT = "#7aa7d6";
const EYE = { ink: INK, red: RED, white: "#fff" };

/**
 * @typedef {object} ChibiLook
 * @property {number} build 0 (slim) .. 1.2 (very heavy)
 * @property {string} skin
 * @property {string | null} hair null = bald
 * @property {string | null} beard
 * @property {string | null} glasses frame colour
 * @property {string} shirt
 * @property {string} pants
 * @property {string} legs bare skin for shorts, trouser colour otherwise
 * @property {string} shoes
 * @property {string} shoeTrim
 * @property {"ink" | "red" | "white"} eyes
 * @property {string | null} hat crown | burger | fries | books | phone | cap | antenna | visor
 * @property {string | null} held dumbbell | band | remote | book | bookmark | sign | bags | bill | phone
 * @property {boolean} cape
 * @property {boolean} vest
 * @property {boolean} headband
 * @property {boolean} tall boss size (+2 px torso)
 * @property {number} aura -5..5: sparkles from 3, sweat from -3, tired eyes from -2
 */

/** @typedef {"down" | "up" | "left" | "right"} Facing */
/** @typedef {"stand" | "walk" | "attack" | "hurt" | "win" | "down"} ChibiPose */
/** @typedef {{ dir: Facing, pose: ChibiPose, step: number, tick: number }} ChibiFrame */

/**
 * Draw a chibi with its 24x32 box at (ox, oy). `step` is the walk-cycle index (0..3).
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} ox
 * @param {number} oy
 * @param {ChibiLook} look
 * @param {ChibiFrame} frame
 * @example drawChibi(painter, 0, 0, look, { dir: "down", pose: "walk", step: 1, tick: 0 })
 */
export function drawChibi(p, ox, oy, look, frame) {
  const paint = frame.pose === "down" ? ghostPainter(p) : p;
  const g = geometry(ox, oy, look, frame);
  drawAura(paint, g, look, frame.tick);
  if (look.cape) paint.rect(g.cx - half(g.torsoW) - 2, g.top + 14, g.torsoW + 4, 9 + g.tall, "#8e1b1b");
  drawLegs(paint, g, look);
  drawBody(paint, g, look);
  drawArms(paint, g, look, frame);
  drawHead(paint, g, look, frame);
  drawHeld(paint, g, look);
}

/** @param {number} w @returns {number} */
const half = (w) => Math.floor(w / 2);

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @returns {import("./pixel-painter.js").Painter}
 */
function ghostPainter(p) {
  return { ...p, rect: (x, y, w, h) => p.rect(x, y, w, h, GHOST) };
}

/**
 * @param {number} ox
 * @param {number} oy
 * @param {ChibiLook} look
 * @param {ChibiFrame} frame
 */
function geometry(ox, oy, look, frame) {
  const side = frame.dir === "left" ? -1 : frame.dir === "right" ? 1 : 0;
  const build = Math.max(0, Math.min(1.2, look.build));
  const narrow = side ? 0.8 : 1;
  const lunge = frame.pose === "attack" ? side * 4 : 0;
  const shake = frame.pose === "hurt" ? (Math.floor(frame.tick / 3) % 2 ? 2 : -2) : 0;
  const tall = look.tall ? 2 : 0;
  return {
    cx: ox + 12 + lunge + shake,
    top: oy + (frame.pose === "down" ? 6 : 0) - tall,
    side,
    back: frame.dir === "up",
    tall,
    torsoW: Math.round((10 + 6 * build) * narrow),
    bellyW: Math.round((10 + 10 * build) * narrow),
    faceW: build > 0.6 ? 12 : 10,
    stride: frame.pose === "walk" ? [0, 1, 0, -1][frame.step % 4] : 0,
  };
}

/** @typedef {ReturnType<typeof geometry>} Geometry */

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {Geometry} g
 * @param {ChibiLook} look
 * @param {number} tick
 */
function drawAura(p, g, look, tick) {
  if (look.aura >= 3) {
    const t = Math.floor(tick / 6) % 3;
    for (const [dx, dy] of [
      [-11, 6],
      [10, 2],
      [-9, 20],
      [11, 16],
    ])
      p.rect(g.cx + dx, g.top + dy + t, 1, 1, GOLD);
  }
  if (look.aura > -3) return;
  const t = Math.floor(tick / 10) % 2;
  p.rect(g.cx - 9, g.top + 4 + t, 1, 3, SWEAT);
  p.rect(g.cx + 8, g.top + 14 - t, 1, 3, SWEAT);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {Geometry} g
 * @param {ChibiLook} look
 */
function drawLegs(p, g, look) {
  const y = g.top + 23 + g.tall;
  const gap = Math.max(1, Math.round(g.bellyW / 6));
  const dx = g.side ? g.stride * 2 : 0;
  const liftLeft = !g.side && g.stride === 1 ? 1 : 0;
  const liftRight = !g.side && g.stride === -1 ? 1 : 0;
  drawLeg(p, g.cx - gap - 3 + dx, y, liftLeft, look);
  drawLeg(p, g.cx + gap - dx, y, liftRight, look);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {number} lift
 * @param {ChibiLook} look
 */
function drawLeg(p, x, y, lift, look) {
  p.rect(x, y, 3, 6 - lift, look.legs);
  p.rect(x - 1, y + 6 - lift, 5, 1, look.shoes);
  p.rect(x - 1, y + 7 - lift, 5, 1, look.shoeTrim);
  p.rect(x - 1, y + 8 - lift, 5, 1, INK);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {Geometry} g
 * @param {ChibiLook} look
 */
function drawBody(p, g, look) {
  const y = g.top + 14;
  const torsoH = 4 + g.tall;
  p.rect(g.cx - half(g.torsoW), y, g.torsoW, torsoH, look.shirt);
  p.rect(g.cx - half(g.bellyW), y + torsoH, g.bellyW, 4, look.shirt);
  p.rect(g.cx - half(g.bellyW), y + torsoH + 4, g.bellyW, 1, look.pants);
  if (!look.vest) return;
  p.rect(g.cx - half(g.torsoW) + 1, y, 2, torsoH + 3, VEST);
  p.rect(g.cx + half(g.torsoW) - 3, y, 2, torsoH + 3, VEST);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {Geometry} g
 * @param {ChibiLook} look
 * @param {ChibiFrame} frame
 */
function drawArms(p, g, look, frame) {
  const y = g.top + 15;
  const left = g.cx - half(g.torsoW) - 2;
  const right = g.cx + half(g.torsoW);
  if (frame.pose === "win") return [left, right].forEach((x) => drawRaisedArm(p, x, y, look));
  if (frame.pose === "attack" && g.side) return drawPunch(p, g, look, y);
  if (g.side) return drawArm(p, g.cx + g.side * 2 - 1, y, look, g.stride);
  drawArm(p, left, y, look, 0);
  drawArm(p, right, y, look, 0);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {ChibiLook} look
 * @param {number} swing
 */
function drawArm(p, x, y, look, swing) {
  p.rect(x, y + swing, 2, 4, look.shirt);
  p.rect(x, y + 4 + swing, 2, 3, look.skin);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {ChibiLook} look
 */
function drawRaisedArm(p, x, y, look) {
  p.rect(x, y - 6, 2, 3, look.skin);
  p.rect(x, y - 3, 2, 4, look.shirt);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {Geometry} g
 * @param {ChibiLook} look
 * @param {number} y
 */
function drawPunch(p, g, look, y) {
  const x = g.side > 0 ? g.cx + 2 : g.cx - 8;
  p.rect(x, y + 2, 6, 2, look.shirt);
  p.rect(g.side > 0 ? x + 6 : x - 2, y + 2, 2, 2, look.skin);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {Geometry} g
 * @param {ChibiLook} look
 * @param {ChibiFrame} frame
 */
function drawHead(p, g, look, frame) {
  const w = g.faceW;
  const x = g.cx - half(w) + g.side;
  const y = g.top + 1;
  p.rect(x, y + 4, w, 9, look.skin);
  if (g.back) {
    p.rect(x, y, w, 10, look.hair ?? look.skin);
    return HATS[look.hat ?? ""]?.(p, x, y, w);
  }
  if (look.hair) drawHair(p, x, y, w, look.hair);
  drawFace(p, x, y, w, g, look, frame);
  HATS[look.hat ?? ""]?.(p, x, y, w);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {string} hair
 */
function drawHair(p, x, y, w, hair) {
  p.rect(x, y, w, 4, hair);
  p.rect(x, y + 4, 1, 3, hair);
  p.rect(x + w - 1, y + 4, 1, 3, hair);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {Geometry} g
 * @param {ChibiLook} look
 * @param {ChibiFrame} frame
 */
function drawFace(p, x, y, w, g, look, frame) {
  const eyeY = y + 8;
  drawEyes(p, x, eyeY, w, g.side, look);
  if (look.glasses) drawGlasses(p, x, eyeY, w, g.side, look.glasses);
  if (look.beard) drawBeard(p, x, y, w, look, frame);
  if (look.headband) p.rect(x, y + 4, w, 1, RED);
  if (frame.pose === "hurt") p.rect(g.cx + g.side - 1, y + 11, 2, 1, INK);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} eyeY
 * @param {number} w
 * @param {number} side
 * @param {ChibiLook} look
 */
function drawEyes(p, x, eyeY, w, side, look) {
  const eye = EYE[look.eyes];
  const tired = look.aura <= -2 ? "#8e6f6f" : null;
  if (side === 0) {
    p.rect(x + 2, eyeY, 2, 2, eye);
    p.rect(x + w - 4, eyeY, 2, 2, eye);
    if (tired) p.rect(x + 2, eyeY + 2, 2, 1, tired);
    if (tired) p.rect(x + w - 4, eyeY + 2, 2, 1, tired);
    return;
  }
  const ex = side > 0 ? x + w - 4 : x + 2;
  p.rect(ex, eyeY, 2, 2, eye);
  if (tired) p.rect(ex, eyeY + 2, 2, 1, tired);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} eyeY
 * @param {number} w
 * @param {number} side
 * @param {string} colour
 */
function drawGlasses(p, x, eyeY, w, side, colour) {
  p.rect(x + 1, eyeY - 1, w - 2, 1, colour);
  if (side <= 0) p.rect(x + 1, eyeY + 2, 4, 1, colour);
  if (side >= 0) p.rect(x + w - 5, eyeY + 2, 4, 1, colour);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {ChibiLook} look
 * @param {ChibiFrame} frame
 */
function drawBeard(p, x, y, w, look, frame) {
  p.rect(x + 1, y + 11, w - 2, 2, /** @type {string} */ (look.beard));
  p.rect(x, y + 10, 1, 2, /** @type {string} */ (look.beard));
  p.rect(x + w - 1, y + 10, 1, 2, /** @type {string} */ (look.beard));
  if (look.aura >= 0 || frame.pose === "win") p.rect(x + half(w) - 1, y + 11, 2, 1, look.skin);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {Geometry} g
 * @param {ChibiLook} look
 */
function drawHeld(p, g, look) {
  if (!look.held || g.back) return;
  const hx = g.side === 0 ? g.cx + half(g.torsoW) : g.cx + g.side * 2 - 1;
  HELD[look.held]?.(p, hx, g.top + 20);
}
