# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pricing\start-trial.spec.ts >> free user can start 7-day Basic trial
- Location: tests\pricing\start-trial.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /basic/i })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: /basic/i })

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
  3  | test("free user can start 7-day Basic trial", async ({ page }) => {
  4  |   await page.goto("/pricing");
  5  | 
> 6  |   await expect(page.getByRole("heading", { name: /basic/i })).toBeVisible({ timeout: 10_000 });
     |                                                               ^ Error: expect(locator).toBeVisible() failed
  7  | 
  8  |   // Only visible when current plan is free and trial not yet used
  9  |   const trialBtn = page.getByRole("button", { name: /start 7.day basic trial/i });
  10 | 
  11 |   if (!(await trialBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
  12 |     test.skip(true, "Trial already used or user is not on free plan");
  13 |   }
  14 | 
  15 |   await trialBtn.click();
  16 | 
  17 |   // Button shows loading state
  18 |   await expect(page.getByText(/starting trial/i)).toBeVisible({ timeout: 5_000 });
  19 | 
  20 |   // After success: "Trial active" badge on Basic card
  21 |   await expect(
  22 |     page.getByText(/trial active/i)
  23 |   ).toBeVisible({ timeout: 15_000 });
  24 | });
  25 | 
```