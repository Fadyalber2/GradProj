# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pricing\upgrade.spec.ts >> upgrade to PRO plan via Stripe and verify Current plan PRO
- Location: tests\pricing\upgrade.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /upgrade/i }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /upgrade/i }).first()

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
  - button "Testuser1 Testuser1 Pro":
    - img "Testuser1"
    - text: Testuser1 Pro
- main:
  - text: Owner pricing
  - heading "Pay for the selling motion you actually use." [level=1]
  - paragraph: Start with one listing, then scale into AI descriptions, stronger placement, and portfolio reporting when your inventory needs it.
  - complementary:
    - paragraph: Current plan
    - paragraph: pro
    - text: Active listings 15/20 AI descriptions used 1/50 AI remaining 49 Renewal Jul 17, 2026
    - button "Cancel plan"
  - article:
    - paragraph: First listing
    - heading "Free" [level=2]
    - paragraph: Free
    - paragraph: Publish one property and learn how AXIOM demand behaves.
    - term: Listings
    - definition: "1"
    - term: AI quota
    - definition: None
    - list:
      - listitem: 1 active listing
      - listitem: Standard visibility
      - listitem: Manual listing copy
    - text: Included in pro
  - article:
    - paragraph: Best owner fit
    - heading "Basic" [level=2]
    - text: 199 EGP per month
    - paragraph: For active owners who want stronger placement and AI support.
    - term: Listings
    - definition: "5"
    - term: AI quota
    - definition: "10"
    - list:
      - listitem: 5 active listings
      - listitem: 10 AI descriptions each month
      - listitem: Priority listing placement
      - listitem: Email support
    - text: Included in pro
  - article:
    - paragraph: Portfolio scale
    - heading "Pro" [level=2]
    - text: 499 EGP per month
    - paragraph: For teams managing multiple homes, rooms, and buyer leads.
    - term: Listings
    - definition: "20"
    - term: AI quota
    - definition: "50"
    - list:
      - listitem: 20 active listings
      - listitem: 50 AI descriptions each month
      - listitem: Featured listing slots
      - listitem: Analytics dashboard
      - listitem: Priority support
    - text: Active plan
  - paragraph: Agency plan
  - paragraph: For developers and agencies that need unlimited inventory, a dedicated account manager, custom integrations, and SLA support.
  - link "Contact us":
    - /url: mailto:hello@axiom.eg?subject=Agency%20Plan%20Enquiry
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
  3  | test("upgrade to PRO plan via Stripe and verify Current plan PRO", async ({ page }) => {
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
  25 |   // Wait for plan cards (articles) to appear — skeleton has no articles
  26 |   await expect(page.locator("article").first()).toBeVisible({ timeout: 30_000 });
  27 |   await expect(page.getByRole("heading", { level: 2, name: /basic/i })).toBeVisible();
  28 | 
  29 |   const upgradeBtn = page.getByRole("button", { name: /upgrade/i }).first();
> 30 |   await expect(upgradeBtn).toBeVisible();
     |                            ^ Error: expect(locator).toBeVisible() failed
  31 |   await upgradeBtn.click();
  32 | 
  33 |   await page.waitForURL(/stripe/, { timeout: 15_000 });
  34 | 
  35 |   const emailInput = page.locator("input[type='email']").or(page.getByLabel(/email/i)).first();
  36 |   if (await emailInput.isVisible({ timeout: 5_000 })) {
  37 |     await emailInput.fill("Testuser1@gmail.com");
  38 |   }
  39 | 
  40 |   const cardInput = page.locator("input[name='cardnumber'], input[placeholder*='4242']").or(page.getByLabel(/card number/i)).first();
  41 |   if (await cardInput.isVisible({ timeout: 5_000 })) {
  42 |     await cardInput.fill("4242424242424242");
  43 |   }
  44 | 
  45 |   const expiryInput = page.locator("input[name='exp-date'], input[placeholder*='MM/YY']").or(page.getByLabel(/expiry/i)).first();
  46 |   if (await expiryInput.isVisible({ timeout: 5_000 })) {
  47 |     await expiryInput.fill("12/59");
  48 |   }
  49 | 
  50 |   const cvcInput = page.locator("input[name='cvc'], input[placeholder*='CVC']").or(page.getByLabel(/cvc/i)).first();
  51 |   if (await cvcInput.isVisible({ timeout: 5_000 })) {
  52 |     await cvcInput.fill("123");
  53 |   }
  54 | 
  55 |   const nameInput = page.locator("input[name='cardholder'], input[placeholder*='name']").or(page.getByLabel(/name on card/i)).first();
  56 |   if (await nameInput.isVisible({ timeout: 5_000 })) {
  57 |     await nameInput.fill("TESTuser1");
  58 |   }
  59 | 
  60 |   const subscribeBtn = page.getByRole("button", { name: /subscribe|pay/i }).first();
  61 |   if (await subscribeBtn.isVisible({ timeout: 5_000 })) {
  62 |     await subscribeBtn.click();
  63 |   }
  64 | 
  65 |   await page.waitForURL("/dashboard", { timeout: 30_000 });
  66 |   expect(page.url()).toContain("/dashboard");
  67 | 
  68 |   await page.goto("/pricing");
  69 |   await expect(page.locator("article").first()).toBeVisible({ timeout: 30_000 });
  70 |   await expect(page.getByText(/current plan pro/i)).toBeVisible({ timeout: 15_000 });
  71 | });
  72 | 
```