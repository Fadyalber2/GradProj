# Shared Housing Features Design

**Date:** 2026-05-12  
**Status:** Approved  
**Scope:** Full-stack — 3 features: Lifestyle Preferences UI, Roommate Application System, Dedicated Shared Housing Search Page

---

## Overview

AXIOM's shared housing category (`category = "shared_housing"`) is partially built — the detail page, housemate display, and AI compatibility scoring exist, but users have no way to express their own preferences, apply to listings, or browse shared housing in a dedicated experience. This spec covers all three gaps in one combined implementation.

---

## Feature A — Lifestyle Preferences UI

### Goal

Give users a UI to fill in their roommate profile (`LifestylePreferences`), which is already stored in `profiles.lifestyle_preferences` JSONB but has no edit surface.

### Where it lives

Dashboard — new "Roommate Profile" settings section (below or alongside existing profile edit fields).

### Component

`frontend/src/components/profile/LifestylePrefsForm.tsx`

### Fields (8 total)

| Field               | Input type   | Values                            |
| ------------------- | ------------ | --------------------------------- |
| `gender_preference` | Radio/select | male / female / mixed             |
| `smoking_allowed`   | Toggle       | yes / no                          |
| `pets_allowed`      | Toggle       | yes / no                          |
| `guests_policy`     | Select       | flexible / rarely / never         |
| `noise_level`       | Select       | quiet / moderate / lively         |
| `cleanliness`       | Select       | very_clean / average / relaxed    |
| `sleep_schedule`    | Select       | early_bird / night_owl / flexible |
| `occupation_type`   | Select       | student / professional / any      |

### API

`PUT /api/auth/me { lifestyle_preferences: {...} }` — already implemented, no backend changes needed.

### Behaviour

- Shows "Profile complete" indicator when all 8 fields are set.
- Incomplete profile shows a soft prompt on the Apply modal: "Complete your roommate profile for a better match score."

---

## Feature B — Roommate Application System

### Goal

Let users formally apply to shared housing listings. Owners review, accept, or reject from the dashboard.

### 2a — Apply Button & Modal

**Trigger:** "Apply to Live Here" button appears on `/property/[id]` when:

- `listing.category === "shared_housing"`
- User is authenticated
- User is not the listing owner
- User has not already applied (show "Application Sent" state if they have)

**Component:** `frontend/src/components/shared-housing/ApplyModal.tsx`

**Modal layout:** Single scrollable form

1. Listing title + thumbnail at top (context)
2. "Your message" textarea — free-text intro to housemates
3. "Your Roommate Profile" collapsible block — pre-filled from `authStore.user.lifestyle_preferences`, all 8 fields editable inline
4. "Send Application" button (primary)

**Submit flow:**

```
POST /api/applications {
  listing_id: string,
  message: string,
  lifestyle_data: LifestylePreferences  // snapshot at submit time
}
→ backend computes compatibility_score via AI
→ owner notified
→ modal closes, button state → "Application Sent ✓"
```

### 2b — Backend changes to `applications/router.py`

| Change                                                        | Detail                                                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Add `lifestyle_data: dict = {}` to `CreateApplicationRequest` | Save snapshot to `listing_applications.lifestyle_data`                                                                         |
| Auto-compute compatibility score on submit                    | Call `_score_compatibility(listing_id, lifestyle_data)` internally; store result in `compatibility_score` column               |
| Add `GET /api/applications/my` endpoint                       | Returns applicant's own applications — `id, listing_id, listing_title, listing_image, status, compatibility_score, created_at` |

Status values: `"pending"` / `"approved"` / `"rejected"` (existing backend convention).

### 2c — Dashboard tabs (owner view)

**New tab:** "Applications Received"

