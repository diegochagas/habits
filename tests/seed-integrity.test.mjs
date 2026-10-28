// Data-integrity test (PLAYBOOK §4.1 extras): the committed seed must always load.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseItemList } from "../js/items-store.js";
import { missingTranslationKeys } from "../js/i18n.js";

const seedUrl = new URL("../data/seed.json", import.meta.url);

test("seed.json is a valid item list with unique ids and ISO dates", async () => {
  const parsed = parseItemList(JSON.parse(await readFile(seedUrl, "utf8")));
  assert.ok("items" in parsed, "error" in parsed ? parsed.error : "");
  const ids = new Set(parsed.items.map((item) => item.id));
  assert.equal(ids.size, parsed.items.length, "duplicate ids in seed.json");
  for (const item of parsed.items) assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/, `date ${item.date} on ${item.id}`);
  assert.ok(parsed.items.length >= 300);
});

test("every i18n key exists in both languages", () => {
  assert.deepEqual(missingTranslationKeys(), []);
});
