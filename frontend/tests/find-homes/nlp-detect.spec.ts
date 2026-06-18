import { test, expect } from "@playwright/test";

test("natural language query switches to AI Search mode", async ({ page }) => {
  await page.goto("/find-homes");

  const searchInput = page.getByPlaceholder(/search by location/i);

  // Natural language triggers AI mode
  await searchInput.fill("looking for a cozy place near a university");

  // Button should now say "AI Search"
  await expect(page.getByRole("button", { name: "AI Search" })).toBeVisible();

  // Hint text confirms smart search
  await expect(page.getByText(/smart search/i)).toBeVisible();

  // Click and verify it runs without crash
  await page.getByRole("button", { name: "AI Search" }).click();
  await expect(page.locator(".animate-spin").first()).not.toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/showing/i)).toBeVisible();
});

test("clearing search input resets to regular mode", async ({ page }) => {
  await page.goto("/find-homes");

  const searchInput = page.getByPlaceholder(/search by location/i);
  await searchInput.fill("looking for a cozy apartment for students");
  await expect(page.getByRole("button", { name: "AI Search" })).toBeVisible();

  // Clear button (X icon)
  await page.getByRole("button", { name: /clear/i }).click().catch(async () => {
    // Fallback: clear via keyboard
    await searchInput.clear();
  });

  await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
});
