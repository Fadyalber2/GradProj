# Axiom Website — Issues & Bug Notes

**Source:** Sticky Notes (compiled 5/3/2026)

---

## Priority Tier List

### 🔴 S — Critical (site-wide / unusable without fix)

| #   | Issue                                            | Why                                                        |
| --- | ------------------------------------------------ | ---------------------------------------------------------- |
| 8   | Footer links — all broken + blank email          | Every footer link is dead — affects entire site navigation |
| 2   | Responsive design not implemented (400px–1200px) | Site is unusable on mobile/tablet — blocks most users      |
| 6   | Blog "Read Article" → 404                        | Core content pages are inaccessible                        |
| 4   | 🟢Search button not working on home page           | Primary discovery feature is dead                          |
| 5   | 🟢Search disabled in some areas                    | Users cannot find what they need                           |

### 🟠 A — High Priority (key features broken, blocking conversions)

| #   | Issue                                                                     | Why                                                  |
| --- | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| 15  | Project page: contact sales, download brochure, view gallery — all broken | 3 conversion actions dead on the most important page |
| 9   | Agencies → project of agency — empty/non-functional                       | Entire section has no working content                |
| 13  | Apply filter not working                                                  | Users can't narrow down listings — core UX broken    |
| 14  | 🟢Smart search not working                                                  | Advanced search feature non-functional               |
| 16  | Partner universities "View student housing" → 404                         | Dead link for a key audience segment                 |

### 🔵 B — Medium Priority (functional gaps, incomplete sections)

| #   | Issue                                          | Why                                               |
| --- | ---------------------------------------------- | ------------------------------------------------- |
| 7   | Contact page missing — link goes to About page | No way for users to reach out directly            |
| 17  | Shared housing section not built out           | Entire feature incomplete with all subcomponents  |
| 18  | Blog page empty — no content added             | Published page with zero content — bad impression |
| 12  | Maps showing wrong locations                   | Misleading info for property seekers              |
| 3   | Account switching — old chat persists          | Data leakage between accounts                     |

### 🟢 C — Lower Priority (annoying but not blocking core flows)

| #   | Issue                                             | Why                                                          |
| --- | ------------------------------------------------- | ------------------------------------------------------------ |
| 1   | User can edit their own data from dashboard       | Permission/access control issue                              |
| 11  | Unverified badge still showing (agreed to remove) | Visual clutter — previously decided unnecessary              |
| 19  | Schedule a viewing → WhatsApp redirect            | Works but not ideal — decide: build feature or remove button |

### ⚪ D — Needs Clarification

| #   | Issue                          | Why                                            |
| --- | ------------------------------ | ---------------------------------------------- |
| 10  | Shared housing — issue flagged | No specific details — likely overlaps with #17 |

---

## Detailed Issue Breakdown

## 1. Dashboard — User Edit Restriction `[Tier C]`

- A user (aluser) y3ml edit f aldata bta3to f aldashboard (msh m3mola)
- Users should NOT be able to edit data that belongs to them directly from the dashboard — this is not implemented / not working correctly

## 2. Responsive Design — Not Implemented `[Tier S]`

- Mafish 7aga m3mola responsive (400px → 1200px)
- The website is NOT responsive across the expected breakpoint range (400px to 1200px)
- Needs full responsive pass across all pages

## 3. Account Switching — Broken Behavior `[Tier B]`

- Ai law 3mlt switch accounts alchat bta3 alaccount alawl byfdl mwgod (t2ribn 3shan ana msh msh8l ai)
- When switching accounts, the chat from the first/original account remains visible and persists
- It should clear or switch context properly — this is confusing for users

## 4. Search Button — Not Working `[Tier S]`

- Search btn msh sh8al ali f alhome page
- The search button on the home page is not functional / disabled

## 5. Disabled Search (Axiom Source Note) `[Tier S]`

- Disabled search
- Search functionality appears to be disabled entirely in some areas

## 6. Redirect Page 404 — Blog Page Issue `[Tier S]`

- Redirect page 404 (blog page > read article btn)
- Clicking "Read Article" button on the blog page results in a 404 redirect / page not found error

## 7. Contact Us — Missing Page `[Tier B]`

- Contact us bywde 3alabout w t2ribn mafish contact page
- The "Contact Us" link points to or references the About page, but there is NO actual Contact page built
- A dedicated Contact page needs to be created

## 8. Footer Links — Broken (Not Found Pages) `[Tier S]`

- Allinks ali f alfooter btwde 3alnot found page w send email bayza
- ALL links in the footer redirect to a "Not Found" page
- The "Send Email" link/button in the footer is also broken / sends a blank email

## 9. Agencies > Project of Agency — Not Working `[Tier A]`

- Agencies > project of agency msh sh8al 7aga gowaha
- Navigating from Agencies to a specific agency's project page — nothing works inside, the page content is empty or non-functional

## 10. Shared Housing `[Tier D]`

- Shared housing
- Issue flagged with the shared housing section/feature (details to be clarified — likely overlaps with #17)

## 11. Unverified Badge — Incorrect Display `[Tier C]`

- Unverified badge shelo enta 2olt malosh lazma
- The "Unverified" badge is still showing — previously discussed that it should be removed or is unnecessary

## 12. Wrong Maps `[Tier B]`

- Wrong maps
- Maps displayed on the site are incorrect / showing wrong locations

## 13. Apply Filter — Not Working `[Tier A]`

- Apply filter msh sh8al
- The "Apply Filter" functionality is broken / not responding

## 14. Smart Search — Not Working `[Tier A]`

- Smart search bardo msh sh8al
- The smart search feature is also not working

## 15. Contact Sales Team — Project Page Issues `[Tier A]`

- Contact sales team in project page msh sh8al w aldownload brochure / view gallery bardo msh sh8alen
- On the Project page, the following are ALL broken:
  - "Contact Sales Team" button — not working
  - "Download Brochure" button — not working
  - "View Gallery" — not working

## 16. Partner Universities — Broken Redirect `[Tier A]`

- Partner universities "view student housing" btredirect 3alnot found page
- Clicking "View Student Housing" under Partner Universities redirects to a 404 / Not Found page

## 17. Shared Housing Entry Point — Broken `[Tier B]`

- Enta lsa m3mltsh alshared housing w kol 7agto
- The shared housing section is still not built out with all its required components/features

## 18. Blog Page — Incomplete `[Tier B]`

- Lsa m7ttsh 7aga f alblog page
- The blog page is still empty — no content has been added yet

## 19. Schedule a Viewing — Feature Missing `[Tier C]`

- Schedule a viewing bywde 3la wsp bardo fa shilo law malosh lazma
- "Schedule a Viewing" currently just redirects to WhatsApp — either build the actual scheduling feature or remove the button if it's unnecessary

---

_Total issues tracked: 19_



