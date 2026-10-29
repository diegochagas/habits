import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, renderCategoryTabs, renderItemCard } from "../js/render-items.js";

const item = {
  id: "sheet-001",
  name: "<script>alert(1)</script> Devotional",
  category: "Habilidade",
  daily: false,
  description: "Pray. https://bible.com/x",
  date: "2026-10-28",
  done: false,
  createdAt: "",
};

test("renderItemCard escapes the name, links the description and shows the sheet date format", () => {
  const html = renderItemCard(item, "en");
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt; Devotional"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes('<a href="https://bible.com/x"'));
  assert.ok(html.includes("28/10/2026"));
  assert.ok(html.includes('class="card panel category-habilidade"'));
  assert.ok(html.includes('<span class="card-stamp" aria-hidden="true">技</span>'));
});

test("a done card gets the done class and the undo label in PT", () => {
  const html = renderItemCard({ ...item, done: true }, "pt");
  assert.ok(html.includes("card-done"));
  assert.ok(html.includes(">Desfazer<"));
});

test("a daily habit done today is greyed out with an 'already done' note", () => {
  const habit = { ...item, category: "Poder", daily: true, xp: 2, done: true, doneAt: "2026-10-29" };
  const html = renderItemCard(habit, "en");
  assert.ok(html.includes("card-done card-done-today"));
  assert.ok(html.includes("✓ Already done today"));
  assert.ok(html.includes("🔁 +2</span>"), "a daily card shows its XP per day");
  const plain = renderItemCard({ ...item, done: true }, "en");
  assert.ok(!plain.includes("card-done-today"), "a plain done item keeps the DONE stamp");
});

test("formatDate leaves non-ISO input untouched but escaped", () => {
  assert.equal(formatDate("soon <b>"), "soon &lt;b&gt;");
});

test("renderCategoryTabs marks the active tab and shows counts", () => {
  const html = renderCategoryTabs({ All: 5, Habilidade: 2, Today: 1 }, "Habilidade", "en");
  assert.ok(html.includes('aria-selected="true" data-category="Habilidade">Habilidade <b>2</b>'));
  assert.ok(html.includes('data-category="Poder">Poder <b>0</b>'));
  assert.ok(html.includes('data-category="Today">Today <b>1</b>'), "the Today tab (daily items) comes last");
});

test("cards get a Pomodoro button while open and show finished Pomodoros", async () => {
  const { renderItemCard } = await import("../js/render-items.js");
  const item = {
    id: "a",
    name: "Read",
    category: "Habilidade",
    daily: false,
    description: "",
    date: "2026-10-29",
    done: false,
    createdAt: "",
  };
  const open = renderItemCard(item, "en", { pomodoros: { a: 2 }, pomodoroLabel: "Pomodoro" });
  assert.match(open, /data-action="pomodoro"/);
  assert.match(open, /🍅 2/);
  const done = renderItemCard({ ...item, done: true }, "en", { pomodoroLabel: "Pomodoro" });
  assert.doesNotMatch(done, /data-action="pomodoro"/);
  assert.doesNotMatch(renderItemCard(item, "en"), /data-action="pomodoro"/);
});
