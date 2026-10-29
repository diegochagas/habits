// diego-sprite.js: the hero's own pixel sheet, traced from Diego's reference figure
// (2026-10-29: black tee, black shorts with grey side stripes, glasses, beard with a white
// smile, black sneakers with red toes). Same 24x32 box, facings and poses as chibi-sprite.js,
// so maps and battles draw it through drawChibi. Maps are strings: one char per pixel.

import { HATS, HELD } from "./chibi-gear.js";
import { RED, drawAura, ghostPainter } from "./chibi-common.js";

const CAPE = "#8e1b1b";
const VEST = "#5b5b5b";
const STRIPE = "#5a5a5a";
const HAIR_LIGHT = "#5a3a22";
const TEETH = "#fff";
/** The figure's top-left inside the 24x32 box (14 wide front, 9 wide side; 28 tall). */
const FRONT_X = 5;
const SIDE_X = 7;
const TOP = 3;
const LEG_Y = 23;

// Palette keys: h hair, H hair highlight, s skin, a arm/hand skin (hidden in the win pose),
// g glasses, k eye, b beard, w teeth, t shirt, B belly (heavy build only), p shorts, y stripe,
// o shoe, r red.
const FRONT_HEAD = [
  "....hhHHhh....",
  "...hhHhhhhh...",
  "...hhsssshh...",
  "...hssssssh...",
  "...gksggskg...",
  "...ssssssss...",
  "...sbbbbbbs...",
  "...bbwwwwbb...",
  "...bbbbbbbb...",
  "....bbbbbb....",
  ".....ssss.....",
];
const BACK_HEAD = [
  "....hhhhhh....",
  "...hhhhhhhh...",
  "...hhhhhhhh...",
  "...hhhhhhhh...",
  "...hhhhhhhh...",
  "...hhhhhhhh...",
  "...hhhhhhhh...",
  "...hhhhhhhh...",
  "....hhhhhh....",
  ".....ssss.....",
  ".....ssss.....",
];
const FRONT_BODY = [
  ".tttttttttttt.",
  "tttttttttttttt",
  "tttttttttttttt",
  "aaBttttttttBaa",
  "aaBttttttttBaa",
  "aaBttttttttBaa",
  "..BttttttttB..",
  "..BttttttttB..",
  "..BttttttttB..",
  "..yppppppppy..",
  "..yppppppppy..",
  "..pppppppppp..",
];
const FRONT_LEFT_LEG = [".pppp", "..sss", "..sss", "ooooo", "ooorr"];
const FRONT_RIGHT_LEG = ["pppp.", "sss..", "sss..", "ooooo", "rrooo"];
const SIDE_HEAD = [
  "..hhHHh..",
  ".hhhHhhh.",
  ".hhhssss.",
  ".hhsssss.",
  ".hsgggkg.",
  ".hssssss.",
  "..sbbbbb.",
  "..bbbwwb.",
  "..bbbbbb.",
  "...bbbb..",
  "....sss..",
];
const SIDE_BODY = [
  "..tttttt.",
  ".ttttttt.",
  ".ttttttt.",
  ".aatttttB",
  ".aatttttB",
  ".aatttttB",
  "..tttttB.",
  "..tttttB.",
  "..tttttB.",
  "..pppypp.",
  "..pppypp.",
  "..pppppp.",
];
const SIDE_LEGS_STAND = ["..pppppp.", "...ssss..", "...ssss..", "..oooooo.", "..oooorr."];
const SIDE_LEGS_STRIDE = ["..pppppp.", "..ss..ss.", "..ss..ss.", ".ooo..ooo", ".oor..oor"];

/**
 * @param {import("./chibi-sprite.js").ChibiLook} look
 * @param {boolean} win arms raised: the hanging arms disappear
 * @returns {Record<string, string>}
 */
function palette(look, win) {
  return {
    h: look.hair ?? look.skin,
    H: look.hair ? HAIR_LIGHT : look.skin,
    s: look.skin,
    a: win ? "" : look.skin,
    g: look.glasses ?? look.skin,
    k: "#111",
    b: look.beard ?? look.skin,
    w: TEETH,
    t: look.shirt,
    B: look.build >= 0.6 ? look.shirt : "",
    p: look.pants,
    y: STRIPE,
    o: look.shoes,
    r: look.shoeTrim,
  };
}

/**
 * Paint a string map through `p.rect` (not `p.map`), so the ghost painter greys it too.
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {string[]} rows
 * @param {Record<string, string>} colours "" = transparent
 */
function paintRows(p, x, y, rows, colours) {
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c += 1) if (colours[row[c]]) p.rect(x + c, y + r, 1, 1, colours[row[c]]);
  });
}

/**
 * Draw the hero in the 24x32 box at (ox, oy).
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} ox
 * @param {number} oy
 * @param {import("./chibi-sprite.js").ChibiLook} look
 * @param {import("./chibi-sprite.js").ChibiFrame} frame
 * @example drawDiego(painter, 0, 0, heroLook(hero, today), { dir: "down", pose: "stand", step: 0, tick: 0 })
 */
