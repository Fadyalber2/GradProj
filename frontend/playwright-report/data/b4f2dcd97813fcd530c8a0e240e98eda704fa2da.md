# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pricing\upgrade.spec.ts >> clicking Upgrade on Basic triggers Stripe checkout redirect
- Location: tests\pricing\upgrade.spec.ts:3:5

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
  3  | test("clicking Upgrade on Basic triggers Stripe checkout redirect", async ({ page }) => {
  4  |   // Intercept checkout API — return fake Stripe URL so test stays local
  5  |   await page.route("**/api/subscriptions/checkout", async (route) => {
  6  |     await route.fulfill({
  7  |       status: 200,
  8  |       contentType: "application/json",
  9  |       body: JSON.stringify({ checkout_url: "https://checkout.stripe.com/test-session-xyz" }),
  10 |     });
  11 |   });
  12 | 
  13 |   // Track where the page tries to navigate
  14 |   let stripeRedirectUrl = "";
  15 |   page.on("request", (req) => {
  16 |     if (req.url().includes("stripe.com")) stripeRedirectUrl = req.url();
  17 |   });
  18 | 
  19 |   // Block the actual Stripe navigation so the test browser doesn't leave
  20 |   await page.route("https://checkout.stripe.com/**", (route) => route.abort());
  21 | 
  22 |   await page.goto("/pricing");
> 23 |   await expect(page.getByRole("heading", { name: /basic/i })).toBeVisible({ timeout: 10_000 });
     |                                                               ^ Error: expect(locator).toBeVisible() failed
  24 | 
  25 |   // Find and click Upgrade on Basic card
  26 |   const basicCard = page.getByRole("article").filter({ hasText: /best owner fit/i });
  27 |   const upgradeBtn = basicCard.getByRole("button", { name: /upgrade/i });
  28 |   await expect(upgradeBtn).toBeVisible();
  29 |   await upgradeBtn.click();
  30 | 
  31 |   // Button shows "Redirecting..." loading state
  32 |   await expect(basicCard.getByText(/redirecting/i)).toBeVisible({ timeout: 5_000 });
  33 | 
  34 |   // API was called and redirect to Stripe was attempted
  35 |   await page.waitForTimeout(2000);
  36 |   expect(stripeRedirectUrl).toContain("checkout.stripe.com");
  37 | });
  38 | 
```