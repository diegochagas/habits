// sheet-view.js: the Ficha de Personagem and the shop. Each track's XP buys only its own things.

import { SHOP, TRACK_ATTRIBUTE } from "./catalog.js";
import { gameText } from "./game-i18n.js";
import { capitalize } from "./hero-panel.js";
import { countOwned, deriveSheet } from "./hero-sheet.js";
import { attributeRaise, purchaseBlocker } from "./progression.js";

const TRACKS = ["poder", "habilidade", "resistencia"];

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
export function renderSheetView(hero, lang) {
  const sheet = deriveSheet(hero);
  return `<div class="sheet-grid">
  <section class="panel panel-tilt-left"><h3 class="panel-title">${gameText(lang, "attributes")}</h3>${renderAttributeRows(hero, lang)}</section>
  <section class="panel panel-tilt-right">
    ${renderOwnedList(hero, lang, "pericia", "pericias")}
    ${renderOwnedList(hero, lang, "vantagem", "vantagens")}
    ${renderDesvantagens(sheet, lang)}
    ${renderOwnedList(hero, lang, "artefato", "artefatos")}
    ${renderInventory(hero, lang)}
  </section>
  <section class="panel shop"><h3 class="panel-title">${gameText(lang, "shop")}</h3>${renderShop(hero, lang)}</section>
</div>`;
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderAttributeRows(hero, lang) {
  const rows = TRACKS.map((track) => {
    const key = TRACK_ATTRIBUTE[track];
    const { cost, reason } = attributeRaise(hero, track);
    const label = gameText(lang, `track${capitalize(track)}`);
    return `<div class="attribute-row track-${track}"><span>${label} <b>${hero.attributes[key]}</b></span>
      <button type="button" class="stamp stamp-small" data-action="raise" data-track="${track}" ${reason ? "disabled" : ""}>${gameText(lang, "raise", { cost })}</button></div>`;
  });
  return rows.join("");
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @param {string} kind
 * @param {string} titleKey
 * @returns {string}
 */
function renderOwnedList(hero, lang, kind, titleKey) {
  const ids = [...new Set(hero.owned.filter((id) => id.startsWith(`${kind}.`)))];
  const items = ids.map((id) => {
    const count = countOwned(hero, id);
    return `<li>${gameText(lang, `shop.${id}`)}${count > 1 ? ` ×${count}` : ""}</li>`;
  });
  return `<h3 class="panel-title">${gameText(lang, titleKey)}</h3><ul class="sheet-list">${items.join("") || "<li class='muted'>—</li>"}</ul>`;
}

/**
 * @param {ReturnType<typeof deriveSheet>} sheet
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderDesvantagens(sheet, lang) {
  const items = sheet.desvantagens.map((key) => `<li>${gameText(lang, `desv.${key}`)}</li>`);
  return `<h3 class="panel-title">${gameText(lang, "desvantagens")}</h3><ul class="sheet-list">${items.join("") || "<li class='muted'>—</li>"}</ul>`;
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderInventory(hero, lang) {
  const ids = [...new Set(hero.owned.filter((id) => id.startsWith("item.")))];
  const items = ids.map(
    (id) => `<li>${gameText(lang, `shop.${id}`)} ×${countOwned(hero, id)}
      <button type="button" class="stamp stamp-small" data-action="use-item" data-item="${id}">${gameText(lang, "use")}</button></li>`,
  );
  return `<h3 class="panel-title">${gameText(lang, "items")}</h3><ul class="sheet-list">${items.join("") || "<li class='muted'>—</li>"}</ul>`;
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @returns {string}
 */
function renderShop(hero, lang) {
  const columns = TRACKS.map((track) => {
    const entries = SHOP.filter((entry) => entry.track === track).map((entry) => renderShopEntry(hero, lang, entry));
    return `<div class="shop-column track-${track}"><h4>${gameText(lang, `track${capitalize(track)}`)} · ${hero.pools[track]} XP</h4>${entries.join("")}</div>`;
  });
  return `<div class="shop-columns">${columns.join("")}</div>`;
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {"en" | "pt"} lang
 * @param {import("./catalog.js").ShopEntry} entry
 * @returns {string}
 */
function renderShopEntry(hero, lang, entry) {
  const blocker = purchaseBlocker(hero, entry.id);
  const owned = countOwned(hero, entry.id);
  const title = blocker ? gameText(lang, `block${capitalize(blocker)}`) : "";
  const ownedTag = owned ? ` <small>(${gameText(lang, "owned")} ×${owned})</small>` : "";
  return `<div class="shop-entry kind-${entry.kind}"><span>${gameText(lang, `shop.${entry.id}`)}${ownedTag}</span>
    <button type="button" class="stamp stamp-small" data-action="buy" data-entry="${entry.id}" ${blocker ? "disabled" : ""} title="${title}">${gameText(lang, "buy")} ${entry.xp}</button></div>`;
}
