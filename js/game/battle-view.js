// battle-view.js: the fight screen: canvas, action buttons and the log. The run (which stage,
// which enemy, the duel state) is owned by game-app.js; this module only renders it.

import { availableActions } from "./combat.js";
import { battleLogText, gameText } from "./game-i18n.js";
import { stageById, stageEncounters } from "./stages.js";

/**
 * @typedef {object} StageRun
 * @property {string} stageId
 * @property {number} index encounter index
 * @property {import("./combat.js").DuelState} duel
 * @property {number} lastXp
 * @property {number} heroPoseUntil tick until which the hero pose holds
 * @property {import("./character-sprite.js").Pose} heroPose
 * @property {number} foePoseUntil
 * @property {"idle" | "hurt" | "down"} foePose
 */

/**
 * @param {StageRun | null} run
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
export function renderBattleView(run, lang) {
  if (!run) return `<section class="panel battle-idle"><p>${gameText(lang, "battleIdle")}</p></section>`;
  const stage = /** @type {import("./stages.js").StageDefinition} */ (stageById(run.stageId));
  const total = stageEncounters(stage).length;
  const foe = stageEncounters(stage)[run.index];
  return `<section class="panel battle-panel">
  <p class="battle-head"><b>${gameText(lang, `stage.${run.stageId}`)}</b> · ${gameText(lang, "encounter", { index: run.index + 1, total })} · ${gameText(lang, `foe.${foe.id}`)} · ${gameText(lang, "battleRound", { round: run.duel.round })}</p>
  <canvas id="battle-canvas" class="battle-canvas" width="640" height="360"></canvas>
  <div class="battle-actions">${renderActions(run, lang, total)}</div>
  <ol class="battle-log">${renderLog(run, lang)}</ol>
</section>`;
}

/**
 * @param {StageRun} run
 * @param {"en" | "pt"} lang
 * @param {number} total
 * @returns {string}
 */
function renderActions(run, lang, total) {
  const { phase } = run.duel;
  if (phase === "won" && run.index + 1 < total) return actionButton("next", gameText(lang, "actionNext"));
  if (phase !== "player") return actionButton("home", gameText(lang, "actionHome"));
  return availableActions(run.duel)
    .map((action) => actionButton(action, gameText(lang, `action${action.charAt(0).toUpperCase()}${action.slice(1)}`)))
    .join("");
}

/**
 * @param {string} action
 * @param {string} label
 * @returns {string}
 */
function actionButton(action, label) {
  const danger = action === "flee" || action === "home" ? " stamp-danger" : "";
  return `<button type="button" class="stamp${danger}" data-action="battle" data-battle="${action}">${label}</button>`;
}

/**
 * @param {StageRun} run
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderLog(run, lang) {
  return run.duel.log
    .slice(-8)
    .reverse()
    .map((line) => `<li>${battleLogText(lang, line, run.lastXp)}</li>`)
    .join("");
}
