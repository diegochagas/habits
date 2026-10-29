// today-view.test.mjs: the Today tab lists the list's Today habits first (done ones greyed and
// disabled), then the catalog's good and bad habits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStartingHero } from "../js/game/hero-sheet.js";
import { renderTodayView } from "../js/game/today-view.js";

const hero = createStartingHero("2026-10-29");
const base = { category: "Today", description: "", date: "2026-10-29", doneAt: "", createdAt: "", track: "resistencia", xp: 1 };

test("Today items are the good habits; a done one is disabled and says it is done", () => {
  const items = [
    { ...base, id: "a", name: "Gym workout", track: "poder", xp: 2, done: false },
    { ...base, id: "b", name: "Duolingo <3", done: true, doneAt: "2026-10-29" },
  ];
  const html = renderTodayView(hero, "en", "2026-10-29", items);
  assert.ok(html.includes("Good habits (+XP)"));
  assert.match(html, /data-action="done-item" data-id="a">\s*<span>Gym workout<\/span><b>\+2 P<\/b>/);
  assert.match(html, /habit-done" data-action="done-item" data-id="b" disabled>\s*<span>Duolingo &lt;3<\/span>/);
  assert.ok(html.includes("✓ Already done today"));
  assert.ok(html.includes("Junk food"), "the catalog's bad habits follow");
  assert.ok(!html.includes("log-habit\" data-habit=\"gym"), "no catalog good habits any more");
  assert.ok(html.includes('name="pvHit"'), "the custom form adds bad habits only");
});

test("without Today items the tab explains how to add one, in PT too", () => {
  const html = renderTodayView(hero, "pt", "2026-10-29");
  assert.ok(html.includes("Nenhum hábito ainda"));
  assert.ok(html.includes("Bons hábitos (+XP)"));
});
