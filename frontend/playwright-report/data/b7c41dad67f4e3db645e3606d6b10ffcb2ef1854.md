# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin\reject-listing.spec.ts >> admin can reject a pending listing and it does not appear in find-homes
- Location: tests\admin\reject-listing.spec.ts:3:5

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  getByText('Test Pending Listing for Rejection')
Expected: not visible
Received: visible
Timeout:  10000ms

Call log:
  - Expect "not toBeVisible" with timeout 10000ms
  - waiting for getByText('Test Pending Listing for Rejection')
    24 × locator resolved to <h3 class="line-clamp-2 text-[15px] font-black leading-snug text-white">Test Pending Listing for Rejection</h3>
       - unexpected value "visible"

```

```yaml
- heading "Test Pending Listing for Rejection" [level=3]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("admin can reject a pending listing and it does not appear in find-homes", async ({ page }) => {
  4  | 
  5  |   await page.goto("/login");
  6  |   await page.getByPlaceholder("name@example.com").fill("Testuser1@gmail.com");
  7  |   await page.getByPlaceholder("Password").fill("Testuser123");
  8  |   await page.locator('button[type="submit"]').click();
  9  |   await page.waitForURL("/dashboard", { timeout: 15_000 });
  10 | 
  11 | 
  12 |   // Create a pending listing as regular user
  13 |   await page.goto("/dashboard");
  14 |   await expect(
  15 |     page.getByRole("heading", { name: /manage your axiom workspace/i })
  16 |   ).toBeVisible({ timeout: 10_000 });
  17 | 
  18 |   await page.getByRole("button", { name: /add listing/i }).click();
  19 |   await expect(page.getByRole("heading", { name: /add new listing/i })).toBeVisible();
  20 | 
  21 |   const modal = page.getByRole("dialog");
  22 | 
  23 |   await modal.getByPlaceholder(/modern apartment/i).fill("Test Pending Listing for Rejection");
  24 |   await modal.getByPlaceholder(/enter property address/i).fill("456 Test Street, Cairo");
  25 |   await page.getByRole("button", { name: /details/i }).click();
  26 | 
  27 |   await modal.locator('input[type="number"]').first().fill("2");
  28 |   await modal.locator('input[type="number"]').nth(1).fill("1045670");
  29 |   await modal.locator('input[type="date"]').first().fill('2024-11-01');
  30 |   await page.getByRole("button", { name: /photos/i }).click();
  31 | 
  32 |   await page.getByRole("button", { name: /submit for review/i }).click();
  33 |   await expect(page.getByRole("heading", { name: /add new listing/i }))
  34 |     .not.toBeVisible({ timeout: 20_000 });
  35 | 
  36 |   // Login as admin
  37 |   await page.goto("/admin/login");
  38 |   await page.getByPlaceholder("Admin").fill("admin");
  39 |   await page.getByPlaceholder("••••••••").fill("axiom_admin_2026");
  40 |   await page.locator('button[type="submit"]').click();
  41 |   await page.waitForURL("/admin/dashboard", { timeout: 15_000 });
  42 | 
  43 |   await page.getByRole('button', { name: 'Pending Approvals' }).click();
  44 | 
  45 |   const pendingFilter = page.getByRole("button", { name: /pending/i })
  46 |     .or(page.getByText(/pending/i).first());
  47 |   if (await pendingFilter.isVisible({ timeout: 3_000 }).catch(() => false)) {
  48 |     await pendingFilter.click();
  49 |   }
  50 | 
  51 |   await expect(page.locator("table, [role='table']")).toBeVisible({ timeout: 10_000 });
  52 | 
  53 |   const pendingRow = page.locator("tr").filter({ hasText: /pending/i }).first();
  54 |   await expect(pendingRow).toBeVisible({ timeout: 10_000 });
  55 | 
  56 |   await pendingRow.getByRole("button", { name: /reject/i }).click();
  57 |   await page.getByPlaceholder("Reason…").fill("NONE");
  58 |   await pendingRow.getByRole("button", { name: /Cancel/i }).click();
  59 | 
  60 | 
  61 | 
  62 |   const confirmBtn = page.getByRole("button", { name: /confirm|yes/i });
  63 |   if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
  64 |     await confirmBtn.click();
  65 |   }
  66 | 
  67 |   await page.goto("/find-homes");
  68 |   await expect(page.locator(".animate-spin").first()).not.toBeVisible({ timeout: 15_000 });
  69 | 
> 70 |   await expect(page.getByText("Test Pending Listing for Rejection")).not.toBeVisible({ timeout: 10_000 });
     |                                                                          ^ Error: expect(locator).not.toBeVisible() failed
  71 | });
  72 | 
```