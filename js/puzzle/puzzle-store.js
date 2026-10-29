// puzzle-store.js: puzzle progress in localStorage: the chosen skin, the level reached per skin
// and the board in progress per skin (so a reload keeps the game).

export const PUZZLE_KEY = "habits:puzzle:v1";

/**
 * @typedef {object} PuzzleProgress
 * @property {import("./sort-puzzle.js").PuzzleSkin} skin
 * @property {{ tubes: number, coins: number }} levels
 * @property {{ tubes: SavedBoard | null, coins: SavedBoard | null }} boards
 * @typedef {{ start: number[][], puzzle: import("./sort-puzzle.js").SortPuzzle }} SavedBoard
 */

/** @returns {PuzzleProgress} */
export function createPuzzleProgress() {
  return { skin: "tubes", levels: { tubes: 1, coins: 1 }, boards: { tubes: null, coins: null } };
}

/**
 * @param {{ getItem: (k: string) => string | null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void }} storage
 */
export function createPuzzleStore(storage) {
  return {
    /** @returns {PuzzleProgress} */
    load() {
      const saved = storage.getItem(PUZZLE_KEY);
      const parsed = saved ? safeParse(saved) : null;
      return isPuzzleProgress(parsed) ? parsed : createPuzzleProgress();
    },
    /** @param {PuzzleProgress} progress */
    save(progress) {
      storage.setItem(PUZZLE_KEY, JSON.stringify(progress));
    },
  };
}

/**
 * @param {unknown} raw
 * @returns {raw is PuzzleProgress}
 */
export function isPuzzleProgress(raw) {
  if (typeof raw !== "object" || raw === null) return false;
  const progress = /** @type {Record<string, any>} */ (raw);
  return (
    (progress.skin === "tubes" || progress.skin === "coins") &&
    typeof progress.levels?.tubes === "number" &&
    typeof progress.levels?.coins === "number" &&
    typeof progress.boards === "object"
  );
}

/**
 * @param {string} text
 * @returns {unknown}
 */
function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
