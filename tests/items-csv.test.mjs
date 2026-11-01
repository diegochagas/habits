// The list file: CSV text, item rows, and the store that keeps habits:v1 in the file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatCsv, parseCsv } from "../server/csv-text.js";
import { ITEMS_CSV_COLUMNS, itemsFromCsv, itemsToCsv } from "../server/items-csv.js";
import { STORAGE_KEY } from "../js/items-store.js";
import { createItemsCsvState } from "../server/state-items-csv.js";
import { createMemoryState } from "../server/state-memory.js";

const fixedClock = { id: () => "csv-test", now: () => new Date("2026-11-01T09:00:00.000Z") };
const HEADER = ITEMS_CSV_COLUMNS.join(",");

/** @returns {import("../js/items-store.js").HabitItem} */
function gymItem() {
  return {
    id: "habit-gym",
    name: "Gym workout",
    category: "Poder",
    daily: true,
    xp: 2,
    description: "",
    date: "2026-10-29",
    done: false,
    doneAt: "",
    createdAt: "2026-10-29T00:00:00.000Z",
  };
}

test("csv text: quotes, doubled quotes, commas and line breaks inside fields round-trip; CRLF and BOM read", () => {
  const rows = [
    ["a", "b"],
    ["x, y", 'say "hi"'],
    ["two\nlines", ""],
  ];
  const text = formatCsv(rows);
  assert.equal(text, 'a,b\n"x, y","say ""hi"""\n"two\nlines",\n');
  assert.deepEqual(parseCsv(text), rows);
  assert.deepEqual(parseCsv("﻿a,b\r\n1,2\r\n"), [
    ["a", "b"],
    ["1", "2"],
  ]);
  assert.deepEqual(parseCsv(""), []);
  assert.deepEqual(parseCsv("a,b"), [["a", "b"]]);
});

test("items to csv: the canonical header, booleans as words, xp only on daily items, blank url", () => {
  const text = itemsToCsv([
    gymItem(),
    { ...gymItem(), id: "b", name: "Bleach, ep 1", daily: false, url: "https://x.io" },
  ]);
  assert.deepEqual(text.split("\n"), [
    HEADER,
    "Gym workout,Poder,true,2,2026-10-29,false,,,,habit-gym,2026-10-29T00:00:00.000Z",
    '"Bleach, ep 1",Poder,false,,2026-10-29,false,,https://x.io,,b,2026-10-29T00:00:00.000Z',
    "",
  ]);
  const back = itemsFromCsv(text, fixedClock);
  assert.ok("items" in back);
  assert.deepEqual(back.items[0], gymItem());
  assert.equal(back.completed, 0);
});

test("items from csv: any column order, yes/x/1 mean true, a hand-typed row gets id, date and createdAt", () => {
  const read = itemsFromCsv(
    "category,name,daily,xp,done,description\nPoder,Gym,yes,3,x,\nHabilidade, Read ,,,,\n",
    fixedClock,
  );
  assert.ok("items" in read);
  assert.deepEqual(read.items, [
    {
      id: "csv-test",
      name: "Gym",
      category: "Poder",
      daily: true,
      xp: 3,
      description: "",
      date: "2026-11-01",
      done: true,
      doneAt: "",
      createdAt: "2026-11-01T09:00:00.000Z",
    },
    {
      id: "csv-test",
      name: "Read",
      category: "Habilidade",
      daily: false,
      description: "",
      date: "2026-11-01",
      done: false,
      doneAt: "",
      createdAt: "2026-11-01T09:00:00.000Z",
    },
  ]);
  assert.equal(read.completed, 2);
});

test("items from csv: blank lines are ignored, a row that is not an item is skipped with its line number", () => {
  const read = itemsFromCsv(`${HEADER}\n\nGym,Game\n,Poder\nRun,Side Hustle\n`, fixedClock);
  assert.ok("items" in read);
  assert.deepEqual(
    read.skipped.map((entry) => entry.line),
    [3, 4],
  );
  assert.match(read.skipped[0].error, /category "Game"/);
  assert.match(read.skipped[1].error, /name ""/);
  assert.deepEqual(
    read.items.map((item) => [item.name, item.category]),
    [["Run", "Poder"]],
    "the sheet's old Source values still load",
  );
  assert.match(/** @type {any} */ (itemsFromCsv("Task,Notes\nGym,\n", fixedClock)).error, /header "Task,Notes"/);
  assert.deepEqual(itemsFromCsv("", fixedClock), { items: [], skipped: [], completed: 0 });
});

