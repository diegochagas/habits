// e2e/sync.spec.ts: the Google Sheets sync against a stubbed Apps Script endpoint: connect,
// pull the sheet's rows, mark one done (a delete op is posted), add one (an upsert is posted).
import { test, expect, type Route } from "@playwright/test";
import { collectErrors } from "./helpers";

const SCRIPT_URL = "https://script.google.com/macros/s/TEST123/exec";

type Row = { id: string; date: string; task: string; notes: string; source: string };

test("the list follows the sheet and pushes Done / Add as ops", async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  const rows: Row[] = [
    { id: "row-a", date: "29/10/2026", task: "Devotional", notes: "Pray", source: "Personal" },
    { id: "row-b", date: "30/10/2026", task: "Bleach", notes: "", source: "Watch" },
  ];
  const posted: unknown[] = [];
  await page.route(SCRIPT_URL, async (route: Route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    posted.push(body);
    if (body.token !== "secret") return route.fulfill({ json: { error: "bad token" } });
    for (const op of body.ops) {
      const index = rows.findIndex((row) => row.id === op.id);
      if (op.op === "delete" && index >= 0) rows.splice(index, 1);
      if (op.op === "upsert")
        rows.push({ id: op.id, date: op.date, task: op.name, notes: op.description, source: op.category });
    }
    return route.fulfill({ json: { rows } });
  });

  await page.goto("/");
  await expect(page.locator("#counter")).toContainText("310 of 310");
  await page.getByRole("button", { name: "Sync", exact: true }).click();
  await expect(page.locator("#sync-panel")).toBeVisible();
  await page.getByLabel("Web app URL").fill(SCRIPT_URL);
  await page.getByLabel("Secret word").fill("wrong");
  await page.locator("#sync-panel").getByRole("button", { name: "Save" }).click();
  await expect(page.locator("[data-sync-status]")).toContainText("Sync failed: bad token");

  await page.getByLabel("Secret word").fill("secret");
  await page.locator("#sync-panel").getByRole("button", { name: "Save" }).click();
  await expect(page.locator("[data-sync-status]")).toContainText("Synced with the sheet: 2 items");
  await expect(page.locator("#counter")).toContainText("2 of 2");
  await expect(page.locator("article.card", { hasText: "Devotional" })).toContainText("Pray");
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-home-sync.png` });

  await page.locator("article.card", { hasText: "Bleach" }).getByRole("button", { name: "Done" }).click();
  await expect(page.locator("#counter")).toContainText("1 of 1");
  expect(posted.at(-1)).toMatchObject({ ops: [{ op: "delete", id: "row-b" }] });
  expect(rows.map((row) => row.id)).toEqual(["row-a"]);

  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByLabel("Name").fill("Read Vagabond");
  await page.getByRole("button", { name: "ADD!" }).click();
  await expect(page.locator("#counter")).toContainText("2 of 2");
  expect(posted.at(-1)).toMatchObject({ ops: [{ op: "upsert", name: "Read Vagabond", category: "Read" }] });
  expect(rows.map((row) => row.task)).toEqual(["Devotional", "Read Vagabond"]);

  await page.reload();
  await expect(page.locator("#counter")).toContainText("2 of 2");
  expect(errors).toEqual([]);
});
