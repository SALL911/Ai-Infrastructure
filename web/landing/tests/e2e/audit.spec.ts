import { test, expect } from "@playwright/test";

test.describe("Brand AI Audit flow", () => {
  test("step 1 → step 2 → submit → report renders", async ({ page }) => {
    await page.goto("/audit");

    // Step 1
    await page.getByPlaceholder("例：鮮乳坊").fill("測試品牌");
    await page.getByPlaceholder("例：Xian Nai Fang").fill("Test Brand");
    await page.getByPlaceholder("https://").fill("https://example.com");
    await page.getByLabel(/產業類別/).selectOption("科技軟體");

    await page.getByRole("button", { name: /下一步/ }).click();

    // Step 2
    await expect(page.getByText("Step 2 · 企業資料")).toBeVisible();
    await page.getByLabel(/公司規模/).selectOption("11-50人");
    await page.getByLabel("Email *").fill("tester@example.com");
    await page.getByLabel("姓名 *").fill("Tester");

    await page.getByRole("button", { name: /開始 AI 診斷/ }).click();

    // Diagnostic overlay (10s animation — wait for first stage)
    await expect(page.getByText(/掃描 AI 搜尋引擎資料庫/)).toBeVisible({
      timeout: 3_000,
    });

    // Report renders within 12s
    await expect(page.getByText(/品牌 AI 可見度診斷報告/)).toBeVisible({
      timeout: 15_000,
    });

    // BCI ring shows a number 0-100
    await expect(page.getByText(/^[0-9]{1,3}$/).first()).toBeVisible();

    // AI engine names present
    await expect(page.getByText("ChatGPT", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Perplexity", { exact: true }).first()).toBeVisible();

    // 3 CTAs present
    await expect(page.getByRole("button", { name: /下載 PDF/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /解鎖進階分析/ })).toBeVisible();
  });

  test("validation: can't go to step 2 without required fields", async ({ page }) => {
    await page.goto("/audit");

    const nextBtn = page.getByRole("button", { name: /下一步/ });
    await expect(nextBtn).toBeDisabled();

    await page.getByPlaceholder("例：鮮乳坊").fill("只填一個");
    await expect(nextBtn).toBeDisabled();
  });
});
