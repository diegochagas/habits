// stages-view.js: the Arca select screen. Every Arca is open; the required points only warn.

import { gameText } from "./game-i18n.js";
import { deriveSheet } from "./hero-sheet.js";
import { STAGES } from "./stages.js";

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
export function renderStagesView(hero, lang) {
  const points = deriveSheet(hero).points;
  const cards = STAGES.map((stage, index) => renderStageCard(hero, lang, stage, index, points));
  return `<div class="stage-grid">${cards.join("")}</div>`;
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @param {import("./stages.js").StageDefinition} stage
 * @param {number} index
 * @param {number} points
 * @returns {string}
 */
function renderStageCard(hero, lang, stage, index, points) {
  const progress = hero.stages[stage.id];
  const cleared = progress?.bossBeaten ? `<span class="stage-cleared">★ ${gameText(lang, "stageCleared")}</span>` : "";
  const weak =
    points < stage.requiredPoints ? `<p class="stage-warning">${gameText(lang, "stageTooWeak", { points })}</p>` : "";
  const foes = [...stage.minions, stage.boss].map((foe) => gameText(lang, `foe.${foe.id}`));
  return `<article class="panel stage-card ${points >= stage.requiredPoints ? "stage-open" : "stage-locked"}">
  <span class="stage-number">${index + 1}</span>
  <h3 class="panel-title">${gameText(lang, `stage.${stage.id}`)}</h3>
  <p class="stage-req">${gameText(lang, "stageRequires", { points: stage.requiredPoints })} ${cleared}</p>
  <p class="stage-foes">${foes.join(" · ")}</p>
  ${weak}
  <button type="button" class="stamp" data-action="enter-stage" data-stage="${stage.id}">${gameText(lang, "stageEnter")}</button>
</article>`;
}
