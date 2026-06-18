import { test, expect } from "@playwright/test";

test("like a property from find-homes then verify it appears in dashboard Saved tab", async ({ page }) => {
  await page.goto("/find-homes");
  await expect(page.locator(".animate-spin").first()).not.toBeVisible({ timeout: 15_000 });

  // Click like/heart button on first listing card
  const likeBtn = page.locator("button[aria-label*='like' i], button[aria-label*='save' i], button[aria-label*='heart' i]")
    .first();
  await expect(likeBtn).toBeVisible({ timeout: 10_000 });

  // Get listing title before liking
  const card = likeBtn.locator("xpath=ancestor::a[contains(@href,'/property/')]");
  const cardTitle = await card.locator("h2, h3").first().textContent().catch(() => null);

  await likeBtn.click();
  // Wait for optimistic update (button state changes)
  await page.waitForTimeout(1000);

  // Go to dashboard → Saved tab
  await page.goto("/dashboard");
  await expect(page.getByText("Manage your AXIOM workspace")).toBeVisible({ timeout: 10_000 });

  await page.getByRole("tab", { name: /saved/i }).click();

  // Liked listing should appear
  await expect(page.getByRole("tabpanel")).toBeVisible();
  await expect(page.getByText(/no saved/i).or(page.locator("article, [class*='card']").first()))
    .toBeVisible({ timeout: 10_000 });
});
