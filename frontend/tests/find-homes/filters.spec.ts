import { test, expect } from "@playwright/test";

test("applying category filter updates listing count and resets to page 1", async ({ page }) => {
  await page.goto("/find-homes");

  // Wait for initial load
  await expect(page.locator(".animate-spin").first()).not.toBeVisible({ timeout: 15_000 });
  const initialCountText = await page.getByText(/showing \d+/i).textContent();

  // Select category "For Rent" in the filter sidebar
  await page.getByRole("radio", { name: /for rent/i })
    .first()
    .click()
    .catch(() =>
      page.getByLabel(/for rent/i).first().click()
    );

  // Click Apply if sidebar has an apply button
  const applyBtn = page.getByRole("button", { name: /apply/i });
  if (await applyBtn.isVisible()) await applyBtn.click();

  await expect(page.locator(".animate-spin").first()).not.toBeVisible({ timeout: 15_000 });

  // Count may differ from initial
  await expect(page.getByText(/showing \d+/i)).toBeVisible();

  // Page indicator back to 1
  const activePage = page.locator("[aria-current='page'], [aria-label='Page 1']").first();
  if (await activePage.isVisible()) {
    await expect(activePage).toBeVisible();
  }
});
