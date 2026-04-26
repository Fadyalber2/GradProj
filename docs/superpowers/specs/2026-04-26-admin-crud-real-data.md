# Spec: Admin CRUD Overhaul + Real Supabase Data Wiring

**Date:** 2026-04-26
**Branch:** feat/admin-crud-real-data
**Status:** Approved

---

## Goal

Two parallel improvements:
1. Replace all mock/hardcoded data on public-facing pages with real data queried directly from Supabase.
2. Overhaul the admin panel CRUD experience — better forms, a pending approvals queue, rich text for blog, autocomplete pickers, validation, and safer deletes.

---

## Phase 1 — Supabase Query Layer + Public Pages

### 1.1 New query file

Create `frontend/src/lib/supabase-queries.ts` with TanStack Query hooks that query Supabase JS client directly (no FastAPI hop). Each hook returns `{ data, isLoading, error }`.

| Hook | Supabase table(s) | Consumer page |
|------|-------------------|---------------|
| `useListings(filters)` | `listings` | `/find-homes` |
| `useListing(id)` | `listings` | `/property/[id]` |
| `useAgencies(search?)` | `agencies` | `/agencies` |
| `useAgency(slug)` | `agencies` + join `projects`, `listings` | `/agencies/[slug]` |
| `useProject(id)` | `projects` | `/project/[id]` |
| `useBlogPosts(filters)` | `blog_posts` | `/blog` |
| `useBlogPost(slug)` | `blog_posts` | `/blog/[slug]` |
| `useDashboardData()` | `listings` filtered by `auth.user().id` | `/dashboard` |

Filters for `useListings`: `category`, `property_type`, `min_price`, `max_price`, `bedrooms`, `search` (text search on title + location).

### 1.2 Page wiring

For each page:
- Remove the mock data import from `constants.ts`
- Add the corresponding hook
- Replace static array references with `data ?? []`
- Show existing skeleton/loading states while `isLoading` is true
- Show an error message if `error` is set

Pages to update:
- `frontend/src/app/find-homes/page.tsx`
- `frontend/src/app/property/[id]/page.tsx`
- `frontend/src/app/agencies/page.tsx`
- `frontend/src/app/agencies/[slug]/page.tsx`
- `frontend/src/app/project/[id]/page.tsx`
- `frontend/src/app/blog/page.tsx`
- `frontend/src/app/blog/[slug]/page.tsx`
- `frontend/src/app/dashboard/page.tsx`

### 1.3 Supabase table assumptions

- `listings` columns used: `id`, `title`, `price`, `location`, `category`, `property_type`, `status`, `bedrooms`, `bathrooms`, `area`, `description`, `images`, `amenities`, `owner_id`, `created_at`, `fraud_score`, `deleted_at`
- `agencies` columns: `id`, `slug`, `name`, `description`, `phone`, `email`, `address`, `website`, `is_verified`, `logo_url`, `cover_url`, `created_at`
- `projects` columns: `id`, `name`, `location`, `min_price`, `max_price`, `status`, `total_units`, `delivery_date`, `agency_id`, `description`, `images`, `created_at`
- `blog_posts` columns: `id`, `slug`, `title`, `summary`, `content`, `category`, `is_published`, `author_id`, `cover_image`, `tags`, `created_at`

---

## Phase 2 — Admin CRUD Overhaul

### 2.1 Pending Approvals Queue

New view `PendingApprovalsView` component inside `frontend/src/app/admin/dashboard/page.tsx`.

- Fetches listings with `status = 'pending'` via `GET /admin/listings?status=pending`
- Table columns: Title, Price, Location, Type, Owner, Submitted date
- Per-row actions: **Approve** (green) calls `PUT /admin/listings/{id}/approve`, **Reject** (red) opens an inline reason input then calls `PUT /admin/listings/{id}/reject`
- Empty state: "No pending listings — all caught up"
- Added to AdminSidebar under the "Properties" group as "Pending Approvals" with a live count badge

