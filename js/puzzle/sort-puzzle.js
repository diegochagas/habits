// sort-puzzle.js: the "sort the colours into tubes" puzzle (Magic Sort / coin sort style) as pure
// values. Items are small integers (a colour index); the views decide how a colour looks.
// Two rules: `tubes` moves one ball per pour, `coins` pours the whole run of equal coins.

export const CAPACITY = 4;
export const EMPTY_TUBES = 2;
export const MAX_COLOURS = 9;

/**
 * @typedef {"tubes" | "coins"} PuzzleSkin
 * @typedef {object} SortPuzzle
 * @property {number[][]} tubes bottom → top
 * @property {number} capacity
 * @property {boolean} pourAll
 * @property {number} moves
 * @property {number[][][]} history tube snapshots before each move, for undo
 */

/**
 * How many colours a level has: 3 on levels 1–2, one more every two levels, up to 9.
 * @param {PuzzleSkin} skin
 * @param {number} level 1-based
 * @returns {{ colours: number, pourAll: boolean }}
 * @example levelSpec("coins", 5) // { colours: 5, pourAll: true }
 */
export function levelSpec(skin, level) {
  if (skin !== "tubes" && skin !== "coins") throw new Error(`puzzle skin "${skin}": expected tubes or coins`);
  return { colours: Math.min(MAX_COLOURS, 3 + Math.floor((Math.max(1, level) - 1) / 2)), pourAll: skin === "coins" };
}

/**
 * A random, solvable puzzle with `colours` colours and two empty tubes.
 * @param {number} colours
 * @param {boolean} pourAll
 * @param {() => number} random 0 ≤ r < 1
 * @returns {SortPuzzle}
 */
export function generateSortPuzzle(colours, pourAll, random) {
  let tubes = shuffledTubes(colours, random);
  for (let attempt = 0; attempt < 40 && !(isInteresting(tubes) && isSolvable(tubes)); attempt += 1)
    tubes = shuffledTubes(colours, random);
  return { tubes, capacity: CAPACITY, pourAll, moves: 0, history: [] };
}

/**
 * @param {number} colours
 * @param {() => number} random
 * @returns {number[][]}
 */
function shuffledTubes(colours, random) {
  const items = Array.from({ length: colours * CAPACITY }, (_, i) => i % colours);
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  const filled = Array.from({ length: colours }, (_, t) => items.slice(t * CAPACITY, (t + 1) * CAPACITY));
  return [...filled, ...Array.from({ length: EMPTY_TUBES }, () => [])];
}

/**
 * No tube starts already sorted.
 * @param {number[][]} tubes
 * @returns {boolean}
 */
function isInteresting(tubes) {
  return tubes.every((tube) => tube.length === 0 || !isUniform(tube));
}

/**
 * @param {number[]} tube
 * @returns {boolean}
 */
function isUniform(tube) {
  return tube.every((item) => item === tube[0]);
}

/**
 * @param {SortPuzzle} puzzle
 * @returns {boolean}
 */
export function isSolved(puzzle) {
  return puzzle.tubes.every((tube) => tube.length === 0 || (tube.length === puzzle.capacity && isUniform(tube)));
}

/**
 * @param {SortPuzzle} puzzle
 * @param {number} from
 * @param {number} to
 * @returns {boolean}
 */
export function canPour(puzzle, from, to) {
  const source = puzzle.tubes[from];
  const target = puzzle.tubes[to];
  if (from === to || !source || !target || source.length === 0 || target.length >= puzzle.capacity) return false;
  return target.length === 0 || target[target.length - 1] === source[source.length - 1];
}

/**
 * Pour from one tube into another; an illegal pour returns the same puzzle.
 * @param {SortPuzzle} puzzle
 * @param {number} from
 * @param {number} to
 * @returns {SortPuzzle}
 * @example pour(puzzle, 0, 5).moves // puzzle.moves + 1
 */
export function pour(puzzle, from, to) {
  if (!canPour(puzzle, from, to)) return puzzle;
  const tubes = puzzle.tubes.map((tube) => [...tube]);
  const count = puzzle.pourAll ? pourableCount(tubes[from], tubes[to], puzzle.capacity) : 1;
  tubes[to].push(...tubes[from].splice(tubes[from].length - count, count));
  return { ...puzzle, tubes, moves: puzzle.moves + 1, history: [...puzzle.history, puzzle.tubes] };
}

/**
 * @param {number[]} source
 * @param {number[]} target
 * @param {number} capacity
 * @returns {number} how many of the top run fit
 */
function pourableCount(source, target, capacity) {
  const colour = source[source.length - 1];
  let run = 0;
  while (run < source.length && source[source.length - 1 - run] === colour) run += 1;
  return Math.min(run, capacity - target.length);
}

/**
 * @param {SortPuzzle} puzzle
 * @returns {SortPuzzle}
 */
export function undoPour(puzzle) {
  const previous = puzzle.history[puzzle.history.length - 1];
  if (!previous) return puzzle;
  return { ...puzzle, tubes: previous, moves: puzzle.moves + 1, history: puzzle.history.slice(0, -1) };
}

/**
 * Depth-first search over pour-everything moves, tube order ignored. A level that needs more
 * than `limit` positions counts as unsolvable and gets regenerated.
 * @param {number[][]} tubes
 * @param {number} [limit]
 * @returns {boolean}
 */
export function isSolvable(tubes, limit = 60_000) {
  const start = { tubes, capacity: CAPACITY, pourAll: true, moves: 0, history: [] };
  const seen = new Set([positionKey(tubes)]);
  const stack = [start];
  let expanded = 0;
  while (stack.length > 0) {
    const current = /** @type {SortPuzzle} */ (stack.pop());
    if (isSolved(current)) return true;
    if ((expanded += 1) > limit) return false;
    for (const next of usefulMoves(current)) if (!seen.has(positionKey(next.tubes))) pushMove(seen, stack, next);
  }
  return false;
}

/**
 * @param {Set<string>} seen
 * @param {SortPuzzle[]} stack
 * @param {SortPuzzle} next
 */
function pushMove(seen, stack, next) {
  seen.add(positionKey(next.tubes));
  stack.push(next);
}

/**
 * Pours that can change the outcome: not from a finished tube, not a uniform tube into an empty.
 * @param {SortPuzzle} puzzle
 * @returns {SortPuzzle[]}
 */
function usefulMoves(puzzle) {
  const moves = [];
  puzzle.tubes.forEach((source, from) => {
    if (source.length === 0 || (isUniform(source) && source.length === puzzle.capacity)) return;
    puzzle.tubes.forEach((target, to) => {
      if (target.length === 0 && isUniform(source)) return;
      if (canPour(puzzle, from, to)) moves.push(pour(puzzle, from, to));
    });
  });
  return moves;
}

/**
 * @param {number[][]} tubes
 * @returns {string}
 */
function positionKey(tubes) {
  return tubes
    .map((tube) => tube.join(","))
    .sort()
    .join("|");
}
