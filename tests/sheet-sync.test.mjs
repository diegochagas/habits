import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeSheetRows, opsBetween, rowToItem, sheetDateToIso, upsertOp } from "../js/sync/sheet-rows.js";
import { createSheetClient, parseExchange } from "../js/sync/sheet-client.js";
import { createSyncStore, enqueueOps } from "../js/sync/sync-store.js";

/** @param {Partial<import("../js/items-store.js").HabitItem>} fields */
const item = (fields) => ({
  id: "x",
  name: "Task",
  category: "Read",
  description: "",
  date: "2026-10-29",
  done: false,
  doneAt: "",
  createdAt: "",
  ...fields,
});

test("sheet rows become items: dd/mm/yyyy → ISO, unknown Source rows are skipped", () => {
  assert.equal(sheetDateToIso("29/10/2026"), "2026-10-29");
  assert.equal(sheetDateToIso("1/2/2027"), "2027-02-01");
  assert.equal(sheetDateToIso("2026-10-29"), "2026-10-29");
  const row = { id: "row-1", date: "29/10/2026", task: " Devotional ", notes: "Pray", source: "Personal" };
  assert.deepEqual(
    rowToItem(row),
    item({ id: "row-1", name: "Devotional", category: "Today", description: "Pray", track: "resistencia", xp: 1 }),
    "the sheet's old Personal column is the Today category",
  );
  assert.equal(rowToItem({ ...row, source: "Today" })?.category, "Today");
  assert.equal(rowToItem({ ...row, source: "Legend:" }), null);
  assert.equal(rowToItem({ ...row, task: "" }), null);
  assert.equal(rowToItem({ ...row, id: "" }), null);
  const daily = rowToItem({ ...row, daily: true, done: true }, "2026-10-29");
  assert.equal(daily?.category, "Today", "a row with a Done checkbox is a Today item");
  assert.equal(daily?.done, true, "a ticked daily row is done");
  assert.equal(daily?.doneAt, "2026-10-29");
  assert.equal(rowToItem({ ...row, daily: false, done: true })?.done, false, "only a checkbox counts");
});

test("ops between two lists: Done/Remove delete, Undo/Add upsert, untouched items are silent", () => {
  const a = item({ id: "a" });
  const b = item({ id: "b", name: "B" });
  assert.deepEqual(opsBetween([a, b], [{ ...a, done: true }, b]), [{ op: "delete", id: "a" }]);
  assert.deepEqual(opsBetween([a, b], [b]), [{ op: "delete", id: "a" }]);
  assert.deepEqual(opsBetween([b], [a, b]), [upsertOp(a)]);
  assert.deepEqual(opsBetween([{ ...a, done: true }], [a]), [upsertOp(a)]);
  assert.deepEqual(opsBetween([a, b], [a, b]), []);
  assert.deepEqual(opsBetween([{ ...a, done: true }], []), [], "removing a done item: the row is already gone");
  const edited = { ...a, name: "Edited", category: /** @type {const} */ ("Today") };
  assert.deepEqual(opsBetween([a, b], [edited, b]), [upsertOp(edited)], "an edit writes the row back");
  assert.equal(upsertOp(edited).daily, true, "a Today row gets the Done checkbox");
  assert.equal(upsertOp(a).daily, false);
  assert.deepEqual(opsBetween([a], [{ ...a, doneAt: "x" }]), [], "doneAt alone is not an edit");
});

test("merge: the sheet decides which items exist; pending ops keep local state; text matches rename ids", () => {
  const local = [
    item({ id: "sheet-001", name: "Devotional", category: "Today", track: "resistencia", xp: 1 }),
    item({ id: "sheet-002", name: "Gone" }),
  ];
  const rows = [
    { id: "row-a", date: "29/10/2026", task: "Devotional", notes: "", source: "Personal" },
    { id: "row-b", date: "30/10/2026", task: "New in sheet", notes: "", source: "Watch" },
    { id: "row-c", date: "31/10/2026", task: "Being deleted", notes: "", source: "Read" },
  ];
  const added = item({ id: "item-local", name: "Added offline" });
  const pending = [{ op: "delete", id: "row-c" }, upsertOp(added)];
  const merged = mergeSheetRows([...local, added], rows, /** @type {any} */ (pending));
  assert.deepEqual(
    merged.items.map((it) => [it.id, it.done]),
    [
      ["row-a", false],
      ["row-b", false],
      ["row-c", true],
      ["item-local", false],
    ],
  );
  assert.deepEqual(merged.renamed, { "sheet-001": "row-a" });
});

