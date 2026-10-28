// e2e/smoke.spec.ts: the site loads the seed, adds an item with a link, filters, toggles
// language and keeps data across reloads, with no console errors. Screenshots are the evidence.
import { test, expect, type Page } from "@playwright/test";

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  return errors;
}

test("loads the sheet list, adds an item with a URL, filters and survives a reload", async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("HABITS");
  await expect(page.locator("article.card").first()).toBeVisible();
  await expect(page.locator("#counter")).toContainText("310 of 310");
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-home.png`, fullPage: false });

  await page.getByLabel("Name").fill("Read Vagabond");
  await page.getByLabel("Category").selectOption("Read");
  await page.getByLabel(/Description/).fill("Takehiko Inoue. https://example.com/vagabond vol. 1");
  await page.getByRole("button", { name: "ADD!" }).click();

  const card = page.locator("article.card", { hasText: "Read Vagabond" });
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: "https://example.com/vagabond" })).toHaveAttribute("target", "_blank");
  await expect(page.locator("#counter")).toContainText("311 of 311");
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-added.png`, fullPage: false });

  await page.getByRole("tab", { name: /^Watch/ }).click();
  await expect(page.locator("#counter")).toContainText("of 311");
  await expect(page.locator("article.card.category-read")).toHaveCount(0);

  await page.getByRole("tab", { name: /^All/ }).click();
  await page.getByPlaceholder("Search...").fill("vagabond");
  await expect(page.locator("article.card")).toHaveCount(1);
  await card.getByRole("button", { name: "Done" }).click();
  await expect(card).toHaveClass(/card-done/);

  await page.reload();
  await page.getByPlaceholder("Search...").fill("vagabond");
  await expect(page.locator("article.card.card-done", { hasText: "Read Vagabond" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("empty name shows an error and the PT toggle translates the page", async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "ADD!" }).click();
  await expect(page.locator("#form-error")).toHaveText("Give it a name first!");

  await page.locator("#lang-toggle").click();
  await expect(page.getByRole("button", { name: "ADICIONAR!" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /^Assistir/ })).toBeVisible();
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-pt.png`, fullPage: false });
  expect(errors).toEqual([]);
});
