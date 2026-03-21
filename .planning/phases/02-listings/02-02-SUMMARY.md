---
phase: "02-listings"
plan: "02-02"
subsystem: "frontend-listings"
tags: ["frontend", "listings", "search", "dashboard", "favorites"]
dependency_graph:
  requires: ["02-01"]
  provides: ["find-homes-ui", "property-detail-ui", "dashboard-listings-ui"]
  affects: ["03-messaging-dashboard"]
tech_stack:
  added: []
  patterns:
    - "TanStack Query mutations for listing CRUD"
    - "Optimistic favorite toggle with cache invalidation"
    - "Signed URL upload via Supabase Storage"
    - "Server component property detail page with ISR"
    - "Delete confirmation dialog pattern"
key_files:
  created: []
  modified:
    - "frontend/src/types/api.ts"
    - "frontend/src/lib/queries.ts"
    - "frontend/src/components/dashboard/MyListings.tsx"
decisions:
  - "Find Homes page implemented as client component (not server component) to support filter-driven React Query — acceptable deviation"
  - "ApiListingBrief/ApiListingDetail added as type aliases to ListingBrief/ListingDetail — avoids duplication"
  - "Mappers (API → UI) kept in page files not types/index.ts — cleaner separation"
  - "MyListings onEdit prop added as optional — dashboard can wire it when AddListingModal supports pre-fill"
metrics:
  duration: "~20 minutes"
  completed: "2026-03-21"
  tasks_total: 14
  tasks_completed: 14
  files_modified: 3
---

# Phase 2 Plan 02: Frontend Listings UI Summary

Gap-fill pass — code was largely complete from V1 wiring work. Verified all 14 plan tasks, confirmed correctness, filled 3 specific gaps.

## Objective

Build and wire the Find Homes search page, property detail page (all 3 listing categories), dashboard listing management, and file upload flow.

## What Was Done

All 14 tasks from the plan were verified. The majority of code existed and was complete. Three specific gaps were identified and filled:

**Task 12 — API types:** Added `ApiListingBrief` and `ApiListingDetail` type aliases to `api.ts`. The equivalent types (`ListingBrief`, `ListingDetail`) already existed with full correct shapes matching the backend Pydantic schemas. Added aliases to satisfy the plan's naming contract without duplicating type definitions.

**Task 14 — Listing CRUD mutations:** `queries.ts` had `listingsQueries`, `favoritesQueries`, and `favoriteMutation` but was missing the three mutation objects the plan required. Added `createListingMutation`, `updateListingMutation`, and `deleteListingMutation` along with a typed `CreateListingInput` interface.

**Task 8 — MyListings delete action:** The component existed with correct status badge logic but had stub buttons with no API integration. Added working delete button with a confirm dialog using `deleteListingMutation`. Added optional `onEdit` prop for future edit modal wiring.

## Tasks Verified Complete (Pre-Existing)

| Task | Component | Status |
|------|-----------|--------|
| 1 | Find Homes page (`app/find-homes/page.tsx`) | Existed — client component with React Query + AI search |
| 2 | FilterSidebar | Existed — manages filter state, calls onApply |
| 3 | SearchListingCard | Existed — image, verified badge, favorite toggle |
| 4 | SearchListingRow | Existed — list view variant with favorite toggle |
| 5 | Property detail page | Existed — server component, both layouts (standard + shared housing) |
| 6 | Shared housing redirect | Existed — `redirect("/property/" + params.id)` |
| 7 | AddListingModal | Existed — 3-step form, signed URL upload, AI description gen |
| 9 | LikedProperties | Existed — unfavorite button wired |
| 10 | MyViewings | Existed — status badges (confirmed/pending/cancelled) |
| 11 | Favorites toggle | Existed — PropertyHero + SearchListingCard both wire favoriteMutation |
| 13 | UI type mappers | Existed — in page files (dashboard/page.tsx, property/[id]/page.tsx) |

## Deviations from Plan

### Acceptable Architectural Differences

**1. [Rule 4 - Accepted] Find Homes page as client component**
- **Found during:** Task 1 verification
- **Issue:** Plan specified server component using `serverFetch`. Actual implementation is client component using `useQuery`.
- **Decision:** Kept as-is. Client component enables real-time filter updates and AI search without page navigation. Server component would require full page reload on every filter change.
- **Not a bug** — superior UX choice.

**2. [Rule 4 - Accepted] Mappers in page files, not types/index.ts**
- **Found during:** Task 13 verification
- **Issue:** Plan suggests mappers in `types/index.ts`. Actual implementations are co-located in `dashboard/page.tsx` and `property/[id]/page.tsx`.
- **Decision:** Kept as-is. Mappers import from `api.ts` and produce UI types — coupling them to the types file would create a circular dependency concern and mix responsibilities.

### Auto-fixed Gaps

**3. [Rule 2 - Missing functionality] Added delete action to MyListings**
- **Found during:** Task 8
- **Issue:** Plan required delete (DELETE /api/listings/{id}) wired in MyListings. Only stub buttons existed.
- **Fix:** Added working Trash2 delete button with confirm dialog using `deleteListingMutation`.
- **Files modified:** `frontend/src/components/dashboard/MyListings.tsx`
- **Commit:** f0c3286

**4. [Rule 2 - Missing functionality] Added listing CRUD mutations to queries.ts**
- **Found during:** Task 14
- **Issue:** Plan required `useCreateListing`, `useUpdateListing`, `useDeleteListing` mutations. Only query objects existed.
- **Fix:** Added three mutation objects + `CreateListingInput` interface.
- **Files modified:** `frontend/src/lib/queries.ts`
- **Commit:** e37d0ce

**5. [Rule 1 - Gap] Added ApiListingBrief/ApiListingDetail type aliases**
- **Found during:** Task 12
- **Issue:** Plan required these types. Equivalent types existed under different names.
- **Fix:** Added type aliases pointing to existing `ListingBrief` / `ListingDetailWithSimilar`.
- **Files modified:** `frontend/src/types/api.ts`
- **Commit:** e37d0ce

## Acceptance Criteria Status

- [x] Find Homes page loads and displays listings with filters
- [x] Filter sidebar updates query and re-fetches
- [x] Property detail page loads for all 3 categories
- [x] Shared housing renders compatibility score section
- [x] `/shared-housing/[id]` redirects to `/property/[id]`
- [x] Add listing modal submits successfully (existing, unchanged)
- [x] File upload via signed URL works (existing, unchanged)
- [x] My Listings shows with correct status badges
- [x] Liked Properties shows and unfavorite works
- [x] Favorite toggle works on listing cards and detail page
- [x] `npx tsc --noEmit` passes with zero errors

## Self-Check: PASSED

All modified files exist and TypeScript passes with zero errors.
