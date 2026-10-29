// stage-run.js: a run through one Arca: walking its map, bumping into enemies, fighting them in
// order (minions then boss). Pure transitions over Hero + StageRun; the DOM lives in game-app.js.

import { playerAction, startDuel } from "./combat.js";
import { combatantFromHero, heroAfterDuel } from "./hero-store.js";
import { awardXp } from "./progression.js";
import { maxResources } from "./rules.js";
import { buildStageMap } from "./stage-maps.js";
import { createStageWalk, markBeaten, stepWalk } from "./stage-walk.js";
import { encounterXp, stageById, stageEncounters } from "./stages.js";

const BEAT_TICKS = 22;

/**
 * @typedef {object} PoseBeat
 * @property {import("./chibi-sprite.js").ChibiPose} heroPose
 * @property {import("./chibi-sprite.js").ChibiPose} foePose
 * @property {number} until tick
 */

/**
 * @typedef {object} StageRun
 * @property {string} stageId
 * @property {import("./stage-maps.js").StageMap} map
 * @property {import("./stage-walk.js").StageWalk} walk
 * @property {import("./combat.js").DuelState | null} duel null while walking
 * @property {number} index encounter being fought (or last fought), -1 before the first
 * @property {number} lastXp
 * @property {number} logMark log length before the last action, for animation and sounds
 * @property {PoseBeat[]} beats
 */

/**
 * @param {import("./stages.js").EnemyDefinition} foe
 * @returns {import("./combat.js").Combatant}
 */
export function combatantFromEnemy(foe) {
  const max = maxResources(foe.attributes);
  return {
    attributes: foe.attributes,
    pv: max.pv,
    pm: max.pm,
    pa: max.pa,
    luta: foe.luta,
    traits: [],
    bonus: { attack: 0, defense: 0, initiative: 0 },
    critFrom: foe.critFrom,
    regen: foe.regen,
  };
}

/**
 * Enter an Arca at its map start. Needs PV above 0.
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {string} stageId
 * @returns {{ run: StageRun } | { error: "needRest" | "unknownStage" }}
 */
export function startStageRun(hero, stageId) {
  if (!stageById(stageId)) return { error: "unknownStage" };
  if (hero.current.pv <= 0) return { error: "needRest" };
  const map = buildStageMap(stageId);
  return { run: { stageId, map, walk: createStageWalk(map), duel: null, index: -1, lastXp: 0, logMark: 0, beats: [] } };
}

/**
 * One tick of walking; bumping into an enemy starts its duel.
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {StageRun} run
 * @param {import("./chibi-sprite.js").Facing | null} input
 * @param {() => number} rollDie
 * @returns {StageRun}
 */
