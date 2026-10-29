// today-view.test.mjs: the Today tab lists the list's Today habits first (done ones greyed and
// disabled), then the catalog's good and bad habits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStartingHero } from "../js/game/hero-sheet.js";
import { renderTodayView } from "../js/game/today-view.js";

const hero = createStartingHero("2026-10-29");
const base = { category: "Personal", description: "", date: "2026-10-29", doneAt: "", createdAt: "", daily: true };

test("Today habits render as buttons; a done one is disabled and says it is done", () => {
  const items = [
    { ...base, id: "a", name: "Devotional", done: false },
    { ...base, id: "b", name: "Duolingo <3", done: true, doneAt: "2026-10-29" },
  ];
  const html = renderTodayView(hero, "en", "2026-10-29", items);
  assert.ok(html.includes("Today's habits (+XP)"));
  assert.match(html, /data-action="done-item" data-id="a">\s*<span>Devotional<\/span><b>\+1 R<\/b>/);
  assert.match(html, /habit-done" data-action="done-item" data-id="b" disabled>\s*<span>Duolingo &lt;3<\/span>/);
  assert.ok(html.includes("✓ Already done today"));
  assert.ok(html.includes("Gym workout"), "the catalog's good habits follow");
  assert.ok(!html.includes("Devotional / prayer"), "the merged catalog habit is gone");
});

test("without Today habits the tab explains how to flag one, in PT too", () => {
  const html = renderTodayView(hero, "pt", "2026-10-29");
  assert.ok(html.includes("Nenhum hábito de hoje ainda"));
  assert.ok(html.includes("Hábitos de hoje (+XP)"));
});