### 2.2 Autocomplete Entity Picker

New reusable component `frontend/src/components/admin/EntityPicker.tsx`.

Props:
- `value: string` — current UUID
- `onChange: (id: string, label: string) => void`
- `section: "users" | "agencies"` — which admin endpoint to search
- `placeholder: string`

Behaviour:
- Debounced search (300ms) against the admin list endpoint
- Dropdown shows up to 8 results with name + truncated ID
- Selecting an option sets the UUID in the form
- Displays the selected name next to the hidden UUID value
- Clears with an ×  button

Used in `EntityForm` for fields: `owner_id`, `author_id`, `agency_id`.

### 2.3 Rich Text Editor for Blog

Install packages: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`.

New component `frontend/src/components/admin/RichTextEditor.tsx`.

- Toolbar buttons: Bold, Italic, H2, H3, Bullet list, Numbered list, Blockquote, Horizontal rule
- Stores output as HTML string
- Styled to match the existing admin form inputs (white bg, slate border, blue focus ring)
- Used in `EntityForm` when `field.type === "richtext"`
- Blog `content` field in `SECTIONS.blog` editFields and createFields changed to `type: "richtext"`

### 2.4 Form Validation

Changes to `EntityForm` in `frontend/src/app/admin/dashboard/page.tsx`:

- Fields with `required: true` in their `FieldDef` show a red `*` in the label
- On submit, validate all required fields — if any are empty, set per-field error state and prevent submit
- Error messages appear below the field in red (`text-xs text-red-500`)
- Number fields: validate that value is a valid number if `type === "number"`
- Email fields: basic regex validation if `field.key === "email"`

Add `required?: boolean` to the `FieldDef` type and mark required fields in the `SECTIONS` config.

### 2.5 Safer Delete — Countdown Confirm

In the delete confirmation modal:
- The "Yes, Delete" button is disabled and shows a countdown `(3)`, `(2)`, `(1)` for 3 seconds
- After countdown completes, button becomes active and turns red
- Uses `useEffect` with a 1-second interval, cleared on modal close
- Prevents accidental deletion from a misclick

---

## Phase 3 — Bug Fixes

### 3.1 Remove "brokers" section

- Remove `brokers` key from `SECTIONS` in `frontend/src/app/admin/dashboard/page.tsx`
- Remove the Brokers nav item from `AdminSidebar` navigation groups

### 3.2 Fix projects search

In `backend/app/admin/router.py` line ~563:
```python
# Before
query = query.ilike("title", f"%{search}%")
# After
query = query.ilike("name", f"%{search}%")
```

### 3.3 TypeScript check

Run `npx tsc --noEmit` inside `frontend/` — must pass with zero errors before the work is complete.

---

## File Change Summary

### New files
- `frontend/src/lib/supabase-queries.ts`
- `frontend/src/components/admin/EntityPicker.tsx`
- `frontend/src/components/admin/RichTextEditor.tsx`

### Modified files
- `frontend/src/app/find-homes/page.tsx`
- `frontend/src/app/property/[id]/page.tsx`
- `frontend/src/app/agencies/page.tsx`
- `frontend/src/app/agencies/[slug]/page.tsx`
- `frontend/src/app/project/[id]/page.tsx`
- `frontend/src/app/blog/page.tsx`
- `frontend/src/app/blog/[slug]/page.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/admin/dashboard/page.tsx`
- `frontend/src/components/admin/AdminSidebar.tsx`
- `backend/app/admin/router.py`

### Packages to install
- `@tiptap/react`
- `@tiptap/pm`
- `@tiptap/starter-kit`

---

## What is NOT changing

- Admin auth flow (JWT localStorage token) — stays the same
- Admin API client (`frontend/src/lib/admin/api.ts`) — stays the same
- Backend endpoints — only the projects search typo fix
- `AdminTable`, `AdminModal` components — no structural changes
- Transactions and Notifications sections — stay read-only stubs
