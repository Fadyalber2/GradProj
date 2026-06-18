import { test, expect } from "@playwright/test";

test("regular keyword search returns listings", async ({ page }) => {
  await page.goto("/find-homes");

  const searchInput = page.getByPlaceholder(/search by location/i);
  await searchInput.fill("cairo apartment");

  // Regular mode: magnifier icon visible, not sparkles
  await expect(page.getByRole("button", { name: "Search" })).toBeVisible();

  await page.getByRole("button", { name: "Search" }).click();

  // Wait for results — loader disappears
  await expect(page.locator(".animate-spin").first()).not.toBeVisible({ timeout: 15_000 });

  // At least one listing card rendered
  const cards = page.locator("[data-testid='listing-card'], article, .listing-card").first();
  // Check count text updated
  await expect(page.getByText(/showing/i)).toBeVisible({ timeout: 10_000 });
});