export function stepStageWalk(hero, run, input, rollDie) {
  if (run.duel) return run;
  const { walk, contact } = stepWalk(run.map, run.walk, input);
  if (contact === null) return { ...run, walk };
  return startEncounter(hero, { ...run, walk }, contact, rollDie);
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {StageRun} run
 * @param {number} index
 * @param {() => number} rollDie
 * @returns {StageRun}
 */
export function startEncounter(hero, run, index, rollDie) {
  const foe = currentFoe({ ...run, index });
  const duel = startDuel(combatantFromHero(hero), combatantFromEnemy(foe), rollDie);
  return { ...run, index, duel, lastXp: 0, logMark: 0, beats: [] };
}

/**
 * @param {StageRun} run
 * @returns {import("./stages.js").EnemyDefinition}
 */
export function currentFoe(run) {
  const stage = /** @type {import("./stages.js").StageDefinition} */ (stageById(run.stageId));
  return stageEncounters(stage)[Math.max(0, run.index)];
}

/**
 * One player action in the current duel. When the enemy falls, XP is awarded and stage progress
 * recorded; when the hero falls or flees, their PV/PM/PA are written back.
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {StageRun} run
 * @param {string} action
 * @param {() => number} rollDie
 * @param {string} today
 * @returns {{ hero: import("./hero-sheet.js").Hero, run: StageRun }}
 */
export function runAction(hero, run, action, rollDie, today) {
  if (!run.duel) return { hero, run };
  const duel = playerAction(run.duel, action, rollDie);
  const next = { ...run, duel, logMark: run.duel.log.length };
  if (duel.phase === "player") return { hero, run: next };
  const synced = heroAfterDuel(hero, duel.hero);
  if (duel.phase !== "won") return { hero: synced, run: next };
  return rewardVictory(synced, next, today);
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {StageRun} run
 * @param {string} today
 * @returns {{ hero: import("./hero-sheet.js").Hero, run: StageRun }}
 */
function rewardVictory(hero, run, today) {
  const stage = /** @type {import("./stages.js").StageDefinition} */ (stageById(run.stageId));
  const foe = currentFoe(run);
  const progress = hero.stages[run.stageId] ?? { minions: 0, bossBeaten: false, lastClearDate: "" };
  const xp = encounterXp(foe, progress, today);
  const updated = foe.boss
    ? { ...progress, bossBeaten: true, lastClearDate: today }
    : {
        ...progress,
        minions: progress.minions + 1,
        lastClearDate: run.index + 1 === stage.minions.length ? today : progress.lastClearDate,
      };
  const stages = { ...hero.stages, [run.stageId]: updated };
  return { hero: awardXp({ ...hero, stages }, "poder", xp), run: { ...run, lastXp: xp } };
}

/**
 * Back to the map after a duel: a beaten enemy leaves the map, a fled-from one stays.
 * @param {StageRun} run
 * @returns {StageRun}
 */
export function resumeWalk(run) {
  if (!run.duel || run.duel.phase === "player" || run.duel.phase === "lost") return run;
  const walk = run.duel.phase === "won" ? markBeaten(run.walk, run.index) : run.walk;
  return { ...run, walk, duel: null, beats: [] };
}

/**
 * @param {StageRun} run
 * @returns {boolean}
 */
export function isStageCleared(run) {
  return run.walk.beaten.every(Boolean);
}

/**
 * Pose timeline from the log lines the last action added: the hero's swing, then the enemy's.
 * @param {StageRun} run
 * @param {number} tick
 * @returns {StageRun}
 */
export function posesAfterAction(run, tick) {
  if (!run.duel) return run;
  const beats = [];
  let at = tick;
  for (const line of run.duel.log.slice(run.logMark)) {
    const beat = beatForLine(line, at + BEAT_TICKS);
    if (!beat) continue;
    beats.push(beat);
    at += BEAT_TICKS;
  }
  return { ...run, beats };
}

/**
 * @param {string} line
 * @param {number} until
 * @returns {PoseBeat | null}
 */
function beatForLine(line, until) {
  const [kind, , , damage] = line.split("|");
  const landed = Number(damage) > 0;
  if (kind === "heroAttack") return { heroPose: "attack", foePose: landed ? "hurt" : "stand", until };
  if (kind === "foeAttack") return { heroPose: landed ? "hurt" : "stand", foePose: "attack", until };
  return null;
}

/**
 * @param {StageRun} run
 * @param {number} tick
 * @returns {{ heroPose: import("./chibi-sprite.js").ChibiPose, foePose: import("./chibi-sprite.js").ChibiPose, foeVisible: boolean }}
 */
export function currentPoses(run, tick) {
  const beat = run.beats.find((candidate) => tick < candidate.until);
  if (beat) return { heroPose: beat.heroPose, foePose: beat.foePose, foeVisible: true };
  const phase = run.duel?.phase ?? "player";
  const lastBeat = run.beats[run.beats.length - 1]?.until ?? 0;
  if (phase === "won") return { heroPose: "win", foePose: "down", foeVisible: tick < lastBeat + BEAT_TICKS * 2 };
  if (phase === "lost") return { heroPose: "hurt", foePose: "stand", foeVisible: true };
  return { heroPose: "stand", foePose: "stand", foeVisible: true };
}
