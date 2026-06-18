import { test, expect } from "@playwright/test";

test("clicking Upgrade on Basic triggers Stripe checkout redirect", async ({ page }) => {
  // Intercept checkout API — return fake Stripe URL so test stays local
  await page.route("**/api/subscriptions/checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ checkout_url: "https://checkout.stripe.com/test-session-xyz" }),
    });
  });

  // Track where the page tries to navigate
  let stripeRedirectUrl = "";
  page.on("request", (req) => {
    if (req.url().includes("stripe.com")) stripeRedirectUrl = req.url();
  });

  // Block the actual Stripe navigation so the test browser doesn't leave
  await page.route("https://checkout.stripe.com/**", (route) => route.abort());

  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: /basic/i })).toBeVisible({ timeout: 10_000 });

  // Find and click Upgrade on Basic card
  const basicCard = page.getByRole("article").filter({ hasText: /best owner fit/i });
  const upgradeBtn = basicCard.getByRole("button", { name: /upgrade/i });
  await expect(upgradeBtn).toBeVisible();
  await upgradeBtn.click();

  // Button shows "Redirecting..." loading state
  await expect(basicCard.getByText(/redirecting/i)).toBeVisible({ timeout: 5_000 });

  // API was called and redirect to Stripe was attempted
  await page.waitForTimeout(2000);
  expect(stripeRedirectUrl).toContain("checkout.stripe.com");
});
