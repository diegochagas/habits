// stage-run.js: a run through one Arca (minions then boss), as pure transitions over Hero + run.

import { playerAction, startDuel } from "./combat.js";
import { combatantFromHero, heroAfterDuel } from "./hero-store.js";
import { awardXp } from "./progression.js";
import { maxResources } from "./rules.js";
import { encounterXp, stageById, stageEncounters } from "./stages.js";

/** @typedef {import("./battle-view.js").StageRun} StageRun */

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
 * Begin an Arca at its first enemy. Needs PV above 0.
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {string} stageId
 * @param {() => number} rollDie
 * @returns {{ run: StageRun } | { error: "needRest" | "unknownStage" }}
 */
export function startStageRun(hero, stageId, rollDie) {
  const stage = stageById(stageId);
  if (!stage) return { error: "unknownStage" };
  if (hero.current.pv <= 0) return { error: "needRest" };
  return { run: encounterAt(hero, stageId, 0, rollDie) };
}

/**
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {string} stageId
 * @param {number} index
 * @param {() => number} rollDie
 * @returns {StageRun}
 */
function encounterAt(hero, stageId, index, rollDie) {
  const stage = /** @type {import("./stages.js").StageDefinition} */ (stageById(stageId));
  const foe = stageEncounters(stage)[index];
  const duel = startDuel(combatantFromHero(hero), combatantFromEnemy(foe), rollDie);
  return { stageId, index, duel, lastXp: 0, heroPose: "idle", heroPoseUntil: 0, foePose: "idle", foePoseUntil: 0 };
}

/**
 * One player action. When the enemy falls, XP is awarded and stage progress recorded; when the
 * hero falls or flees, their PV/PM/PA are written back. Returns the updated hero and run.
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {StageRun} run
 * @param {string} action
 * @param {() => number} rollDie
 * @param {string} today
 * @returns {{ hero: import("./hero-sheet.js").Hero, run: StageRun }}
 */
export function runAction(hero, run, action, rollDie, today) {
  const duel = playerAction(run.duel, action, rollDie);
  const next = { ...run, duel };
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
  const foe = stageEncounters(stage)[run.index];
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
 * After a win, move to the next enemy of the Arca (PV/PM/PA carry over), or null when it is done.
 * @param {import("./hero-sheet.js").Hero} hero
 * @param {StageRun} run
 * @param {() => number} rollDie
 * @returns {StageRun | null}
 */
export function nextEncounter(hero, run, rollDie) {
  const stage = /** @type {import("./stages.js").StageDefinition} */ (stageById(run.stageId));
  if (run.index + 1 >= stageEncounters(stage).length) return null;
  return encounterAt(hero, run.stageId, run.index + 1, rollDie);
}

/**
 * Poses for the renderer, derived from the last log line.
 * @param {StageRun} run
 * @param {number} tick
 * @returns {StageRun}
 */
export function posesAfterAction(run, tick) {
  const last = run.duel.log[run.duel.log.length - 1] ?? "";
  const hold = tick + 24;
  if (run.duel.phase === "won")
    return { ...run, heroPose: "win", heroPoseUntil: Infinity, foePose: "down", foePoseUntil: Infinity };
  if (run.duel.phase === "lost")
    return { ...run, heroPose: "hurt", heroPoseUntil: Infinity, foePose: "idle", foePoseUntil: 0 };
  if (last.startsWith("foeAttack") && Number(last.split("|")[3]) > 0)
    return { ...run, heroPose: "hurt", heroPoseUntil: hold, foePose: "idle", foePoseUntil: 0 };
  if (run.duel.log.some((line, index) => index >= run.duel.log.length - 2 && line.startsWith("heroAttack")))
    return { ...run, heroPose: "attack", heroPoseUntil: hold, foePose: "hurt", foePoseUntil: hold };
  return run;
}

/**
 * @param {StageRun} run
 * @param {number} tick
 * @returns {{ heroPose: import("./character-sprite.js").Pose, foePose: "idle" | "hurt" | "down" }}
 */
export function currentPoses(run, tick) {
  return {
    heroPose: tick < run.heroPoseUntil ? run.heroPose : "idle",
    foePose: tick < run.foePoseUntil ? run.foePose : "idle",
  };
}
