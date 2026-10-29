// game-app.js: state owner and DOM wiring for the game page. Views return HTML; this file
// re-renders on every change, runs the animation loop (map walking, battle poses) and the sounds.

import { drawBattleFrame } from "./battle-scene.js";
import { soundsForAction } from "./battle-sounds.js";
import { renderBattleView } from "./battle-view.js";
import { enemyLook } from "./enemy-looks.js";
import { applyGameTranslations, gameText } from "./game-i18n.js";
import { heroLook } from "./hero-look.js";
import { drawPortrait, renderHeroPanel } from "./hero-panel.js";
import { deriveSheet, restHero } from "./hero-sheet.js";
import { createHeroStore, loadOrCreateHero, useConsumable } from "./hero-store.js";
import { drawMapFrame } from "./map-scene.js";
import { buyEntry, creditDoneListItems, logHabit, raiseAttribute } from "./progression.js";
import { dieFromRandom, seededRandom } from "./rules.js";
import { renderSheetView } from "./sheet-view.js";
import { createSoundBoard } from "./sound.js";
import { createDirectionInput } from "./stage-input.js";
import {
  currentFoe,
  currentPoses,
  isStageCleared,
  posesAfterAction,
  resumeWalk,
  runAction,
  startStageRun,
  stepStageWalk,
} from "./stage-run.js";
import { stageById, stageEncounters } from "./stages.js";
import { renderStagesView } from "./stages-view.js";
import { customHabitFromForm, renderTodayView } from "./today-view.js";
import { parseWeight } from "./weight.js";
import { createItemStore } from "../items-store.js";
import { nextLang } from "../i18n.js";

const LANG_KEY = "habits:lang";
const TAB_KEY = "habits:game-tab";
const seedParam = new URLSearchParams(location.search).get("seed");
const rollDie = dieFromRandom(seedParam ? seededRandom(Number(seedParam)) : Math.random);
const heroStore = createHeroStore(localStorage);
const listStore = createItemStore(localStorage);
const sounds = createSoundBoard(() => new AudioContext(), localStorage);

/** @returns {string} */
const today = () => new Date().toISOString().slice(0, 10);

const state = {
  lang: /** @type {"en" | "pt"} */ (localStorage.getItem(LANG_KEY) === "pt" ? "pt" : "en"),
  tab: localStorage.getItem(TAB_KEY) ?? "today",
  hero: loadOrCreateHero(heroStore, today()),
  run: /** @type {import("./stage-run.js").StageRun | null} */ (null),
  tick: 0,
  notice: "",
};

const input = createDirectionInput(document, () => state.tab === "battle" && state.run !== null);
const main = /** @type {HTMLElement} */ (document.getElementById("game-main"));
const heroPanel = /** @type {HTMLElement} */ (document.getElementById("hero-panel"));
const notice = /** @type {HTMLElement} */ (document.getElementById("game-notice"));

/** @param {import("./hero-sheet.js").Hero} hero */
function commit(hero) {
  state.hero = hero;
  heroStore.save(hero);
  render();
}

function render() {
  document.documentElement.lang = state.lang;
  applyGameTranslations(document, state.lang);
  /** @type {HTMLElement} */ (document.getElementById("lang-toggle")).textContent = state.lang === "en" ? "PT" : "EN";
  renderSoundToggle();
  heroPanel.innerHTML = renderHeroPanel(state.hero, state.lang, today());
  for (const tab of document.querySelectorAll("[data-tab]"))
    tab.classList.toggle("tab-active", tab.getAttribute("data-tab") === state.tab);
  main.innerHTML = renderTab();
  notice.textContent = state.notice;
  notice.hidden = !state.notice;
}

function renderSoundToggle() {
  const toggle = /** @type {HTMLElement} */ (document.getElementById("sound-toggle"));
  toggle.textContent = sounds.enabled() ? "🔊" : "🔇";
  toggle.setAttribute("aria-label", gameText(state.lang, sounds.enabled() ? "soundOn" : "soundOff"));
}

