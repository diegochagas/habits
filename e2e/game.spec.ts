// e2e/game.spec.ts: the play page: locked without free time; with it, walk the first Arca RPG
// Maker style, bump into the enemy, fight, continue, and leave with PV restored.
import { test, expect } from "@playwright/test";
import { collectErrors, freshStateBeforeEach, grantFreeTime } from "./helpers";

freshStateBeforeEach();

test("without free time the play page is locked behind the Pomodoro notice", async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await page.goto("/game.html?seed=7");
  await expect(page.locator("#free-time-over")).toBeVisible();
  await expect(page.locator("#free-time-over")).toContainText("Free time is over!");
  await expect(page.locator("#free-time")).toContainText("00:00");
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-game-locked.png` });
  expect(errors).toEqual([]);
});

test("the first Arca is walked RPG Maker style: bump into the enemy, fight, continue, leave healed", async ({
  page,
}, testInfo) => {
  const errors = collectErrors(page);
  await grantFreeTime(page, 600);
  await page.goto("/game.html?seed=7");
  await expect(page.locator("#free-time-over")).toBeHidden();
  await expect(page.locator("#free-time")).toContainText("Free time");
  await expect(page.locator(".game-tabs .tab")).toHaveCount(2);
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

  // Leaving the Arca restores PV/PM/PA.
  await page.getByRole("button", { name: "Back to the Arcas" }).click();
  await expect(page.locator(".stage-card")).toHaveCount(6);
  await expect(page.locator(".resource.pv span")).toHaveText("PV 10/10");
  expect(errors).toEqual([]);
});

test("PT toggle translates the play page", async ({ page }) => {
  await grantFreeTime(page, 600);
  await page.goto("/game.html?seed=7");
  await page.locator("#lang-toggle").click();
  await expect(page.getByRole("button", { name: "Aventura", exact: true })).toBeVisible();
  await expect(page.locator("#free-time")).toContainText("Tempo livre");
});
