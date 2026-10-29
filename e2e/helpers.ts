// e2e/helpers.ts: shared bits for the specs: console error capture, a clean server state before
// each test, and a Pomodoro state with free time so the play pages are not locked.
import { test, type Page } from "@playwright/test";

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  return errors;
}

/** Wipes the server's state (memory store only) so specs never see each other's data. */
export async function resetState(page: Page): Promise<void> {
  const response = await page.request.delete("/api/state");
  if (response.status() !== 204) throw new Error(`DELETE /api/state: HTTP ${response.status()}, expected 204`);
}

/** Every spec starts from an empty server. */
export function freshStateBeforeEach(): void {
  test.beforeEach(async ({ page }) => resetState(page));
}

/** Stores one JSON document on the server before the page loads. */
export async function putState(page: Page, key: string, value: unknown): Promise<void> {
  const response = await page.request.put(`/api/state/${encodeURIComponent(key)}`, { data: value });
  if (response.status() !== 204) throw new Error(`PUT ${key}: HTTP ${response.status()}, expected 204`);
}

/** `seconds` of free time earned today, saved on the server before the page loads. */
export async function grantFreeTime(page: Page, seconds: number): Promise<void> {
  await putState(page, "habits:pomodoro:v1", {
    mode: "work",
    running: false,
    endsAt: null,
    remaining: 1500,
    itemId: null,
    videoUrl: "",
    muted: false,
    date: new Date().toISOString().slice(0, 10),
    completed: 1,
    freeSeconds: seconds,
    pomodoros: {},
  });
}