test("merge: a Today row's checkbox overrides the local done state; the local track and XP survive", () => {
  const local = [item({ id: "row-d", name: "Devotional", category: "Today", done: true, track: "poder", xp: 2 })];
  const row = { id: "row-d", date: "29/10/2026", task: "Devotional", notes: "", source: "Personal", daily: true };
  assert.equal(mergeSheetRows(local, [{ ...row, done: false }], []).items[0].done, false);
  assert.equal(mergeSheetRows(local, [{ ...row, done: true }], []).items[0].done, true);
  assert.deepEqual(
    [mergeSheetRows(local, [row], []).items[0].track, mergeSheetRows(local, [row], []).items[0].xp],
    ["poder", 2],
  );
  const pending = /** @type {any} */ ([{ op: "delete", id: "row-d" }]);
  assert.equal(mergeSheetRows(local, [{ ...row, done: false }], pending).items[0].done, true, "queued Done stays");
  const ticked = mergeSheetRows([], [{ ...row, done: true }], [], "2026-10-30").items[0];
  assert.equal(ticked.doneAt, "2026-10-30", "a row ticked in the sheet counts as done today");
});

test("the queue keeps one op per id, the latest", () => {
  const queue = enqueueOps(
    [
      { op: "delete", id: "a" },
      { op: "delete", id: "b" },
    ],
    [upsertOp(item({ id: "a" }))],
  );
  assert.deepEqual(
    queue.map((op) => [op.op, op.id]),
    [
      ["delete", "b"],
      ["upsert", "a"],
    ],
  );
});

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

test("settings round-trip and fall back to defaults on garbage", () => {
  const store = createSyncStore(new FakeStorage());
  assert.deepEqual(store.load(), { url: "", token: "", queue: [], lastSyncAt: "" });
  store.save({ url: "https://script.google.com/macros/s/abc/exec", token: "t", queue: [], lastSyncAt: "" });
  assert.equal(store.load().token, "t");
});

test("the client posts text/plain JSON to a script.google.com /exec URL and parses the answer", async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push([url, init]);
    return {
      ok: true,
      json: async () => ({ rows: [{ id: "row-1", date: "29/10/2026", task: "T", notes: "", source: "Read" }] }),
    };
  };
  const client = createSheetClient(/** @type {any} */ (fetchFn));
  const settings = { url: "https://script.google.com/macros/s/abc/exec", token: "secret" };
  const result = await client.exchange(settings, [{ op: "delete", id: "row-9" }]);
  assert.deepEqual(result, {
    rows: [{ id: "row-1", date: "29/10/2026", task: "T", notes: "", source: "Read", daily: false, done: false }],
  });
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[0][1].headers["Content-Type"], "text/plain;charset=utf-8");
  assert.deepEqual(JSON.parse(calls[0][1].body), { token: "secret", ops: [{ op: "delete", id: "row-9" }] });
  assert.match(
    /** @type {any} */ (await client.exchange({ url: "https://evil.example/exec", token: "" }, [])).error,
    /expected https:\/\/script\.google\.com/,
  );
  assert.deepEqual(parseExchange({ error: "bad token" }), { error: "bad token" });
  assert.match(/** @type {any} */ (parseExchange({})).error, /no rows/);
  const failing = createSheetClient(/** @type {any} */ (async () => ({ ok: false, status: 500 })));
  assert.deepEqual(await failing.exchange(settings, []), { error: "HTTP 500" });
});
