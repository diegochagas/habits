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
  const result = createItem({ name: "  Bleach  ", category: "Watch", description: " ep 1 \n" }, fixedClock);
  assert.ok("item" in result);
  assert.deepEqual(result.item, {
    id: "item-test",
    name: "Bleach",
    category: "Watch",
    description: "ep 1",
    date: "2026-10-28",
    done: false,
    doneAt: "",
    createdAt: "2026-10-28T12:34:56.000Z",
  });
  const daily = createItem(
    { name: "Duolingo", category: "Personal", description: "", daily: true, date: "2026-11-01" },
    fixedClock,
  );
  assert.ok("item" in daily);
  assert.equal(daily.item.daily, true);
  assert.equal(daily.item.date, "2026-11-01", "a chosen date wins over today");
  assert.deepEqual(createItem({ name: "x", category: "Read", description: "", date: "1/2/2026" }, fixedClock), {
    error: "errorDate",
  });
});

test("updateItem replaces the editable fields, keeps id/done, and can turn daily on and off", () => {
  const items = [
    {
      id: "a",
      name: "Old",
      category: "Read",
      description: "",
      date: "2026-10-01",
      done: true,
      doneAt: "2026-10-02",
      createdAt: "",
    },
    {
      id: "b",
      name: "B",
      category: "Read",
      description: "",
      date: "2026-10-01",
      done: false,
      doneAt: "",
      createdAt: "",
      daily: true,
    },
  ];
  const edited = updateItem(items, "a", {
    name: " New ",
    category: "Watch",
    description: " d ",
    date: "",
    daily: true,
  });
  assert.ok("items" in edited);
  assert.deepEqual(edited.items[0], {
    id: "a",
    name: "New",
    category: "Watch",
    description: "d",
    date: "2026-10-01",
    done: true,
    doneAt: "2026-10-02",
    createdAt: "",
    daily: true,
  });
  const noLongerDaily = /** @type {any} */ (updateItem(items, "b", { name: "B", category: "Read", description: "" }));
  assert.equal("daily" in noLongerDaily.items[1], false);
  assert.deepEqual(updateItem(items, "a", { name: "", category: "Read", description: "" }), { error: "errorName" });
});

test("rollDailyItems: a daily item done yesterday is to do again, one done today stays done", () => {
  const items = [
    { id: "a", done: true, doneAt: "2026-10-28", daily: true },
    { id: "b", done: true, doneAt: "2026-10-29", daily: true },
    { id: "c", done: true, doneAt: "2026-10-01" },
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
  assert.deepEqual(createItem({ name: "   ", category: "Read", description: "" }, fixedClock), { error: "errorName" });
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
  assert.deepEqual(parseItem({ id: "x", name: "", category: "Read" }), {
    error: 'name "": expected a non-empty string',
  });
  assert.deepEqual(parseItem({ id: "x", name: "y", category: "Game" }), {
    error: 'category "Game": expected Read, Watch, Side Hustle or Personal',
  });
});

test("parseItem fills optional fields with safe defaults", () => {
  const parsed = parseItem({ id: "x", name: "y", category: "Read", done: "yes" });
  assert.ok("item" in parsed);
  assert.deepEqual(parsed.item, {
    id: "x",
    name: "y",
    category: "Read",
    description: "",
    date: "",
    done: false,
    doneAt: "",
    createdAt: "",
  });
});

test("parseItemList fails on the first bad entry", () => {
  assert.deepEqual(parseItemList("nope"), { error: "list string: expected an array of items" });
  const result = parseItemList([{ id: "a", name: "ok", category: "Read" }, { id: "" }]);
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
      category: "Read",
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
