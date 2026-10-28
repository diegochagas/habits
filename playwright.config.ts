import { defineConfig, devices } from "@playwright/test";

// Static site: serve the repo root. Port 4180 so it never collides with the other projects.
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4180", trace: "retain-on-failure" },
  webServer: { command: "npx serve -l 4180 --no-clipboard .", url: "http://localhost:4180", reuseExistingServer: true },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
