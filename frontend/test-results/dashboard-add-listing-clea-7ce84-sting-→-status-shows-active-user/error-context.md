# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard\add-listing-clean.spec.ts >> submit clean listing → status shows active
- Location: tests\dashboard\add-listing-clean.spec.ts:3:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel(/listing name|title/i)

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - link "AXIOM" [ref=e6] [cursor=pointer]:
          - /url: /
        - generic [ref=e7]:
          - link "Find Homes" [ref=e8] [cursor=pointer]:
            - /url: /find-homes
          - link "Shared Housing" [ref=e9] [cursor=pointer]:
            - /url: /find-homes?category=shared_housing
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
        - button "Testuser1 Testuser1" [ref=e22]:
          - img "Testuser1" [ref=e24]
          - generic [ref=e25]: Testuser1
          - img [ref=e26]
  - generic [ref=e30]:
    - generic [ref=e32]:
      - generic [ref=e33]:
        - generic [ref=e34]:
          - generic [ref=e35]:
            - img [ref=e36]
            - text: User dashboard
          - heading "Manage your AXIOM workspace." [level=1] [ref=e39]
          - paragraph [ref=e40]: Testuser1, keep your profile, listing pipeline, and saved homes in one place.
        - generic [ref=e41]:
          - generic [ref=e42]:
            - paragraph [ref=e43]: Listings
            - paragraph [ref=e44]: "7"
          - generic [ref=e45]:
            - paragraph [ref=e46]: Saved
            - paragraph [ref=e47]: "1"
          - generic [ref=e48]:
            - paragraph [ref=e49]: Pending
            - paragraph [ref=e50]: "1"
      - generic [ref=e51]:
        - button "Add listing" [active] [ref=e52]:
          - img [ref=e53]
          - text: Add listing
        - button "Browse homes" [ref=e54]:
          - img [ref=e55]
          - text: Browse homes
    - generic [ref=e59]:
      - generic [ref=e60]:
        - generic [ref=e61]:
          - img "Testuser1" [ref=e63]
          - generic [ref=e64]:
            - heading "Testuser1" [level=2] [ref=e66]
            - paragraph [ref=e67]: testuser1@gmail.com
            - paragraph [ref=e68]: Awl user on the website
        - generic [ref=e69]:
          - generic [ref=e70]:
            - paragraph [ref=e71]: "7"
            - paragraph [ref=e72]: Listings
          - generic [ref=e73]:
            - paragraph [ref=e74]: "1"
            - paragraph [ref=e75]: Saved
          - generic [ref=e76]:
            - paragraph [ref=e77]: "1"
            - paragraph [ref=e78]: Pending
        - generic [ref=e79]:
          - generic [ref=e80]:
            - term [ref=e81]: Contact
            - definition [ref=e82]: "01023221784"
          - generic [ref=e83]:
            - term [ref=e84]: Gender
            - definition [ref=e85]: Male
          - generic [ref=e86]:
            - term [ref=e87]: Age
            - definition [ref=e88]: 23 yrs
          - generic [ref=e89]:
            - term [ref=e90]: Since
            - definition [ref=e91]: 28/03/2026
      - generic [ref=e92]:
        - generic [ref=e93]:
          - generic [ref=e94]:
            - paragraph [ref=e95]: Profile settings
            - heading "Keep account details current" [level=3] [ref=e96]
          - button "Edit info" [ref=e97]:
            - img
            - text: Edit info
        - generic [ref=e98]:
          - generic [ref=e99]:
            - generic [ref=e100]: Contact
            - generic [ref=e101]: "01023221784"
          - generic [ref=e102]:
            - generic [ref=e103]: Gender
            - generic [ref=e104]: Male
          - generic [ref=e105]:
            - generic [ref=e106]: Birth date
            - generic [ref=e107]: 03/03/2003
          - generic [ref=e108]:
            - generic [ref=e109]: Age
            - generic [ref=e110]: 23 yrs
          - generic [ref=e111]:
            - generic [ref=e112]: Last updated
            - generic [ref=e113]: 28/03/2026
          - generic [ref=e114]:
            - generic [ref=e115]:
              - generic [ref=e116]:
                - img [ref=e117]
                - text: Member since
              - paragraph [ref=e119]: 28/03/2026
            - generic [ref=e120]:
              - generic [ref=e121]:
                - img [ref=e122]
                - text: Account security
              - button "Change password" [ref=e125]
    - generic [ref=e126]:
      - generic [ref=e127]:
        - generic [ref=e128]:
          - img [ref=e130]
          - generic [ref=e133]:
            - img [ref=e134]
            - text: 0%
        - generic [ref=e137]:
          - paragraph [ref=e138]: Total Views
          - paragraph [ref=e139]: "12"
        - generic [ref=e141]:
          - generic [ref=e142]: Activity level
          - generic [ref=e143]: 12 views
      - generic [ref=e146]:
        - generic [ref=e147]:
          - img [ref=e149]
          - generic [ref=e152]:
            - img [ref=e153]
            - text: 0%
        - generic [ref=e156]:
          - paragraph [ref=e157]: Active Listings
          - paragraph [ref=e158]: "5"
        - generic [ref=e160]:
          - generic [ref=e161]: Portfolio depth
          - generic [ref=e162]: 5 of 10 target
      - generic [ref=e165]:
        - generic [ref=e166]:
          - img [ref=e168]
          - generic [ref=e171]:
            - img [ref=e172]
            - text: 0%
        - generic [ref=e175]:
          - paragraph [ref=e176]: Pending Approval
          - paragraph [ref=e177]: "1"
        - generic [ref=e179]:
          - generic [ref=e180]: Queue load
          - generic [ref=e181]: 1 waiting
      - generic [ref=e184]:
        - generic [ref=e185]:
          - img [ref=e187]
          - generic [ref=e189]:
            - img [ref=e190]
            - text: 0%
        - generic [ref=e193]:
          - paragraph [ref=e194]: Saved Properties
          - paragraph [ref=e195]: "1"
        - generic [ref=e197]:
          - generic [ref=e198]: Shortlist depth
          - generic [ref=e199]: 1 saved
    - generic [ref=e202]:
      - tablist [ref=e203]:
        - tab "Listings" [selected] [ref=e204]
        - tab "Saved" [ref=e205]
      - tabpanel "Listings" [ref=e206]:
        - generic [ref=e207]:
          - generic [ref=e208]:
            - generic [ref=e209]:
              - paragraph [ref=e210]: Listing pipeline
              - heading "My Listings" [level=2] [ref=e211]
              - paragraph [ref=e212]: New listings require admin approval before going live.
            - button "Add New Listing" [ref=e213]:
              - img [ref=e214]
              - text: Add New Listing
          - table [ref=e217]:
            - rowgroup [ref=e218]:
              - row "Property Location Status Price Views Actions" [ref=e219]:
                - columnheader "Property" [ref=e220]
                - columnheader "Location" [ref=e221]
                - columnheader "Status" [ref=e222]
                - columnheader "Price" [ref=e223]
                - columnheader "Views" [ref=e224]
                - columnheader "Actions" [ref=e225]
            - rowgroup [ref=e226]:
              - 'row "apartment in dokki ID: LIST-F08F4E tahrir square cairo egypt Pending Review EGP 1 0" [ref=e227]':
                - 'cell "apartment in dokki ID: LIST-F08F4E" [ref=e228]':
                  - generic [ref=e229]:
                    - img [ref=e231]
                    - generic [ref=e235]:
                      - paragraph [ref=e236]: apartment in dokki
                      - paragraph [ref=e237]: "ID: LIST-F08F4E"
                - cell "tahrir square cairo egypt" [ref=e238]
                - cell "Pending Review" [ref=e239]:
                  - generic [ref=e240]: Pending Review
                - cell "EGP 1" [ref=e242]
                - cell "0" [ref=e243]
                - cell [ref=e244]:
                  - button "Delete listing" [ref=e246]:
                    - img [ref=e247]
              - 'row "apartment in giza apartment in giza ID: LIST-F6710B giza,egypt Active EGP 6,000/month 0" [ref=e250]':
                - 'cell "apartment in giza apartment in giza ID: LIST-F6710B" [ref=e251]':
                  - generic [ref=e252]:
                    - img "apartment in giza" [ref=e253]
                    - generic [ref=e254]:
                      - paragraph [ref=e255]: apartment in giza
                      - paragraph [ref=e256]: "ID: LIST-F6710B"
                - cell "giza,egypt" [ref=e257]
                - cell "Active" [ref=e258]:
                  - generic [ref=e259]: Active
                - cell "EGP 6,000/month" [ref=e261]
                - cell "0" [ref=e262]
                - cell [ref=e263]:
                  - button "Delete listing" [ref=e265]:
                    - img [ref=e266]
              - 'row "apartment near Ahram Canadian University apartment near Ahram Canadian University ID: LIST-3275E2 WVPM+FFF، 4th Industrial Zone, Banks Complex, 6th of October City (2), Giza Governorate 3222401 Active EGP 4,000/month 0" [ref=e269]':
                - 'cell "apartment near Ahram Canadian University apartment near Ahram Canadian University ID: LIST-3275E2" [ref=e270]':
                  - generic [ref=e271]:
                    - img "apartment near Ahram Canadian University" [ref=e272]
                    - generic [ref=e273]:
                      - paragraph [ref=e274]: apartment near Ahram Canadian University
                      - paragraph [ref=e275]: "ID: LIST-3275E2"
                - cell "WVPM+FFF، 4th Industrial Zone, Banks Complex, 6th of October City (2), Giza Governorate 3222401" [ref=e276]
                - cell "Active" [ref=e277]:
                  - generic [ref=e278]: Active
                - cell "EGP 4,000/month" [ref=e280]
                - cell "0" [ref=e281]
                - cell [ref=e282]:
                  - button "Delete listing" [ref=e284]:
                    - img [ref=e285]
              - 'row "studio in New administrative capital studio in New administrative capital ID: LIST-893498 Triumphal arch,egypy Active EGP 25,000/month 0" [ref=e288]':
                - 'cell "studio in New administrative capital studio in New administrative capital ID: LIST-893498" [ref=e289]':
                  - generic [ref=e290]:
                    - img "studio in New administrative capital" [ref=e291]
                    - generic [ref=e292]:
                      - paragraph [ref=e293]: studio in New administrative capital
                      - paragraph [ref=e294]: "ID: LIST-893498"
                - cell "Triumphal arch,egypy" [ref=e295]
                - cell "Active" [ref=e296]:
                  - generic [ref=e297]: Active
                - cell "EGP 25,000/month" [ref=e299]
                - cell "0" [ref=e300]
                - cell [ref=e301]:
                  - button "Delete listing" [ref=e303]:
                    - img [ref=e304]
              - 'row "Apartment in shoubra Apartment in shoubra ID: LIST-312F12 36MW+845, Shobra, Borham, El Sahel, Cairo Governorate 4352034 Draft EGP 2,000,000 0" [ref=e307]':
                - 'cell "Apartment in shoubra Apartment in shoubra ID: LIST-312F12" [ref=e308]':
                  - generic [ref=e309]:
                    - img "Apartment in shoubra" [ref=e310]
                    - generic [ref=e311]:
                      - paragraph [ref=e312]: Apartment in shoubra
                      - paragraph [ref=e313]: "ID: LIST-312F12"
                - cell "36MW+845, Shobra, Borham, El Sahel, Cairo Governorate 4352034" [ref=e314]
                - cell "Draft" [ref=e315]:
                  - generic [ref=e316]: Draft
                - cell "EGP 2,000,000" [ref=e318]
                - cell "0" [ref=e319]
                - cell [ref=e320]:
                  - button "Delete listing" [ref=e322]:
                    - img [ref=e323]
              - 'row "awsoma penthouse awsoma penthouse ID: LIST-C7F7A7 El-Gaish Rd, Sidi Gabir, Sidi Gaber, Alexandria Governorate 5434023 Active EGP 3,000,000 8" [ref=e326]':
                - 'cell "awsoma penthouse awsoma penthouse ID: LIST-C7F7A7" [ref=e327]':
                  - generic [ref=e328]:
                    - img "awsoma penthouse" [ref=e329]
                    - generic [ref=e330]:
                      - paragraph [ref=e331]: awsoma penthouse
                      - paragraph [ref=e332]: "ID: LIST-C7F7A7"
                - cell "El-Gaish Rd, Sidi Gabir, Sidi Gaber, Alexandria Governorate 5434023" [ref=e333]
                - cell "Active" [ref=e334]:
                  - generic [ref=e335]: Active
                - cell "EGP 3,000,000" [ref=e337]
                - cell "8" [ref=e338]
                - cell [ref=e339]:
                  - button "Delete listing" [ref=e341]:
                    - img [ref=e342]
              - 'row "stunning villa stunning villa ID: LIST-010A74 6 of October, Giza ,Egypt Active EGP 1,500,000 4" [ref=e345]':
                - 'cell "stunning villa stunning villa ID: LIST-010A74" [ref=e346]':
                  - generic [ref=e347]:
                    - img "stunning villa" [ref=e348]
                    - generic [ref=e349]:
                      - paragraph [ref=e350]: stunning villa
                      - paragraph [ref=e351]: "ID: LIST-010A74"
                - cell "6 of October, Giza ,Egypt" [ref=e352]
                - cell "Active" [ref=e353]:
                  - generic [ref=e354]: Active
                - cell "EGP 1,500,000" [ref=e356]
                - cell "4" [ref=e357]
                - cell [ref=e358]:
                  - button "Delete listing" [ref=e360]:
                    - img [ref=e361]
    - dialog [ref=e364]:
      - generic [ref=e367]:
        - generic [ref=e368]:
          - heading "Add New Listing" [level=3] [ref=e369]
          - button [ref=e370]:
            - img [ref=e371]
        - generic [ref=e374]:
          - generic [ref=e375]:
            - button "1 Basics" [ref=e376]:
              - generic [ref=e377]: "1"
              - generic [ref=e378]: Basics
            - button "2 Details" [ref=e379]:
              - generic [ref=e380]: "2"
              - generic [ref=e381]: Details
            - button "3 Photos" [ref=e382]:
              - generic [ref=e383]: "3"
              - generic [ref=e384]: Photos
          - generic [ref=e385]:
            - paragraph [ref=e386]: Basics
            - generic [ref=e387]:
              - generic [ref=e388]: Listing Name *
              - textbox "e.g. Modern Apartment in Maadi" [ref=e389]
            - generic [ref=e390]:
              - generic [ref=e391]:
                - generic [ref=e392]: Listing Category
                - combobox [ref=e393] [cursor=pointer]:
                  - option "For Rent" [selected]
                  - option "For Sale"
                  - option "Shared Housing"
              - generic [ref=e394]:
                - generic [ref=e395]: Property Type
                - combobox [ref=e396] [cursor=pointer]:
                  - option "Apartment" [selected]
                  - option "Villa"
                  - option "Studio"
                  - option "Penthouse"
                  - option "Duplex"
                  - option "Townhouse"
                  - option "Chalet"
                  - option "Office"
                  - option "Commercial"
                  - option "Land"
          - generic [ref=e398]:
            - paragraph [ref=e399]: Location
            - generic [ref=e400]:
              - generic [ref=e401]: Address *
              - generic [ref=e402]:
                - img
                - textbox "Enter property address…" [ref=e403]
        - generic [ref=e405]:
          - paragraph [ref=e406]: Listings are reviewed by an admin before going live.
          - generic [ref=e407]:
            - button "Cancel" [ref=e408]
            - button "Continue" [ref=e409]
  - button "Open AI chat" [ref=e412]:
    - img [ref=e414]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e422] [cursor=pointer]:
    - img [ref=e423]
  - alert [ref=e426]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("submit clean listing → status shows active", async ({ page }) => {
  4  |   await page.goto("/dashboard");
  5  |   
  6  |   // Wait for dashboard to load - use same robust selector as login test
  7  |   await expect(page.locator("h1").or(page.getByText("User dashboard")).or(page.getByText("Listings"))).toBeVisible({ timeout: 15_000 });
  8  | 
  9  |   // Open modal
  10 |   await page.getByRole("button", { name: /add listing/i }).click({ timeout: 10_000 });
  11 |   await expect(page.getByRole("heading", { name: /add new listing/i })).toBeVisible();
  12 | 
  13 |   // ── Step 0: Basics ────────────────────────────────────────────────
> 14 |   await page.getByLabel(/listing name|title/i).fill("Clean Test Apartment in Maadi");
     |                                                ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  15 |   await page.getByLabel(/address/i).fill("123 Road 9, Maadi, Cairo");
  16 | 
  17 |   await page.getByRole("button", { name: /next|continue|details/i }).click();
  18 | 
  19 |   // ── Step 1: Details ───────────────────────────────────────────────
  20 |   await page.getByLabel(/price/i).fill("15000");
  21 |   await page.getByLabel(/size/i).fill("120");
  22 | 
  23 |   // Lease type — for_rent default
  24 |   const leaseSelect = page.getByLabel(/lease type/i);
  25 |   if (await leaseSelect.isVisible()) await leaseSelect.selectOption("monthly");
  26 | 
  27 |   await page.getByLabel(/minimum stay/i).fill("12");
  28 | 
  29 |   // Available date
  30 |   const availDate = page.getByLabel(/available date/i);
  31 |   if (await availDate.isVisible()) await availDate.fill("2026-08-01");
  32 | 
  33 |   // ── AI Description generate ───────────────────────────────────────
  34 |   const generateBtn = page.getByRole("button", { name: /generate/i })
  35 |     .or(page.locator("button").filter({ hasText: /generate/i }))
  36 |     .first();
  37 | 
  38 |   if (await generateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
  39 |     await generateBtn.click();
  40 |     // Wait for generation to complete (spinner disappears)
  41 |     await expect(page.locator("button").filter({ hasText: /generating/i }))
  42 |       .not.toBeVisible({ timeout: 30_000 });
  43 |     // Description textarea should now have content
  44 |     const desc = page.getByLabel(/description/i);
  45 |     await expect(desc).not.toBeEmpty({ timeout: 5_000 });
  46 |   }
  47 | 
  48 |   await page.getByRole("button", { name: /next|photos/i }).click();
  49 | 
  50 |   // ── Step 2: Photos — skip upload, go straight to submit ──────────
  51 |   await page.getByRole("button", { name: /submit for review/i }).click();
  52 | 
  53 |   // Wait for modal to close or success state
  54 |   await expect(page.getByRole("heading", { name: /add new listing/i }))
  55 |     .not.toBeVisible({ timeout: 20_000 });
  56 | 
  57 |   // Listing appears in My Listings tab with "active" status
  58 |   await expect(
  59 |     page.getByText(/active/i).first()
  60 |   ).toBeVisible({ timeout: 15_000 });
  61 | });
  62 | 
```