// game-app.js: the play page (Arcas + Adventure). The hero's own actions live in the shared
// hero-controller; this file owns the stage run, the animation loop, the sounds and the
// free-time gate (play time is earned by Pomodoros on the habits page).

import { drawBattleFrame } from "./battle-scene.js";
import { soundsForAction } from "./battle-sounds.js";
import { renderBattleView } from "./battle-view.js";
import { enemyLook } from "./enemy-looks.js";
import { applyGameTranslations, gameText } from "./game-i18n.js";
import { createHeroController } from "./hero-controller.js";
import { heroLook } from "./hero-look.js";
import { deriveSheet, restoreResources } from "./hero-sheet.js";
import { createHeroStore } from "./hero-store.js";
import { drawMapFrame } from "./map-scene.js";
import { dieFromRandom, seededRandom } from "./rules.js";
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
import { startFreeTimeGate } from "../pomodoro/free-time-gate.js";
import { applyPomodoroTranslations } from "../pomodoro/pomodoro-i18n.js";
import { createPomodoroStore } from "../pomodoro/pomodoro-store.js";
import { nextLang } from "../i18n.js";
import { connectStateStorage } from "../state-storage.js";

const LANG_KEY = "habits:lang";
const TAB_KEY = "habits:game-tab";
const params = new URLSearchParams(location.search);
// The server's state when served by server/, this browser's localStorage otherwise.
const storage = await connectStateStorage({ document });
const rollDie = dieFromRandom(params.get("seed") ? seededRandom(Number(params.get("seed"))) : Math.random);
const sounds = createSoundBoard(() => new AudioContext(), localStorage);

/** @returns {string} */
const today = () => new Date().toISOString().slice(0, 10);

const state = {
  lang: /** @type {"en" | "pt"} */ (localStorage.getItem(LANG_KEY) === "pt" ? "pt" : "en"),
  tab: localStorage.getItem(TAB_KEY) === "battle" ? "battle" : "stages",
  run: /** @type {import("./stage-run.js").StageRun | null} */ (null),
  tick: 0,
  notice: "",
};

const input = createDirectionInput(document, () => state.tab === "battle" && state.run !== null && gate.active());
const main = /** @type {HTMLElement} */ (document.getElementById("game-main"));
const notice = /** @type {HTMLElement} */ (document.getElementById("game-notice"));
const hero = createHeroController({
  store: createHeroStore(storage),
  sounds,
  today,
  lang: () => state.lang,
  say: (message) => {
    state.notice = message;
    render();
  },
  onChange: render,
  confirmReset: (message) => confirm(message),
});
const gate = startFreeTimeGate({
  store: createPomodoroStore(storage),
  badge: /** @type {HTMLElement} */ (document.getElementById("free-time")),
  overlay: /** @type {HTMLElement} */ (document.getElementById("free-time-over")),
  lang: () => state.lang,
  today,
  secondsPerMinute: params.get("fast") ? 0.1 : 60,
  onExpired: () => leaveStage(),
});

function render() {
  document.documentElement.lang = state.lang;
  applyGameTranslations(document, state.lang);
  applyPomodoroTranslations(document, state.lang);
  /** @type {HTMLElement} */ (document.getElementById("lang-toggle")).textContent = state.lang === "en" ? "PT" : "EN";
  renderSoundToggle();
  hero.renderPanel(/** @type {HTMLElement} */ (document.getElementById("hero-panel")));
  for (const tab of document.querySelectorAll("[data-tab]"))
    tab.classList.toggle("tab-active", tab.getAttribute("data-tab") === state.tab);
  main.innerHTML =
    state.tab === "battle" ? renderBattleView(state.run, state.lang) : renderStagesView(hero.hero, state.lang);
  notice.textContent = state.notice;
  notice.hidden = !state.notice;
  gate.render();
}

function renderSoundToggle() {
  const toggle = /** @type {HTMLElement} */ (document.getElementById("sound-toggle"));
  toggle.textContent = sounds.enabled() ? "🔊" : "🔇";
  toggle.setAttribute("aria-label", gameText(state.lang, sounds.enabled() ? "soundOn" : "soundOff"));
}

/** @param {string} key */
function say(key) {
  state.notice = gameText(state.lang, key);
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
  state.notice = "";
  if (hero.handleAction(button)) return;
  if (button.dataset.action === "enter-stage") return onEnterStage(button.dataset.stage ?? "");
  if (button.dataset.action === "battle") return onBattle(button.dataset.battle ?? "");
}

/** @param {string} stageId */
function onEnterStage(stageId) {
  if (!gate.active()) return;
  const result = startStageRun(hero.hero, stageId);
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
  const { hero: after, run } = runAction(hero.hero, state.run, action, rollDie, today());
  state.run = posesAfterAction(run, state.tick);
  for (const sound of soundsForAction(action, run.duel?.log.slice(before) ?? [], run.duel?.phase ?? ""))
    sounds.play(sound.name, sound.delay);
  hero.commit(after);
}

/** Leaving an Arca (by choice, after losing, or when the free time ends) restores PV/PM/PA. */
function leaveStage() {
  if (!state.run) return;
  state.run = null;
  input.releaseAll();
  sounds.play("cancel");
  hero.commit(restoreResources(hero.hero));
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

function animate() {
  state.tick += 1;
  hero.drawPortraitFrame(state.tick);
  if (state.run && state.tab === "battle") tickStage(state.run);
  requestAnimationFrame(animate);
}

/** @param {import("./stage-run.js").StageRun} run */
function tickStage(run) {
  if (!run.duel) {
    const next = stepStageWalk(hero.hero, run, input.current(), rollDie);
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
    heroLook: heroLook(hero.hero, today()),
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
  const max = deriveSheet(hero.hero).max;
  return {
    palette: stage.palette,
    heroLook: heroLook(hero.hero, today()),
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
    if (tab) return switchTab(tab.getAttribute("data-tab") ?? "stages");
    const button = /** @type {HTMLElement | null} */ (target.closest("button[data-action]"));
    if (button) onAction(button);
  });
  document.addEventListener("submit", (event) => {
    if (hero.handleSubmit(/** @type {HTMLFormElement} */ (event.target))) event.preventDefault();
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
}

bindEvents();
render();
animate();
