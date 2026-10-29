// puzzle-app.js: the sort-puzzle page. Progress per skin in localStorage, sounds from the game's
// sound board, play time from the Pomodoro's free-time gate.

import { createSoundBoard } from "../game/sound.js";
import { seededRandom } from "../game/rules.js";
import { nextLang } from "../i18n.js";
import { startFreeTimeGate } from "../pomodoro/free-time-gate.js";
import { applyPomodoroTranslations } from "../pomodoro/pomodoro-i18n.js";
import { createPomodoroStore } from "../pomodoro/pomodoro-store.js";
import { applyPuzzleTranslations } from "./puzzle-i18n.js";
import { createPuzzleStore } from "./puzzle-store.js";
import { renderPuzzlePage } from "./puzzle-view.js";
import { canPour, generateSortPuzzle, isSolved, levelSpec, pour, undoPour } from "./sort-puzzle.js";

const LANG_KEY = "habits:lang";
const params = new URLSearchParams(location.search);
const random = params.get("seed") ? seededRandom(Number(params.get("seed"))) : Math.random;
const sounds = createSoundBoard(() => new AudioContext(), localStorage);
const store = createPuzzleStore(localStorage);
const main = /** @type {HTMLElement} */ (document.getElementById("puzzle-main"));
/** @returns {string} */
const today = () => new Date().toISOString().slice(0, 10);

const state = {
  lang: /** @type {"en" | "pt"} */ (localStorage.getItem(LANG_KEY) === "pt" ? "pt" : "en"),
  progress: store.load(),
  selected: /** @type {number | null} */ (null),
};

const gate = startFreeTimeGate({
  store: createPomodoroStore(localStorage),
  badge: /** @type {HTMLElement} */ (document.getElementById("free-time")),
  overlay: /** @type {HTMLElement} */ (document.getElementById("free-time-over")),
  lang: () => state.lang,
  today,
  secondsPerMinute: params.get("fast") ? 0.1 : 60,
  onExpired: () => render(),
});

/** @returns {import("./puzzle-store.js").SavedBoard} the board of the current skin, made on demand */
function currentBoard() {
  const skin = state.progress.skin;
  const saved = state.progress.boards[skin];
  if (saved) return saved;
  const spec = levelSpec(skin, state.progress.levels[skin]);
  const puzzle = generateSortPuzzle(spec.colours, spec.pourAll, random);
  const board = { start: puzzle.tubes, puzzle };
  state.progress = { ...state.progress, boards: { ...state.progress.boards, [skin]: board } };
  return board;
}

/** @param {import("./sort-puzzle.js").SortPuzzle} puzzle */
function commitPuzzle(puzzle) {
  const skin = state.progress.skin;
  const board = { start: currentBoard().start, puzzle };
  state.progress = { ...state.progress, boards: { ...state.progress.boards, [skin]: board } };
  store.save(state.progress);
  render();
}

function render() {
  document.documentElement.lang = state.lang;
  applyPuzzleTranslations(document, state.lang);
  applyPomodoroTranslations(document, state.lang);
  /** @type {HTMLElement} */ (document.getElementById("lang-toggle")).textContent = state.lang === "en" ? "PT" : "EN";
  /** @type {HTMLElement} */ (document.getElementById("sound-toggle")).textContent = sounds.enabled() ? "🔊" : "🔇";
  const skin = state.progress.skin;
  const board = currentBoard();
  store.save(state.progress);
  main.innerHTML = renderPuzzlePage({
    skin,
    level: state.progress.levels[skin],
    puzzle: board.puzzle,
    selected: state.selected,
    lang: state.lang,
  });
  main.classList.toggle("puzzle-locked", !gate.active());
  gate.render();
}

/** @param {number} index */
function onTube(index) {
  const puzzle = currentBoard().puzzle;
  if (isSolved(puzzle)) return;
  if (state.selected === null || state.selected === index)
    return select(state.selected === index ? null : index, puzzle);
  if (!canPour(puzzle, state.selected, index)) return select(index, puzzle);
  const poured = pour(puzzle, state.selected, index);
  state.selected = null;
  sounds.play(isSolved(poured) ? "victory" : "decision");
  commitPuzzle(poured);
}

/**
 * @param {number | null} index
 * @param {import("./sort-puzzle.js").SortPuzzle} puzzle
 */
function select(index, puzzle) {
  if (index !== null && puzzle.tubes[index].length === 0) return;
  state.selected = index;
  sounds.play(index === null ? "cancel" : "cursor");
  render();
}

/** @param {string} action */
function onControl(action) {
  const board = currentBoard();
  state.selected = null;
  if (action === "undo") return commitPuzzle(undoPour(board.puzzle));
  if (action === "restart") return commitPuzzle({ ...board.puzzle, tubes: board.start, moves: 0, history: [] });
  if (action === "new") return resetBoard(state.progress.levels[state.progress.skin]);
  if (action === "next") {
    sounds.play("fanfare");
    resetBoard(state.progress.levels[state.progress.skin] + 1);
  }
}

/** @param {number} level */
function resetBoard(level) {
  const skin = state.progress.skin;
  state.progress = {
    ...state.progress,
    levels: { ...state.progress.levels, [skin]: level },
    boards: { ...state.progress.boards, [skin]: null },
  };
  sounds.play("decision");
  render();
}

/** @param {import("./sort-puzzle.js").PuzzleSkin} skin */
function onSkin(skin) {
  state.selected = null;
  state.progress = { ...state.progress, skin };
  sounds.play("cursor");
  render();
}

main.addEventListener("click", (event) => {
  if (!gate.active()) return;
  const target = /** @type {HTMLElement} */ (event.target);
  const tube = /** @type {HTMLElement | null} */ (target.closest("[data-tube]"));
  if (tube) return onTube(Number(tube.dataset.tube));
  const control = /** @type {HTMLElement | null} */ (target.closest("button[data-puzzle]"));
  if (control) return onControl(control.dataset.puzzle ?? "");
  const skin = /** @type {HTMLElement | null} */ (target.closest("[data-skin]"));
  if (skin) onSkin(/** @type {any} */ (skin.dataset.skin));
});
document.getElementById("lang-toggle")?.addEventListener("click", () => {
  state.lang = nextLang(state.lang);
  localStorage.setItem(LANG_KEY, state.lang);
  render();
});
document.getElementById("sound-toggle")?.addEventListener("click", () => {
  sounds.toggle();
  sounds.play("decision");
  render();
});
render();
