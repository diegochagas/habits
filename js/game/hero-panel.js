// hero-panel.js: the always-visible hero card: animated chibi, points/tier, P/H/R, PV/PM/PA,
// weight form and the XP pools. HTML strings + one canvas draw.

import { CHIBI_H, CHIBI_W, drawChibi } from "./chibi-sprite.js";
import { gameText } from "./game-i18n.js";
import { deriveSheet } from "./hero-sheet.js";
import { createPainter } from "./pixel-painter.js";
import { escapeHtml } from "../linkify.js";

/**
 * The portrait: the chibi walking in place, facing the player.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import("./chibi-sprite.js").ChibiLook} look
 * @param {import("./chibi-sprite.js").ChibiPose} pose
 * @param {number} tick
 */
export function drawPortrait(ctx, look, pose, tick) {
  const scale = ctx.canvas.width / CHIBI_W;
  const p = createPainter(ctx, scale);
  p.rect(0, 0, CHIBI_W, CHIBI_H, "#fff");
  p.halftone(0, 0, CHIBI_W, CHIBI_H, "#d8d8d8", 4);
  drawChibi(p, 0, 0, look, { dir: "down", pose, step: Math.floor(tick / 8) % 4, tick });
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @param {string} today
 * @returns {string}
 */
export function renderHeroPanel(hero, lang, today) {
  const sheet = deriveSheet(hero);
  const tier = gameText(lang, `tier${sheet.tier.charAt(0).toUpperCase()}${sheet.tier.slice(1)}`);
  return `<div class="hero-card">
  <canvas id="portrait" class="portrait" width="120" height="160" aria-label="Diego"></canvas>
  <div class="hero-stats">
    <p class="hero-rank"><b>${sheet.points}</b> ${gameText(lang, "points")} · ${tier}</p>
    ${renderAttributes(sheet)}
    ${renderResources(hero, sheet)}
    ${renderWeightForm(hero, lang)}
    ${renderPools(hero, lang)}
    <p class="hero-tools">
      <button type="button" class="stamp stamp-small" data-action="rest">${gameText(lang, "rest")}</button>
      <button type="button" class="stamp stamp-small stamp-danger" data-action="reset-hero">${gameText(lang, "resetHero")}</button>
    </p>
  </div>
</div>`;
}

/**
 * @param {ReturnType<typeof deriveSheet>} sheet
 * @returns {string}
 */
function renderAttributes(sheet) {
  const { P, H, R } = sheet.attributes;
  return `<p class="hero-attributes"><span>P<b>${P}</b></span><span>H<b>${H}</b></span><span>R<b>${R}</b></span></p>`;
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {ReturnType<typeof deriveSheet>} sheet
 * @returns {string}
 */
function renderResources(hero, sheet) {
  const bar = (label, value, max, cls) =>
    `<div class="resource ${cls}"><span>${label} ${value}/${max}</span><i style="width:${max ? Math.round((100 * value) / max) : 0}%"></i></div>`;
  return (
    bar("PV", hero.current.pv, sheet.max.pv, "pv") +
    bar("PM", hero.current.pm, sheet.max.pm, "pm") +
    bar("PA", hero.current.pa, sheet.max.pa, "pa")
  );
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderWeightForm(hero, lang) {
  return `<form class="weight-form" data-form="weight">
    <label>${gameText(lang, "weight")} <input type="number" name="kg" step="0.1" min="30" max="400" value="${hero.weightKg}" inputmode="decimal" /> kg</label>
    <button type="submit" class="stamp stamp-small">${gameText(lang, "weightSave")}</button>
  </form>`;
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderPools(hero, lang) {
  const tracks = ["poder", "habilidade", "resistencia"];
  const chips = tracks.map(
    (track) =>
      `<span class="pool pool-${track}">${escapeHtml(gameText(lang, `track${capitalize(track)}`))} <b>${hero.pools[track]}</b></span>`,
  );
  return `<p class="hero-pools"><span class="pools-label">${gameText(lang, "pools")}</span>${chips.join("")}</p>`;
}

/**
 * @param {string} word
 * @returns {string}
 */
export function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
