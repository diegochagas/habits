import { test } from "node:test";
import assert from "node:assert/strict";
import { createStartingHero } from "../js/game/hero-sheet.js";
import { createHeroStore, loadOrCreateHero, useConsumable } from "../js/game/hero-store.js";
import { nextEncounter, runAction, startStageRun } from "../js/game/stage-run.js";
import { STAGES, encounterXp, enemyPoints, stageEncounters } from "../js/game/stages.js";
import { DEFAULT_HABITS, SHOP } from "../js/game/catalog.js";
import { gameText } from "../js/game/game-i18n.js";

const TODAY = "2026-10-28";

class FakeStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.get(key) ?? null;
  }
  setItem(key, value) {
    this.map.set(key, value);
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

function scriptedDie(values) {
  const queue = [...values];
  return () => {
    const next = queue.shift();
    if (next === undefined) throw new Error("scripted die ran out of values");
    return next;
  };
}

test("stages get harder and every Arca has three minions and a boss", () => {
  const required = STAGES.map((stage) => stage.requiredPoints);
  assert.deepEqual(
    required,
    [...required].sort((a, b) => a - b),
  );
  for (const stage of STAGES) {
    assert.equal(stage.minions.length, 3);
    assert.equal(stage.boss.boss, true);
    assert.ok(enemyPoints(stage.boss) > enemyPoints(stage.minions[0]));
  }
});

test("XP: minions pay 1 once per day, bosses pay 5 the first time and 1 on replays", () => {
  const minion = STAGES[0].minions[0];
  const boss = STAGES[0].boss;
  const fresh = { minions: 0, bossBeaten: false, lastClearDate: "" };
  assert.equal(encounterXp(minion, fresh, TODAY), 1);
  assert.equal(encounterXp(minion, { ...fresh, lastClearDate: TODAY }, TODAY), 0);
  assert.equal(encounterXp(boss, fresh, TODAY), 5);
  assert.equal(encounterXp(boss, { ...fresh, bossBeaten: true }, TODAY), 1);
});

test("a run: winning awards Poder XP and records progress; a 0 PV hero cannot start", () => {
  const hero = createStartingHero(TODAY);
  assert.ok("error" in startStageRun({ ...hero, current: { ...hero.current, pv: 0 } }, "academia", scriptedDie([])));
  assert.ok("error" in startStageRun(hero, "nope", scriptedDie([])));
  const started = /** @type {any} */ (startStageRun(hero, "academia", scriptedDie([4, 1]))).run;
  const { hero: after, run } = runAction(hero, started, "attack", scriptedDie([3, 3, 2]), TODAY);
  assert.equal(run.duel.phase, "won");
  assert.equal(run.lastXp, 1);
  assert.equal(after.pools.poder, 1);
  assert.equal(after.stages.academia.minions, 1);
  const next = nextEncounter(after, run, scriptedDie([4, 1]));
  assert.equal(next?.index, 1);
  assert.equal(stageEncounters(STAGES[0]).length, 4);
});

test("a lost fight writes 0 PV back into the hero", () => {
  const hero = { ...createStartingHero(TODAY), current: { pv: 1, pm: 10, pa: 2 } };
  const started = /** @type {any} */ (startStageRun(hero, "academia", scriptedDie([4, 1]))).run;
  // attack misses: [1,1]+2 = 4 vs [2]+1 = 3 → 1 damage; foe answers [6]+1+1 = 8 vs [1]+2 = 3 → 5 damage → lost
  const { hero: after, run } = runAction(hero, started, "attack", scriptedDie([1, 1, 2, 6, 1]), TODAY);
  assert.equal(run.duel.phase, "lost");
  assert.equal(after.current.pv, 0);
});

test("hero store round-trips and consumables restore resources", () => {
  const store = createHeroStore(new FakeStorage());
  const hero = loadOrCreateHero(store, TODAY);
  assert.deepEqual(store.load(), hero);
  const hurt = { ...hero, owned: [...hero.owned, "item.marmita"], current: { pv: 2, pm: 10, pa: 2 } };
  const healed = useConsumable(hurt, "item.marmita");
  assert.equal(healed.current.pv, 7);
  assert.ok(!healed.owned.includes("item.marmita"));
  assert.equal(useConsumable(healed, "item.marmita"), healed);
});

test("every habit, shop entry, stage and enemy has a label in both languages", () => {
  const keys = [
    ...DEFAULT_HABITS.map((habit) => `habit.${habit.id}`),
    ...SHOP.map((entry) => `shop.${entry.id}`),
    ...STAGES.map((stage) => `stage.${stage.id}`),
    ...STAGES.flatMap((stage) => stageEncounters(stage).map((foe) => `foe.${foe.id}`)),
  ];
  for (const key of keys) {
    assert.notEqual(gameText("en", key), key, `missing EN ${key}`);
    assert.notEqual(gameText("pt", key), key, `missing PT ${key}`);
  }
});
