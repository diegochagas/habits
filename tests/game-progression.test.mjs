import { test } from "node:test";
import assert from "node:assert/strict";
import { createStartingHero, deriveSheet, restHero } from "../js/game/hero-sheet.js";
import {
  auraScore,
  buyEntry,
  creditDoneListItems,
  logHabit,
  purchaseBlocker,
  raiseAttribute,
} from "../js/game/progression.js";
import { bodyMassFactor, parseWeight, weightDesvantagens } from "../js/game/weight.js";

const TODAY = "2026-10-28";

test("starting sheet: 12 points, P2 H2 R2, 10/10/2, Lento and Frágil from 111.9 kg", () => {
  const hero = createStartingHero(TODAY);
  const sheet = deriveSheet(hero);
  assert.equal(sheet.points, 12);
  assert.equal(sheet.tier, "iniciante");
  assert.deepEqual(sheet.max, { pv: 10, pm: 10, pa: 2 });
  assert.deepEqual(sheet.desvantagens, ["lento", "fragil"]);
});

test("weight thresholds drop the desvantagens as kilos go down", () => {
  assert.deepEqual(weightDesvantagens(111.9), ["lento", "fragil"]);
  assert.deepEqual(weightDesvantagens(104.9), ["lento"]);
  assert.deepEqual(weightDesvantagens(94.9), []);
  assert.equal(bodyMassFactor(111.9), 1);
  assert.equal(bodyMassFactor(88), 0);
  assert.deepEqual(parseWeight("110,5"), { kg: 110.5 });
  assert.ok("error" in parseWeight("abc"));
});

const GYM = { id: "habit-gym", name: "Gym workout", category: "Today", done: true, track: "poder", xp: 2 };

test("a Today item adds its XP to its track; a bad habit removes XP and PV", () => {
  let hero = createStartingHero(TODAY);
  hero = creditDoneListItems(hero, [GYM], TODAY).hero;
  assert.equal(hero.pools.poder, 2);
  hero = /** @type {any} */ (logHabit(hero, "junkFood", TODAY)).hero;
  assert.equal(hero.pools.poder, 0, "falls back to the fullest pool when the track is empty");
  assert.equal(hero.current.pv, 7);
  assert.equal(hero.habitLog.length, 2);
  assert.ok("error" in logHabit(hero, "nope", TODAY));
});

test("list items marked done are credited once, by category track", () => {
  const hero = createStartingHero(TODAY);
  const items = [
    { id: "a", category: "Read", done: true },
    { id: "b", category: "Side Hustle", done: true },
    { id: "c", category: "Watch", done: false },
  ];
  const first = creditDoneListItems(hero, items);
  assert.equal(first.credited, 2);
  assert.equal(first.hero.pools.habilidade, 2);
  assert.equal(first.hero.habitLog.length, 0, "plain items are not logged as habits");
  assert.equal(creditDoneListItems(first.hero, items).credited, 0);
});

test("a Today item pays XP once per day, keyed by the date", () => {
  const hero = createStartingHero(TODAY);
  const items = [{ id: "row-d", category: "Today", done: true }];
  const monday = creditDoneListItems(hero, items, "2026-10-26");
  assert.equal(monday.credited, 1);
  assert.equal(creditDoneListItems(monday.hero, items, "2026-10-26").credited, 0);
  const tuesday = creditDoneListItems(monday.hero, items, "2026-10-27");
  assert.equal(tuesday.credited, 1);
  assert.deepEqual(tuesday.hero.creditedListItemIds, ["row-d@2026-10-26", "row-d@2026-10-27"]);
});

