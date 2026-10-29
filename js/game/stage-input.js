// stage-input.js: the held direction for the map, from arrow/WASD keys and the on-screen d-pad
// ([data-dir] buttons, pointer events). The most recently pressed direction wins; a quick tap
// still counts for one tick, so one click on the d-pad walks exactly one tile.

const KEY_DIRECTIONS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

/**
 * @typedef {object} DirectionInput
 * @property {() => import("./chibi-sprite.js").Facing | null} current
 * @property {() => void} releaseAll
 */

/**
 * @param {Document} root
 * @param {() => boolean} isActive keys are captured only while this returns true
 * @returns {DirectionInput}
 * @example createDirectionInput(document, () => state.tab === "battle").current()
 */
export function createDirectionInput(root, isActive) {
  /** @type {import("./chibi-sprite.js").Facing[]} */
  const held = [];
  /** @type {import("./chibi-sprite.js").Facing | null} a tap shorter than one frame still steps once */
  let tapped = null;
  const press = (dir, tap = false) => {
    release(dir);
    held.push(dir);
    tapped = tap ? dir : null;
  };
  const release = (dir) => {
    const at = held.indexOf(dir);
    if (at >= 0) held.splice(at, 1);
  };
  root.addEventListener("keydown", (event) => onKey(event, isActive, (dir) => press(dir)));
  root.addEventListener("keyup", (event) => onKey(event, isActive, release));
  const releaseAll = () => {
    held.splice(0);
    tapped = null;
  };
  bindDpad(root, press, () => held.splice(0));
  const current = () => {
    if (held.length) return held[held.length - 1];
    const step = tapped;
    tapped = null;
    return step;
  };
  return { current, releaseAll };
}

/**
 * @param {KeyboardEvent} event
 * @param {() => boolean} isActive
 * @param {(dir: import("./chibi-sprite.js").Facing) => void} apply
 */
function onKey(event, isActive, apply) {
  const dir = KEY_DIRECTIONS[event.key];
  if (!dir || !isActive() || isTypingTarget(event.target)) return;
  event.preventDefault();
  if (!event.repeat) apply(dir);
}

/**
 * @param {EventTarget | null} target
 * @returns {boolean}
 */
function isTypingTarget(target) {
  const tag = target instanceof Element ? target.tagName : "";
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * @param {Document} root
 * @param {(dir: import("./chibi-sprite.js").Facing, tap: boolean) => void} press
 * @param {() => void} releaseAll
 */
function bindDpad(root, press, releaseAll) {
  root.addEventListener("pointerdown", (event) => {
    const key = /** @type {HTMLElement | null} */ (/** @type {Element} */ (event.target).closest?.("[data-dir]"));
    if (!key) return;
    event.preventDefault();
    press(/** @type {import("./chibi-sprite.js").Facing} */ (key.dataset.dir), true);
  });
  for (const type of ["pointerup", "pointercancel"]) root.addEventListener(type, releaseAll);
}
