// map-scene.js: draws one frame of the stage map (tiles, enemies standing as events, the hero)
// on the 320x240 logical screen with a horizontal camera. Pure drawing from a MapFrame.

import { drawChibi } from "./chibi-sprite.js";
import { createPainter } from "./pixel-painter.js";
import { SCREEN_W, TILE, tileAt } from "./stage-maps.js";
import { cameraX, heroPixel, walkStep } from "./stage-walk.js";
import { drawTile } from "./tile-art.js";

/**
 * @typedef {object} MapFrame
 * @property {import("./stage-maps.js").StageMap} map
 * @property {import("./stage-walk.js").StageWalk} walk
 * @property {import("./chibi-sprite.js").ChibiLook} heroLook
 * @property {{ look: import("./chibi-sprite.js").ChibiLook, tx: number, ty: number }[]} foes unbeaten enemies
 * @property {number} tick
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {MapFrame} frame
 */
export function drawMapFrame(ctx, frame) {
  const p = createPainter(ctx, ctx.canvas.width / SCREEN_W);
  const camera = cameraX(frame.map, frame.walk);
  drawTiles(p, frame, camera);
  for (const actor of actorsByDepth(frame)) drawChibi(p, actor.x - 4 - camera, actor.y - 16, actor.look, actor.frame);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {MapFrame} frame
 * @param {number} camera
 */
function drawTiles(p, frame, camera) {
  const first = Math.floor(camera / TILE);
  const last = first + SCREEN_W / TILE;
  for (let ty = 0; ty < frame.map.height; ty += 1)
    for (let tx = first; tx <= last; tx += 1)
      drawTile(p, tileAt(frame.map, tx, ty), tx * TILE - camera, ty * TILE, {
        tx,
        ty,
        tick: frame.tick,
        outdoor: frame.map.outdoor,
      });
}

/**
 * Enemies and the hero sorted by their feet, so a lower sprite overlaps a higher one.
 * @param {MapFrame} frame
 * @returns {{ x: number, y: number, look: import("./chibi-sprite.js").ChibiLook, frame: import("./chibi-sprite.js").ChibiFrame }[]}
 */
function actorsByDepth(frame) {
  const hero = heroPixel(frame.walk);
  const foes = frame.foes.map((foe) => ({
    x: foe.tx * TILE,
    y: foe.ty * TILE,
    look: foe.look,
    frame: { dir: faceToward(foe, frame.walk), pose: "stand", step: 0, tick: frame.tick },
  }));
  const heroActor = {
    x: hero.x,
    y: hero.y,
    look: frame.heroLook,
    frame: {
      dir: frame.walk.dir,
      pose: frame.walk.offset ? "walk" : "stand",
      step: walkStep(frame.walk),
      tick: frame.tick,
    },
  };
  return [...foes, heroActor].sort((a, b) => a.y - b.y);
}

/**
 * An enemy turns to the hero when they are next to each other, like an RPG Maker event.
 * @param {{ tx: number, ty: number }} foe
 * @param {import("./stage-walk.js").StageWalk} walk
 * @returns {import("./chibi-sprite.js").Facing}
 */
export function faceToward(foe, walk) {
  const dx = walk.tx - foe.tx;
  const dy = walk.ty - foe.ty;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return "down";
  if (dx !== 0) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
