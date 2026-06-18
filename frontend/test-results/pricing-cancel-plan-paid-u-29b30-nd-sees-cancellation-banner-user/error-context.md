# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pricing\cancel-plan.spec.ts >> paid user can cancel plan and sees cancellation banner
- Location: tests\pricing\cancel-plan.spec.ts:5:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /basic|pro/i }).first()
Expected: visible
Timeout: 25000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 25000ms
  - waiting for getByRole('heading', { name: /basic|pro/i }).first()

```

```yaml
- navigation:
  - link "AXIOM":
    - /url: /
  - link "Find Homes":
    - /url: /find-homes
  - link "Shared Housing":
    - /url: /find-homes?category=shared_housing
  - link "Agencies":
    - /url: /agencies
  - link "Pricing":
    - /url: /pricing
  - link "Blog":
    - /url: /blog
  - link "About Us":
    - /url: /about
  - textbox "Search city, neighborhood..."
  - link "Log In":
    - /url: /login
  - link "Sign Up":
    - /url: /signup
- main
- contentinfo:
  - link "AXIOM":
    - /url: /
  - paragraph: The first AI-powered real estate platform in Egypt designed for compatibility and trust. Find your vibe today.
  - link "Facebook":
    - /url: "#"
    - img
  - link "Instagram":
    - /url: "#"
    - img
  - link "Twitter":
    - /url: "#"
    - img
  - link "LinkedIn":
    - /url: "#"
    - img
  - heading "Quick Links" [level=3]
  - list:
    - listitem:
      - link "Home":
        - /url: /
    - listitem:
      - link "Search Listings":
        - /url: /find-homes
    - listitem:
      - link "Agencies":
        - /url: /agencies
    - listitem:
      - link "About Us":
        - /url: /about
    - listitem:
      - link "Blog":
        - /url: /blog
    - listitem:
      - link "Contact":
        - /url: /contact
  - heading "Legal" [level=3]
  - list:
    - listitem:
      - link "Terms & Conditions":
        - /url: /terms
    - listitem:
      - link "Privacy Policy":
        - /url: /privacy
    - listitem:
      - link "Cookie Policy":
        - /url: /cookies
    - listitem:
      - link "Fraud Prevention":
        - /url: /fraud-prevention
  - heading "Newsletter" [level=3]
  - paragraph: Subscribe to get the latest market trends and vibe checks.
  - textbox "Your email"
  - button
  - paragraph: © 2024 Axiom Platform. All rights reserved.
  - text: +20 100 000 0000 Cairo, Egypt
- button "Open AI chat"
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | // This test needs a paid-plan user — set TEST_PAID_USER_* in .env.test
  4  | // If using the same user account, ensure it has an active basic/pro subscription
  5  | test("paid user can cancel plan and sees cancellation banner", async ({ page, context }) => {
  6  |   // If paid user is a different account, login separately
  7  |   const paidEmail    = process.env.TEST_PAID_USER_EMAIL;
  8  |   const paidPassword = process.env.TEST_PAID_USER_PASSWORD;
  9  | 
  10 |   if (paidEmail && paidPassword) {
  11 |     // Clear session and login as paid user
  12 |     await context.clearCookies();
  13 |     await page.goto("/login");
  14 |     await page.getByLabel("Email Address").fill(paidEmail);
  15 |     await page.locator('input[name="password"]').fill(paidPassword);
  16 |     await page.getByRole("button", { name: "Log In" }).click();
  17 |     await page.waitForURL("/dashboard", { timeout: 15_000 });
  18 |   }
  19 | 
  20 |   await page.goto("/pricing");
> 21 |   await expect(page.getByRole("heading", { name: /basic|pro/i }).first()).toBeVisible({ timeout: 25_000 });
     |                                                                           ^ Error: expect(locator).toBeVisible() failed
  22 | 
  23 |   const cancelBtn = page.getByRole("button", { name: /cancel plan/i });
  24 | 
  25 |   if (!(await cancelBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
  26 |     test.skip(true, "No paid plan active — skipping cancel test");
  27 |   }
  28 | 
  29 |   await cancelBtn.click();
  30 | 
  31 |   // Cancellation scheduled banner appears
  32 |   await expect(
  33 |     page.getByText(/cancellation scheduled|stays active until/i)
  34 |   ).toBeVisible({ timeout: 15_000 });
  35 | });
  36 | 
```