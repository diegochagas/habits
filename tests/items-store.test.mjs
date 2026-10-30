import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  createItem,
  createItemStore,
  parseItem,
  parseItemList,
  removeItem,
  rollDailyItems,
  toggleDone,
  updateItem,
} from "../js/items-store.js";

/** In-memory stand-in for window.localStorage. */
class FakeStorage {
  constructor() {
    /** @type {Map<string, string>} */
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

const fixedClock = { id: () => "item-test", now: () => new Date("2026-10-28T12:34:56.000Z") };

test("createItem trims fields and stamps date and id from the clock", () => {
  const result = createItem({ name: "  Bleach  ", category: "Resistência", description: " ep 1 \n" }, fixedClock);
  assert.ok("item" in result);
  assert.deepEqual(result.item, {
    id: "item-test",
    name: "Bleach",
    category: "Resistência",
    daily: false,
    description: "ep 1",
    date: "2026-10-28",
    done: false,
    doneAt: "",
    createdAt: "2026-10-28T12:34:56.000Z",
  });
  const habit = createItem(
    { name: "Gym", category: "Poder", description: "", daily: true, xp: "2", date: "2026-11-01" },
    fixedClock,
  );
  assert.ok("item" in habit);
  assert.equal(habit.item.daily, true);
  assert.equal(habit.item.xp, 2);
  assert.equal(habit.item.date, "2026-11-01", "a chosen date wins over today");
  const defaults = /** @type {any} */ (
    createItem({ name: "Pray", category: "Resistência", description: "", daily: true, xp: "9" }, fixedClock)
  );
  assert.equal(defaults.item.xp, 1, "a daily item outside 1–3 gets 1 XP");
  const plain = /** @type {any} */ (
    createItem({ name: "x", category: "Habilidade", description: "", xp: 2 }, fixedClock)
  );
  assert.equal("xp" in plain.item, false, "only daily items carry an XP amount");
  assert.deepEqual(createItem({ name: "x", category: "Habilidade", description: "", date: "1/2/2026" }, fixedClock), {
    error: "errorDate",
  });
});

test("updateItem replaces the editable fields, keeps id/done, and can turn the daily flag on and off", () => {
  const items = [
    {
      id: "a",
      name: "Old",
      category: "Habilidade",
      daily: false,
      description: "",
      date: "2026-10-01",
      done: true,
      doneAt: "2026-10-02",
      createdAt: "",
    },
    {
      id: "b",
      name: "B",
      category: "Poder",
      daily: true,
      description: "",
      date: "2026-10-01",
      done: false,
      doneAt: "",
      createdAt: "",
      xp: 2,
    },
  ];
  const edited = updateItem(items, "a", {
    name: " New ",
    category: "Resistência",
    description: " d ",
    date: "",
    daily: true,
    xp: 3,
  });
  assert.ok("items" in edited);
  assert.deepEqual(edited.items[0], {
    id: "a",
    name: "New",
    category: "Resistência",
    daily: true,
    description: "d",
    date: "2026-10-01",
    done: true,
    doneAt: "2026-10-02",
    createdAt: "",
    xp: 3,
  });
  const noLongerHabit = /** @type {any} */ (updateItem(items, "b", { name: "B", category: "Poder", description: "" }));
  assert.equal(noLongerHabit.items[1].daily, false);
  assert.equal("xp" in noLongerHabit.items[1], false);
  assert.deepEqual(updateItem(items, "a", { name: "", category: "Poder", description: "" }), { error: "errorName" });
});

test("rollDailyItems: a daily item done yesterday is to do again, one done today stays done", () => {
  const items = [
    { id: "a", done: true, doneAt: "2026-10-28", daily: true },
    { id: "b", done: true, doneAt: "2026-10-29", daily: true },
    { id: "c", done: true, doneAt: "2026-10-01", daily: false },
    { id: "d", done: false, doneAt: "", daily: true },
  ];
  const rolled = rollDailyItems(/** @type {any} */ (items), "2026-10-29");
  assert.equal(rolled.changed, 1);
  assert.deepEqual(
    rolled.items.map((item) => item.done),
    [false, true, true, false],
  );
  assert.equal(rolled.items[0].doneAt, "");
});

test("createItem rejects an empty name and an unknown category with i18n keys", () => {
  assert.deepEqual(createItem({ name: "   ", category: "Poder", description: "" }, fixedClock), { error: "errorName" });
  assert.deepEqual(createItem({ name: "x", category: "Games", description: "" }, fixedClock), {
    error: "errorCategory",
  });
});

test("toggleDone flips only the matching item and keeps order", () => {
  const items = [
    { id: "a", done: false },
    { id: "b", done: false },
  ];
  const next = toggleDone(items, "b", "2026-10-29");
  assert.deepEqual(
    next.map((item) => item.done),
    [false, true],
  );
  assert.notEqual(next, items);
});

test("removeItem drops the matching id", () => {
  assert.deepEqual(removeItem([{ id: "a" }, { id: "b" }], "a"), [{ id: "b" }]);
});

test("parseItem explains what is wrong, with the offending value", () => {
  assert.deepEqual(parseItem(null), { error: "item null: expected an object" });
  assert.deepEqual(parseItem({ id: "x", name: "", category: "Poder" }), {
    error: 'name "": expected a non-empty string',
  });
  assert.deepEqual(parseItem({ id: "x", name: "y", category: "Game" }), {
    error: 'category "Game": expected Poder, Habilidade or Resistência',
  });
});

test("parseItem fills optional fields with safe defaults", () => {
  const parsed = parseItem({ id: "x", name: "y", category: "Habilidade", done: "yes" });
  assert.ok("item" in parsed);
  assert.deepEqual(parsed.item, {
    id: "x",
    name: "y",
    category: "Habilidade",
    daily: false,
    description: "",
    date: "",
    done: false,
    doneAt: "",
    createdAt: "",
  });
});

test("parseItem migrates the sheet's old categories: Read/Watch/Side Hustle and the Today items", () => {
  const category = (raw) => /** @type {any} */ (parseItem({ id: "x", name: "y", ...raw })).item;
  assert.equal(category({ category: "Read" }).category, "Habilidade");
  assert.equal(category({ category: "Watch" }).category, "Resistência");
  assert.equal(category({ category: "Side Hustle" }).category, "Poder");
  const gym = category({ category: "Today", track: "poder", xp: 2 });
  assert.deepEqual([gym.category, gym.daily, gym.xp, "track" in gym], ["Poder", true, 2, false]);
  const personal = category({ category: "Personal" });
  assert.deepEqual([personal.category, personal.daily, personal.xp], ["Resistência", true, 1]);
  assert.equal(category({ category: "Read", daily: true }).daily, true, "the daily flag is read as is");
});

test("parseItemList fails on the first bad entry", () => {
  assert.deepEqual(parseItemList("nope"), { error: "list string: expected an array of items" });
  const result = parseItemList([{ id: "a", name: "ok", category: "Poder" }, { id: "" }]);
  assert.ok("error" in result);
});

test("store round-trips a list and returns null for missing or corrupt data", () => {
  const storage = new FakeStorage();
  const store = createItemStore(storage);
  assert.equal(store.load(), null);
  const items = [
    {
      id: "a",
      name: "A",
      category: "Habilidade",
      daily: false,
      description: "",
      date: "2026-01-01",
      done: true,
      doneAt: "",
      createdAt: "",
    },
  ];
  store.save(items);
  assert.deepEqual(store.load(), items);
  storage.setItem(STORAGE_KEY, "{not json");
  assert.equal(store.load(), null);
  store.clear();
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test("an item keeps an http(s) url, drops anything else, and an edit can clear it", () => {
  const withLink = createItem(
    { name: "Bleach", category: "Resistência", description: "", url: " https://x.io/a " },
    fixedClock,
  );
  assert.equal(/** @type {any} */ (withLink).item.url, "https://x.io/a");
  assert.deepEqual(
    createItem({ name: "x", category: "Poder", description: "", url: "javascript:alert(1)" }, fixedClock),
    {
      error: "errorUrl",
    },
  );
  assert.equal(
    "url" in /** @type {any} */ (parseItem({ id: "a", name: "A", category: "Poder", url: "ftp://x" })).item,
    false,
  );
  const items = [/** @type {any} */ (withLink).item];
  const cleared = /** @type {any} */ (
    updateItem(items, items[0].id, { name: "Bleach", category: "Poder", description: "" })
  );
  assert.equal("url" in cleared.items[0], false);
});