/** @returns {string} */
function renderTab() {
  if (state.tab === "sheet") return renderSheetView(state.hero, state.lang);
  if (state.tab === "stages") return renderStagesView(state.hero, state.lang);
  if (state.tab === "battle") return renderBattleView(state.run, state.lang);
  return renderTodayView(state.hero, state.lang, today());
}

/** @param {string} key */
function say(key, values = {}) {
  state.notice = gameText(state.lang, key, values);
  render();
}

/** @param {string} tab */
function switchTab(tab) {
  state.tab = tab;
  state.notice = "";
  localStorage.setItem(TAB_KEY, tab);
  sounds.play("cursor");
  render();
}

/** @param {HTMLElement} button */
function onAction(button) {
  const action = button.dataset.action;
  state.notice = "";
  if (action === "log-habit") return onLogHabit(button.dataset.habit ?? "");
  if (action === "raise") return onPurchase(raiseAttribute(state.hero, /** @type {any} */ (button.dataset.track)));
  if (action === "buy") return onPurchase(buyEntry(state.hero, button.dataset.entry ?? ""));
  if (action === "use-item") return onUseItem(button.dataset.item ?? "");
  if (action === "rest") return onRest();
  if (action === "reset-hero") return onResetHero();
  if (action === "enter-stage") return onEnterStage(button.dataset.stage ?? "");
  if (action === "battle") return onBattle(button.dataset.battle ?? "");
}

/** @param {{ hero: import("./hero-sheet.js").Hero } | { error: string }} result */
function onPurchase(result) {
  if ("error" in result) {
    sounds.play("cancel");
    return say(`block${result.error.charAt(0).toUpperCase()}${result.error.slice(1)}`);
  }
  sounds.play("buy");
  commit(result.hero);
}

/** @param {string} habitId */
function onLogHabit(habitId) {
  const result = logHabit(state.hero, habitId, today());
  if ("error" in result) return say(result.error);
  sounds.play(result.hero.habitLog[result.hero.habitLog.length - 1]?.good ? "habitGood" : "habitBad");
  commit(result.hero);
}

/** @param {string} itemId */
function onUseItem(itemId) {
  sounds.play("heal");
  commit(useConsumable(state.hero, itemId));
}

function onRest() {
  const { hero, rested } = restHero(state.hero, today());
  state.notice = gameText(state.lang, rested ? "rested" : "alreadyRested");
  sounds.play(rested ? "heal" : "cancel");
  commit(hero);
}

function onResetHero() {
  if (!confirm(gameText(state.lang, "resetHeroConfirm"))) return;
  heroStore.clear();
  state.run = null;
  commit(loadOrCreateHero(heroStore, today()));
}

/** @param {string} stageId */
function onEnterStage(stageId) {
  const result = startStageRun(state.hero, stageId);
  if ("error" in result) {
    sounds.play("cancel");
    return say(result.error);
  }
  state.run = result.run;
  sounds.play("decision");
  switchTab("battle");
}

/** @param {string} action */
function onBattle(action) {
  if (!state.run) return;
  if (action === "home") return leaveStage();
  if (action === "resume") return backToMap();
  const before = state.run.duel?.log.length ?? 0;
  const { hero, run } = runAction(state.hero, state.run, action, rollDie, today());
  state.run = posesAfterAction(run, state.tick);
  for (const sound of soundsForAction(action, run.duel?.log.slice(before) ?? [], run.duel?.phase ?? ""))
    sounds.play(sound.name, sound.delay);
  commit(hero);
}

function leaveStage() {
  state.run = null;
  input.releaseAll();
  sounds.play("cancel");
  switchTab("stages");
}

function backToMap() {
  if (!state.run) return;
  state.run = resumeWalk(state.run);
  if (isStageCleared(state.run)) {
    sounds.play("fanfare");
    return say("logStageCleared");
  }
  sounds.play("decision");
  render();
}

/** @param {SubmitEvent} event */
function onSubmit(event) {
  const form = /** @type {HTMLFormElement} */ (event.target);
  event.preventDefault();
  if (form.dataset.form === "weight") return onWeight(new FormData(form));
  if (form.dataset.form === "custom-habit") return onCustomHabit(form);
}

