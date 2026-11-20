// e2e/images.spec.ts: pictures on cards. The editor's file picker uploads to /api/images, the
// thumbnail can be removed again, and a saved picture shows on the card and survives a reload.
import { test, expect } from "@playwright/test";
import { collectErrors, freshStateBeforeEach } from "./helpers";

freshStateBeforeEach();

// A 1x1 PNG: the smallest real picture the server accepts.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("attach a picture in the editor: it shows on the card, can be removed, survives a reload", async ({
  page,
}, testInfo) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.locator("#counter")).toContainText("315 of 315");
  await page.getByPlaceholder("Search...").fill("Duolingo");
  const card = page.locator("article.card", { hasText: "Duolingo" });
  await card.getByRole("button", { name: "Edit" }).click();
  const editor = card.locator("form[data-form='edit-item']");
  await editor
    .locator("[data-image-input]")
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: PNG_1X1 });
  await expect(editor.locator(".image-thumb img")).toHaveCount(1);
  await expect(editor.locator(".image-thumb img")).toHaveJSProperty("naturalWidth", 1);
  await card.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-images-editor.png` });
  await editor.getByRole("button", { name: "Save" }).click();

  const saved = page.locator("article.card", { hasText: "Duolingo" });
  await expect(saved.locator(".card-images img")).toHaveCount(1);
  await saved.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-images-card.png` });

  await page.reload();
  await page.getByPlaceholder("Search...").fill("Duolingo");
  const reloaded = page.locator("article.card", { hasText: "Duolingo" });
  await expect(reloaded.locator(".card-images img")).toHaveCount(1);

  await reloaded.getByRole("button", { name: "Edit" }).click();
  await page.locator("form[data-form='edit-item'] [data-action='remove-image']").click();
  await page.locator("form[data-form='edit-item']").getByRole("button", { name: "Save" }).click();
  await expect(page.locator("article.card", { hasText: "Duolingo" }).locator(".card-images")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a file the server refuses shows an error in the picture field", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Search...").fill("Duolingo");
  const card = page.locator("article.card", { hasText: "Duolingo" });
  await card.getByRole("button", { name: "Edit" }).click();
  const editor = card.locator("form[data-form='edit-item']");
  await page.route("**/api/images", (route) => route.fulfill({ status: 415, body: "{}" }));
  await editor.locator("[data-image-input]").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: PNG_1X1 });
  await expect(editor.locator("[data-image-error]")).toContainText("could not be saved");
});
