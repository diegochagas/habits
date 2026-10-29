// stage-walk.js: tile-by-tile movement on a stage map, RPG Maker style: the hero faces the
// pressed direction, slides one tile in 16 ticks (RPG Maker's normal speed at 60 fps; 2 px/tick
// felt rushed), and bumping into an enemy starts its fight.
// Pure transitions over a StageWalk value.

import { SCREEN_W, TILE, isWalkable } from "./stage-maps.js";

export const WALK_SPEED = 1;
const STEPS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/**
 * @typedef {object} StageWalk
 * @property {number} tx tile the hero is leaving (or standing on)
 * @property {number} ty
 * @property {import("./chibi-sprite.js").Facing} dir
 * @property {number} offset pixels already moved towards the next tile (0 = standing)
 * @property {boolean[]} beaten one flag per spawn index
 */

/**
 * @param {import("./stage-maps.js").StageMap} map
 * @returns {StageWalk}
 */
export function createStageWalk(map) {
  return { tx: map.start.tx, ty: map.start.ty, dir: "down", offset: 0, beaten: map.spawns.map(() => false) };
}

/**
 * One tick of movement. `input` is the held direction or null.
 * @param {import("./stage-maps.js").StageMap} map
 * @param {StageWalk} walk
 * @param {import("./chibi-sprite.js").Facing | null} input
 * @returns {{ walk: StageWalk, contact: number | null }} contact = spawn index bumped into
 * @example stepWalk(map, walk, "right") // walk.offset 1, contact null
 */
export function stepWalk(map, walk, input) {
  if (walk.offset > 0) return { walk: continueSlide(walk), contact: null };
  if (!input) return { walk, contact: null };
  const [dx, dy] = STEPS[input];
  const faced = { ...walk, dir: input };
  const spawn = spawnAt(map, walk, walk.tx + dx, walk.ty + dy);
  if (spawn) return { walk: faced, contact: spawn.index };
  if (!isWalkable(map, walk.tx + dx, walk.ty + dy)) return { walk: faced, contact: null };
  return { walk: { ...faced, offset: WALK_SPEED }, contact: null };
}

/**
 * @param {StageWalk} walk
 * @returns {StageWalk}
 */
function continueSlide(walk) {
  const offset = walk.offset + WALK_SPEED;
  if (offset < TILE) return { ...walk, offset };
  const [dx, dy] = STEPS[walk.dir];
  return { ...walk, tx: walk.tx + dx, ty: walk.ty + dy, offset: 0 };
}

/**
 * @param {import("./stage-maps.js").StageMap} map
 * @param {StageWalk} walk
 * @param {number} tx
 * @param {number} ty
 * @returns {{ index: number, tx: number, ty: number } | undefined} an unbeaten enemy on the tile
 */
function spawnAt(map, walk, tx, ty) {
  return map.spawns.find((spawn) => spawn.tx === tx && spawn.ty === ty && !walk.beaten[spawn.index]);
}

/**
 * @param {StageWalk} walk
 * @param {number} index
 * @returns {StageWalk}
 */
export function markBeaten(walk, index) {
  return { ...walk, beaten: walk.beaten.map((flag, i) => flag || i === index) };
}

/**
 * Hero position in map pixels (top-left of the tile the sprite stands on).
 * @param {StageWalk} walk
 * @returns {{ x: number, y: number }}
 */
export function heroPixel(walk) {
  const [dx, dy] = STEPS[walk.dir];
  return { x: walk.tx * TILE + dx * walk.offset, y: walk.ty * TILE + dy * walk.offset };
}

/**
 * Walk-cycle step for the sprite (0 standing, 1/3 feet apart).
 * @param {StageWalk} walk
 * @returns {number}
 */
export function walkStep(walk) {
  return walk.offset === 0 ? 0 : Math.floor(walk.offset / (TILE / 4)) % 4;
}

/**
 * Horizontal camera: the hero stays centred until the map edges.
 * @param {import("./stage-maps.js").StageMap} map
 * @param {StageWalk} walk
 * @returns {number}
 */
export function cameraX(map, walk) {
  const centre = heroPixel(walk).x + TILE / 2 - SCREEN_W / 2;
  return Math.max(0, Math.min(map.width * TILE - SCREEN_W, Math.round(centre)));
}