test("a Today item is logged for today on its own track and XP; a plain item is not", () => {
  const hero = createStartingHero(TODAY);
  const items = [
    { id: "row-d", name: "Devotional", category: "Today", done: true },
    { id: "b", name: "Bleach", category: "Watch", done: true },
    GYM,
  ];
  const credited = creditDoneListItems(hero, items, "2026-10-26").hero;
  assert.equal(credited.habitLog.length, 2);
  assert.deepEqual(credited.habitLog[0], {
    date: "2026-10-26",
    habitId: "list:row-d",
    xp: 1,
    track: "resistencia",
    good: true,
    label: "Devotional",
  });
  assert.equal(credited.habitLog[1].xp, 2);
  assert.equal(credited.pools.poder, 2);
});

test("raising an attribute costs 10 XP from its own track and grows the resource", () => {
  let hero = createStartingHero(TODAY);
  assert.ok("error" in raiseAttribute(hero, "resistencia"));
  hero = { ...hero, pools: { ...hero.pools, resistencia: 10 } };
  const raised = /** @type {any} */ (raiseAttribute(hero, "resistencia")).hero;
  assert.equal(raised.attributes.R, 3);
  assert.equal(raised.pools.resistencia, 0);
  assert.equal(deriveSheet(raised).max.pv, 15);
  assert.equal(deriveSheet(raised).points, 13);
});

test("shop gating: own track XP, prerequisites, desvantagem exclusions, stack limits", () => {
  let hero = createStartingHero(TODAY);
  hero = { ...hero, pools: { poder: 10, habilidade: 10, resistencia: 30 } };
  assert.equal(purchaseBlocker(hero, "vantagem.vigoroso"), "excluded", "Frágil blocks Vigoroso");
  assert.equal(purchaseBlocker(hero, "vantagem.mentorSaber"), null);
  assert.equal(purchaseBlocker(hero, "vantagem.riqueza"), null);
  assert.equal(purchaseBlocker({ ...hero, pools: { ...hero.pools, poder: 5 } }, "vantagem.forte"), "notEnoughXp");
  const bought = /** @type {any} */ (buyEntry(hero, "vantagem.forte")).hero;
  assert.equal(purchaseBlocker(bought, "vantagem.forte"), "owned");
  assert.equal(bought.xpSpent, 10);
  const item = /** @type {any} */ (buyEntry(bought, "item.marmita")).hero;
  assert.equal(item.xpSpent, 10, "consumables do not raise the character's points");
});

test("rest recovers everything once per day; aura counts the last 7 days", () => {
  let hero = createStartingHero(TODAY);
  hero = { ...hero, current: { pv: 1, pm: 0, pa: 0 }, lastRestDate: "2026-10-27" };
  const rested = restHero(hero, TODAY);
  assert.equal(rested.rested, true);
  assert.deepEqual(rested.hero.current, { pv: 10, pm: 10, pa: 2 });
  assert.equal(restHero(rested.hero, TODAY).rested, false);
  hero = creditDoneListItems(hero, [GYM], TODAY).hero;
  hero = creditDoneListItems(hero, [{ ...GYM, id: "habit-read", track: "habilidade", xp: 1 }], "2026-10-27").hero;
  assert.equal(auraScore(hero, TODAY), 2);
  assert.equal(auraScore(hero, "2026-11-10"), 0);
});

test("a finished Pomodoro credits 1 XP to the item's track and logs it for today", async () => {
  const { creditPomodoro } = await import("../js/game/progression.js");
  const { createStartingHero } = await import("../js/game/hero-sheet.js");
  const hero = createStartingHero("2026-10-29");
  const habit = {
    id: "a",
    name: "Devotional",
    category: "Today",
    description: "",
    date: "",
    done: false,
    createdAt: "",
    track: "resistencia",
    xp: 1,
  };
  const credited = creditPomodoro(hero, habit, "2026-10-29");
  assert.equal(credited.pools.resistencia, 1);
  assert.deepEqual(credited.habitLog.at(-1), {
    date: "2026-10-29",
    habitId: "pomodoro",
    xp: 1,
    track: "resistencia",
    good: true,
    label: "🍅 Devotional",
  });
  assert.equal(creditPomodoro(hero, null, "2026-10-29").pools.habilidade, 1);
});
