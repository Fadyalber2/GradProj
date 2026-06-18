import { test, expect } from "@playwright/test";

test("free user can start 7-day Basic trial", async ({ page }) => {
  await page.goto("/pricing");

  await expect(page.getByRole("heading", { name: /basic/i })).toBeVisible({ timeout: 10_000 });

  // Only visible when current plan is free and trial not yet used
  const trialBtn = page.getByRole("button", { name: /start 7.day basic trial/i });

  if (!(await trialBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
    test.skip(true, "Trial already used or user is not on free plan");
  }

  await trialBtn.click();

  // Button shows loading state
  await expect(page.getByText(/starting trial/i)).toBeVisible({ timeout: 5_000 });

  // After success: "Trial active" badge on Basic card
  await expect(
    page.getByText(/trial active/i)
  ).toBeVisible({ timeout: 15_000 });
});
