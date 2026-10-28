// e2e/game.spec.ts: the game page on desktop and phone: log habits, see XP move, fight the first
// Arca with a fixed seed, and keep the hero across reloads. Screenshots are the evidence.
import { test, expect, type Page } from "@playwright/test";

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  return errors;
}

test("habits move XP, the sheet sells with track XP, and the hero survives a reload", async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await page.goto("/game.html?seed=7");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ARCAS DO HÁBITO");
  await expect(page.locator(".hero-rank")).toContainText("12 pts");
  await expect(page.locator(".pool-poder b")).toHaveText("0");
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-game-today.png` });

  await page.getByRole("button", { name: /Gym workout/ }).click();
  await expect(page.locator(".pool-poder b")).toHaveText("2");
  await page.getByRole("button", { name: /Junk food/ }).click();
  await expect(page.locator(".pool-poder b")).toHaveText("0");
  await expect(page.locator(".resource.pv span")).toHaveText("PV 7/10");
  await expect(page.locator(".today-log li")).toHaveCount(2);

  for (let i = 0; i < 5; i += 1) await page.getByRole("button", { name: /Gym workout/ }).click();
  await expect(page.locator(".pool-poder b")).toHaveText("10");
  await page.getByRole("button", { name: "Sheet", exact: true }).click();
  await page
    .getByRole("button", { name: /^Buy 10$/ })
    .first()
    .click();
  await expect(page.locator(".sheet-list").first()).toContainText("Esporte");
  await expect(page.locator(".pool-poder b")).toHaveText("0");
  await expect(page.locator(".hero-rank")).toContainText("13 pts");
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-game-sheet.png`, fullPage: true });

  await page.reload();
  await expect(page.locator(".hero-rank")).toContainText("13 pts");
  expect(errors).toEqual([]);
});

test("the first Arca can be fought with the starting sheet", async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await page.goto("/game.html?seed=7");
  await page.getByRole("button", { name: "Arcas", exact: true }).click();
  await expect(page.locator(".stage-card")).toHaveCount(6);
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-game-arcas.png` });

  await page.getByRole("button", { name: "Enter" }).first().click();
  await expect(page.locator(".battle-head")).toContainText("Haunted Gym");
  await expect(page.locator("#battle-canvas")).toBeVisible();
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-game-battle.png` });

  for (let turn = 0; turn < 12; turn += 1) {
    const attack = page.getByRole("button", { name: "Attack" });
    if ((await attack.count()) === 0) break;
    await attack.click();
  }
  await expect(page.locator(".battle-actions .stamp").first()).toHaveText(/Next enemy|Back to the Arcas/);
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-game-battle-end.png` });
  expect(errors).toEqual([]);
});

test("PT toggle translates the game", async ({ page }) => {
  await page.goto("/game.html?seed=7");
  await page.locator("#lang-toggle").click();
  await expect(page.getByRole("button", { name: "Hoje", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Treino na academia/ })).toBeVisible();
});
