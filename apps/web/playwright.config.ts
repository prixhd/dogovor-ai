import { defineConfig, devices } from "@playwright/test";

/**
 * Demo acceptance scenario (docs/08-mvp-plan.md §1). Reuses `make dev`
 * servers when they are running, otherwise starts them.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", locale: "ru-RU" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    { command: "cd ../api && go run ./cmd/api", url: "http://localhost:8080/healthz", reuseExistingServer: true, timeout: 120_000 },
    { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
  ],
});
