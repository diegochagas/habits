// e2e/home.spec.ts: the habits page's hero side: Today habits move XP, the Sheet sells with track
// XP, the hero survives a reload; and the Pomodoro (fast mode) earns free time on a list item.
import { test, expect } from "@playwright/test";
import { collectErrors, freshStateBeforeEach } from "./helpers";

freshStateBeforeEach();

test("habits move XP, the sheet sells with track XP, and the hero survives a reload", async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.locator(".hero-rank")).toContainText("12 pts");
  await expect(page.locator(".hero-bmi")).toHaveText("BMI 38.7");
  await expect(page.locator(".pool-poder b")).toHaveText("0");
  await expect(page.locator(".game-tabs .tab").first()).toHaveText("Today");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator("#list-section")).toBeHidden();

  // Good habits are the list's daily items: once a day each, then gone from the tab and greyed on the list.
  const gym = page.locator(".today-habits button", { hasText: "Gym workout" });
  await expect(gym).toContainText("+2 P");
  await gym.click();
  await expect(gym).toHaveCount(0);
  await expect(page.locator(".pool-poder b")).toHaveText("2");
  await page.getByRole("button", { name: /Junk food/ }).click();
  await expect(page.locator(".pool-poder b")).toHaveText("0", "falls back to the fullest pool");
  await expect(page.locator(".resource.pv span")).toHaveText("PV 7/10");
  await expect(page.locator(".today-log li")).toHaveCount(2);
  await page.locator(".today-habits button", { hasText: "Devotional" }).click();
  await expect(page.locator(".pool-resistencia b")).toHaveText("1");
  await expect(page.locator(".today-log li").first()).toContainText("Devotional");
  await expect(page.locator(".today-habits button")).toHaveCount(8, "ten daily habits, two done");
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-home-today.png` });
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("tab", { name: /^Today/ }).click();
  await expect(page.locator("#counter")).toContainText("10 of 315");
  const card = page.locator("article.card", { hasText: "Gym workout" });
  await expect(card).toHaveClass(/card-done-today/);
  await expect(card.locator(".card-done-today-note")).toHaveText("✓ Already done today");
  // Done on the list = done for today: the habit leaves the Today tab; a plain item pays 1 XP on its característica.
  await page.locator("article.card", { hasText: "Duolingo" }).getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".pool-habilidade b")).toHaveText("1");
  await page.getByRole("tab", { name: /^Habilidade/ }).click();
  const plain = page.locator("article.card:not(.card-done):not(:has(.card-daily))").first();
  await plain.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".pool-habilidade b")).toHaveText("2");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".today-habits button")).toHaveCount(7);
  await expect(page.locator(".today-log li")).toHaveCount(5);
  await page.getByRole("button", { name: "List", exact: true }).click();

  // Ten XP on Poder (as if gym had been logged all week) buys a perícia on the Sheet tab.
  const saved = await (await page.request.get("/api/state")).json();
  const hero = saved.state["habits:hero:v1"];
  await page.request.put("/api/state/habits%3Ahero%3Av1", { data: { ...hero, pools: { ...hero.pools, poder: 10 } } });
  await page.reload();
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
  // Height and weight together give the BMI; below 30 both desvantagens go from the Ficha.
  await expect(page.locator(".sheet-list", { hasText: "Lento (BMI ≥ 30)" })).toContainText("Frágil (BMI ≥ 35)");
  await page.locator(".weight-form input[name='kg']").fill("86");
  await page.locator(".weight-form input[name='cm']").fill("170");
  await page.getByRole("button", { name: "Log weight" }).click();
  await expect(page.locator(".hero-bmi")).toHaveText("BMI 29.8");
  await expect(page.locator(".sheet-list", { hasText: "Lento" })).toHaveCount(0);
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

  // A work block needs an item: Start with nothing picked says so and hands the cursor to the picker.
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator("[data-error='pomodoro-item']")).toHaveText(
    "Pick an item in “Working on” to start a Pomodoro.",
  );
  await expect(page.locator("[data-pomodoro-select='item']")).toBeFocused();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
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
  await expect(page.locator("[data-error='pomodoro-item']")).toBeHidden();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-home-pomodoro.png` });

  await expect(page.locator("#game-notice")).toContainText("Pomodoro done!", { timeout: 10_000 });
  await expect(page.locator(".pomodoro-count")).toContainText("1 today");
  await expect(page.locator("#free-time-bank")).toHaveText("00:01");
  await expect(page.locator(".pomodoro-modes .tab-active")).toHaveText("Short break");
  await expect(card.locator(".card-pomodoros")).toHaveText("🍅 1");
  // The finished Pomodoro is a good habit: +1 XP on the track of the item's característica.
  const pool = { Poder: "poder", Habilidade: "habilidade", Resistência: "resistencia" }[
    (await card.locator(".card-category").textContent()) ?? ""
  ];
  await expect(page.locator(`.pool-${pool} b`)).toHaveText("1");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".today-log li").first()).toContainText("🍅");
  expect(errors).toEqual([]);
});
