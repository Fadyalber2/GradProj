# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chatbot\send-message.spec.ts >> AI chatbot opens, accepts message, and streams response without error
- Location: tests\chatbot\send-message.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[role=\'dialog\'], [data-state=\'open\']').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[role=\'dialog\'], [data-state=\'open\']').first()

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
- main:
  - heading "Find a home that matches your vibe." [level=1]
  - paragraph: Experience a new way to live together with AI-powered compatibility matching designed for modern living.
  - button "Rent"
  - button "Buy"
  - button "Roommates"
  - textbox "City or neighborhood to rent in..."
  - button "Search"
  - text: 12,400+ Listings 3,200 Roommates ♥ 94% Match Rate Trusted by 50,000+ residents across Egypt
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
  - link "Modern Duplex in New Cairo For Sale Save property Modern Duplex in New Cairo Downtown, New Cairo Duplex 9,858,148 EGP 1 Bed 3 Baths 350 m²":
    - /url: /property/1ba9ebba-b4d5-465b-a1ef-de1fef084d10
    - img "Modern Duplex in New Cairo"
    - text: For Sale
    - button "Save property"
    - heading "Modern Duplex in New Cairo" [level=3]
    - paragraph: Downtown, New Cairo
    - text: Duplex 9,858,148 EGP 1 Bed 3 Baths 350 m²
  - link "2 Bedroom Apartment in Tag Sultan For Sale Save property 2 Bedroom Apartment in Tag Sultan Tag Sultan, Nasr City, Cairo Apartment 8,000,000 EGP 2 Beds 2 Baths 117 m²":
    - /url: /property/03e89354-f91e-422a-b80e-89a353570072
    - img "2 Bedroom Apartment in Tag Sultan"
    - text: For Sale
    - button "Save property"
    - heading "2 Bedroom Apartment in Tag Sultan" [level=3]
    - paragraph: Tag Sultan, Nasr City, Cairo
    - text: Apartment 8,000,000 EGP 2 Beds 2 Baths 117 m²
  - link "7 Bedroom Twin House in El Khamayel Compound For Sale Save property 7 Bedroom Twin House in El Khamayel Compound El Khamayel Compound, Sheikh Zayed, Giza Twin House 25,000,000 EGP 7 Beds 5 Baths 450 m²":
    - /url: /property/96eeb24f-3645-4705-b269-709e66fbd246
    - img "7 Bedroom Twin House in El Khamayel Compound"
    - text: For Sale
    - button "Save property"
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
  - heading "People Love Living with Axiom" [level=2]
  - img "Sarah Jenkins"
  - heading "Sarah Jenkins" [level=4]
  - paragraph: Moved into The Mission Loft
  - paragraph: “I was skeptical about AI matching, but my roommates are literally my best friends now. The vibe check feature is shockingly accurate.”
  - img "Marcus Chen"
  - heading "Marcus Chen" [level=4]
  - paragraph: Host in NYC
  - paragraph: “Finding quality tenants used to be a nightmare. Axiom verified profiles gave me peace of mind instantly. Highly recommended.”
  - img "Elena Rodriguez"
  - heading "Elena Rodriguez" [level=4]
  - paragraph: Renting in Austin
  - paragraph: “The interface is so smooth and the filters actually work. Found a place within 3 days of signing up. Smooth sailing!”
  - paragraph: Trusted Partners
  - text: S SODIC Real Estate EM Emaar Misr Developments PH Palm Hills Developments T TMG Talaat Moustafa Group HP Hyde Park Properties SoO Sixth of October Development
  - heading "Ready to find your vibe?" [level=2]
  - paragraph: Join thousands of verified members finding their perfect homes and roommates today.
  - link "Get Started Free":
    - /url: /signup
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
- button "Close AI chat"
- paragraph: AXIOM AI
- paragraph: Your Egyptian property expert
- button "Clear chat"
- button "Close"
- text: مرحباً / Hello — I speak Arabic and English. Tell me what you're looking for and I'll search our live listings across Egypt for you.
- button "🏠 Apartments in New Cairo"
- button "💰 Under 10,000 EGP/month"
- button "🏘️ Compare neighborhoods"
- textbox "Ask about properties, prices, areas..."
- button [disabled]
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("AI chatbot opens, accepts message, and streams response without error", async ({ page }) => {
  4  |   await page.goto("/");
  5  | 
  6  |   // Click the floating AI button to open chat drawer
  7  |   const aiButton = page.getByRole("button", { name: /chat|ai|assistant/i })
  8  |     .or(page.locator("button[aria-label*='chat' i], button[aria-label*='ai' i]"))
  9  |     .first();
  10 |   await expect(aiButton).toBeVisible({ timeout: 10_000 });
  11 |   await aiButton.click();
  12 | 
  13 |   // Drawer opens
  14 |   const drawer = page.locator("[role='dialog'], [data-state='open']").first();
> 15 |   await expect(drawer).toBeVisible({ timeout: 5_000 });
     |                        ^ Error: expect(locator).toBeVisible() failed
  16 | 
  17 |   // Type a message
  18 |   const input = drawer.getByRole("textbox")
  19 |     .or(drawer.locator("input[type='text'], textarea"))
  20 |     .first();
  21 |   await expect(input).toBeVisible();
  22 |   await input.fill("What properties are available in Maadi?");
  23 | 
  24 |   // Send
  25 |   await drawer.getByRole("button", { name: /send/i }).click();
  26 | 
  27 |   // Response appears (any assistant message bubble)
  28 |   await expect(
  29 |     drawer.locator("[class*='message'], [class*='bubble'], [class*='assistant']").last()
  30 |   ).toBeVisible({ timeout: 30_000 });
  31 | 
  32 |   // No error state visible
  33 |   await expect(drawer.getByText(/error|failed|500/i)).not.toBeVisible();
  34 | });
  35 | 
```