- Component: `frontend/src/components/dashboard/ApplicationsReceivedTab.tsx`
- Lists applications grouped by listing
- Each row: applicant avatar, name, compat score badge (colour-coded: green ≥80, blue 60–79, grey <60), message preview, Accept / Reject buttons
- API: `GET /api/listings/{id}/applications` per listing (already implemented)
- On Accept → `PUT /api/applications/{id} { status: "approved" }` → applicant notified
- On Reject → `PUT /api/applications/{id} { status: "rejected" }` → applicant notified

**Dashboard `GET /api/dashboard/me` change:** Add `pending_applications: number` count to response so the tab can show a badge.

### 2d — Dashboard tabs (applicant view)

**New tab:** "My Applications"

- Component: `frontend/src/components/dashboard/MyApplicationsTab.tsx`
- Lists own applications: listing thumbnail, title, location, applied date, status badge
- Status badges: "Pending" (yellow), "Approved ✓" (green), "Rejected" (red)
- API: `GET /api/applications/my` (new endpoint)

---

## Feature C — Dedicated `/shared-housing` Page

### Goal

Replace the generic find-homes experience for shared housing with a housemate-focused discovery page.

### Route

`frontend/src/app/shared-housing/page.tsx` (new — currently this path only has a redirect to `/property/[id]`, so the new page is at the list level)

### Layout: Filters Top + "For You" Banner + Card Grid

```
┌─────────────────────────────────────────────────────┐
│  Horizontal filter bar                              │
│  [Female only] [Male only] [Bills incl.] [Room type]│
│  [Has spots ✓] [Move-in date] [Price range]         │
├─────────────────────────────────────────────────────┤
│  ✨ Suggested for you  (logged-in + prefs set only)  │
│  [ Card 94% ] [ Card 91% ] [ Card 88% ]              │
├─────────────────────────────────────────────────────┤
│  All listings grid (3-col desktop, 2-col tablet,    │
│  1-col mobile) — SharedHousingCard                  │
└─────────────────────────────────────────────────────┘
```

### Filters

| Filter             | Input                                    | API param                            |
| ------------------ | ---------------------------------------- | ------------------------------------ |
| Gender preference  | "Female only" / "Male only" chip (radio) | `gender_preference=female\|male`     |
| Utilities included | Toggle                                   | `utilities_included=true`            |
| Room type          | Multi-select chips                       | `room_type=private\|ensuite\|shared` |
| Has open spots     | Toggle                                   | `has_spots=true`                     |
| Move-in date       | Date picker                              | `available_before=YYYY-MM-DD`        |
| Price range        | Min/max inputs                           | `min_price` / `max_price`            |

All filters passed as URL query params → `GET /api/listings?category=shared_housing&[filters]`.

### "For You" Section

- Visible only to logged-in users with `lifestyle_preferences` set
- Calls `GET /api/ai/recommendations?category=shared_housing` (backend: add optional `?category=` filter to existing recommendations endpoint)
- Renders 3–4 `SharedHousingCard` with compat score badge overlay
- If not logged in or no prefs: section hidden (no empty state shown)

### `SharedHousingCard` component

`frontend/src/components/shared-housing/SharedHousingCard.tsx`

Displays:

- Listing image (top)
- Title + location
- Price/month + utilities included badge
- Housemate avatars (up to 3, +N overflow)
- Spots count: "2 of 4 spots open"
- Gender preference badge (female-only / male-only / mixed)
- Room type chip
- Compat score badge (if in "For You" section)
- Links to `/property/[id]`

### Backend change to `ai/router.py`

Add optional `?category=` query param to `GET /api/ai/recommendations`. When `category=shared_housing`, filter both the favorites lookup and the fallback keyword query to that category.

### Backend change to `listings/router.py`

The existing `GET /api/listings` only supports `category, city, price, bedrooms, sort_by`. Add shared-housing-specific filter params:

