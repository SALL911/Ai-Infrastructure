import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Symcio BrandOS end-to-end tests.
 *
 * Local:  npm run dev, then `npm run test:e2e`
 * CI:     .github/workflows/e2e.yml spins up a fresh next server
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
    ignoreHTTPSErrors: true,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          // Build without Supabase — pages render, just no auth state
          NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "test",
        },
      },
});
