import { defineConfig, devices } from "@playwright/test";

// The real server with the in-memory store (HABITS_STORE=memory) on port 4180, so the specs
// exercise /api/state. One worker: every spec wipes that shared state before it starts.
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4180", trace: "retain-on-failure" },
  webServer: {
    command: "node server/main.js",
    env: { HABITS_STORE: "memory", PORT: "4180" },
    url: "http://localhost:4180/api/health",
    reuseExistingServer: true,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
