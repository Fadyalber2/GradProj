# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard\tabs.spec.ts >> dashboard Listings and Saved tabs render correct content
- Location: tests\dashboard\tabs.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-value="listings"], [data-state="active"]:has-text("listings"), [role="tabpanel"]').first().locator('article, [class*=\'card\'], p').first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('[data-value="listings"], [data-state="active"]:has-text("listings"), [role="tabpanel"]').first().locator('article, [class*=\'card\'], p').first()

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
  - button "Testuser1 Testuser1":
    - img "Testuser1"
    - text: Testuser1
- text: User dashboard
- heading "Manage your AXIOM workspace." [level=1]
- paragraph: Testuser1, keep your profile, listing pipeline, and saved homes in one place.
- paragraph: Listings
- paragraph: "7"
- paragraph: Saved
- paragraph: "2"
- paragraph: Pending
- paragraph: "1"
- button "Add listing"
- button "Browse homes"
- img "Testuser1"
- heading "Testuser1" [level=2]
- paragraph: testuser1@gmail.com
- paragraph: Awl user on the website
- paragraph: "7"
- paragraph: Listings
- paragraph: "2"
- paragraph: Saved
- paragraph: "1"
- paragraph: Pending
- term: Contact
- definition: "01023221784"
- term: Gender
- definition: Male
- term: Age
- definition: 23 yrs
- term: Since
- definition: 28/03/2026
- paragraph: Profile settings
- heading "Keep account details current" [level=3]
- button "Edit info"
- text: Contact 01023221784 Gender Male Birth date 03/03/2003 Age 23 yrs Last updated 28/03/2026 Member since
- paragraph: 28/03/2026
- text: Account security
- button "Change password"
- text: 0%
- paragraph: Total Views
- paragraph: "12"
- text: Activity level 12 views 0%
- paragraph: Active Listings
- paragraph: "5"
- text: Portfolio depth 5 of 10 target 0%
- paragraph: Pending Approval
- paragraph: "1"
- text: Queue load 1 waiting 0%
- paragraph: Saved Properties
- paragraph: "2"
- text: Shortlist depth 2 saved
- tablist:
  - tab "Listings" [selected]
  - tab "Saved"
- tabpanel "Listings":
  - paragraph: Listing pipeline
  - heading "My Listings" [level=2]
  - paragraph: New listings require admin approval before going live.
  - button "Add New Listing"
  - table:
    - rowgroup:
      - row "Property Location Status Price Views Actions":
        - columnheader "Property"
        - columnheader "Location"
        - columnheader "Status"
        - columnheader "Price"
        - columnheader "Views"
        - columnheader "Actions"
    - rowgroup:
      - 'row "apartment in dokki ID: LIST-F08F4E tahrir square cairo egypt Pending Review EGP 1 0"':
        - 'cell "apartment in dokki ID: LIST-F08F4E"':
          - paragraph: apartment in dokki
          - paragraph: "ID: LIST-F08F4E"
        - cell "tahrir square cairo egypt"
        - cell "Pending Review"
        - cell "EGP 1"
        - cell "0"
        - cell:
          - button "Delete listing"
      - 'row "apartment in giza apartment in giza ID: LIST-F6710B giza,egypt Active EGP 6,000/month 0"':
        - 'cell "apartment in giza apartment in giza ID: LIST-F6710B"':
          - img "apartment in giza"
          - paragraph: apartment in giza
          - paragraph: "ID: LIST-F6710B"
        - cell "giza,egypt"
        - cell "Active"
        - cell "EGP 6,000/month"
        - cell "0"
        - cell:
          - button "Delete listing"
      - 'row "apartment near Ahram Canadian University apartment near Ahram Canadian University ID: LIST-3275E2 WVPM+FFF، 4th Industrial Zone, Banks Complex, 6th of October City (2), Giza Governorate 3222401 Active EGP 4,000/month 0"':
        - 'cell "apartment near Ahram Canadian University apartment near Ahram Canadian University ID: LIST-3275E2"':
          - img "apartment near Ahram Canadian University"
          - paragraph: apartment near Ahram Canadian University
          - paragraph: "ID: LIST-3275E2"
        - cell "WVPM+FFF، 4th Industrial Zone, Banks Complex, 6th of October City (2), Giza Governorate 3222401"
        - cell "Active"
        - cell "EGP 4,000/month"
        - cell "0"
        - cell:
          - button "Delete listing"
      - 'row "studio in New administrative capital studio in New administrative capital ID: LIST-893498 Triumphal arch,egypy Active EGP 25,000/month 0"':
        - 'cell "studio in New administrative capital studio in New administrative capital ID: LIST-893498"':
          - img "studio in New administrative capital"
          - paragraph: studio in New administrative capital
          - paragraph: "ID: LIST-893498"
        - cell "Triumphal arch,egypy"
        - cell "Active"
        - cell "EGP 25,000/month"
        - cell "0"
        - cell:
          - button "Delete listing"
      - 'row "Apartment in shoubra Apartment in shoubra ID: LIST-312F12 36MW+845, Shobra, Borham, El Sahel, Cairo Governorate 4352034 Draft EGP 2,000,000 0"':
        - 'cell "Apartment in shoubra Apartment in shoubra ID: LIST-312F12"':
          - img "Apartment in shoubra"
          - paragraph: Apartment in shoubra
          - paragraph: "ID: LIST-312F12"
        - cell "36MW+845, Shobra, Borham, El Sahel, Cairo Governorate 4352034"
        - cell "Draft"
        - cell "EGP 2,000,000"
        - cell "0"
        - cell:
          - button "Delete listing"
      - 'row "awsoma penthouse awsoma penthouse ID: LIST-C7F7A7 El-Gaish Rd, Sidi Gabir, Sidi Gaber, Alexandria Governorate 5434023 Active EGP 3,000,000 8"':
        - 'cell "awsoma penthouse awsoma penthouse ID: LIST-C7F7A7"':
          - img "awsoma penthouse"
          - paragraph: awsoma penthouse
          - paragraph: "ID: LIST-C7F7A7"
        - cell "El-Gaish Rd, Sidi Gabir, Sidi Gaber, Alexandria Governorate 5434023"
        - cell "Active"
        - cell "EGP 3,000,000"
        - cell "8"
        - cell:
          - button "Delete listing"
      - 'row "stunning villa stunning villa ID: LIST-010A74 6 of October, Giza ,Egypt Active EGP 1,500,000 4"':
        - 'cell "stunning villa stunning villa ID: LIST-010A74"':
          - img "stunning villa"
          - paragraph: stunning villa
          - paragraph: "ID: LIST-010A74"
        - cell "6 of October, Giza ,Egypt"
        - cell "Active"
        - cell "EGP 1,500,000"
        - cell "4"
        - cell:
          - button "Delete listing"
