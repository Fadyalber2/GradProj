import { test, expect } from "@playwright/test";

// This test needs a paid-plan user — set TEST_PAID_USER_* in .env.test
// If using the same user account, ensure it has an active basic/pro subscription
test("paid user can cancel plan and sees cancellation banner", async ({ page, context }) => {
  // If paid user is a different account, login separately
  const paidEmail    = process.env.TEST_PAID_USER_EMAIL;
  const paidPassword = process.env.TEST_PAID_USER_PASSWORD;

  if (paidEmail && paidPassword) {
    // Clear session and login as paid user
    await context.clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email Address").fill(paidEmail);
    await page.locator('input[name="password"]').fill(paidPassword);
    await page.getByRole("button", { name: "Log In" }).click();
    await page.waitForURL("/dashboard", { timeout: 15_000 });
  }

  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: /basic|pro/i }).first()).toBeVisible({ timeout: 25_000 });

  const cancelBtn = page.getByRole("button", { name: /cancel plan/i });

  if (!(await cancelBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
    test.skip(true, "No paid plan active — skipping cancel test");
  }

  await cancelBtn.click();

  // Cancellation scheduled banner appears
  await expect(
    page.getByText(/cancellation scheduled|stays active until/i)
  ).toBeVisible({ timeout: 15_000 });
});