/** @param {FormData} fields */
function onWeight(fields) {
  const parsed = parseWeight(fields.get("kg"));
  if ("error" in parsed) return say("weightError");
  const weightLog = [...state.hero.weightLog, { date: today(), kg: parsed.kg }];
  sounds.play("decision");
  commit({ ...state.hero, weightKg: parsed.kg, weightLog });
}

/** @param {HTMLFormElement} form */
function onCustomHabit(form) {
  const result = customHabitFromForm(new FormData(form), () => `custom-${Date.now().toString(36)}`);
  if ("error" in result) return say(result.error);
  sounds.play("decision");
  commit({ ...state.hero, customHabits: [...state.hero.customHabits, result.habit] });
}

function animate() {
  state.tick += 1;
  const portrait = /** @type {HTMLCanvasElement | null} */ (document.getElementById("portrait"));
  if (portrait)
    drawPortrait(
      /** @type {CanvasRenderingContext2D} */ (portrait.getContext("2d")),
      heroLook(state.hero, today()),
      state.hero.current.pv > 0 ? "walk" : "hurt",
      state.tick,
    );
  if (state.run && state.tab === "battle") tickStage(state.run);
  requestAnimationFrame(animate);
}

/** @param {import("./stage-run.js").StageRun} run */
function tickStage(run) {
  if (!run.duel) {
    const next = stepStageWalk(state.hero, run, input.current(), rollDie);
    state.run = next;
    if (next.duel) {
      sounds.play("encounter");
      render();
    }
  } else if (run.duel.phase === "won" && input.current()) return backToMap();
  const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById("battle-canvas"));
  if (!canvas || !state.run) return;
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
  if (state.run.duel) drawBattleFrame(ctx, battleFrame(state.run));
  else drawMapFrame(ctx, mapFrame(state.run));
}

/**
 * @param {import("./stage-run.js").StageRun} run
 * @returns {import("./map-scene.js").MapFrame}
 */
function mapFrame(run) {
  const stage = /** @type {import("./stages.js").StageDefinition} */ (stageById(run.stageId));
  const foes = stageEncounters(stage);
  return {
    map: run.map,
    walk: run.walk,
    heroLook: heroLook(state.hero, today()),
    foes: run.map.spawns
      .filter((spawn) => !run.walk.beaten[spawn.index])
      .map((spawn) => ({ look: enemyLook(foes[spawn.index].sprite), tx: spawn.tx, ty: spawn.ty })),
    tick: state.tick,
  };
}

/**
 * @param {import("./stage-run.js").StageRun} run
 * @returns {import("./battle-scene.js").BattleFrame}
 */
function battleFrame(run) {
  const stage = /** @type {import("./stages.js").StageDefinition} */ (stageById(run.stageId));
  const duel = /** @type {import("./combat.js").DuelState} */ (run.duel);
  const foe = currentFoe(run);
  const poses = currentPoses(run, state.tick);
  const max = deriveSheet(state.hero).max;
  return {
    palette: stage.palette,
    heroLook: heroLook(state.hero, today()),
    heroPose: poses.heroPose,
    foeLook: enemyLook(foe.sprite),
    foePose: poses.foePose,
    foeVisible: poses.foeVisible,
    heroBar: { pv: duel.hero.pv, max: max.pv },
    heroPm: { pm: duel.hero.pm, max: max.pm },
    heroPa: { pa: duel.hero.pa, max: Math.min(8, max.pa) },
    foeBar: { pv: duel.foe.pv, max: foe.attributes.R * 5 || 1 },
    tick: state.tick,
  };
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const tab = target.closest("[data-tab]");
    if (tab) return switchTab(tab.getAttribute("data-tab") ?? "today");
    const button = /** @type {HTMLElement | null} */ (target.closest("button[data-action]"));
    if (button) onAction(button);
  });
  document.addEventListener("submit", onSubmit);
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
}

function start() {
  const credited = creditDoneListItems(state.hero, listStore.load() ?? []);
  if (credited.credited > 0) state.notice = gameText(state.lang, "listCredit", { count: credited.credited });
  bindEvents();
  commit(credited.hero);
  animate();
}

start();
