# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pricing\upgrade.spec.ts >> upgrade to PRO plan via Stripe and verify Current plan PRO
- Location: tests\pricing\upgrade.spec.ts:3:5

# Error details

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for getByRole('button', { name: 'Log In' })
    - locator resolved to <button type="submit" class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(255,90,60,0.22)] transition-[background-color,box-shadow,transform,opacity] duration-150 ease-out hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
      - waiting 100ms

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
> 20 |   await page.getByRole("button", { name: "Log In" }).click();
     |                                                      ^ Error: locator.click: Target page, context or browser has been closed
  21 |   await page.waitForURL("/dashboard", { timeout: 15_000 });
  22 | 
  23 |   await page.goto("/pricing");
  24 | 
  25 |   // Wait for plan cards (articles) to appear — skeleton has no articles
  26 |   await expect(page.locator("article").first()).toBeVisible({ timeout: 30_000 });
  27 |   await expect(page.getByRole("heading", { level: 2, name: /basic/i })).toBeVisible();
  28 | 
  29 |   const upgradeBtn = page.getByRole("button", { name: /upgrade/i }).first();
  30 |   await expect(upgradeBtn).toBeVisible();
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