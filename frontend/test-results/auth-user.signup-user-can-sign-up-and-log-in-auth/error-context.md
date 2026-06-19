# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\user.signup.spec.ts >> user can sign up and log in
- Location: tests\auth\user.signup.spec.ts:3:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - link "AXIOM" [ref=e4] [cursor=pointer]:
        - /url: /
    - main [ref=e5]:
      - main [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e8]:
            - generic [ref=e9]:
              - generic [ref=e10]: Explore AXIOM
              - heading "See the homes before you sign in." [level=1] [ref=e11]
              - paragraph [ref=e12]: The same listing cards, AI matches, and seller signals you will use inside the app.
            - generic [ref=e14]:
              - generic [ref=e15]:
                - generic [ref=e16]:
                  - paragraph [ref=e17]: Find homes preview
                  - paragraph [ref=e18]: Live listing surface
                - generic [ref=e19]: AI match
              - generic [ref=e20]:
                - generic [ref=e21]:
                  - generic [ref=e22]:
                    - img "Sunny apartment near Cairo Festival City" [ref=e23]
                    - generic [ref=e25]:
                      - generic [ref=e26]: NEW
                      - generic [ref=e27]: VERIFIED
                    - img [ref=e29]
                  - generic [ref=e31]:
                    - generic [ref=e32]:
                      - generic [ref=e33]:
                        - heading "Sunny apartment near Cairo Festival City" [level=3] [ref=e34]
                        - paragraph [ref=e35]:
                          - img [ref=e36]
                          - generic [ref=e39]: New Cairo, Cairo
                      - generic [ref=e40]:
                        - text: EGP 18,500
                        - generic [ref=e41]: /month
                    - generic [ref=e42]:
                      - generic [ref=e43]:
                        - img [ref=e44]
                        - text: 2 Beds
                      - generic [ref=e47]:
                        - img [ref=e48]
                        - text: 2 Baths
                      - generic [ref=e51]:
                        - img [ref=e52]
                        - text: 128 m2
                - generic [ref=e58]:
                  - generic [ref=e59]:
                    - generic [ref=e60]:
                      - img [ref=e61]
                      - text: Smart filters
                    - generic [ref=e64]:
                      - generic [ref=e65]: New Cairo
                      - generic [ref=e66]: Apartment
                      - generic [ref=e67]: 2 bedrooms
                  - generic [ref=e68]:
                    - generic [ref=e69]:
                      - img [ref=e70]
                      - text: AI fit
                    - paragraph [ref=e73]: "91"
                    - paragraph [ref=e74]: matches your search pattern
                  - generic [ref=e75]:
                    - generic [ref=e76]:
                      - img [ref=e77]
                      - text: Property detail
                    - paragraph [ref=e80]: Opens into the same property page with photos, map, saved homes, and owner contact.
          - generic [ref=e82]:
            - generic [ref=e83]:
              - generic [ref=e84]:
                - paragraph [ref=e85]: AXIOM
                - heading "Create your account" [level=1] [ref=e86]
                - paragraph [ref=e87]: One profile for listings, saved searches, and recommendations.
              - img [ref=e89]
            - generic [ref=e92]: Email already registered
            - generic [ref=e93]:
              - generic [ref=e94]:
                - generic [ref=e95]: Full Name
                - textbox "Full Name" [ref=e96]:
                  - /placeholder: Ahmed Mohamed
                  - text: Test User
              - generic [ref=e97]:
                - generic [ref=e98]: Email Address
                - textbox "Email Address" [ref=e99]:
                  - /placeholder: name@example.com
                  - text: testuser1781833502096@gmail.com
              - generic [ref=e100]:
                - generic [ref=e101]: Gender *
                - generic [ref=e102]:
                  - generic [ref=e103] [cursor=pointer]:
                    - generic [ref=e104]: Male
                    - radio "Male" [checked] [ref=e105]
                    - img [ref=e106]
                  - generic [ref=e108] [cursor=pointer]:
                    - generic [ref=e109]: Female
                    - radio "Female" [ref=e110]
              - generic [ref=e111]:
                - generic [ref=e112]:
                  - generic [ref=e113]: Password
                  - generic [ref=e114]:
                    - textbox "Password" [ref=e115]: Testuser123
                    - button "Show password" [ref=e116]:
                      - img [ref=e117]
                  - paragraph [ref=e125]: Strong
                - generic [ref=e126]:
                  - generic [ref=e127]: Confirm Password
                  - generic [ref=e128]:
                    - textbox "Confirm Password" [ref=e129]:
                      - /placeholder: Confirm
                      - text: Testuser123
                    - button "Show password" [ref=e130]:
                      - img [ref=e131]
              - generic [ref=e134]:
                - generic [ref=e135]: Phone Number *
                - generic [ref=e136]:
                  - combobox [ref=e137]:
                    - option "+20" [selected]
                    - option "+1"
                    - option "+44"
                    - option "+971"
                  - textbox "Phone Number *" [ref=e138]:
                    - /placeholder: 01X XXXX XXXX
                    - text: "01012345678"
              - generic [ref=e140] [cursor=pointer]:
                - checkbox "I agree to the Terms of Service and Privacy Policy" [checked] [ref=e141]
                - generic [ref=e142]:
                  - text: I agree to the
                  - link "Terms of Service" [ref=e143]:
                    - /url: /terms
                  - text: and
                  - link "Privacy Policy" [ref=e144]:
                    - /url: /privacy
              - button "Sign Up" [ref=e146]:
                - text: Sign Up
                - img [ref=e147]
            - generic [ref=e153]: Or continue with
            - generic [ref=e154]:
              - button "Google" [ref=e155]:
                - img [ref=e157]
                - text: Google
              - button "Facebook" [ref=e162]:
                - img [ref=e164]
                - text: Facebook
            - paragraph [ref=e167]:
              - text: Already have an account?
              - link "Sign In" [ref=e168] [cursor=pointer]:
                - /url: /login
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e174] [cursor=pointer]:
    - img [ref=e175]
  - alert [ref=e178]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("user can sign up and log in", async ({ page }) => {
  4  |   const timestamp = Date.now();
  5  |   const testEmail = `testuser${timestamp}@gmail.com`;
  6  |   const testPassword = "Testuser123";
  7  | 
  8  |   await page.goto("/signup");
  9  | 
  10 |   await page.getByRole('textbox', { name: 'Full Name' }).fill("Test User");
  11 |   await page.getByLabel(/email/i).fill(testEmail);
  12 |   await page.getByRole('textbox', { name: 'Phone Number *' }).fill("01012345678");
  13 |   await page.locator('label').filter({ hasText: /^Male$/ }).click();
  14 |   // Use id selector — getByLabel(/password/i) also matches aria-label="Show password" buttons
  15 |   await page.locator("#signup-password").fill(testPassword);
  16 |   await page.locator("#confirm-password").fill(testPassword);
  17 |   await page.getByRole('checkbox', { name: 'I agree to the Terms of' }).click();
  18 | 
  19 |   await page.getByRole("button", { name: /sign up|create account/i }).click();
  20 | 
> 21 |   await page.waitForURL(/\/(login|dashboard)/, { timeout: 15_000 });
     |              ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  22 | 
  23 |   if (page.url().includes("/login")) {
  24 |     await page.getByLabel("Email Address").fill(testEmail);
  25 |     await page.locator('input[name="password"]').fill(testPassword);
  26 |     await page.getByRole("button", { name: "Log In" }).click();
  27 |     await page.waitForURL("/dashboard", { timeout: 15_000 });
  28 |   }
  29 | 
  30 |   await expect(
  31 |     page.getByRole("heading", { name: /manage your axiom workspace/i })
  32 |   ).toBeVisible({ timeout: 10_000 });
  33 |   expect(page.url()).toContain("/dashboard");
  34 | });
  35 | 
```