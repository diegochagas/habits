// e2e/home.spec.ts: the habits page's hero side: Today habits move XP, the Sheet sells with track
// XP, the hero survives a reload; and the Pomodoro (fast mode) earns free time on a list item.
import { test, expect } from "@playwright/test";
import { collectErrors, freshStateBeforeEach } from "./helpers";

freshStateBeforeEach();

test("habits move XP, the sheet sells with track XP, and the hero survives a reload", async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.locator(".hero-rank")).toContainText("12 pts");
  await expect(page.locator(".pool-poder b")).toHaveText("0");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator("#list-section")).toBeHidden();
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-home-today.png` });

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
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-home-sheet.png`, fullPage: true });

  await page.reload();
  await expect(page.locator(".hero-rank")).toContainText("13 pts");
  await expect(page.getByRole("button", { name: "Sheet", exact: true })).toHaveClass(/tab-active/);
  expect(errors).toEqual([]);
});

test("a Pomodoro on a list item earns free time; the focus music form validates the link", async ({
  page,
}, testInfo) => {
  const errors = collectErrors(page);
  // The embed is served by a stub so the test never reaches YouTube.
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>stub</title>" }),
  );
  await page.goto("/?fast=1");
  await expect(page.locator("#pomodoro-clock")).toHaveText("00:03");

  await page.getByPlaceholder("https://www.youtube.com/watch?v=...").fill("https://example.com/not-youtube");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("[data-error='focus-music']")).toHaveText("That is not a YouTube link.");
  await page.getByPlaceholder("https://www.youtube.com/watch?v=...").fill("https://youtu.be/rFZHOHl-L8A");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("#pomodoro-video iframe")).toHaveAttribute(
    "src",
    /youtube-nocookie\.com\/embed\/rFZHOHl-L8A/,
  );
  await page.getByRole("button", { name: /Mute/ }).click();
  await expect(page.getByRole("button", { name: /Unmute/ })).toBeVisible();

  const card = page.locator("article.card").first();
  const itemName = (await card.locator(".card-name").textContent()) ?? "";
  await card.getByRole("button", { name: /Pomodoro/ }).click();
  await expect(page.locator("[data-pomodoro-select='item']")).toContainText(itemName);
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-home-pomodoro.png` });

  await expect(page.locator("#game-notice")).toContainText("Pomodoro done!", { timeout: 10_000 });
  await expect(page.locator(".pomodoro-count")).toContainText("1 today");
  await expect(page.locator("#free-time-bank")).toHaveText("00:01");
  await expect(page.locator(".pomodoro-modes .tab-active")).toHaveText("Short break");
  await expect(card.locator(".card-pomodoros")).toHaveText("🍅 1");
  // The finished Pomodoro is a good habit: +1 XP on the item's track (Side Hustle → Habilidade).
  await expect(page.locator(".pool-habilidade b")).toHaveText("1");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".today-log li").first()).toContainText("🍅");
  expect(errors).toEqual([]);
});
