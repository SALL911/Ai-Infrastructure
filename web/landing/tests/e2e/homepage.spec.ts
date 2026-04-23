import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("renders hero + 4 stages + BCI formula + 6 modules", async ({ page }) => {
    await page.goto("/");

    // Hero
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "量化品牌 AI 基礎設施系統",
    );
    await expect(page.getByRole("link", { name: /免費品牌 AI 健檢/ })).toBeVisible();

    // 4-stage boards
    await expect(page.getByText("板塊一 · 診斷與敘事奠基")).toBeVisible();
    await expect(page.getByText("板塊四 · 商模重構與資本化")).toBeVisible();

    // BCI formula
    await expect(page.getByText(/BCI = α · FBV \+ β · NCV \+ γ · AIV/)).toBeVisible();

    // 6 modules present
    await expect(page.getByRole("heading", { name: "AI Visibility Index" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /運動產業/ })).toBeVisible();
  });

  test("nav menu links work (desktop)", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.getByRole("link", { name: "診斷", exact: true }).click();
    await expect(page).toHaveURL(/\/audit/);
  });

  test("mobile hamburger menu opens + closes", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 390, height: 844 });

    const hamburger = page.getByRole("button", { name: "開啟選單" });
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    // After click: menu links appear
    await expect(page.getByRole("link", { name: "方案", exact: true })).toBeVisible();

    // Click again to close
    await hamburger.click();
    await expect(page.getByRole("link", { name: "方案", exact: true })).toBeHidden();
  });

  test("has Organization JSON-LD", async ({ page }) => {
    await page.goto("/");
    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent();
    expect(jsonLd).toBeTruthy();
    const parsed = JSON.parse(jsonLd!);
    expect(parsed["@type"]).toBe("Organization");
    expect(parsed.alternateName).toContain("Symcio");
  });
});
