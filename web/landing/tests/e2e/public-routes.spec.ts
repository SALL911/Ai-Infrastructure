import { test, expect } from "@playwright/test";

/**
 * Smoke tests for all public static routes.
 * Catches 500s, broken imports, missing metadata.
 */

const STATIC_ROUTES = [
  { path: "/", title: /Symcio BrandOS/ },
  { path: "/about", title: /關於全識/ },
  { path: "/pricing", title: /定價方案/ },
  { path: "/tools", title: /工具套件/ },
  { path: "/tools/brand-check", title: /免費品牌 AI 健檢/ },
  { path: "/tools/entity-builder", title: /Entity Builder/ },
  { path: "/audit", title: /Brand AI Audit/ },
  { path: "/login", title: /登入/ },
  { path: "/signup", title: /註冊/ },
  { path: "/forgot-password", title: /登入/ }, // shares layout metadata
];

for (const route of STATIC_ROUTES) {
  test(`${route.path} returns 200 and has correct title`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(route.title);
  });
}

test.describe("FAQ dynamic routes", () => {
  const categories = [
    "enterprise",
    "esg",
    "investor",
    "security",
    "creator",
  ];

  for (const cat of categories) {
    test(`/faq/${cat} renders with FAQPage Schema`, async ({ page }) => {
      const resp = await page.goto(`/faq/${cat}`);
      expect(resp?.status()).toBe(200);

      // FAQPage JSON-LD present
      const schemas = await page.locator('script[type="application/ld+json"]').all();
      const faqSchemas = await Promise.all(
        schemas.map((s) => s.textContent()),
      );
      const hasFaqPage = faqSchemas.some((t) => t && t.includes('"FAQPage"'));
      expect(hasFaqPage).toBe(true);
    });
  }

  test("/faq/nonexistent returns 404", async ({ page }) => {
    const response = await page.goto("/faq/nonexistent");
    expect(response?.status()).toBe(404);
  });
});

test("pricing page shows all 4 plans", async ({ page }) => {
  await page.goto("/pricing");

  await expect(page.getByRole("heading", { name: "免費版 Free" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /專業版 · 月付/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /專業版 · 年付/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /企業版 Enterprise/ }),
  ).toBeVisible();
});
