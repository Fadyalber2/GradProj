# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin\admin-login.spec.ts >> admin login with valid credentials redirects to admin dashboard
- Location: tests\admin\admin-login.spec.ts:4:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Sign In' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - complementary [ref=e5]:
        - generic [ref=e7]:
          - img [ref=e9]
          - generic [ref=e12]:
            - generic [ref=e13]:
              - generic [ref=e14]: AXIOM
              - generic [ref=e15]: Admin
            - paragraph [ref=e16]: Live operations
        - navigation [ref=e17]:
          - generic [ref=e18]:
            - paragraph [ref=e19]: Overview
            - button "Dashboard" [ref=e21]:
              - img [ref=e22]
              - generic [ref=e27]: Dashboard
          - generic [ref=e28]:
            - paragraph [ref=e29]: People
            - button "Users" [ref=e31]:
              - img [ref=e32]
              - generic [ref=e37]: Users
          - generic [ref=e38]:
            - paragraph [ref=e39]: Properties
            - generic [ref=e40]:
              - button "Listings" [ref=e41]:
                - img [ref=e42]
                - generic [ref=e45]: Listings
              - button "Pending Approvals" [ref=e46]:
                - img [ref=e47]
                - generic [ref=e50]: Pending Approvals
              - button "Projects" [ref=e52]:
                - img [ref=e53]
                - generic [ref=e55]: Projects
          - generic [ref=e56]:
            - paragraph [ref=e57]: Business
            - generic [ref=e58]:
              - button "Agencies" [ref=e59]:
                - img [ref=e60]
                - generic [ref=e64]: Agencies
              - button "Universities" [ref=e65]:
                - img [ref=e66]
                - generic [ref=e69]: Universities
              - button "Leads" [ref=e70]:
                - img [ref=e71]
                - generic [ref=e75]: Leads
          - generic [ref=e76]:
            - paragraph [ref=e77]: Content
            - button "Blog Posts" [ref=e79]:
              - img [ref=e80]
              - generic [ref=e83]: Blog Posts
          - generic [ref=e84]:
            - paragraph [ref=e85]: Moderation
            - button "Fraud Queue" [ref=e87]:
              - img [ref=e88]
              - generic [ref=e90]: Fraud Queue
        - generic [ref=e92]:
          - generic [ref=e93]:
            - generic [ref=e94]: A
            - generic [ref=e95]:
              - paragraph [ref=e96]: Admin
              - paragraph [ref=e97]: Super Admin
          - button "Sign Out" [ref=e98]:
            - img [ref=e99]
            - text: Sign Out
    - main [ref=e102]:
      - generic [ref=e103]:
        - generic [ref=e104]:
          - generic [ref=e106]: Admin
          - heading "Dashboard Overview" [level=1] [ref=e107]
        - generic [ref=e108]:
          - generic [ref=e109]:
            - paragraph [ref=e110]: Logged in as
            - paragraph [ref=e111]: Super Admin
          - generic [ref=e112]: A
      - generic [ref=e114]:
        - generic [ref=e115]:
          - paragraph [ref=e116]: Live database
          - heading "Platform control room" [level=2] [ref=e117]
          - paragraph [ref=e118]: A current snapshot of listings, moderation queues, leads, and content moving through AXIOM.
        - generic [ref=e119]:
          - button "Total Users 17" [ref=e120]:
            - generic [ref=e121]:
              - img [ref=e124]
              - generic [ref=e129]:
                - paragraph [ref=e130]: Total Users
                - paragraph [ref=e131]: "17"
              - img [ref=e132]
          - button "Active Listings 115" [ref=e134]:
            - generic [ref=e135]:
              - img [ref=e138]
              - generic [ref=e141]:
                - paragraph [ref=e142]: Active Listings
                - paragraph [ref=e143]: "115"
              - img [ref=e144]
          - button "Pending Review 1" [ref=e146]:
            - generic [ref=e147]:
              - img [ref=e150]
              - generic [ref=e153]:
                - paragraph [ref=e154]: Pending Review
                - paragraph [ref=e155]: "1"
              - img [ref=e156]
          - button "Flagged Fraud 0" [ref=e158]:
            - generic [ref=e159]:
              - img [ref=e162]
              - generic [ref=e164]:
                - paragraph [ref=e165]: Flagged Fraud
                - paragraph [ref=e166]: "0"
              - img [ref=e167]
          - button "Agencies 21" [ref=e169]:
            - generic [ref=e170]:
              - img [ref=e173]
              - generic [ref=e177]:
                - paragraph [ref=e178]: Agencies
                - paragraph [ref=e179]: "21"
              - img [ref=e180]
          - button "Leads 16" [ref=e182]:
            - generic [ref=e183]:
              - img [ref=e186]
              - generic [ref=e189]:
                - paragraph [ref=e190]: Leads
                - paragraph [ref=e191]: "16"
              - img [ref=e192]
          - button "Shared Housing 33" [ref=e194]:
            - generic [ref=e195]:
              - img [ref=e198]
              - generic [ref=e201]:
                - paragraph [ref=e202]: Shared Housing
                - paragraph [ref=e203]: "33"
              - img [ref=e204]
        - generic [ref=e206]:
          - heading "Priority queues" [level=3] [ref=e207]
          - generic [ref=e208]:
            - button "Manage Users" [ref=e209]:
              - img [ref=e210]
              - generic [ref=e215]: Manage Users
            - button "Review Listings" [ref=e216]:
              - img [ref=e217]
              - generic [ref=e220]: Review Listings
            - button "Fraud Queue" [ref=e221]:
              - img [ref=e222]
              - generic [ref=e224]: Fraud Queue
  - button "Open AI chat" [ref=e227]:
    - img [ref=e229]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e237] [cursor=pointer]:
    - img [ref=e238]
  - alert [ref=e241]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | // Runs without storageState — tests the login itself
  4  | test("admin login with valid credentials redirects to admin dashboard", async ({ page }) => {
  5  |   await page.goto("/admin/login");
  6  | 
  7  |   await expect(page.getByText("Admin Panel")).toBeVisible();
  8  | 
  9  |   await page.getByPlaceholder("Admin").fill(process.env.TEST_ADMIN_USERNAME!);
  10 |   await page.getByPlaceholder("••••••••").fill(process.env.TEST_ADMIN_PASSWORD!);
  11 |   
  12 |   // Use Promise.all to handle navigation and button click race condition
  13 |   await Promise.all([
  14 |     page.waitForURL("/admin/dashboard", { timeout: 15_000 }),
> 15 |     page.getByRole("button", { name: "Sign In" }).click()
     |                                                   ^ Error: locator.click: Test timeout of 30000ms exceeded.
  16 |   ]);
  17 |   
  18 |   await expect(page.getByText(/admin|dashboard/i).first()).toBeVisible();
  19 | });
  20 | 
  21 | test("admin login with wrong password shows error", async ({ page }) => {
  22 |   await page.goto("/admin/login");
  23 | 
  24 |   await page.getByPlaceholder("Admin").fill("admin");
  25 |   await page.getByPlaceholder("••••••••").fill("wrongpassword");
  26 |   
  27 |   // Click the button and wait for error message
  28 |   await page.getByRole("button", { name: "Sign In" }).click();
  29 |   
  30 |   await expect(page.getByText(/failed|invalid|incorrect/i)).toBeVisible({ timeout: 8_000 });
  31 |   expect(page.url()).not.toContain("/admin/dashboard");
  32 | });
  33 | 
```