test("csv state: the list moves from the inner store to the file once, the other keys stay inside", async () => {
  const folder = await mkdtemp(join(tmpdir(), "habits-csv-"));
  const csvPath = join(folder, "list", "items.csv");
  const inner = createMemoryState({ "habits:v1": [gymItem()], "habits:hero:v1": { xp: 1 } });
  const log = [];
  const state = await createItemsCsvState(inner, csvPath, { log: (line) => log.push(line), clock: fixedClock });
  assert.deepEqual(
    log.map((line) => [line.event, line.items]),
    [["items-csv-created", 1]],
  );
  assert.equal((await readFile(csvPath, "utf8")).split("\n")[0], HEADER);
  assert.equal(STORAGE_KEY, "habits:v1");
  const moved = { "habits:hero:v1": { xp: 1 }, "habits:v1:before-csv": [gymItem()] };
  assert.deepEqual(await inner.loadAll(), moved, "the database row is kept under another key");
  assert.deepEqual(await state.loadAll(), { ...moved, "habits:v1": [gymItem()] });
  await state.save("habits:hero:v1", { xp: 2 });
  assert.deepEqual((await inner.loadAll())["habits:hero:v1"], { xp: 2 });
  await state.close();
});

test("csv state: an edit made to the file by hand shows on the next load, a save rewrites the file", async () => {
  const folder = await mkdtemp(join(tmpdir(), "habits-csv-"));
  const csvPath = join(folder, "items.csv");
  const log = [];
  const state = await createItemsCsvState(createMemoryState(), csvPath, {
    log: (line) => log.push(line),
    clock: fixedClock,
  });
  assert.deepEqual(await state.loadAll(), {}, "no file yet: no list, the page loads the seed");
  await state.save("habits:v1", [gymItem()]);
  await writeFile(
    csvPath,
    `${HEADER}\nGym workout,Poder,true,2,2026-10-29,true,2026-11-01,,,habit-gym,x\nSwim,Poder\n`,
  );
  const loaded = /** @type {any} */ (await state.loadAll())["habits:v1"];
  assert.deepEqual(
    loaded.map((item) => [item.id, item.name, item.done, item.doneAt]),
    [
      ["habit-gym", "Gym workout", true, "2026-11-01"],
      ["csv-test", "Swim", false, ""],
    ],
  );
  const rewritten = (await readFile(csvPath, "utf8")).split("\n");
  assert.match(
    rewritten[2],
    /^Swim,Poder,false,,2026-11-01,false,,,,csv-test,2026-11-01T/,
    "the completed row is written back",
  );
  await writeFile(csvPath, `${HEADER}\nGym,Game\nRun,Poder\n`);
  assert.equal(/** @type {any} */ (await state.loadAll())["habits:v1"].length, 1);
  assert.deepEqual(
    log.filter((line) => line.event === "items-csv-row-skipped").map((line) => line.line),
    [2],
  );
  await state.remove("habits:v1");
  assert.deepEqual(await state.loadAll(), {});
  await state.save("habits:v1", []);
  assert.equal((await stat(csvPath)).mode & 0o777, 0o664);
  await state.wipe();
  await assert.rejects(stat(csvPath));
  await assert.rejects(state.save("habits:v1", [{ id: "a" }]), /name undefined/);
});

test("csv state: a file whose header is not the list's fails the load instead of being replaced", async () => {
  const folder = await mkdtemp(join(tmpdir(), "habits-csv-"));
  const csvPath = join(folder, "items.csv");
  await writeFile(csvPath, "Task,Notes\nGym,\n");
  const state = await createItemsCsvState(createMemoryState({ "habits:v1": [gymItem()] }), csvPath);
  await assert.rejects(state.loadAll(), /header "Task,Notes"/);
  assert.equal(await readFile(csvPath, "utf8"), "Task,Notes\nGym,\n", "untouched");
});
