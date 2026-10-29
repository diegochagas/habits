// puzzle-view.js: HTML for the sort-puzzle board. Colours are ink patterns (class ink-0 … ink-8),
// tubes are buttons, the selected tube lifts what the next pour would move.

import { puzzleText } from "./puzzle-i18n.js";
import { isSolved } from "./sort-puzzle.js";

/**
 * @typedef {object} PuzzleView
 * @property {import("./sort-puzzle.js").PuzzleSkin} skin
 * @property {number} level
 * @property {import("./sort-puzzle.js").SortPuzzle} puzzle
 * @property {number | null} selected
 * @property {"en" | "pt"} lang
 */

/**
 * @param {PuzzleView} view
 * @returns {string}
 */
export function renderPuzzlePage(view) {
  const solved = isSolved(view.puzzle);
  return `${renderSkinTabs(view)}
<p class="puzzle-status"><b>${puzzleText(view.lang, "level", { level: view.level })}</b> · ${puzzleText(view.lang, "moves", { moves: view.puzzle.moves })}</p>
${renderBoard(view)}
${solved ? renderSolved(view) : ""}
<div class="puzzle-controls">
  <button type="button" class="stamp" data-puzzle="undo"${view.puzzle.history.length === 0 ? " disabled" : ""}>${puzzleText(view.lang, "undo")}</button>
  <button type="button" class="stamp" data-puzzle="restart">${puzzleText(view.lang, "restart")}</button>
  <button type="button" class="stamp stamp-danger" data-puzzle="new">${puzzleText(view.lang, "newLevel")}</button>
</div>
<p class="muted puzzle-how">${puzzleText(view.lang, view.skin === "coins" ? "howCoins" : "howTubes")}</p>`;
}

/**
 * @param {PuzzleView} view
 * @returns {string}
 */
function renderSkinTabs(view) {
  const tabs = /** @type {const} */ (["tubes", "coins"]).map(
    (skin) =>
      `<button type="button" class="tab${view.skin === skin ? " tab-active" : ""}" data-skin="${skin}">${puzzleText(view.lang, skin === "tubes" ? "skinTubes" : "skinCoins")}</button>`,
  );
  return `<nav class="game-tabs" aria-label="Puzzle">${tabs.join("")}</nav>`;
}

/**
 * @param {PuzzleView} view
 * @returns {string}
 */
function renderBoard(view) {
  const tubes = view.puzzle.tubes.map((tube, index) => renderTube(view, tube, index));
  return `<div class="sort-board skin-${view.skin}" style="--capacity: ${view.puzzle.capacity}">${tubes.join("")}</div>`;
}

/**
 * @param {PuzzleView} view
 * @param {number[]} tube
 * @param {number} index
 * @returns {string}
 */
function renderTube(view, tube, index) {
  const lifted = view.selected === index ? liftedCount(tube, view.puzzle.pourAll) : 0;
  const items = tube.map((colour, position) => {
    const lift = position >= tube.length - lifted ? " lifted" : "";
    return `<span class="sort-item ink-${colour}${lift}" aria-hidden="true"></span>`;
  });
  const label = puzzleText(view.lang, view.skin === "coins" ? "stack" : "tube", { n: index + 1 });
  return `<button type="button" class="tube${view.selected === index ? " tube-selected" : ""}" data-tube="${index}" aria-label="${label}" aria-pressed="${view.selected === index}">${items.join("")}</button>`;
}

/**
 * How many items the next pour would take: one ball, or the whole run of equal coins.
 * @param {number[]} tube
 * @param {boolean} pourAll
 * @returns {number}
 */
export function liftedCount(tube, pourAll) {
  if (tube.length === 0) return 0;
  if (!pourAll) return 1;
  const top = tube[tube.length - 1];
  let run = 0;
  while (run < tube.length && tube[tube.length - 1 - run] === top) run += 1;
  return run;
}

/**
 * @param {PuzzleView} view
 * @returns {string}
 */
function renderSolved(view) {
  return `<div class="rm-window puzzle-win" role="status">
  <p>${puzzleText(view.lang, "solved", { moves: view.puzzle.moves })}</p>
  <button type="button" class="stamp stamp-big" data-puzzle="next">${puzzleText(view.lang, "nextLevel")}</button>
</div>`;
}
