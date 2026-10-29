// e2e/helpers.ts: shared bits for the specs: console error capture and a Pomodoro state with
// free time, so the play pages are not locked.
import { type Page } from "@playwright/test";

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  return errors;
}

/** Seeds localStorage before any script runs: `seconds` of free time earned today. */
export async function grantFreeTime(page: Page, seconds: number): Promise<void> {
  await page.addInitScript((freeSeconds) => {
    const state = {
      mode: "work",
      running: false,
      endsAt: null,
      remaining: 1500,
      itemId: null,
      videoUrl: "",
      muted: false,
      date: new Date().toISOString().slice(0, 10),
      completed: 1,
      freeSeconds,
      pomodoros: {},
    };
    localStorage.setItem("habits:pomodoro:v1", JSON.stringify(state));
  }, seconds);
}
