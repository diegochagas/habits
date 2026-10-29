// e2e/edit.spec.ts: a card's Edit button opens an inline form; saving changes name, category,
// the Today-habit flag and its XP, survives a reload (the server keeps it), and a daily item
// done on an earlier day comes back as to do.
import { test, expect } from "@playwright/test";
import { collectErrors, freshStateBeforeEach, putState } from "./helpers";

freshStateBeforeEach();

test("edit a card: name, category, Today habit and XP; the change survives a reload", async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.locator("#counter")).toContainText("315 of 315");
  await page.getByPlaceholder("Search...").fill("Duolingo");
  const card = page.locator("article.card", { hasText: "Duolingo" });
  await card.getByRole("button", { name: "Edit" }).click();
  const editor = card.locator("form[data-form='edit-item']");
  await expect(editor.getByLabel("Name")).toHaveValue("Duolingo");
  await editor.getByLabel("Name").fill("Duolingo: 2 lessons");
  // The XP per day belongs to Today habits only: it hides when the box is unticked.
  await expect(editor.getByLabel("Today habit (once a day)")).toBeChecked();
  await expect(editor.locator("[data-xp-field]")).toBeVisible();
  await editor.getByLabel("Today habit (once a day)").uncheck();
  await expect(editor.locator("[data-xp-field]")).toBeHidden();
  await editor.getByLabel("Today habit (once a day)").check();
  await editor.getByLabel("Category").selectOption("Poder");
  await editor.getByLabel("XP per day (1–3)").fill("2");
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-edit.png`, fullPage: false });
  await editor.getByRole("button", { name: "Save" }).click();

  await page.getByPlaceholder("Search...").fill("2 lessons");
  const edited = page.locator("article.card", { hasText: "Duolingo: 2 lessons" });
  await expect(edited).toHaveClass(/category-poder/);
  await expect(edited.locator(".card-category")).toHaveText("Poder");
  await expect(edited.locator(".card-daily")).toHaveText("🔁 +2");
  await expect(page.locator("form[data-form='edit-item']")).toHaveCount(0);

  await edited.getByRole("button", { name: "Edit" }).click();
  // In edit mode the name is an input value, not card text: address the form directly.
  const reopened = page.locator("form[data-form='edit-item']");
  await reopened.getByLabel("Name").fill("   ");
  await reopened.getByRole("button", { name: "Save" }).click();
  await expect(reopened.locator("[data-edit-error]")).toHaveText("Give it a name first!");
  await reopened.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator("form[data-form='edit-item']")).toHaveCount(0);

  await page.reload();
  await page.getByPlaceholder("Search...").fill("2 lessons");
  await expect(page.locator("article.card", { hasText: "Duolingo: 2 lessons" }).locator(".card-daily")).toBeVisible();
  const saved = await (await page.request.get("/api/state")).json();
  const item = saved.state["habits:v1"].find((entry: { name: string }) => entry.name === "Duolingo: 2 lessons");
  expect(item).toMatchObject({ category: "Poder", daily: true, xp: 2 });
  expect(item).not.toHaveProperty("track");
  expect(errors).toEqual([]);
});

test("a daily item done yesterday is to do again today; one done today stays done", async ({ page }) => {
  const errors = collectErrors(page);
  const base = { category: "Resistência", daily: true, description: "", date: "2026-10-01", createdAt: "" };
  const today = new Date().toISOString().slice(0, 10);
  await putState(page, "habits:v1", [
    { id: "y", name: "Yesterday's habit", done: true, doneAt: "2000-01-01", ...base },
    { id: "t", name: "Today's habit", done: true, doneAt: today, ...base },
  ]);
  await page.goto("/");
  await expect(page.locator("#counter")).toContainText("2 of 2");
  await expect(page.locator("article.card", { hasText: "Yesterday's habit" })).not.toHaveClass(/card-done/);
  const doneToday = page.locator("article.card", { hasText: "Today's habit" });
  await expect(doneToday).toHaveClass(/card-done-today/);
  await expect(doneToday.locator(".card-done-today-note")).toHaveText("✓ Already done today");
  expect(errors).toEqual([]);
});
