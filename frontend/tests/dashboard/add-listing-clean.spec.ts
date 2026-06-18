import { test, expect } from "@playwright/test";

test("submit clean listing → status shows active", async ({ page }) => {
  await page.goto("/dashboard");
  
  // Wait for dashboard to load - use same robust selector as login test
  await expect(page.locator("h1").or(page.getByText("User dashboard")).or(page.getByText("Listings"))).toBeVisible({ timeout: 15_000 });

  // Open modal
  await page.getByRole("button", { name: /add listing/i }).click({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: /add new listing/i })).toBeVisible();

  // ── Step 0: Basics ────────────────────────────────────────────────
  await page.getByLabel(/listing name|title/i).fill("Clean Test Apartment in Maadi");
  await page.getByLabel(/address/i).fill("123 Road 9, Maadi, Cairo");

  await page.getByRole("button", { name: /next|continue|details/i }).click();

  // ── Step 1: Details ───────────────────────────────────────────────
  await page.getByLabel(/price/i).fill("15000");
  await page.getByLabel(/size/i).fill("120");

  // Lease type — for_rent default
  const leaseSelect = page.getByLabel(/lease type/i);
  if (await leaseSelect.isVisible()) await leaseSelect.selectOption("monthly");

  await page.getByLabel(/minimum stay/i).fill("12");

  // Available date
  const availDate = page.getByLabel(/available date/i);
  if (await availDate.isVisible()) await availDate.fill("2026-08-01");

  // ── AI Description generate ───────────────────────────────────────
  const generateBtn = page.getByRole("button", { name: /generate/i })
    .or(page.locator("button").filter({ hasText: /generate/i }))
    .first();

  if (await generateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await generateBtn.click();
    // Wait for generation to complete (spinner disappears)
    await expect(page.locator("button").filter({ hasText: /generating/i }))
      .not.toBeVisible({ timeout: 30_000 });
    // Description textarea should now have content
    const desc = page.getByLabel(/description/i);
    await expect(desc).not.toBeEmpty({ timeout: 5_000 });
  }

  await page.getByRole("button", { name: /next|photos/i }).click();

  // ── Step 2: Photos — skip upload, go straight to submit ──────────
  await page.getByRole("button", { name: /submit for review/i }).click();

  // Wait for modal to close or success state
  await expect(page.getByRole("heading", { name: /add new listing/i }))
    .not.toBeVisible({ timeout: 20_000 });

  // Listing appears in My Listings tab with "active" status
  await expect(
    page.getByText(/active/i).first()
  ).toBeVisible({ timeout: 15_000 });
});
