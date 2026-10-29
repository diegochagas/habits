// chibi-common.js: the bits every sprite drawer shares (chibi-sprite.js for the generic chibis,
// diego-sprite.js for the hero): the ghost painter of a knocked-out sprite and the aura marks.

export const INK = "#111";
export const GOLD = "#f2c94c";
export const RED = "#c0392b";
const GHOST = "#cfcfcf";
const SWEAT = "#7aa7d6";

/**
 * Every rect in the ghost grey: the "down" pose.
 * @param {import("./pixel-painter.js").Painter} p
 * @returns {import("./pixel-painter.js").Painter}
 */
export function ghostPainter(p) {
  return { ...p, rect: (x, y, w, h) => p.rect(x, y, w, h, GHOST) };
}

/**
 * Sparkles around a sprite with a good week (aura >= 3), sweat drops after a bad one (<= -3).
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} cx centre column of the sprite
 * @param {number} top top row of the sprite
 * @param {number} aura -5..5
 * @param {number} tick
 * @example drawAura(p, 12, 0, 4, tick)
 */
export function drawAura(p, cx, top, aura, tick) {
  if (aura >= 3) {
    const t = Math.floor(tick / 6) % 3;
    for (const [dx, dy] of [
      [-11, 6],
      [10, 2],
      [-9, 20],
      [11, 16],
    ])
      p.rect(cx + dx, top + dy + t, 1, 1, GOLD);
  }
  if (aura > -3) return;
  const t = Math.floor(tick / 10) % 2;
  p.rect(cx - 9, top + 4 + t, 1, 3, SWEAT);
  p.rect(cx + 8, top + 14 - t, 1, 3, SWEAT);
}
