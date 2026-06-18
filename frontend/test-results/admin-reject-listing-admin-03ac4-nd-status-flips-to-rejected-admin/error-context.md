# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin\reject-listing.spec.ts >> admin can reject a pending listing and status flips to rejected
- Location: tests\admin\reject-listing.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Manage your AXIOM workspace')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('Manage your AXIOM workspace')

```

```yaml
- banner:
  - link "AXIOM":
    - /url: /
- main:
  - main:
    - text: Return to AXIOM
    - heading "Your search is already waiting." [level=1]
    - paragraph: Jump back into saved homes, listing replies, and the dashboard view you already use.
    - paragraph: Dashboard preview
    - paragraph: Saved homes
    - text: 2 saved
    - img "Garden studio"
    - paragraph: Garden studio
    - paragraph: Maadi
    - paragraph: EGP 11,200
    - img "Shared room"
    - paragraph: Shared room
    - paragraph: Nasr City
    - paragraph: EGP 5,800
    - paragraph: Saved
    - paragraph: "12"
    - paragraph: homes in dashboard
    - text: Activity Saved home updated Lead captured Application pending
    - paragraph: AXIOM
    - heading "Welcome back" [level=1]
    - paragraph: Sign in to open your dashboard, listings, and saved homes.
    - button "Email"
    - button "Phone"
    - text: Email Address
    - textbox "Email Address":
      - /placeholder: name@example.com
    - text: Password
    - textbox "Password"
    - button "Show password"
    - checkbox "Remember Me"
    - text: Remember Me
    - link "Forgot Password?":
      - /url: /forgot-password
    - button "Log In"
    - text: Or continue with
    - button "Google":
      - img
      - text: Google
    - button "Facebook":
      - img
      - text: Facebook
    - paragraph:
      - text: Don't have an account?
      - link "Sign Up":
        - /url: /signup
- region "Notifications alt+T"
- alert: Log In — Axiom
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("admin can reject a pending listing and status flips to rejected", async ({ page }) => {
  4  |   // First create a pending listing as a regular user
  5  |   await page.goto("/dashboard");
> 6  |   await expect(page.getByText("Manage your AXIOM workspace")).toBeVisible({ timeout: 10_000 });
     |                                                               ^ Error: expect(locator).toBeVisible() failed
  7  | 
  8  |   // Open modal and create a simple pending listing
  9  |   await page.getByRole("button", { name: /add listing/i }).click();
  10 |   await expect(page.getByRole("heading", { name: /add new listing/i })).toBeVisible();
  11 | 
  12 |   // Fill basic listing info
  13 |   await page.getByLabel(/listing name|title/i).fill("Test Pending Listing for Rejection");
  14 |   await page.getByLabel(/address/i).fill("456 Test Street, Cairo");
  15 |   await page.getByRole("button", { name: /next|continue|details/i }).click();
  16 | 
  17 |   // Fill details
  18 |   await page.getByLabel(/price/i).fill("9000");
  19 |   await page.getByLabel(/size/i).fill("110");
  20 |   await page.getByRole("button", { name: /next|photos/i }).click();
  21 | 
  22 |   // Submit for review
  23 |   await page.getByRole("button", { name: /submit for review/i }).click();
  24 |   await expect(page.getByRole("heading", { name: /add new listing/i }))
  25 |     .not.toBeVisible({ timeout: 20_000 });
  26 | 
  27 |   // Now login as admin and reject the listing
  28 |   await page.goto("/admin/login");
  29 |   await page.getByPlaceholder("Admin").fill(process.env.TEST_ADMIN_USERNAME!);
  30 |   await page.getByPlaceholder("••••••••").fill(process.env.TEST_ADMIN_PASSWORD!);
  31 |   await page.getByRole("button", { name: "Sign In" }).click();
  32 |   await page.waitForURL("/admin/dashboard", { timeout: 15_000 });
  33 | 
  34 |   await page.getByRole("link", { name: /listings/i })
  35 |     .or(page.getByRole("button", { name: /listings/i }))
  36 |     .first()
  37 |     .click();
  38 | 
  39 |   const pendingFilter = page.getByRole("button", { name: /pending/i })
  40 |     .or(page.getByText(/pending/i).first());
  41 |   if (await pendingFilter.isVisible({ timeout: 3_000 }).catch(() => false)) {
  42 |     await pendingFilter.click();
  43 |   }
  44 | 
  45 |   await expect(page.locator("table, [role='table']")).toBeVisible({ timeout: 10_000 });
  46 | 
  47 |   const pendingRow = page.locator("tr").filter({ hasText: /pending/i }).first();
  48 |   await expect(pendingRow).toBeVisible({ timeout: 10_000 });
  49 | 
  50 |   await pendingRow.getByRole("button", { name: /reject/i }).click();
  51 | 
  52 |   const confirmBtn = page.getByRole("button", { name: /confirm|yes/i });
  53 |   if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
  54 |     await confirmBtn.click();
  55 |   }
  56 | 
  57 |   await expect(
  58 |     pendingRow.getByText(/rejected/i).or(page.getByText(/rejected/i))
  59 |   ).toBeVisible({ timeout: 10_000 });
  60 | });
  61 | 
```