- button "Open AI chat"
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("dashboard Listings and Saved tabs render correct content", async ({ page }) => {
  4  |   await page.goto("/dashboard");
  5  |   
  6  |   // Wait for dashboard to load - use same robust selector as login test
  7  |   await expect(page.locator("h1").or(page.getByText("User dashboard")).or(page.getByText("Listings"))).toBeVisible({ timeout: 15_000 });
  8  | 
  9  |   // ── Listings tab (default) ─────────────────────────────────────────
  10 |   // Try multiple selector approaches to find the tabs
  11 |   const listingsTab = page.locator('[data-value="listings"], button:has-text("Listings"), [role="tab"]:has-text("Listings")').first();
  12 |   await expect(listingsTab).toBeVisible({ timeout: 10_000 });
  13 |   await listingsTab.click({ timeout: 10_000 });
  14 |   
  15 |   const listingsPanel = page.locator('[data-value="listings"], [data-state="active"]:has-text("listings"), [role="tabpanel"]').first();
  16 |   await expect(listingsPanel).toBeVisible({ timeout: 10_000 });
  17 |   // Either listings exist or empty-state message shown
  18 |   await expect(
  19 |     listingsPanel.locator("article, [class*='card'], p").first()
> 20 |   ).toBeVisible({ timeout: 8_000 });
     |     ^ Error: expect(locator).toBeVisible() failed
  21 | 
  22 |   // ── Saved tab ──────────────────────────────────────────────────────
  23 |   const savedTab = page.locator('[data-value="liked"], button:has-text("Saved"), [role="tab"]:has-text("Saved")').first();
  24 |   await expect(savedTab).toBeVisible({ timeout: 10_000 });
  25 |   await savedTab.click({ timeout: 10_000 });
  26 |   
  27 |   const savedPanel = page.locator('[data-value="liked"], [data-state="active"]:has-text("saved"), [role="tabpanel"]').first();
  28 |   await expect(savedPanel).toBeVisible({ timeout: 10_000 });
  29 |   await expect(
  30 |     savedPanel.locator("article, [class*='card'], p").first()
  31 |   ).toBeVisible({ timeout: 8_000 });
  32 | 
  33 |   // Switch back to Listings — content re-renders
  34 |   await listingsTab.click({ timeout: 10_000 });
  35 |   await expect(listingsPanel).toBeVisible({ timeout: 10_000 });
  36 | });
  37 | 
```