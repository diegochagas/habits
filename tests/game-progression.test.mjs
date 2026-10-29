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
import { bodyMassFactor, bodyMassIndex, parseHeight, parseWeight, weightDesvantagens } from "../js/game/weight.js";

const TODAY = "2026-10-28";

test("starting sheet: 12 points, P2 H2 R2, 10/10/2, Lento and Frágil from 111.9 kg at 170 cm (BMI 38.7)", () => {
  const hero = createStartingHero(TODAY);
  const sheet = deriveSheet(hero);
  assert.equal(sheet.points, 12);
  assert.equal(sheet.tier, "iniciante");
  assert.deepEqual(sheet.max, { pv: 10, pm: 10, pa: 2 });
  assert.deepEqual(sheet.desvantagens, ["lento", "fragil"]);
});

test("BMI thresholds drop the desvantagens as it goes down: Frágil below 35, Lento below 30", () => {
  assert.equal(bodyMassIndex(111.9, 170), 38.7);
  assert.deepEqual(weightDesvantagens(111.9, 170), ["lento", "fragil"]);
  assert.deepEqual(weightDesvantagens(101, 170), ["lento"], "BMI 34.9");
  assert.deepEqual(weightDesvantagens(86.7, 170), ["lento"], "BMI 30.0");
  assert.deepEqual(weightDesvantagens(86.5, 170), [], "BMI 29.9");
  assert.deepEqual(weightDesvantagens(111.9, 195), [], "the same kilos on a taller hero: BMI 29.4");
  assert.equal(bodyMassFactor(111.9, 170), 1);
  assert.equal(bodyMassFactor(72, 170), 0, "BMI 24.9 is athletic");
  assert.deepEqual(parseWeight("110,5"), { kg: 110.5 });
  assert.ok("error" in parseWeight("abc"));
  assert.deepEqual(parseHeight("170"), { cm: 170 });
  assert.deepEqual(parseHeight("1,70"), { cm: 170 }, "metres are accepted");
  assert.ok("error" in parseHeight("90"));
});

test("a hero saved before the BMI rule loads with the default height", async () => {
  const { createHeroStore, loadOrCreateHero } = await import("../js/game/hero-store.js");
  const saved = { ...createStartingHero(TODAY) };
  delete saved.heightCm;
  const storage = new Map();
  const store = createHeroStore({
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  });
  store.save(saved);
  assert.equal(loadOrCreateHero(store, TODAY).heightCm, 170);
  assert.deepEqual(deriveSheet(loadOrCreateHero(store, TODAY)).desvantagens, ["lento", "fragil"]);
});

const GYM = { id: "habit-gym", name: "Gym workout", category: "Poder", daily: true, done: true, xp: 2 };

test("a daily item adds its XP to its category's track; a bad habit removes XP and PV", () => {
  let hero = createStartingHero(TODAY);
  hero = creditDoneListItems(hero, [GYM], TODAY).hero;
  assert.equal(hero.pools.poder, 2);
  hero = /** @type {any} */ (logHabit(hero, "junkFood", TODAY)).hero;
  assert.equal(hero.pools.poder, 0, "falls back to the fullest pool when the track is empty");
  assert.equal(hero.current.pv, 7);
  assert.equal(hero.habitLog.length, 2);
  assert.ok("error" in logHabit(hero, "nope", TODAY));
});

test("list items marked done are credited once, 1 XP on the track of their característica", () => {
  const hero = createStartingHero(TODAY);
  const items = [
    { id: "a", name: "One Piece", category: "Habilidade", done: true },
    { id: "b", name: "Send chapter", category: "Poder", done: true },
    { id: "c", name: "Bleach", category: "Resistência", done: false },
  ];
  const first = creditDoneListItems(hero, items, TODAY);
  assert.equal(first.credited, 2);
  assert.deepEqual([first.hero.pools.habilidade, first.hero.pools.poder, first.hero.pools.resistencia], [1, 1, 0]);
  assert.equal(first.hero.habitLog.length, 2, "each credit shows in the Today log");
  assert.equal(first.hero.habitLog[1].label, "Send chapter");
  assert.equal(creditDoneListItems(first.hero, items, TODAY).credited, 0);
});

test("a daily item pays XP once per day, keyed by the date", () => {
  const hero = createStartingHero(TODAY);
  const items = [{ id: "row-d", category: "Resistência", daily: true, done: true }];
  const monday = creditDoneListItems(hero, items, "2026-10-26");
  assert.equal(monday.credited, 1);
  assert.equal(creditDoneListItems(monday.hero, items, "2026-10-26").credited, 0);
  const tuesday = creditDoneListItems(monday.hero, items, "2026-10-27");
  assert.equal(tuesday.credited, 1);
  assert.deepEqual(tuesday.hero.creditedListItemIds, ["row-d@2026-10-26", "row-d@2026-10-27"]);
});

test("a daily item is logged for today with its own XP; a plain item with 1", () => {
  const hero = createStartingHero(TODAY);
  const items = [
    { id: "row-d", name: "Devotional", category: "Resistência", daily: true, done: true },
    { id: "b", name: "Bleach", category: "Resistência", done: true },
    GYM,
  ];
  const credited = creditDoneListItems(hero, items, "2026-10-26").hero;
  assert.equal(credited.habitLog.length, 3);
  assert.deepEqual(credited.habitLog[0], {
    date: "2026-10-26",
    habitId: "list:row-d",
    xp: 1,
    track: "resistencia",
    good: true,
    label: "Devotional",
  });
  assert.equal(credited.habitLog[1].xp, 1);
  assert.equal(credited.habitLog[2].xp, 2);
  assert.equal(credited.pools.poder, 2);
  assert.equal(credited.pools.resistencia, 2);
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
  hero = creditDoneListItems(hero, [{ ...GYM, id: "habit-read", category: "Habilidade", xp: 1 }], "2026-10-27").hero;
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
    category: "Resistência",
    daily: true,
    description: "",
    date: "",
    done: false,
    createdAt: "",
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
