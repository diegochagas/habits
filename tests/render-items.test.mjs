import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, renderCategoryTabs, renderItemCard } from "../js/render-items.js";

const item = {
  id: "sheet-001",
  name: "<script>alert(1)</script> Devotional",
  category: "Personal",
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
  assert.ok(html.includes('class="card panel category-personal"'));
});

test("a done card gets the done class and the undo label in PT", () => {
  const html = renderItemCard({ ...item, done: true }, "pt");
  assert.ok(html.includes("card-done"));
  assert.ok(html.includes(">Desfazer<"));
});

test("a Today habit done today is greyed out with an 'already done' note", () => {
  const html = renderItemCard({ ...item, daily: true, done: true, doneAt: "2026-10-29" }, "en");
  assert.ok(html.includes("card-done card-done-today"));
  assert.ok(html.includes("✓ Already done today"));
  const plain = renderItemCard({ ...item, done: true }, "en");
  assert.ok(!plain.includes("card-done-today"), "a plain done item keeps the DONE stamp");
});

test("formatDate leaves non-ISO input untouched but escaped", () => {
  assert.equal(formatDate("soon <b>"), "soon &lt;b&gt;");
});

test("renderCategoryTabs marks the active tab and shows counts", () => {
  const html = renderCategoryTabs({ All: 5, Read: 2 }, "Read", "en");
  assert.ok(html.includes('aria-selected="true" data-category="Read">Read <b>2</b>'));
  assert.ok(html.includes('data-category="Watch">Watch <b>0</b>'));
});

test("cards get a Pomodoro button while open and show finished Pomodoros", async () => {
  const { renderItemCard } = await import("../js/render-items.js");
  const item = {
    id: "a",
    name: "Read",
    category: "Read",
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
