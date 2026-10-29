import { test } from "node:test";
import assert from "node:assert/strict";
import { TILE, buildStageMap } from "../js/game/stage-maps.js";
import { cameraX, createStageWalk, heroPixel, markBeaten, stepWalk, walkStep } from "../js/game/stage-walk.js";

const map = buildStageMap("academia");

test("a held direction slides the hero one tile in 16 ticks and faces the way pressed", () => {
  let walk = createStageWalk(map);
  assert.deepEqual([walk.tx, walk.ty, walk.dir], [2, 7, "down"]);
  walk = stepWalk(map, walk, "right").walk;
  assert.deepEqual([walk.dir, walk.offset], ["right", 1]);
  assert.deepEqual(heroPixel(walk), { x: 2 * TILE + 1, y: 7 * TILE });
  for (let i = 0; i < 15; i += 1) walk = stepWalk(map, walk, null).walk;
  assert.deepEqual([walk.tx, walk.offset], [3, 0]);
  assert.equal(walkStep(stepWalk(map, walk, "up").walk), 0);
});

test("walls, trees and water only turn the hero; standing still keeps the facing", () => {
  const atTree = { ...createStageWalk(map), tx: 9, ty: 1 };
  const bumped = stepWalk(map, atTree, "right");
  assert.deepEqual([bumped.walk.tx, bumped.walk.offset, bumped.walk.dir, bumped.contact], [9, 0, "right", null]);
  assert.equal(stepWalk(map, bumped.walk, null).walk, bumped.walk);
});

test("bumping into an unbeaten enemy reports its index; a beaten one is just floor", () => {
  const beside = { ...createStageWalk(map), tx: 9, ty: 7 };
  assert.equal(stepWalk(map, beside, "right").contact, 0);
  const cleared = markBeaten(beside, 0);
  const moved = stepWalk(map, cleared, "right");
  assert.equal(moved.contact, null);
  assert.equal(moved.walk.offset, 1);
});

test("the camera follows the hero horizontally and stops at the map edges", () => {
  const start = createStageWalk(map);
  assert.equal(cameraX(map, start), 0);
  assert.equal(cameraX(map, { ...start, tx: 20 }), 20 * TILE + 8 - 160);
  assert.equal(cameraX(map, { ...start, tx: 38 }), 40 * TILE - 320);
});
