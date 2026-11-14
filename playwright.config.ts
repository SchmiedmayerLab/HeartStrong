import { defineConfig, devices } from "@playwright/test";
import { siteConfig } from "./site.config.mjs";

const previewOrigin = "http://127.0.0.1:4322";
const previewBase = siteConfig.base;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: previewOrigin,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "compact-phone-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 320, height: 800 },
        isMobile: true,
      },
    },
    {
      name: "phone-webkit",
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
    {
      name: "tablet-chromium",
      use: { browserName: "chromium", viewport: { width: 768, height: 1024 } },
    },
    {
      name: "desktop-chromium",
      use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "wide-desktop-chromium",
      use: { browserName: "chromium", viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: {
    command: "npm run preview:test",
    url: `${previewOrigin}${previewBase}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
