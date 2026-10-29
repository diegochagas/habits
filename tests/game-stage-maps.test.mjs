import { test } from "node:test";
import assert from "node:assert/strict";
import { STAGE_LAYOUTS, buildStageMap, isWalkable, tileAt } from "../js/game/stage-maps.js";
import { STAGES, stageEncounters } from "../js/game/stages.js";

/**
 * Tiles reachable from the start, treating the given spawn indexes as walls.
 * @param {import("../js/game/stage-maps.js").StageMap} map
 * @param {number[]} blockedSpawns
 * @returns {Set<string>}
 */
function reachable(map, blockedSpawns) {
  const blocked = new Set(map.spawns.filter((s) => blockedSpawns.includes(s.index)).map((s) => `${s.tx},${s.ty}`));
  const seen = new Set([`${map.start.tx},${map.start.ty}`]);
  const queue = [[map.start.tx, map.start.ty]];
  while (queue.length) {
    const [tx, ty] = /** @type {number[]} */ (queue.shift());
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const key = `${tx + dx},${ty + dy}`;
      if (seen.has(key) || blocked.has(key) || !isWalkable(map, tx + dx, ty + dy)) continue;
      seen.add(key);
      queue.push([tx + dx, ty + dy]);
    }
  }
  return seen;
}

test("every Arca has a 40x15 map, a start, one spawn per encounter, all on walkable tiles", () => {
  for (const stage of STAGES) {
    const map = buildStageMap(stage.id);
    assert.equal(map.width, 40, stage.id);
    assert.equal(map.height, 15, stage.id);
    for (const row of map.rows) assert.equal(row.length, 40, `${stage.id}: "${row}"`);
    assert.equal(map.spawns.length, stageEncounters(stage).length, stage.id);
    assert.deepEqual(
      map.spawns.map((s) => s.index),
      [0, 1, 2, 3],
      stage.id,
    );
    assert.ok(isWalkable(map, map.start.tx, map.start.ty), stage.id);
    assert.equal(Object.keys(STAGE_LAYOUTS).length, STAGES.length);
  }
});

test("enemies must be fought in order: each minion blocks the only way to the next one", () => {
  for (const stage of STAGES) {
    const map = buildStageMap(stage.id);
    for (let k = 0; k < 4; k += 1) {
      const standing = [0, 1, 2, 3].filter((index) => index >= k);
      const seen = reachable(map, standing);
      const next = map.spawns[k];
      const adjacent = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => seen.has(`${next.tx + dx},${next.ty + dy}`));
      assert.ok(adjacent, `${stage.id}: enemy ${k} reachable after beating ${k} enemies`);
      for (const later of map.spawns.slice(k + 1))
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ])
          assert.ok(
            !seen.has(`${later.tx + dx},${later.ty + dy}`),
            `${stage.id}: enemy ${later.index} reachable too early`,
          );
    }
  }
});

test("tiles outside the map count as walls and unknown stages throw a helpful error", () => {
  const map = buildStageMap("academia");
  assert.equal(tileAt(map, -1, 0), "#");
  assert.equal(isWalkable(map, 0, 0), false);
  assert.throws(() => buildStageMap("nope"), /expected one of academia/);
});
