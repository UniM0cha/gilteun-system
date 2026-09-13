import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: "../output/playwright/test-results",
  reporter: [["list"], ["html", { outputFolder: "../output/playwright/report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5197",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-ipad",
      use: { browserName: "chromium", viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2, hasTouch: true },
    },
    {
      name: "webkit-ipad",
      use: { browserName: "webkit", viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2, hasTouch: true },
    },
    {
      name: "chromium-mobile",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true },
    },
    {
      name: "webkit-mobile",
      use: { browserName: "webkit", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true },
    },
  ],
  webServer: [
    {
      command: "../server/node_modules/.bin/tsx e2e/start-server.ts",
      url: "http://127.0.0.1:3197/api/auth/status",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --strictPort",
      url: "http://127.0.0.1:5197",
      env: { PORT: "5197", VITE_PROXY_TARGET: "http://127.0.0.1:3197" },
      reuseExistingServer: false,
    },
  ],
});
