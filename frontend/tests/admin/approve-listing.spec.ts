import { test, expect } from "@playwright/test";

test("admin can approve a pending listing and status flips to active", async ({ page }) => {
  // First create a pending listing as a regular user
  await page.goto("/dashboard");
  await expect(page.getByText("Manage your AXIOM workspace")).toBeVisible({ timeout: 10_000 });

  // Open modal and create a simple pending listing
  await page.getByRole("button", { name: /add listing/i }).click();
  await expect(page.getByRole("heading", { name: /add new listing/i })).toBeVisible();

  // Fill basic listing info
  await page.getByLabel(/listing name|title/i).fill("Test Pending Listing for Approval");
  await page.getByLabel(/address/i).fill("123 Test Street, Cairo");
  await page.getByRole("button", { name: /next|continue|details/i }).click();

  // Fill details
  await page.getByLabel(/price/i).fill("8000");
  await page.getByLabel(/size/i).fill("100");
  await page.getByRole("button", { name: /next|photos/i }).click();

  // Submit for review
  await page.getByRole("button", { name: /submit for review/i }).click();
  await expect(page.getByRole("heading", { name: /add new listing/i }))
    .not.toBeVisible({ timeout: 20_000 });

  // Now login as admin and approve the listing
  await page.goto("/admin/login");
  await page.getByPlaceholder("Admin").fill(process.env.TEST_ADMIN_USERNAME!);
  await page.getByPlaceholder("••••••••").fill(process.env.TEST_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/admin/dashboard", { timeout: 15_000 });

  // Navigate to Listings section in admin sidebar
  await page.getByRole("link", { name: /listings/i })
    .or(page.getByRole("button", { name: /listings/i }))
    .first()
    .click();

  // Filter to show only pending listings
  const pendingFilter = page.getByRole("button", { name: /pending/i })
    .or(page.getByText(/pending/i).first());
  if (await pendingFilter.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await pendingFilter.click();
  }

  // Wait for table to load
  await expect(page.locator("table, [role='table']")).toBeVisible({ timeout: 10_000 });

  // Find first pending listing row
  const pendingRow = page.locator("tr").filter({ hasText: /pending/i }).first();
  await expect(pendingRow).toBeVisible({ timeout: 10_000 });

  // Click Approve button in that row
  await pendingRow.getByRole("button", { name: /approve/i }).click();

  // Confirm dialog if present
  const confirmBtn = page.getByRole("button", { name: /confirm|yes/i });
  if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await confirmBtn.click();
  }

  // Row status should flip to active
  await expect(
    pendingRow.getByText(/active/i).or(page.getByText(/approved/i))
  ).toBeVisible({ timeout: 10_000 });
});
