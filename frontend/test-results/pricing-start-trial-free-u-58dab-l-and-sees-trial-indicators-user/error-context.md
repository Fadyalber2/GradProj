# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pricing\start-trial.spec.ts >> free user can start 7-day Basic trial and sees trial indicators
- Location: tests\pricing\start-trial.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('article').first()
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for locator('article').first()

```

```yaml
- navigation:
  - link "AXIOM":
    - /url: /
  - link "Home":
    - /url: /
  - link "Find Homes":
    - /url: /find-homes
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
  - heading "Legal" [level=3]
  - list:
    - listitem: Terms & Conditions
    - listitem: Privacy Policy
    - listitem: Cookie Policy
    - listitem: Fraud Prevention
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
  3  | test("free user can start 7-day Basic trial and sees trial indicators", async ({ page }) => {
  4  |   await page.goto("/login");
  5  | 
  6  |   await page.getByLabel("Email Address").fill("Testuser1@gmail.com");
  7  |   await page.locator('input[name="password"]').fill("Testuser123");
  8  |   await page.getByRole("button", { name: "Log In" }).click();
  9  | 
  10 |   await page.waitForURL("/dashboard", { timeout: 15_000 });
  11 | 
  12 |   // Dashboard heading confirms the page rendered
  13 |   await expect(
  14 |     page.getByRole("heading", { name: "Manage your AXIOM workspace." })
  15 |   ).toBeVisible({ timeout: 15_000 });
  16 | 
  17 |   await page.goto("/login");
  18 |   await page.getByLabel("Email Address").fill("Testuser1@gmail.com");
  19 |   await page.locator('input[name="password"]').fill("Testuser123");
  20 |   await page.getByRole("button", { name: "Log In" }).click();
  21 |   await page.waitForURL("/dashboard", { timeout: 15_000 });
  22 | 
  23 |   await page.goto("/pricing");
  24 | 
  25 |   // Plan cards are <article> elements — wait for them to appear (isLoading skeleton has no articles)
> 26 |   await expect(page.locator("article").first()).toBeVisible({ timeout: 30_000 });
     |                                                 ^ Error: expect(locator).toBeVisible() failed
  27 |   await expect(page.getByRole("heading", { level: 2, name: /basic/i })).toBeVisible();
  28 | 
  29 |   const trialBtn = page.getByRole("button", { name: /start 7.day basic trial/i });
  30 | 
  31 |   if (!(await trialBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
  32 |     test.skip(true, "Trial already used or user is not on free plan");
  33 |   }
  34 | 
  35 |   await trialBtn.click();
  36 | 
  37 |   await expect(page.getByText(/starting trial/i)).toBeVisible({ timeout: 5_000 });
  38 |   await expect(page.getByText(/trial active/i)).toBeVisible({ timeout: 15_000 });
  39 |   await expect(page.getByText(/current plan trial/i)).toBeVisible({ timeout: 15_000 });
  40 | });
  41 | 
```