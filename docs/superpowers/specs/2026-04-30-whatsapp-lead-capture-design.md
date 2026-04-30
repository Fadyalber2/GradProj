# WhatsApp Lead Capture — Design Spec
**Date:** 2026-04-30
**Branch:** feat/chat-listing-search

## Problem

The in-app messaging system is complex infrastructure that users never used (all mock data). AXIOM's monetization model is lead-generation for agencies: contractual agreements charge a negotiated price-per-lead. A "lead" is a verified, logged-in buyer who clicked to contact a listing. Capturing these in a DB enables billing, reporting, and demonstrating value to agency partners. The messaging system is replaced entirely with WhatsApp deep links + lead capture.

## Validated Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Auth required | Yes | Guarantees contactable leads with verified identity |
| Phone at signup | Required (was optional) | Lead record needs a real phone; enforcement at account creation |
| Private listings | Show WhatsApp, `is_billable = false` | Good UX, data still valuable for platform analytics |
| Deduplication | 1 lead per `(user_id, listing_id)` ever | Agencies trust unique-buyer counts; prevents accidental inflation |
| WhatsApp target — agency listing | Agency `phone` | Agency owns the lead; maps cleanly to billing client |
| WhatsApp target — private listing | Owner `profiles.phone` | Only option; marked non-billable |
| Lead visibility | Admin-only | MVP — agency portal is a future phase |
| Schedule Viewing CTA | Also WhatsApp + lead (`source = 'schedule_viewing'`) | Differentiates high-intent buyers; same code path |
| Implementation | Atomic replacement (one PR) | Messaging was never live — no data loss risk |

## Data Model

### New table: `leads`
```sql
CREATE TABLE leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id    uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  agency_id     uuid REFERENCES agencies(id) ON DELETE SET NULL,
  contact_name  text NOT NULL,      -- snapshot at click time
  contact_phone text NOT NULL,      -- snapshot at click time
  source        text NOT NULL CHECK (source IN ('whatsapp_click', 'schedule_viewing')),
  is_billable   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX leads_agency_id_idx ON leads(agency_id);
CREATE INDEX leads_listing_id_idx ON leads(listing_id);
CREATE INDEX leads_created_at_idx ON leads(created_at DESC);
```

**Dedup behaviour:** `UNIQUE (user_id, listing_id)` — the first click wins regardless of `source`. If a user clicks "Contact via WhatsApp" and later "Schedule a Viewing" on the same listing, the WhatsApp link opens again but no new DB row is inserted. This is correct for billing: the agency pays once per buyer per property.

**Contact snapshots:** `contact_name` and `contact_phone` are copied from the user's profile at click time so billing records stay accurate even if the user updates their profile later.

### Profile change
`profiles.phone`: add `NOT NULL` constraint. Phone becomes required at signup.

### Objects dropped
- Tables: `conversations`, `messages`, `blocked_users`
- RPC: `get_user_conversations`
- Notification types: `new_message`, `message_request`, `message_request_accepted`

## Backend

### `POST /api/leads` (auth required)
```
Body:     { listing_id: uuid, source: "whatsapp_click" | "schedule_viewing" }
Response: { whatsapp_url: string, already_existed: boolean }
```
1. Fetch authenticated user `full_name` + `phone` (422 if phone null)
2. Fetch listing → if `agency_id` set: use `agency.phone` + `agency.name`; else use `owner.phone` + `owner.full_name`
3. 404 if listing not found; 422 if resolved phone is null (agency has no phone on record)
4. `INSERT INTO leads ... ON CONFLICT (user_id, listing_id) DO NOTHING`
5. Build `wa.me` URL and return

### WhatsApp URL format
```
https://wa.me/{phone_e164_no_plus}?text={encodeURIComponent(message)}
```
Templates:
- `whatsapp_click`: `"Hi, I'm {name}, I'm interested in your listing: {title} ({price} EGP)."`
- `schedule_viewing`: `"Hi, I'm {name}, I'd like to schedule a viewing for: {title} ({price} EGP)."`

### `GET /api/admin/leads` (admin auth required)
Paginated, filterable by `agency_id`, `source`, `is_billable`, `date_from`, `date_to`.
Returns: `contact_name`, `contact_phone`, listing title, agency name, `source`, `is_billable`, `created_at`.

### Extended `GET /api/listings/{id}`
Add to response:
```json
{ "contact_phone": "+201XXXXXXXXX", "contact_name": "Agency or Owner Name" }
```
Used by frontend to show who the buyer will be WhatsApp-ing before they click.

### Deleted backend
- `backend/app/messages/` (entire module)
- Messages router unmounted from `backend/app/main.py`
- `recent_messages` block from `backend/app/dashboard/router.py`
- Message notification inserts (3 types)
- Messages table count from admin stats

## Frontend

### New component: `WhatsAppCTA.tsx`
Shared across all property contact surfaces. Props: `listingId`, `contactName`, `contactPhone`.

Renders two buttons:
- **"Contact via WhatsApp"** → `POST /api/leads` with `source: "whatsapp_click"` → `window.open(whatsapp_url)`
- **"Schedule a Viewing"** → `POST /api/leads` with `source: "schedule_viewing"` → `window.open(whatsapp_url)`

Edge case states:
- `contact_phone` is null → both buttons disabled, label: "Contact unavailable"
- User not authenticated → redirect to `/login?redirect=/property/{id}`
- User has no phone → toast: "Add your phone number in your profile to contact listings" + link to `/dashboard`

Used in: `PropertySidebar.tsx`, `MobilePropertyCTA.tsx`, `SharedHousingSidebar.tsx` (replaces `<MessageOwnerModal>` in each).

### Signup form
Add required `phone` field. Validation: Egyptian E.164 format (`+20` prefix, 11 digits total).

### Deleted frontend
- `frontend/src/app/messages/` (page + layout)
- `frontend/src/components/messages/` (all 8 components)
- `frontend/src/components/property/MessageOwnerModal.tsx`
- `frontend/src/components/dashboard/RecentMessages.tsx`
- `/messages` nav links from `Navbar.tsx`
- `"new_message"` notification handler from `NotificationBell.tsx`
- All `messagesQueries.*` from `lib/queries.ts`
- Message/conversation types from `types/api.ts` and `types/index.ts`
- Mock fixtures `DASHBOARD_MESSAGES`, `USER_MESSAGES`, `CHAT_MESSAGES` from `lib/constants.ts`

## Admin Dashboard

New "Leads" tab in `SECTIONS` registry (`frontend/src/app/admin/dashboard/page.tsx`):
```ts
{
  key: "leads",
  label: "Leads",
  apiSection: "leads",
  columns: ["contact_name", "contact_phone", "listing_title", "agency_name", "source", "is_billable", "created_at"],
  readOnly: true,
}
```

## Verification

1. **Phone required at signup** — try creating account without phone → blocked
2. **Agency listing contact** — listing with agency → two WhatsApp buttons in sidebar
3. **Lead recorded** — click button → check DB: 1 row with correct fields, WhatsApp opens
4. **Dedup** — click again → WhatsApp still opens, no new DB row
5. **Private listing** — no agency → owner's phone used, `is_billable = false`
6. **Agency no phone** — disabled "Contact unavailable" state
7. **Unauthenticated** — redirect to `/login`
8. **Messaging gone** — `/messages` → 404
9. **Admin view** — Leads tab shows captured leads with buyer info
10. **TypeScript clean** — `npx tsc --noEmit` passes