export function drawDiego(p, ox, oy, look, frame) {
  const paint = frame.pose === "down" ? ghostPainter(p) : p;
  const side = frame.dir === "left" ? -1 : frame.dir === "right" ? 1 : 0;
  const shake = frame.pose === "hurt" ? (Math.floor(frame.tick / 3) % 2 ? 2 : -2) : 0;
  const lunge = frame.pose === "attack" ? side * 4 : 0;
  const x = ox + lunge + shake;
  const y = oy + (frame.pose === "down" ? 4 : 0);
  drawAura(paint, ox + 12, oy, look.aura, frame.tick);
  if (side) drawSideView(paint, x + SIDE_X, y + TOP, side, look, frame);
  else drawFrontView(paint, x + FRONT_X, y + TOP, look, frame);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {import("./chibi-sprite.js").ChibiLook} look
 * @param {import("./chibi-sprite.js").ChibiFrame} frame
 */
function drawFrontView(p, x, y, look, frame) {
  const win = frame.pose === "win";
  const colours = palette(look, win);
  const back = frame.dir === "up";
  if (look.cape) p.rect(x + 1, y + 11, 12, 10, CAPE);
  drawFrontLegs(p, x, y + LEG_Y, colours, frame);
  paintRows(p, x, y, back ? BACK_HEAD : FRONT_HEAD, colours);
  paintRows(p, x, y + 11, FRONT_BODY, colours);
  if (look.vest) [3, 9].forEach((dx) => p.rect(x + dx, y + 11, 2, 6, VEST));
  if (win) [0, 12].forEach((dx) => p.rect(x + dx, y + 8, 2, 3, look.skin));
  if (!back) drawFrontFace(p, x, y, look, frame);
  HATS[look.hat ?? ""]?.(p, x + 3, y, 8);
  if (look.held && !back) HELD[look.held]?.(p, x + 12, y + 16);
}

/**
 * The walk lifts one foot at a time (step 1 the left, step 3 the right).
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {Record<string, string>} colours
 * @param {import("./chibi-sprite.js").ChibiFrame} frame
 */
function drawFrontLegs(p, x, y, colours, frame) {
  const stride = frame.pose === "walk" ? [0, 1, 0, -1][frame.step % 4] : 0;
  paintRows(p, x + 1, y - (stride === 1 ? 1 : 0), FRONT_LEFT_LEG, colours);
  paintRows(p, x + 8, y - (stride === -1 ? 1 : 0), FRONT_RIGHT_LEG, colours);
}

/**
 * Headband, a grimace when hurt (the smile closes), and tired eyes after a bad week.
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {import("./chibi-sprite.js").ChibiLook} look
 * @param {import("./chibi-sprite.js").ChibiFrame} frame
 */
function drawFrontFace(p, x, y, look, frame) {
  if (look.headband) p.rect(x + 3, y + 3, 8, 1, RED);
  if (frame.pose === "hurt" || (look.aura < 0 && frame.pose !== "win"))
    p.rect(x + 5, y + 7, 4, 1, look.beard ?? look.skin);
  if (look.aura <= -2) [4, 9].forEach((dx) => p.rect(x + dx, y + 5, 1, 1, "#8e6f6f"));
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x left edge of the 9-wide side figure
 * @param {number} y
 * @param {number} side 1 facing right, -1 facing left
 * @param {import("./chibi-sprite.js").ChibiLook} look
 * @param {import("./chibi-sprite.js").ChibiFrame} frame
 */
function drawSideView(p, x, y, side, look, frame) {
  const colours = palette(look, false);
  const stride = frame.pose === "walk" && frame.step % 2 === 1;
  if (look.cape) p.rect(side > 0 ? x : x + 5, y + 11, 4, 10, CAPE);
  paintRows(p, x, y + LEG_Y, facing(stride ? SIDE_LEGS_STRIDE : SIDE_LEGS_STAND, side), colours);
  paintRows(p, x, y, facing(SIDE_HEAD, side), colours);
  paintRows(p, x, y + 11, facing(SIDE_BODY, side), colours);
  if (look.vest) p.rect(side > 0 ? x + 3 : x + 4, y + 11, 2, 6, VEST);
  if (look.headband) p.rect(x + 1, y + 3, 7, 1, RED);
  if (frame.pose === "attack") drawPunch(p, x, y, side, look);
  HATS[look.hat ?? ""]?.(p, x + 1, y, 7);
  if (look.held) HELD[look.held]?.(p, side > 0 ? x + 7 : x + 1, y + 16);
}

/**
 * Mirror the rows for the left facing.
 * @param {string[]} rows
 * @param {number} side
 * @returns {string[]}
 */
function facing(rows, side) {
  return side > 0 ? rows : rows.map((row) => [...row].reverse().join(""));
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {number} side
 * @param {import("./chibi-sprite.js").ChibiLook} look
 */
function drawPunch(p, x, y, side, look) {
  const armX = side > 0 ? x + 8 : x - 3;
  p.rect(armX, y + 14, 4, 2, look.shirt);
  p.rect(side > 0 ? armX + 4 : armX - 2, y + 14, 2, 2, look.skin);
}
