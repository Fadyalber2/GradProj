import { test, expect } from "@playwright/test";

test("pagination loads page 2 with different listings", async ({ page }) => {
  await page.goto("/find-homes");

  await expect(page.locator(".animate-spin").first()).not.toBeVisible({ timeout: 15_000 });

  // Grab first listing title on page 1
  const firstCardText = await page.locator("h2, h3").first().textContent();

  // Click page 2 button
  const page2Btn = page.getByRole("button", { name: "2" })
    .or(page.getByLabel("Page 2"))
    .first();

  if (!(await page2Btn.isVisible())) {
    test.skip(true, "Only 1 page of results — not enough listings to paginate");
  }

  await page2Btn.click();
  await expect(page.locator(".animate-spin").first()).not.toBeVisible({ timeout: 15_000 });

  // Page scrolls to top — first card should be different
  const newFirstCard = await page.locator("h2, h3").first().textContent();
  expect(newFirstCard).not.toEqual(firstCardText);
});
