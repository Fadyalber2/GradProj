# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard\add-listing-fraud.spec.ts >> submit fraud listing → status shows Pending Review in My Listings table
- Location: tests\dashboard\add-listing-fraud.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/pending review/i)
Expected: visible
Error: strict mode violation: getByText(/pending review/i) resolved to 2 elements:
    1) <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-yellow-500/10 text-yellow-400 border-yellow-500/10">…</span> aka getByText('Pending Review').first()
    2) <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-yellow-500/10 text-yellow-400 border-yellow-500/10">…</span> aka getByText('Pending Review').nth(1)

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText(/pending review/i)

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - link "AXIOM" [ref=e6] [cursor=pointer]:
          - /url: /
        - generic [ref=e7]:
          - link "Home" [ref=e8] [cursor=pointer]:
            - /url: /
          - link "Find Homes" [ref=e9] [cursor=pointer]:
            - /url: /find-homes
          - link "Agencies" [ref=e10] [cursor=pointer]:
            - /url: /agencies
          - link "Pricing" [ref=e11] [cursor=pointer]:
            - /url: /pricing
          - link "Blog" [ref=e12] [cursor=pointer]:
            - /url: /blog
          - link "About Us" [ref=e13] [cursor=pointer]:
            - /url: /about
      - generic [ref=e14]:
        - generic [ref=e15]:
          - img [ref=e17]
          - textbox "Search city, neighborhood..." [ref=e20]
        - button "Testuser1 Testuser1 Pro" [ref=e22]:
          - img "Testuser1" [ref=e24]
          - generic [ref=e25]:
            - generic [ref=e26]: Testuser1
            - generic [ref=e27]: Pro
          - img [ref=e28]
  - generic [ref=e32]:
    - generic [ref=e34]:
      - generic [ref=e35]:
        - generic [ref=e36]:
          - generic [ref=e37]:
            - generic [ref=e38]:
              - img [ref=e39]
              - text: User dashboard
            - generic [ref=e42]: Pro
          - heading "Manage your AXIOM workspace." [level=1] [ref=e43]
          - paragraph [ref=e44]: Testuser1, keep your profile, listing pipeline, and saved homes in one place.
        - generic [ref=e45]:
          - generic [ref=e46]:
            - paragraph [ref=e47]: Listings
            - paragraph [ref=e48]: "16"
          - generic [ref=e49]:
            - paragraph [ref=e50]: Saved
            - paragraph [ref=e51]: "6"
          - generic [ref=e52]:
            - paragraph [ref=e53]: Pending
            - paragraph [ref=e54]: "2"
      - generic [ref=e55]:
        - button "Add listing" [ref=e56]:
          - img [ref=e57]
          - text: Add listing
        - button "Browse homes" [ref=e58]:
          - img [ref=e59]
          - text: Browse homes
    - generic [ref=e63]:
      - generic [ref=e64]:
        - generic [ref=e65]:
          - img "Testuser1" [ref=e67]
          - generic [ref=e68]:
            - heading "Testuser1" [level=2] [ref=e70]
            - paragraph [ref=e71]: testuser1@gmail.com
            - paragraph [ref=e72]: Awl user on the website
        - generic [ref=e73]:
          - generic [ref=e74]:
            - paragraph [ref=e75]: "16"
            - paragraph [ref=e76]: Listings
          - generic [ref=e77]:
            - paragraph [ref=e78]: "6"
            - paragraph [ref=e79]: Saved
          - generic [ref=e80]:
            - paragraph [ref=e81]: "2"
            - paragraph [ref=e82]: Pending
        - generic [ref=e83]:
          - generic [ref=e84]:
            - term [ref=e85]: Contact
            - definition [ref=e86]: "01023221784"
          - generic [ref=e87]:
            - term [ref=e88]: Gender
            - definition [ref=e89]: Male
          - generic [ref=e90]:
            - term [ref=e91]: Age
            - definition [ref=e92]: 23 yrs
          - generic [ref=e93]:
            - term [ref=e94]: Since
            - definition [ref=e95]: 28/03/2026
      - generic [ref=e96]:
        - generic [ref=e97]:
          - generic [ref=e98]:
            - paragraph [ref=e99]: Profile settings
            - heading "Keep account details current" [level=3] [ref=e100]
          - button "Edit info" [ref=e101]:
            - img
            - text: Edit info
        - generic [ref=e102]:
          - generic [ref=e103]:
            - generic [ref=e104]: Contact
            - generic [ref=e105]: "01023221784"
          - generic [ref=e106]:
            - generic [ref=e107]: Gender
            - generic [ref=e108]: Male
          - generic [ref=e109]:
            - generic [ref=e110]: Birth date
            - generic [ref=e111]: 03/03/2003
          - generic [ref=e112]:
            - generic [ref=e113]: Age
            - generic [ref=e114]: 23 yrs
          - generic [ref=e115]:
            - generic [ref=e116]: Last updated
            - generic [ref=e117]: 28/03/2026
          - generic [ref=e118]:
            - generic [ref=e119]:
              - generic [ref=e120]:
                - img [ref=e121]
                - text: Member since
              - paragraph [ref=e123]: 28/03/2026
            - generic [ref=e124]:
              - generic [ref=e125]:
                - img [ref=e126]
                - text: Account security
              - button "Change password" [ref=e129]
    - generic [ref=e130]:
      - generic [ref=e131]:
        - generic [ref=e132]:
          - img [ref=e134]
          - generic [ref=e137]:
            - img [ref=e138]
            - text: 0%
        - generic [ref=e141]:
          - paragraph [ref=e142]: Total Views
          - paragraph [ref=e143]: "12"
        - generic [ref=e145]:
          - generic [ref=e146]: Activity level
          - generic [ref=e147]: 12 views
      - generic [ref=e150]:
        - generic [ref=e151]:
          - img [ref=e153]
          - generic [ref=e156]:
            - img [ref=e157]
            - text: 0%
        - generic [ref=e160]:
          - paragraph [ref=e161]: Active Listings
          - paragraph [ref=e162]: "13"
        - generic [ref=e164]:
          - generic [ref=e165]: Portfolio depth
          - generic [ref=e166]: 13 of 10 target
      - generic [ref=e169]:
        - generic [ref=e170]:
          - img [ref=e172]
          - generic [ref=e175]:
            - img [ref=e176]
            - text: 0%
        - generic [ref=e179]:
          - paragraph [ref=e180]: Pending Approval
          - paragraph [ref=e181]: "2"
        - generic [ref=e183]:
          - generic [ref=e184]: Queue load
          - generic [ref=e185]: 2 waiting
      - generic [ref=e188]:
        - generic [ref=e189]:
          - img [ref=e191]
          - generic [ref=e193]:
            - img [ref=e194]
            - text: 0%
        - generic [ref=e197]:
          - paragraph [ref=e198]: Saved Properties
          - paragraph [ref=e199]: "6"
        - generic [ref=e201]:
          - generic [ref=e202]: Shortlist depth
          - generic [ref=e203]: 6 saved
    - generic [ref=e206]:
      - tablist [ref=e207]:
        - tab "Listings" [selected] [ref=e208]
        - tab "Saved" [ref=e209]
      - tabpanel "Listings" [ref=e210]:
        - generic [ref=e211]:
          - generic [ref=e212]:
            - generic [ref=e213]:
              - paragraph [ref=e214]: Listing pipeline
              - heading "My Listings" [level=2] [ref=e215]
              - paragraph [ref=e216]: New listings require admin approval before going live.
            - button "Add New Listing" [ref=e217]:
              - img [ref=e218]
              - text: Add New Listing
          - table [ref=e221]:
            - rowgroup [ref=e222]:
              - row "Property Location Status Price Views Actions" [ref=e223]:
                - columnheader "Property" [ref=e224]
                - columnheader "Location" [ref=e225]
                - columnheader "Status" [ref=e226]
                - columnheader "Price" [ref=e227]
                - columnheader "Views" [ref=e228]
                - columnheader "Actions" [ref=e229]
            - rowgroup [ref=e230]:
              - 'row "Fraud Test Listing ID: LIST-BF17DC 456 Test Street, Cairo Active EGP 9,000/month 0" [ref=e231] [cursor=pointer]':
                - 'cell "Fraud Test Listing ID: LIST-BF17DC" [ref=e232]':
                  - generic [ref=e233]:
                    - img [ref=e235]
                    - generic [ref=e239]:
                      - paragraph [ref=e240]: Fraud Test Listing
                      - paragraph [ref=e241]: "ID: LIST-BF17DC"
                - cell "456 Test Street, Cairo" [ref=e242]
                - cell "Active" [ref=e243]:
                  - generic [ref=e244]: Active
                - cell "EGP 9,000/month" [ref=e246]
                - cell "0" [ref=e247]
                - cell [ref=e248]:
                  - button "Delete listing" [ref=e250]:
                    - img [ref=e251]
              - 'row "Clean Test Apartment in Maadi ID: LIST-64F997 123 Road 9, Maadi, Cairo Active EGP 15,000/month 0" [ref=e254] [cursor=pointer]':
                - 'cell "Clean Test Apartment in Maadi ID: LIST-64F997" [ref=e255]':
                  - generic [ref=e256]:
                    - img [ref=e258]
                    - generic [ref=e262]:
                      - paragraph [ref=e263]: Clean Test Apartment in Maadi
                      - paragraph [ref=e264]: "ID: LIST-64F997"
                - cell "123 Road 9, Maadi, Cairo" [ref=e265]
                - cell "Active" [ref=e266]:
                  - generic [ref=e267]: Active
                - cell "EGP 15,000/month" [ref=e269]
                - cell "0" [ref=e270]
                - cell [ref=e271]:
                  - button "Delete listing" [ref=e273]:
                    - img [ref=e274]
              - 'row "Test Pending Listing for Rejection ID: LIST-7B0467 456 Test Street, Cairo Pending Review EGP 2/month 0" [ref=e277] [cursor=pointer]':
                - 'cell "Test Pending Listing for Rejection ID: LIST-7B0467" [ref=e278]':
                  - generic [ref=e279]:
                    - img [ref=e281]
                    - generic [ref=e285]:
                      - paragraph [ref=e286]: Test Pending Listing for Rejection
                      - paragraph [ref=e287]: "ID: LIST-7B0467"
                - cell "456 Test Street, Cairo" [ref=e288]
                - cell "Pending Review" [ref=e289]:
                  - generic [ref=e290]: Pending Review
                - cell "EGP 2/month" [ref=e292]
                - cell "0" [ref=e293]
                - cell [ref=e294]:
                  - button "Delete listing" [ref=e296]:
                    - img [ref=e297]
              - 'row "Test Pending Listing for Approval ID: LIST-F6973A 123 Test Street, Cairo,china Pending Review EGP 1/month 0" [ref=e300] [cursor=pointer]':
                - 'cell "Test Pending Listing for Approval ID: LIST-F6973A" [ref=e301]':
                  - generic [ref=e302]:
                    - img [ref=e304]
                    - generic [ref=e308]:
                      - paragraph [ref=e309]: Test Pending Listing for Approval
                      - paragraph [ref=e310]: "ID: LIST-F6973A"
                - cell "123 Test Street, Cairo,china" [ref=e311]
                - cell "Pending Review" [ref=e312]:
                  - generic [ref=e313]: Pending Review
                - cell "EGP 1/month" [ref=e315]
                - cell "0" [ref=e316]
                - cell [ref=e317]:
                  - button "Delete listing" [ref=e319]:
                    - img [ref=e320]
              - 'row "Fraud Test Listing ID: LIST-6DAC26 456 Test Street, Cairo Active EGP 9,000/month 0" [ref=e323] [cursor=pointer]':
                - 'cell "Fraud Test Listing ID: LIST-6DAC26" [ref=e324]':
                  - generic [ref=e325]:
                    - img [ref=e327]
                    - generic [ref=e331]:
                      - paragraph [ref=e332]: Fraud Test Listing
                      - paragraph [ref=e333]: "ID: LIST-6DAC26"
                - cell "456 Test Street, Cairo" [ref=e334]
                - cell "Active" [ref=e335]:
                  - generic [ref=e336]: Active
                - cell "EGP 9,000/month" [ref=e338]
                - cell "0" [ref=e339]
                - cell [ref=e340]:
                  - button "Delete listing" [ref=e342]:
                    - img [ref=e343]
              - 'row "Clean Test Apartment in Maadi ID: LIST-F0F148 123 Road 9, Maadi, Cairo Active EGP 15,000/month 0" [ref=e346] [cursor=pointer]':
                - 'cell "Clean Test Apartment in Maadi ID: LIST-F0F148" [ref=e347]':
                  - generic [ref=e348]:
                    - img [ref=e350]
                    - generic [ref=e354]:
                      - paragraph [ref=e355]: Clean Test Apartment in Maadi
                      - paragraph [ref=e356]: "ID: LIST-F0F148"
                - cell "123 Road 9, Maadi, Cairo" [ref=e357]
                - cell "Active" [ref=e358]:
                  - generic [ref=e359]: Active
                - cell "EGP 15,000/month" [ref=e361]
                - cell "0" [ref=e362]
                - cell [ref=e363]:
                  - button "Delete listing" [ref=e365]:
                    - img [ref=e366]
              - 'row "Test Pending Listing for Rejection ID: LIST-CAC5ED 456 Test Street, Cairo Active EGP 2/month 0" [ref=e369] [cursor=pointer]':
                - 'cell "Test Pending Listing for Rejection ID: LIST-CAC5ED" [ref=e370]':
                  - generic [ref=e371]:
                    - img [ref=e373]
                    - generic [ref=e377]:
                      - paragraph [ref=e378]: Test Pending Listing for Rejection
                      - paragraph [ref=e379]: "ID: LIST-CAC5ED"
                - cell "456 Test Street, Cairo" [ref=e380]
                - cell "Active" [ref=e381]:
                  - generic [ref=e382]: Active
                - cell "EGP 2/month" [ref=e384]
                - cell "0" [ref=e385]
                - cell [ref=e386]:
                  - button "Delete listing" [ref=e388]:
                    - img [ref=e389]
              - 'row "Test Pending Listing for Approval ID: LIST-C7FAAD 123 Test Street, Cairo,china Active EGP 1/month 0" [ref=e392] [cursor=pointer]':
                - 'cell "Test Pending Listing for Approval ID: LIST-C7FAAD" [ref=e393]':
                  - generic [ref=e394]:
                    - img [ref=e396]
                    - generic [ref=e400]:
                      - paragraph [ref=e401]: Test Pending Listing for Approval
                      - paragraph [ref=e402]: "ID: LIST-C7FAAD"
                - cell "123 Test Street, Cairo,china" [ref=e403]
                - cell "Active" [ref=e404]:
                  - generic [ref=e405]: Active
                - cell "EGP 1/month" [ref=e407]
                - cell "0" [ref=e408]
                - cell [ref=e409]:
                  - button "Delete listing" [ref=e411]:
                    - img [ref=e412]
              - 'row "qwawe ID: LIST-BA327B qweqwe Active EGP 123/month 0" [ref=e415] [cursor=pointer]':
                - 'cell "qwawe ID: LIST-BA327B" [ref=e416]':
                  - generic [ref=e417]:
                    - img [ref=e419]
                    - generic [ref=e423]:
                      - paragraph [ref=e424]: qwawe
                      - paragraph [ref=e425]: "ID: LIST-BA327B"
                - cell "qweqwe" [ref=e426]
                - cell "Active" [ref=e427]:
                  - generic [ref=e428]: Active
                - cell "EGP 123/month" [ref=e430]
                - cell "0" [ref=e431]
                - cell [ref=e432]:
                  - button "Delete listing" [ref=e434]:
                    - img [ref=e435]
              - 'row "asdasdas ID: LIST-9B2AF8 asdasd Active EGP 12,312/month 0" [ref=e438] [cursor=pointer]':
                - 'cell "asdasdas ID: LIST-9B2AF8" [ref=e439]':
                  - generic [ref=e440]:
                    - img [ref=e442]
                    - generic [ref=e446]:
                      - paragraph [ref=e447]: asdasdas
                      - paragraph [ref=e448]: "ID: LIST-9B2AF8"
                - cell "asdasd" [ref=e449]
                - cell "Active" [ref=e450]:
                  - generic [ref=e451]: Active
                - cell "EGP 12,312/month" [ref=e453]
                - cell "0" [ref=e454]
                - cell [ref=e455]:
                  - button "Delete listing" [ref=e457]:
                    - img [ref=e458]
              - 'row "apartment in giza apartment in giza ID: LIST-F6710B giza,egypt Active EGP 6,000/month 0" [ref=e461] [cursor=pointer]':
                - 'cell "apartment in giza apartment in giza ID: LIST-F6710B" [ref=e462]':
                  - generic [ref=e463]:
                    - img "apartment in giza" [ref=e464]
                    - generic [ref=e465]:
                      - paragraph [ref=e466]: apartment in giza
                      - paragraph [ref=e467]: "ID: LIST-F6710B"
                - cell "giza,egypt" [ref=e468]
                - cell "Active" [ref=e469]:
                  - generic [ref=e470]: Active
                - cell "EGP 6,000/month" [ref=e472]
                - cell "0" [ref=e473]
                - cell [ref=e474]:
                  - button "Delete listing" [ref=e476]:
                    - img [ref=e477]
              - 'row "apartment near Ahram Canadian University apartment near Ahram Canadian University ID: LIST-3275E2 WVPM+FFF، 4th Industrial Zone, Banks Complex, 6th of October City (2), Giza Governorate 3222401 Active EGP 4,000/month 0" [ref=e480] [cursor=pointer]':
                - 'cell "apartment near Ahram Canadian University apartment near Ahram Canadian University ID: LIST-3275E2" [ref=e481]':
                  - generic [ref=e482]:
                    - img "apartment near Ahram Canadian University" [ref=e483]
                    - generic [ref=e484]:
                      - paragraph [ref=e485]: apartment near Ahram Canadian University
                      - paragraph [ref=e486]: "ID: LIST-3275E2"
                - cell "WVPM+FFF، 4th Industrial Zone, Banks Complex, 6th of October City (2), Giza Governorate 3222401" [ref=e487]
                - cell "Active" [ref=e488]:
                  - generic [ref=e489]: Active
                - cell "EGP 4,000/month" [ref=e491]
                - cell "0" [ref=e492]
                - cell [ref=e493]:
                  - button "Delete listing" [ref=e495]:
                    - img [ref=e496]
              - 'row "studio in New administrative capital studio in New administrative capital ID: LIST-893498 Triumphal arch,egypy Active EGP 25,000/month 0" [ref=e499] [cursor=pointer]':
                - 'cell "studio in New administrative capital studio in New administrative capital ID: LIST-893498" [ref=e500]':
                  - generic [ref=e501]:
                    - img "studio in New administrative capital" [ref=e502]
                    - generic [ref=e503]:
                      - paragraph [ref=e504]: studio in New administrative capital
                      - paragraph [ref=e505]: "ID: LIST-893498"
                - cell "Triumphal arch,egypy" [ref=e506]
                - cell "Active" [ref=e507]:
                  - generic [ref=e508]: Active
                - cell "EGP 25,000/month" [ref=e510]
                - cell "0" [ref=e511]
                - cell [ref=e512]:
                  - button "Delete listing" [ref=e514]:
                    - img [ref=e515]
              - 'row "Apartment in shoubra Apartment in shoubra ID: LIST-312F12 36MW+845, Shobra, Borham, El Sahel, Cairo Governorate 4352034 Draft EGP 2,000,000 0" [ref=e518] [cursor=pointer]':
                - 'cell "Apartment in shoubra Apartment in shoubra ID: LIST-312F12" [ref=e519]':
                  - generic [ref=e520]:
                    - img "Apartment in shoubra" [ref=e521]
                    - generic [ref=e522]:
                      - paragraph [ref=e523]: Apartment in shoubra
                      - paragraph [ref=e524]: "ID: LIST-312F12"
                - cell "36MW+845, Shobra, Borham, El Sahel, Cairo Governorate 4352034" [ref=e525]
                - cell "Draft" [ref=e526]:
                  - generic [ref=e527]: Draft
                - cell "EGP 2,000,000" [ref=e529]
                - cell "0" [ref=e530]
                - cell [ref=e531]:
                  - button "Delete listing" [ref=e533]:
                    - img [ref=e534]
              - 'row "awsoma penthouse awsoma penthouse ID: LIST-C7F7A7 El-Gaish Rd, Sidi Gabir, Sidi Gaber, Alexandria Governorate 5434023 Active EGP 3,000,000 8" [ref=e537] [cursor=pointer]':
                - 'cell "awsoma penthouse awsoma penthouse ID: LIST-C7F7A7" [ref=e538]':
                  - generic [ref=e539]:
                    - img "awsoma penthouse" [ref=e540]
                    - generic [ref=e541]:
                      - paragraph [ref=e542]: awsoma penthouse
                      - paragraph [ref=e543]: "ID: LIST-C7F7A7"
                - cell "El-Gaish Rd, Sidi Gabir, Sidi Gaber, Alexandria Governorate 5434023" [ref=e544]
                - cell "Active" [ref=e545]:
                  - generic [ref=e546]: Active
                - cell "EGP 3,000,000" [ref=e548]
                - cell "8" [ref=e549]
                - cell [ref=e550]:
                  - button "Delete listing" [ref=e552]:
                    - img [ref=e553]
              - 'row "stunning villa stunning villa ID: LIST-010A74 6 of October, Giza ,Egypt Active EGP 1,500,000 4" [ref=e556] [cursor=pointer]':
                - 'cell "stunning villa stunning villa ID: LIST-010A74" [ref=e557]':
                  - generic [ref=e558]:
                    - img "stunning villa" [ref=e559]
                    - generic [ref=e560]:
                      - paragraph [ref=e561]: stunning villa
                      - paragraph [ref=e562]: "ID: LIST-010A74"
                - cell "6 of October, Giza ,Egypt" [ref=e563]
                - cell "Active" [ref=e564]:
                  - generic [ref=e565]: Active
                - cell "EGP 1,500,000" [ref=e567]
                - cell "4" [ref=e568]
                - cell [ref=e569]:
                  - button "Delete listing" [ref=e571]:
                    - img [ref=e572]
  - button "Open AI chat" [ref=e577]:
    - img [ref=e579]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e587] [cursor=pointer]:
    - img [ref=e588]
  - alert [ref=e591]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("submit fraud listing → status shows Pending Review in My Listings table", async ({ page }) => {
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
  17 |   await page.goto("/dashboard");
  18 |   await expect(
  19 |     page.getByRole("heading", { name: /manage your axiom workspace/i })
  20 |   ).toBeVisible({ timeout: 10_000 });
  21 | 
  22 |   await page.getByRole("button", { name: /add listing/i }).click();
  23 |   await expect(page.getByRole("heading", { name: /add new listing/i })).toBeVisible();
  24 | 
  25 |   const modal = page.getByRole("dialog");
  26 | 
  27 |   // ── Step 0: Basics ────────────────────────────────────────────────
  28 |   await modal.getByPlaceholder(/modern apartment/i).fill("Fraud Test Listing");
  29 |   await modal.getByPlaceholder(/enter property address/i).fill("456 Test Street, Cairo");
  30 |   await page.getByRole("button", { name: /details/i }).click();
  31 | 
  32 |   // ── Step 1: Details ───────────────────────────────────────────────
  33 |   await modal.locator('input[type="number"]').first().fill("9000");
  34 |   await modal.locator('input[type="number"]').nth(1).fill("80");
  35 | 
  36 |   const availDate = modal.locator('input[type="date"]');
  37 |   if (await availDate.isVisible()) await availDate.fill("2025-12-12");
  38 | 
  39 |   await page.getByRole("button", { name: /photos/i }).click();
  40 | 
  41 |   // ── Step 2: Submit ────────────────────────────────────────────────
  42 |   await page.getByRole("button", { name: /submit for review/i }).click();
  43 | 
  44 |   await expect(page.getByRole("heading", { name: /add new listing/i }))
  45 |     .not.toBeVisible({ timeout: 20_000 });
  46 | 
  47 |   await expect(page.getByText("Fraud Test Listing")).toBeVisible({ timeout: 15_000 });
> 48 |   await expect(page.getByText(/pending review/i)).toBeVisible({ timeout: 15_000 });
     |                                                   ^ Error: expect(locator).toBeVisible() failed
  49 | });
  50 | 
```