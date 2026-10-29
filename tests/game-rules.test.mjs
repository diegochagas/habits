import { test } from "node:test";
import assert from "node:assert/strict";
import {
  damageDealt,
  diceForTest,
  isNearDefeat,
  maxResources,
  rollTest,
  seededRandom,
  tierForPoints,
  xpToRaiseAttribute,
} from "../js/game/rules.js";

/** Scripted die: returns the queued values in order. */
function scriptedDie(values) {
  const queue = [...values];
  return () => {
    const next = queue.shift();
    if (next === undefined) throw new Error("scripted die ran out of values");
    return next;
  };
}

test("recursos: PV = R×5, PM = H×5, PA = P, atributo 0 gives 1", () => {
  assert.deepEqual(maxResources({ P: 2, H: 4, R: 2 }), { pv: 10, pm: 20, pa: 2 });
  assert.deepEqual(maxResources({ P: 0, H: 0, R: 0 }), { pv: 1, pm: 1, pa: 1 });
});

test("dice: 1 base, +1 perícia, +1 Ganho, -1 Perda, clamped 1..3, Ganho and Perda cancel", () => {
  assert.equal(diceForTest({}), 1);
  assert.equal(diceForTest({ pericia: true }), 2);
  assert.equal(diceForTest({ pericia: true, ganhos: 1 }), 3);
  assert.equal(diceForTest({ pericia: true, ganhos: 3 }), 3);
  assert.equal(diceForTest({ perdas: 2 }), 1);
  assert.equal(diceForTest({ pericia: true, ganhos: 1, perdas: 1 }), 2);
});

test("crítico: each 6 adds the attribute again (book example: P4, dice 6 and 2 → 16)", () => {
  const result = rollTest({ diceCount: 2, attribute: 4 }, scriptedDie([6, 2]));
  assert.equal(result.total, 16);
  assert.equal(result.crits, 1);
});

test("crítico com 5 ou 6, auto crit, noCrit and falha crítica", () => {
  assert.equal(rollTest({ diceCount: 1, attribute: 3, critFrom: 5 }, scriptedDie([5])).total, 11);
  assert.equal(rollTest({ diceCount: 1, attribute: 3, autoCrits: 1 }, scriptedDie([2])).total, 8);
  assert.equal(rollTest({ diceCount: 1, attribute: 3, noCrit: true }, scriptedDie([6])).total, 9);
  assert.equal(rollTest({ diceCount: 2, attribute: 1 }, scriptedDie([1, 1])).criticalFailure, true);
});

test("dano = ataque − defesa, mínimo 1, zero only on defesa perfeita (double)", () => {
  assert.equal(damageDealt(10, 7), 3);
  assert.equal(damageDealt(7, 7), 1);
  assert.equal(damageDealt(7, 9), 1);
  assert.equal(damageDealt(4, 8), 0);
});

test("perto da derrota is PV ≤ R; tiers at 20 and 35 points; attribute above 5 costs 20 XP", () => {
  assert.equal(isNearDefeat(4, 4), true);
  assert.equal(isNearDefeat(5, 4), false);
  assert.equal(tierForPoints(12), "iniciante");
  assert.equal(tierForPoints(20), "heroi");
  assert.equal(tierForPoints(35), "veterano");
  assert.equal(xpToRaiseAttribute(4), 10);
  assert.equal(xpToRaiseAttribute(5), 20);
});

test("seeded random is deterministic and in [0, 1)", () => {
  const a = seededRandom(42);
  const b = seededRandom(42);
  const first = [a(), a(), a()];
  assert.deepEqual(first, [b(), b(), b()]);
  assert.ok(first.every((value) => value >= 0 && value < 1));
});

test("leaving an Arca restores PV/PM/PA to the maxima", async () => {
  const { createStartingHero, restoreResources } = await import("../js/game/hero-sheet.js");
  const hero = createStartingHero("2026-10-29");
  const wounded = { ...hero, current: { pv: 0, pm: 1, pa: 0 } };
  assert.deepEqual(restoreResources(wounded).current, { pv: 10, pm: 10, pa: 2 });
});
