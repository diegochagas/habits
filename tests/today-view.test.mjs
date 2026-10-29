// today-view.test.mjs: the Today tab lists the list's daily habits still to do (a done one
// leaves until tomorrow), then the catalog's bad habits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStartingHero } from "../js/game/hero-sheet.js";
import { renderTodayView } from "../js/game/today-view.js";

const hero = createStartingHero("2026-10-29");
const base = {
  category: "Resistência",
  daily: true,
  description: "",
  date: "2026-10-29",
  doneAt: "",
  createdAt: "",
  xp: 1,
};

test("daily items are the good habits; a done one leaves the tab until tomorrow", () => {
  const items = [
    { ...base, id: "a", name: "Gym workout", category: "Poder", xp: 2, done: false },
    { ...base, id: "b", name: "Duolingo <3", category: "Habilidade", done: true, doneAt: "2026-10-29" },
  ];
  const html = renderTodayView(hero, "en", "2026-10-29", items);
  assert.ok(html.includes("Good habits (+XP)"));
  assert.match(html, /track-poder" data-action="done-item" data-id="a">\s*<span>Gym workout<\/span><b>\+2 P<\/b>/);
  assert.ok(!html.includes('data-id="b"'), "a habit done today is not offered again");
  assert.ok(html.includes("Junk food"), "the catalog's bad habits follow");
  const allDone = renderTodayView(hero, "en", "2026-10-29", [items[1]]);
  assert.ok(allDone.includes("✓ All habits done today!"));
  assert.ok(!html.includes('log-habit" data-habit="gym'), "no catalog good habits any more");
  assert.ok(html.includes('name="pvHit"'), "the custom form adds bad habits only");
});

test("without Today items the tab explains how to add one, in PT too", () => {
  const html = renderTodayView(hero, "pt", "2026-10-29");
  assert.ok(html.includes("Nenhum hábito ainda"));
  assert.ok(html.includes("Bons hábitos (+XP)"));
});
