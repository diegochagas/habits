import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FILTER, countByCategory, matchesFilter, visibleItems } from "../js/filters.js";

const sample = [
  { id: "1", name: "One Piece", category: "Read", description: "Chapter 1197", date: "2026-11-01", done: false },
  { id: "2", name: "Duolingo", category: "Personal", description: "1 lesson", date: "2026-10-28", done: true },
  { id: "3", name: "Bleach", category: "Watch", description: "", date: "2026-10-28", done: false },
  {
    id: "4",
    name: "Anki",
    category: "Side Hustle",
    description: "https://apps.ankiweb.net",
    date: "2026-10-28",
    done: false,
  },
];

test("default filter shows everything, to-do first, then by date and name", () => {
  assert.deepEqual(
    visibleItems(sample, DEFAULT_FILTER).map((item) => item.id),
    ["4", "3", "1", "2"],
  );
});

test("category filter keeps only that category", () => {
  const ids = visibleItems(sample, { ...DEFAULT_FILTER, category: "Watch" }).map((item) => item.id);
  assert.deepEqual(ids, ["3"]);
});

test("status filter separates to-do from done", () => {
  assert.deepEqual(
    visibleItems(sample, { ...DEFAULT_FILTER, status: "done" }).map((item) => item.id),
    ["2"],
  );
  assert.equal(visibleItems(sample, { ...DEFAULT_FILTER, status: "todo" }).length, 3);
});

test("search is case-insensitive and looks at name and description", () => {
  assert.ok(matchesFilter(sample[0], { ...DEFAULT_FILTER, search: "chapter" }));
  assert.ok(matchesFilter(sample[3], { ...DEFAULT_FILTER, search: "ANKIWEB" }));
  assert.ok(!matchesFilter(sample[2], { ...DEFAULT_FILTER, search: "piece" }));
});

test("countByCategory includes the total under All", () => {
  assert.deepEqual(countByCategory(sample), { All: 4, Read: 1, Personal: 1, Watch: 1, "Side Hustle": 1 });
});
