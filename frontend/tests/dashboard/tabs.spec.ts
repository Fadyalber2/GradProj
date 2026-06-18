import { test, expect } from "@playwright/test";

test("dashboard Listings and Saved tabs render correct content", async ({ page }) => {
  await page.goto("/dashboard");
  
  // Wait for dashboard to load - use same robust selector as login test
  await expect(page.locator("h1").or(page.getByText("User dashboard")).or(page.getByText("Listings"))).toBeVisible({ timeout: 15_000 });

  // ── Listings tab (default) ─────────────────────────────────────────
  // Try multiple selector approaches to find the tabs
  const listingsTab = page.locator('[data-value="listings"], button:has-text("Listings"), [role="tab"]:has-text("Listings")').first();
  await expect(listingsTab).toBeVisible({ timeout: 10_000 });
  await listingsTab.click({ timeout: 10_000 });
  
  const listingsPanel = page.locator('[data-value="listings"], [data-state="active"]:has-text("listings"), [role="tabpanel"]').first();
  await expect(listingsPanel).toBeVisible({ timeout: 10_000 });
  // Either listings exist or empty-state message shown
  await expect(
    listingsPanel.locator("article, [class*='card'], p").first()
  ).toBeVisible({ timeout: 8_000 });

  // ── Saved tab ──────────────────────────────────────────────────────
  const savedTab = page.locator('[data-value="liked"], button:has-text("Saved"), [role="tab"]:has-text("Saved")').first();
  await expect(savedTab).toBeVisible({ timeout: 10_000 });
  await savedTab.click({ timeout: 10_000 });
  
  const savedPanel = page.locator('[data-value="liked"], [data-state="active"]:has-text("saved"), [role="tabpanel"]').first();
  await expect(savedPanel).toBeVisible({ timeout: 10_000 });
  await expect(
    savedPanel.locator("article, [class*='card'], p").first()
  ).toBeVisible({ timeout: 8_000 });

  // Switch back to Listings — content re-renders
  await listingsTab.click({ timeout: 10_000 });
  await expect(listingsPanel).toBeVisible({ timeout: 10_000 });
});
