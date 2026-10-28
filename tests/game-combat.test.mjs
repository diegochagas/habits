import { test } from "node:test";
import assert from "node:assert/strict";
import { availableActions, playerAction, startDuel } from "../js/game/combat.js";
import { combatantFromHero } from "../js/game/hero-store.js";
import { createStartingHero } from "../js/game/hero-sheet.js";
import { combatantFromEnemy } from "../js/game/stage-run.js";
import { STAGES } from "../js/game/stages.js";

function scriptedDie(values) {
  const queue = [...values];
  return () => {
    const next = queue.shift();
    if (next === undefined) throw new Error("scripted die ran out of values");
    return next;
  };
}

const hero = combatantFromHero(createStartingHero("2026-10-28"));
const halter = combatantFromEnemy(STAGES[0].minions[0]);

test("the starting hero carries Lento and Frágil into the duel", () => {
  assert.ok(hero.traits.includes("lento"));
  assert.ok(hero.traits.includes("fragil"));
  assert.equal(hero.luta, true);
});

test("initiative: Lento means 1D for the hero (2D Luta − 1 Perda); enemy without Luta rolls 1D", () => {
  // hero init: 1 die [4] + H2 = 6; foe init: 1 die [1] + H1 = 2 → hero first.
  const duel = startDuel(hero, halter, scriptedDie([4, 1]));
  assert.equal(duel.phase, "player");
  assert.equal(duel.log[0], "initiative|6|2");
});

test("attack: 2D + P vs 1D + R, damage = difference, enemy answers, Frágil defense rolls 1D without crit", () => {
  // init hero [4] foe [1]; hero attack [3,3]+2 = 8 vs foe defense [2]+1 = 3 → 5 damage (foe 5→0 won)
  const duel = playerAction(startDuel(hero, halter, scriptedDie([4, 1])), "attack", scriptedDie([3, 3, 2]));
  assert.equal(duel.phase, "won");
  assert.equal(duel.foe.pv, 0);
  assert.equal(duel.log.at(-2), "heroAttack|8|3|5|0");
});

test("enemy turn: Frágil hero defends with 1 die, a 6 is not a crit, damage lands", () => {
  // init hero [1] (1+2=3) foe [5] (5+1=6) → enemy first: foe attack [4]+1 = 5 vs hero defense [6]+2 = 8 (no crit) → 1 damage
  const duel = startDuel(hero, halter, scriptedDie([1, 5, 4, 6]));
  assert.equal(duel.phase, "player");
  assert.equal(duel.hero.pv, 9);
  assert.equal(duel.log.at(-1), "foeAttack|5|8|1|0");
});

test("defesa perfeita: no damage when the defense doubles the attack", () => {
  const duel = startDuel(hero, halter, scriptedDie([1, 5, 1, 6]));
  // foe attack [1]+1 = 2 vs hero defense [6]+2 = 8 → 0 damage
  assert.equal(duel.hero.pv, 10);
});

test("Foco spends 2PM and makes the next attack an automatic crit; Devoção and PA give a third die", () => {
  let duel = startDuel(hero, halter, scriptedDie([4, 1]));
  assert.deepEqual(availableActions(duel), ["attack", "foco", "devocao", "pa", "flee"]);
  // foco, then enemy turn: foe [1]+1 = 2 vs hero (Frágil + foco = 2 Perdas → 1D) [6]+2 = 8 → 0 damage
  duel = playerAction(duel, "foco", scriptedDie([1, 6]));
  assert.equal(duel.hero.pm, 8);
  assert.equal(duel.focoReady, true);
  // pa → ganho; then attack with 3 dice [2,2,2] + P2 + auto crit P2 = 10 vs defense [1]+1 = 2 → 8 damage
  duel = playerAction(duel, "pa", scriptedDie([]));
  assert.equal(duel.phase, "player", "spending PA is free, the enemy does not act");
  assert.equal(duel.hero.pa, 1);
  duel = playerAction(duel, "attack", scriptedDie([2, 2, 2, 1]));
  assert.equal(duel.log.at(-2), "heroAttack|10|2|8|1", "the auto crit from Foco is counted");
});

test("the hero can lose and flee", () => {
  const weak = { ...hero, pv: 1 };
  const lost = startDuel(weak, halter, scriptedDie([1, 5, 6, 1]));
  assert.equal(lost.phase, "lost");
  const fled = playerAction(startDuel(hero, halter, scriptedDie([4, 1])), "flee", scriptedDie([]));
  assert.equal(fled.phase, "fled");
});

test("vantagens change the math: Forte +2 on attack, Vigoroso +2 on defense, Regeneração heals per turn", () => {
  const strong = {
    ...hero,
    traits: [
      ...hero.traits.filter((t) => t !== "fragil"),
      "vantagem.forte",
      "vantagem.vigoroso",
      "vantagem.regeneracao",
    ],
    pv: 5,
  };
  // init hero [4] foe [1]; attack [3,3] + (2+2) = 10 vs [2]+1 = 3 → 7 → foe at 0, won
  const duel = playerAction(startDuel(strong, halter, scriptedDie([4, 1])), "attack", scriptedDie([3, 3, 2]));
  assert.equal(duel.log.at(-2), "heroAttack|10|3|7|0");
  // enemy first: foe [3]+1 = 4 vs defense 2D (no Frágil) [1,1] + (2+2) = 6 → 1 damage, then regen +1 → 5
  const defended = startDuel(strong, halter, scriptedDie([1, 5, 3, 1, 1]));
  assert.equal(defended.hero.pv, 5);
});
