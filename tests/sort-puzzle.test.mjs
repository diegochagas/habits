import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAPACITY,
  canPour,
  generateSortPuzzle,
  isSolvable,
  isSolved,
  levelSpec,
  pour,
  undoPour,
} from "../js/puzzle/sort-puzzle.js";
import { seededRandom } from "../js/game/rules.js";

/** @param {number[][]} tubes */
const puzzleOf = (tubes, pourAll = false) => ({ tubes, capacity: CAPACITY, pourAll, moves: 0, history: [] });

test("levels grow from 3 colours to 9; coins pour the whole run, tubes one ball", () => {
  assert.deepEqual(levelSpec("tubes", 1), { colours: 3, pourAll: false });
  assert.deepEqual(levelSpec("coins", 4), { colours: 4, pourAll: true });
  assert.equal(levelSpec("tubes", 40).colours, 9);
  assert.throws(() => levelSpec(/** @type {any} */ ("cups"), 1), /expected tubes or coins/);
});

test("a pour needs a matching or empty target with room; tubes move one, coins move the run", () => {
  const start = puzzleOf([[0, 1, 1], [0, 0], [1], []]);
  assert.equal(canPour(start, 0, 2), true, "1 onto 1");
  assert.equal(canPour(start, 0, 1), false, "1 onto 0");
  assert.equal(canPour(start, 0, 3), true, "anything onto empty");
  assert.equal(canPour(start, 3, 0), false, "nothing to pour");
  assert.equal(canPour(start, 0, 0), false);
  const one = pour(start, 0, 2);
  assert.deepEqual([one.tubes[0], one.tubes[2], one.moves], [[0, 1], [1, 1], 1]);
  const run = pour({ ...start, pourAll: true }, 0, 2);
  assert.deepEqual([run.tubes[0], run.tubes[2]], [[0], [1, 1, 1]]);
  const full = pour({ ...start, pourAll: true, tubes: [[0, 1, 1, 1], [1, 1, 1], []] }, 0, 1);
  assert.deepEqual(
    [full.tubes[0], full.tubes[1]],
    [
      [0, 1, 1],
      [1, 1, 1, 1],
    ],
    "only what fits",
  );
  assert.equal(pour(start, 0, 1), start, "an illegal pour is a no-op");
});

test("undo restores the previous tubes and counts as a move; solved = full uniform tubes", () => {
  const start = puzzleOf([[0, 1], [1, 0], [], []]);
  const moved = pour(pour(start, 0, 2), 1, 3);
  assert.equal(moved.moves, 2);
  const undone = undoPour(moved);
  assert.deepEqual(undone.tubes, pour(start, 0, 2).tubes);
  assert.equal(undone.moves, 3);
  assert.equal(undoPour(start), start);
  assert.equal(isSolved(puzzleOf([[0, 0, 0, 0], [], [1, 1, 1, 1]])), true);
  assert.equal(isSolved(puzzleOf([[0, 0, 0], [0], [1, 1, 1, 1]])), false);
});

test("the solver tells a solvable position from a dead one", () => {
  assert.equal(isSolvable([[0, 1, 0, 1], [1, 0, 1, 0], [], []]), true);
  assert.equal(
    isSolvable([
      [0, 1, 0, 1],
      [1, 0, 1, 0],
    ]),
    false,
    "no empty tube, nowhere to pour",
  );
  assert.equal(isSolvable([[0, 0, 0, 0], [1, 1, 1, 1], []]), true);
});

test("generated levels are solvable, use every colour four times and start with no sorted tube", () => {
  for (const [skin, level] of [
    ["tubes", 1],
    ["coins", 3],
    ["tubes", 8],
    ["coins", 13],
  ]) {
    const spec = levelSpec(/** @type {any} */ (skin), level);
    const puzzle = generateSortPuzzle(spec.colours, spec.pourAll, seededRandom(level * 7));
    assert.equal(puzzle.tubes.length, spec.colours + 2);
    const counts = new Map();
    for (const item of puzzle.tubes.flat()) counts.set(item, (counts.get(item) ?? 0) + 1);
    assert.deepEqual([...counts.values()], Array(spec.colours).fill(CAPACITY));
    assert.ok(puzzle.tubes.every((tube) => tube.length === 0 || new Set(tube).size > 1));
    assert.equal(isSolvable(puzzle.tubes), true);
    assert.equal(puzzle.pourAll, spec.pourAll);
  }
});
