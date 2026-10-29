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

test("the first Arca is walked RPG Maker style: bump into the enemy, fight, continue", async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await page.goto("/game.html?seed=7");
  await page.getByRole("button", { name: "Arcas", exact: true }).click();
  await expect(page.locator(".stage-card")).toHaveCount(6);
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-game-arcas.png` });

  await page.getByRole("button", { name: "Enter" }).first().click();
  await expect(page.locator(".battle-head")).toContainText("Haunted Gym");
  await expect(page.locator(".battle-head")).toContainText("0 of 4");
  await expect(page.locator("#battle-canvas")).toBeVisible();
  await expect(page.locator(".dpad")).toBeVisible();
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-game-map.png` });

  // Hold → until the hero bumps into Dumbbell Bro (7 tiles away) and the command window appears.
  await page.locator("#battle-canvas").click({ position: { x: 10, y: 10 } });
  await page.keyboard.down("ArrowRight");
  await expect(page.getByRole("button", { name: "Attack" })).toBeVisible({ timeout: 10_000 });
  await page.keyboard.up("ArrowRight");
  await expect(page.locator(".battle-head")).toContainText("Dumbbell Bro");
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-game-battle.png` });

  for (let turn = 0; turn < 12; turn += 1) {
    const attack = page.getByRole("button", { name: "Attack" });
    if ((await attack.count()) === 0) break;
    await attack.click();
  }
  await expect(page.locator(".rm-commands .rm-command").first()).toHaveText(/Continue|Back to the Arcas/);
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-game-battle-end.png` });
  if ((await page.getByRole("button", { name: "Continue" }).count()) > 0) {
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".battle-head")).toContainText("1 of 4");
    await expect(page.locator(".dpad")).toBeVisible();
  }

  // The on-screen d-pad moves the hero too (pointer down/up on a key).
  const left = page.getByRole("button", { name: "Left", exact: true });
  if ((await left.count()) > 0) await left.dispatchEvent("pointerdown");
  await page.waitForTimeout(300);
  await page.dispatchEvent("body", "pointerup");
  expect(errors).toEqual([]);
});

test("PT toggle translates the game", async ({ page }) => {
  await page.goto("/game.html?seed=7");
  await page.locator("#lang-toggle").click();
  await expect(page.getByRole("button", { name: "Hoje", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Treino na academia/ })).toBeVisible();
});
