// e2e/puzzle.spec.ts: the sort puzzles: locked without free time; with it, pour, undo and switch
// to the coin stacks, with the board kept across a reload.
import { test, expect } from "@playwright/test";
import { collectErrors, freshStateBeforeEach, grantFreeTime } from "./helpers";

freshStateBeforeEach();

test("sort puzzles pour, undo, switch skins and survive a reload", async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await grantFreeTime(page, 600);
  await page.goto("/puzzle.html?seed=3");
  await expect(page.locator("#free-time-over")).toBeHidden();
  await expect(page.locator("[data-tube]")).toHaveCount(5);
  await expect(page.locator(".puzzle-status")).toContainText("Level 1 · 0 moves");
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-puzzle-tubes.png` });

  await page.getByRole("button", { name: "Tube 1" }).click();
  await expect(page.locator(".tube-selected")).toHaveCount(1);
  await expect(page.locator(".sort-item.lifted")).toHaveCount(1);
  await page.getByRole("button", { name: "Tube 4" }).click();
  await expect(page.locator(".puzzle-status")).toContainText("1 moves");
  await expect(page.locator("[data-tube='3'] .sort-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("[data-tube='3'] .sort-item")).toHaveCount(0);
  await expect(page.locator(".puzzle-status")).toContainText("2 moves");

  await page.getByRole("button", { name: "Coin stacks" }).click();
  await expect(page.locator(".sort-board")).toHaveClass(/skin-coins/);
  await expect(page.locator("[data-tube]")).toHaveCount(5);
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-puzzle-coins.png` });

  await page.reload();
  await expect(page.locator(".sort-board")).toHaveClass(/skin-coins/);
  await page.getByRole("button", { name: "Magic tubes" }).click();
  await expect(page.locator(".puzzle-status")).toContainText("2 moves");
  expect(errors).toEqual([]);
});

test("without free time the puzzles are locked", async ({ page }) => {
  await page.goto("/puzzle.html");
  await expect(page.locator("#free-time-over")).toContainText("Free time is over!");
  await expect(page.locator("#puzzle-main")).toHaveClass(/puzzle-locked/);
});
