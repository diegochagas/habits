// battle-view.js: the adventure screen: the map with a d-pad while walking, the RPG Maker style
// command window and message log while fighting. The run is owned by game-app.js; this renders it.

import { availableActions } from "./combat.js";
import { battleLogText, gameText } from "./game-i18n.js";
import { currentFoe } from "./stage-run.js";
import { stageById, stageEncounters } from "./stages.js";

/** @typedef {import("./stage-run.js").StageRun} StageRun */

/**
 * @param {StageRun | null} run
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
export function renderBattleView(run, lang) {
  if (!run) return `<section class="panel battle-idle"><p>${gameText(lang, "battleIdle")}</p></section>`;
  const canvas = `<canvas id="battle-canvas" class="battle-canvas" width="640" height="480"></canvas>`;
  const body = run.duel ? renderDuel(run, lang) : renderMap(run, lang);
  return `<section class="panel battle-panel">${body.head}${canvas}${body.controls}${body.window}</section>`;
}

/**
 * @param {StageRun} run
 * @param {"en" | "pt"} lang
 * @returns {{ head: string, controls: string, window: string }}
 */
function renderMap(run, lang) {
  const total = run.walk.beaten.length;
  const beaten = run.walk.beaten.filter(Boolean).length;
  return {
    head: `<p class="battle-head"><b>${gameText(lang, `stage.${run.stageId}`)}</b> · ${gameText(lang, "mapProgress", { beaten, total })}</p>`,
    controls: `<div class="map-controls">${renderDpad(lang)}${actionButton("home", gameText(lang, "actionHome"))}</div>`,
    window: `<p class="rm-window walk-hint">${gameText(lang, beaten === total ? "logStageCleared" : "walkHint")}</p>`,
  };
}

/**
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderDpad(lang) {
  const key = (dir, glyph) =>
    `<button type="button" class="dpad-key dpad-${dir}" data-dir="${dir}" aria-label="${gameText(lang, `dir${dir.charAt(0).toUpperCase()}${dir.slice(1)}`)}">${glyph}</button>`;
  return `<div class="dpad" role="group" aria-label="${gameText(lang, "dpad")}">${key("up", "▲")}${key("left", "◀")}${key("right", "▶")}${key("down", "▼")}</div>`;
}

/**
 * @param {StageRun} run
 * @param {"en" | "pt"} lang
 * @returns {{ head: string, controls: string, window: string }}
 */
function renderDuel(run, lang) {
  const duel = /** @type {import("./combat.js").DuelState} */ (run.duel);
  const total = stageEncounters(/** @type {import("./stages.js").StageDefinition} */ (stageById(run.stageId))).length;
  const foe = currentFoe(run);
  return {
    head: `<p class="battle-head"><b>${gameText(lang, `foe.${foe.id}`)}</b> · ${gameText(lang, "encounter", { index: run.index + 1, total })} · ${gameText(lang, "battleRound", { round: duel.round })}</p>`,
    controls: `<div class="rm-window rm-commands">${renderCommands(duel, lang)}</div>`,
    window: `<ol class="rm-window battle-log">${renderLog(run, lang)}</ol>`,
  };
}

/**
 * @param {import("./combat.js").DuelState} duel
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderCommands(duel, lang) {
  if (duel.phase === "won" || duel.phase === "fled") return actionButton("resume", gameText(lang, "actionResume"));
  if (duel.phase === "lost") return actionButton("home", gameText(lang, "actionHome"));
  return availableActions(duel)
    .map((action) => actionButton(action, gameText(lang, `action${action.charAt(0).toUpperCase()}${action.slice(1)}`)))
    .join("");
}

/**
 * @param {string} action
 * @param {string} label
 * @returns {string}
 */
function actionButton(action, label) {
  const danger = action === "flee" || action === "home" ? " rm-command-danger" : "";
  return `<button type="button" class="rm-command${danger}" data-action="battle" data-battle="${action}">${label}</button>`;
}

/**
 * @param {StageRun} run
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderLog(run, lang) {
  const log = run.duel?.log ?? [];
  return log
    .slice(-8)
    .reverse()
    .map((line) => `<li>${battleLogText(lang, line, run.lastXp)}</li>`)
    .join("");
}
