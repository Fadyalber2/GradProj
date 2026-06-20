# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chatbot\reset-chat.spec.ts >> reset chat button clears conversation history and shows only welcome text
- Location: tests\chatbot\reset-chat.spec.ts:3:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('div').filter({ hasText: 'Hello! How can I assist you' }).nth(5)
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 1000000ms
  - waiting for locator('div').filter({ hasText: 'Hello! How can I assist you' }).nth(5)

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
  - heading "Find a home that matches your vibe." [level=1]
  - paragraph: Experience a new way to live together with AI-powered compatibility matching designed for modern living.
  - button "Rent"
  - button "Buy"
  - button "Roommates"
  - textbox "City or neighborhood to rent in..."
  - button "Search"
  - text: Listings Roommates ♥ Match Rate
  - heading "AI-Powered Matching" [level=3]
  - paragraph: Find roommates and homes that truly match your lifestyle and vibe using our proprietary algorithm.
  - heading "Verified Profiles" [level=3]
  - paragraph: Safety first. All users go through our rigorous verification process including ID checks.
  - heading "Quality Listings" [level=3]
  - paragraph: Curated properties that meet our high quality standards for comfort, location and price.
  - heading "Picked for You" [level=2]
  - paragraph: AI-curated listings based on your preferences
  - button "Set Preferences"
  - paragraph: Get personalized recommendations
  - paragraph: Tell the AI your budget, preferred area, and lifestyle — it will find your best matches.
  - button "Get Started"
  - heading "Top Listings" [level=2]
  - paragraph: Most viewed properties right now
  - link "View all listings →":
    - /url: /find-homes
  - button "Save property"
  - link "Modern Duplex in New Cairo For Sale Modern Duplex in New Cairo Downtown, New Cairo Duplex 9,858,148 EGP 1 Bed 3 Baths 350 m²":
    - /url: /property/1ba9ebba-b4d5-465b-a1ef-de1fef084d10
    - img "Modern Duplex in New Cairo"
    - text: For Sale
    - heading "Modern Duplex in New Cairo" [level=3]
    - paragraph: Downtown, New Cairo
    - text: Duplex 9,858,148 EGP 1 Bed 3 Baths 350 m²
  - button "Save property"
  - link "2 Bedroom Apartment in Tag Sultan For Sale 2 Bedroom Apartment in Tag Sultan Tag Sultan, Nasr City, Cairo Apartment 8,000,000 EGP 2 Beds 2 Baths 117 m²":
    - /url: /property/03e89354-f91e-422a-b80e-89a353570072
    - img "2 Bedroom Apartment in Tag Sultan"
    - text: For Sale
    - heading "2 Bedroom Apartment in Tag Sultan" [level=3]
    - paragraph: Tag Sultan, Nasr City, Cairo
    - text: Apartment 8,000,000 EGP 2 Beds 2 Baths 117 m²
  - button "Save property"
  - link "7 Bedroom Twin House in El Khamayel Compound For Sale 7 Bedroom Twin House in El Khamayel Compound El Khamayel Compound, Sheikh Zayed, Giza Twin House 25,000,000 EGP 7 Beds 5 Baths 450 m²":
    - /url: /property/96eeb24f-3645-4705-b269-709e66fbd246
    - img "7 Bedroom Twin House in El Khamayel Compound"
    - text: For Sale
    - heading "7 Bedroom Twin House in El Khamayel Compound" [level=3]
    - paragraph: El Khamayel Compound, Sheikh Zayed, Giza
    - text: Twin House 25,000,000 EGP 7 Beds 5 Baths 450 m²
  - text: The Process
  - heading "How Axiom Works" [level=2]
  - paragraph: Three simple steps to finding your perfect living situation without the usual headaches.
  - text: "01"
  - heading "Create Profile" [level=3]
  - paragraph: Share your lifestyle, habits, and what you're looking for. Our AI analyzes your vibe.
  - text: "02"
  - heading "Get Matched" [level=3]
  - paragraph: We suggest homes and roommates with high compatibility scores. No more guessing games.
  - text: "03"
  - heading "Connect & Move" [level=3]
  - paragraph: Chat securely, schedule tours, and sign leases all within the platform. Welcome home.
  - heading "Neighborhood Guides" [level=2]
  - link "View all guides →":
    - /url: /blog
  - link "Best Real-Estate Website in Egypt Market Trends Best Real-Estate Website in Egypt":
    - /url: /blog/best-real-estate-website-in-egypt
    - img "Best Real-Estate Website in Egypt"
    - text: Market Trends
    - heading "Best Real-Estate Website in Egypt" [level=3]
  - paragraph: Trusted Partners
  - text: S SODIC Real Estate EM Emaar Misr Developments PH Palm Hills Developments T TMG Talaat Moustafa Group HP Hyde Park Properties SoO Sixth of October Development
  - heading "Ready to find your vibe?" [level=2]
  - paragraph: Join thousands of verified members finding their perfect homes and roommates today.
  - link "Browse Listings":
    - /url: /find-homes
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
- button "Close AI chat"
- paragraph: AXIOM AI
- paragraph: Your Egyptian property expert
- button "Clear chat"
- button "Close"
- text: مرحباً / Hello — I speak Arabic and English. Tell me what you're looking for and I'll search our live listings across Egypt for you. Hello Hello! How can I
- textbox "Ask about properties, prices, areas..." [disabled]
- button [disabled]
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("reset chat button clears conversation history and shows only welcome text", async ({ page }) => {
  4  | await page.goto("/login");
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
  17 |   await page.goto("/");
  18 | 
  19 |   const aiButton = page.getByRole("button", { name: /open ai chat/i });
  20 |   await aiButton.click();
  21 | 
  22 |   // ChatDrawer renders as motion.div — wait for the input
  23 |   const input = page.getByPlaceholder("Ask about properties, prices, areas...");
  24 |   await expect(input).toBeVisible({ timeout: 5_000 });
  25 | 
  26 |   await input.fill("Hello");
  27 |   await page.getByRole('button').filter({ hasText: /^$/ }).nth(4).click(); // Click the send button (no visible text, only icon)
  28 | 
  29 |   // Wait for response
  30 |   await expect(
  31 |     page.locator('div').filter({ hasText: 'Hello! How can I assist you' }).nth(5)
> 32 |   ).toBeVisible({ timeout: 1000_000 });
     |     ^ Error: expect(locator).toBeVisible() failed
  33 | 
  34 |   // Reset button has title="Clear chat" (RotateCcw icon, no visible text)
  35 |   const resetBtn = page.locator('button[title="Clear chat"]');
  36 |   await expect(resetBtn).toBeVisible();
  37 |   await resetBtn.click();
  38 | 
  39 |   await expect(page.locator('div').filter({ hasText: 'Hello! How can I assist you' }).nth(5)).not.toBeVisible();
  40 | 
  41 |   const welcomeText = "مرحباً / Hello — I speak Arabic and English. Tell me what you're looking for and I'll search our live listings across Egypt for you.";
  42 |   await expect(page.getByText(welcomeText)).toBeVisible({ timeout: 10_000 });
  43 | });
  44 | 
```