// SPDX-FileCopyrightText: 2026 Stanford University and the project authors (see CONTRIBUTORS.md)
// SPDX-License-Identifier: MIT

import AccessibilityBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { siteConfig } from "../../site.config.mjs";

const route = (path: string) => `${siteConfig.base}${path}`;
const pages = [
  "/",
  "/hf-basics/",
  "/goal-setting/",
  "/treatment-options/",
  "/resources/",
  "/printables/appointments/",
  "/printables/hospital-visits/",
  "/printables/vitals/",
  "/404.html",
];

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\//, (request) =>
    request.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="en"><title>Embedded video</title><main>Video preview</main></html>',
    }),
  );
});
for (const path of pages) {
  test(`${path} preserves content, accessibility, and responsive layout`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      expect((await page.goto(route(path)))?.ok()).toBe(true);
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator("html")).toHaveAttribute(
        "data-color-scheme",
        colorScheme,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      const results = await new AccessibilityBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

test("keyboard skip link reaches the main content", async ({
  page,
  browserName,
}) => {
  await page.goto(route("/"));
  if (browserName === "webkit")
    await page.getByRole("link", { name: "Skip to content" }).focus();
  else await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("goal wizard builds a goal and scopes printing to its summary", async ({
  page,
}) => {
  await page.goto(route("/goal-setting/"));
  await page.locator("[data-priority-choice]").first().click();
  await page.locator("[data-next]").click();
  await page.locator("#barrier").fill("Remembering my plan");
  await page.locator("[data-next]").click();
  await page.locator("#action").fill("Write my goal in my booklet");
  await page.locator("[data-next]").click();
  await page.locator("#frequency").fill("Each morning");
  await page.locator("[data-next]").click();
  await page.locator("#support").fill("A reminder");
  await page.locator("[data-next]").click();
  await expect(page.locator("[data-summary-text]")).toContainText(
    "Write my goal",
  );
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printCalled = "true";
    };
  });
  await page.locator("[data-print-goal]").click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-print-scope",
    "goal-summary",
  );
  await expect(page.locator("body")).toHaveAttribute(
    "data-print-called",
    "true",
  );
});

test("treatment controls preserve accordion and selection behavior", async ({
  page,
}) => {
  await page.goto(route("/treatment-options/"));
  const toggle = page.locator("[data-treatment-toggle]").nth(1);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-treatment-panel]").first()).toHaveAttribute(
    "inert",
    "",
  );
  const choice = page
    .locator("[data-treatment-panel]")
    .nth(1)
    .getByRole("button")
    .first();
  await choice.click();
  await expect(choice).toHaveAttribute("aria-pressed", "true");
});

test("resources retain embedded videos and downloadable trackers", async ({
  page,
  request,
}) => {
  await page.goto(route("/resources/"));
  expect(await page.locator("iframe[title]").count()).toBeGreaterThan(0);
  for (const name of ["hfpef-medication-tracker", "hfref-medication-tracker"]) {
    const response = await request.get(route(`/assets/trackers/${name}.pdf`));
    expect(response.ok()).toBe(true);
    expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
  }
});

test("printable pages retain their print controls", async ({ page }) => {
  for (const path of pages.filter((path) => path.startsWith("/printables/"))) {
    await page.goto(route(path));
    await page.evaluate(() => {
      window.print = () => {
        document.body.dataset.printCalled = "true";
      };
    });
    await page.locator("[data-print-page]").click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-print-called",
      "true",
    );
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".print-sheet")).toBeVisible();
    await expect(page.locator(".site-header")).toBeHidden();
    await page.emulateMedia({ media: "screen" });
  }
});