| Param                | Type                             | Filters on                                             |
| -------------------- | -------------------------------- | ------------------------------------------------------ |
| `gender_preference`  | `"male"\|"female"`               | `listings.lifestyle_preferences->>'gender_preference'` |
| `utilities_included` | `bool`                           | `listings.utilities_included`                          |
| `room_type`          | `"private"\|"ensuite"\|"shared"` | `listings.room_type`                                   |
| `has_spots`          | `bool`                           | `listings.filled_spots < listings.total_spots`         |
| `available_before`   | `YYYY-MM-DD`                     | `listings.available_date <= ?`                         |

These params are only applied when `category=shared_housing` is also present.

---

## New TypeScript Types

### `frontend/src/types/api.ts` additions

```typescript
export interface ApplicationBrief {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_image: string | null;
  applicant_id: string;
  applicant_name: string | null;
  applicant_avatar: string | null;
  status: "pending" | "approved" | "rejected";
  message: string;
  lifestyle_data: LifestylePreferences | null;
  compatibility_score: number | null;
  created_at: string;
}

export interface MyApplicationBrief {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_image: string | null;
  listing_location: string;
  status: "pending" | "approved" | "rejected";
  compatibility_score: number | null;
  created_at: string;
}
```

---

## File Manifest

### New files

| File                                                              | Purpose                              |
| ----------------------------------------------------------------- | ------------------------------------ |
| `frontend/src/app/shared-housing/page.tsx`                        | Dedicated shared housing search page |
| `frontend/src/components/shared-housing/ApplyModal.tsx`           | Application form modal               |
| `frontend/src/components/shared-housing/SharedHousingCard.tsx`    | Housemate-focused listing card       |
| `frontend/src/components/shared-housing/SharedHousingFilters.tsx` | Filter bar component                 |
| `frontend/src/components/shared-housing/ForYouSection.tsx`        | AI-ranked compatibility section      |
| `frontend/src/components/profile/LifestylePrefsForm.tsx`          | Lifestyle preferences editor         |
| `frontend/src/components/dashboard/ApplicationsReceivedTab.tsx`   | Owner: review incoming applications  |
| `frontend/src/components/dashboard/MyApplicationsTab.tsx`         | Applicant: track own applications    |

### Modified files

| File                                      | Change                                                         |
| ----------------------------------------- | -------------------------------------------------------------- |
| `frontend/src/app/property/[id]/page.tsx` | Add "Apply to Live Here" button for shared_housing             |
| `frontend/src/app/dashboard/page.tsx`     | Add "Applications Received" + "My Applications" tabs           |
| `frontend/src/types/api.ts`               | Add `ApplicationBrief`, `MyApplicationBrief`                   |
| `backend/app/applications/router.py`      | Add `lifestyle_data` field, compat scoring, `GET /my` endpoint |
| `backend/app/dashboard/router.py`         | Add `pending_applications` count                               |
| `backend/app/ai/router.py`                | Add `?category=` param to recommendations                      |
| `backend/app/listings/router.py`          | Add shared-housing filter params to `GET /api/listings`        |

---

## Error & Edge Cases

| Case                                              | Behaviour                                                                                          |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| User applies twice                                | `POST /api/applications` returns 409; frontend shows "Application Sent ✓" state                    |
| User not logged in, clicks Apply                  | Redirect to `/login?next=/property/[id]`                                                           |
| AI compatibility scorer unavailable (Ollama down) | Score stored as `null`; badge hidden; application still submitted                                  |
| Listing has 0 open spots                          | Apply button disabled with "No spots available" tooltip                                            |
| User has no lifestyle prefs set                   | Apply modal shows soft prompt to complete profile; can still apply with empty `lifestyle_data: {}` |
| Recommendations API returns empty                 | "For You" section hidden entirely (no empty state)                                                 |

---

## Out of Scope

- Real-time notifications for new applications (existing notification system handles this)
- Messaging between applicant and housemates before acceptance (use existing `/messages` flow post-approval)
- Admin moderation of applications
- Bulk accept/reject
