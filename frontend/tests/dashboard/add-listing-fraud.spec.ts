import { test, expect } from "@playwright/test";

// Fill FRAUD_LISTING_* in .env.test with values that trigger the fraud AI
test("submit fraud-seed listing → status shows pending", async ({ page }) => {
  const fraudTitle   = process.env.FRAUD_LISTING_TITLE!;
  const fraudAddress = process.env.FRAUD_LISTING_ADDRESS!;
  const fraudPrice   = process.env.FRAUD_LISTING_PRICE!;

  await page.goto("/dashboard");
  await expect(page.getByText("Manage your AXIOM workspace")).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: /add listing/i }).click();
  await expect(page.getByRole("heading", { name: /add new listing/i })).toBeVisible();

  // ── Step 0: Basics ────────────────────────────────────────────────
  await page.getByLabel(/listing name|title/i).fill(fraudTitle);
  await page.getByLabel(/address/i).fill(fraudAddress);
  await page.getByRole("button", { name: /next|continue|details/i }).click();

  // ── Step 1: Details ───────────────────────────────────────────────
  await page.getByLabel(/price/i).fill(fraudPrice);
  await page.getByLabel(/size/i).fill("80");

  const leaseSelect = page.getByLabel(/lease type/i);
  if (await leaseSelect.isVisible()) await leaseSelect.selectOption("monthly");

  await page.getByLabel(/minimum stay/i).fill("12");

  const availDate = page.getByLabel(/available date/i);
  if (await availDate.isVisible()) await availDate.fill("2026-08-01");

  await page.getByRole("button", { name: /next|photos/i }).click();

  // ── Step 2: Submit ────────────────────────────────────────────────
  await page.getByRole("button", { name: /submit for review/i }).click();

  await expect(page.getByRole("heading", { name: /add new listing/i }))
    .not.toBeVisible({ timeout: 20_000 });

  // Fraud-flagged listing shows as "pending" not "active"
  await expect(
    page.getByText(/pending/i).first()
  ).toBeVisible({ timeout: 15_000 });
});
