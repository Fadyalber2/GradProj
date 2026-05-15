# AXIOM V2 — Combined Features Spec

**Covers:** Shared Housing Features · Payment & Booking System · AddListingModal Fee Preview  
**Status:** Approved for implementation  
**Last updated:** 2026-05-15

---

## Part 1 — Shared Housing Features

Three gaps to close in the shared housing category (`category = "shared_housing"`):

- **A** — Lifestyle Preferences UI (roommate profile editor)
- **B** — Roommate Application System (apply → owner reviews)
- **C** — Dedicated `/shared-housing` search page

---

### A — Lifestyle Preferences UI

**Goal:** Give users a form to fill in their roommate profile. Data is already stored in `profiles.lifestyle_preferences` (JSONB) but has no edit UI.

**Location:** Dashboard — new "Roommate Profile" section, below the existing profile edit fields.

**Component:** `frontend/src/components/profile/LifestylePrefsForm.tsx`

**Fields (8 total):**

| Field | Input | Options |
|---|---|---|
| `gender_preference` | Select | male / female / mixed |
| `smoking_allowed` | Toggle | yes / no |
| `pets_allowed` | Toggle | yes / no |
| `guests_policy` | Select | flexible / rarely / never |
| `noise_level` | Select | quiet / moderate / lively |
| `cleanliness` | Select | very_clean / average / relaxed |
| `sleep_schedule` | Select | early_bird / night_owl / flexible |
| `occupation_type` | Select | student / professional / any |

**Behaviour:**
- Progress bar shows how many of 8 fields are filled
- "Profile complete" indicator when all 8 are set
- API: `PUT /api/auth/me { lifestyle_preferences: {...} }` — already implemented, no backend changes needed
- Component is reusable: also embedded inline inside the ApplyModal (Feature B)

---

### B — Roommate Application System

#### B1 — Apply Button & Modal (applicant side)

**Where:** `/property/[id]` when `category === "shared_housing"` and user is not the owner.

**Button states:**
- Not logged in → redirect to `/login?redirect=/property/[id]`
- Already applied → disabled, shows "Application Sent ✓"
- Open spots = 0 → disabled, shows "No spots available"
- Default → "Apply to Live Here"

**Component:** `frontend/src/components/shared-housing/ApplyButton.tsx` (`"use client"`)

**Modal:** `frontend/src/components/shared-housing/ApplyModal.tsx`

Modal layout (single scrollable form):
1. Listing title + thumbnail (context row at top)
2. "Introduce yourself" textarea — free-text message to housemates
3. "Your Roommate Profile" block — pre-filled from user's `lifestyle_preferences`, all 8 fields editable inline via `LifestylePrefsForm`
4. Soft prompt shown if profile is empty: "Complete your profile for a better compatibility score."
5. "Send Application" button

**Submit flow:**
```
POST /api/applications {
  listing_id,
  message,
  lifestyle_data   ← snapshot of preferences at submit time
}
→ backend saves application, runs AI compat score in background
→ owner notified
→ modal shows success state
```

#### B2 — Backend changes to `applications/router.py`

- Add `lifestyle_data: dict = {}` field to `CreateApplicationRequest`
- Save snapshot to `listing_applications.lifestyle_data` column
- Auto-compute AI compatibility score in background (`BackgroundTasks`):
  - Fetches housemates data for the listing
  - Sends prompt to Ollama asking for 0–100 score + reasons
  - Stores result in `compatibility_score` column on the application
  - If Ollama is down: score stored as `null`, application still submits fine
- Add new endpoint: `GET /api/applications/my` — returns applicant's own applications

#### B3 — Dashboard: Applications Received tab (owner view)

**Component:** `frontend/src/components/dashboard/ApplicationsReceivedTab.tsx`

- Lists the user's shared-housing listings
- Each listing is collapsible — shows applications underneath
- Per application row:
  - Applicant avatar + name
  - Compatibility score badge (green ≥80%, blue 60–79%, grey <60%)
  - Message preview
  - Accept / Reject buttons
- On Accept → `PUT /api/applications/{id} { status: "approved" }` → applicant notified
- On Reject → `PUT /api/applications/{id} { status: "rejected" }` → applicant notified
- Tab shows badge with count of pending applications

Backend: `GET /api/dashboard/me` response gains a `pending_applications: int` field.

#### B4 — Dashboard: My Applications tab (applicant view)

**Component:** `frontend/src/components/dashboard/MyApplicationsTab.tsx`

- Lists own applications: listing thumbnail, title, location, applied date, status badge
- Status badges: Pending (amber), Approved ✓ (green), Rejected (red)
- Compat score shown if available
- Link to listing page
- API: `GET /api/applications/my`

---

### C — Dedicated `/shared-housing` Page

**Route:** `frontend/src/app/shared-housing/page.tsx`  
(The existing `shared-housing/[id]/page.tsx` redirects to `/property/[id]` — no conflict)

**Layout:**
```
┌───────────────────────────────────────────┐
│  Horizontal filter bar                    │
│  [Female only] [Male only] [Bills incl.]  │
│  [Room type chips] [Has spots] [Move-in]  │
├───────────────────────────────────────────┤
│  ✨ Suggested for you  (logged-in only)   │
│  [ Card 94% ] [ Card 91% ] [ Card 88% ]   │
├───────────────────────────────────────────┤
│  All listings grid (4-col / 3 / 2 / 1)   │
└───────────────────────────────────────────┘
```

**Filters** (passed as URL params to `GET /api/listings?category=shared_housing&...`):

| Filter | Param |
|---|---|
| Gender preference | `gender_preference=male\|female` |
| Utilities included | `utilities_included=true` |
| Room type | `room_type=private\|ensuite\|shared` |
| Has open spots | `has_spots=true` |
| Move-in date | `available_before=YYYY-MM-DD` |
| Price range | `min_price` / `max_price` |

Backend `GET /api/listings` gains these params (applied only when `category=shared_housing`).

**"For You" section:**
- Only visible to logged-in users who have `lifestyle_preferences` set
- Calls `GET /api/ai/recommendations?category=shared_housing`
- Shows 3–4 `SharedHousingCard` components with compat score badge overlay
- Hidden if not logged in, no prefs, or no results

**SharedHousingCard** (`frontend/src/components/shared-housing/SharedHousingCard.tsx`):
- Listing image + title + location
- Price/month
- Spots count: "2 of 4 spots open"
- Gender preference badge
- Utilities included badge
- Room type chip
- Compat score overlay (only in "For You" section)

**Backend change:** `GET /api/ai/recommendations` gains optional `?category=` param — filters both favorites and fallback queries.

---

### Shared Housing: Edge Cases

| Case | Behaviour |
|---|---|
| User applies twice | 409 from backend; frontend shows "Application Sent ✓" |
| No open spots | Apply button disabled with tooltip |
| Ollama down during scoring | Score = `null`; application still saves |
| No lifestyle prefs set | Soft warning in modal; can still apply |
| Recommendations empty | "For You" section hidden entirely |

---

### Shared Housing: New/Modified Files

**New files:**
- `frontend/src/app/shared-housing/page.tsx`
- `frontend/src/components/shared-housing/ApplyModal.tsx`
- `frontend/src/components/shared-housing/ApplyButton.tsx`
- `frontend/src/components/shared-housing/SharedHousingCard.tsx`
- `frontend/src/components/shared-housing/SharedHousingFilters.tsx`
- `frontend/src/components/shared-housing/ForYouSection.tsx`
- `frontend/src/components/profile/LifestylePrefsForm.tsx`
- `frontend/src/components/dashboard/ApplicationsReceivedTab.tsx`
- `frontend/src/components/dashboard/MyApplicationsTab.tsx`

**Modified files:**
- `frontend/src/app/property/[id]/page.tsx` — add ApplyButton for shared_housing
- `frontend/src/app/dashboard/page.tsx` — add Applications Received + My Applications tabs
- `frontend/src/types/api.ts` — add `ApplicationBrief`, `MyApplicationBrief`
- `frontend/src/lib/queries.ts` — add shared housing + application queries/mutations
- `backend/app/applications/router.py` — lifestyle_data, compat score, GET /my
- `backend/app/dashboard/router.py` — add `pending_applications` count
- `backend/app/ai/router.py` — add `?category=` param
- `backend/app/listings/router.py` — add shared-housing filter params

---

## Part 2 — Payment & Booking System

**Applies to:** `for_rent` and `for_sale` listings only. Shared housing uses the application system above.

---

### Core Flow

1. Renter/buyer clicks "Book & Pay" (rent) or "Buy Now" (sale) on the listing page
2. Selects move-in date + duration (rent only)
3. Platform shows price breakdown with 5% fee
4. Pays via Stripe (test/sandbox — uses test card `4242 4242 4242 4242`)
5. After Stripe confirms payment, booking status → `pending_confirmation`
6. Renter visits the property in person, then comes back to AXIOM and clicks "Confirm — Property is Real"
7. Booking status → `active`; for rent: monthly disbursement schedule created; for sale: listing marked `sold`
8. For rent: owner requests each month's payout via dashboard button
9. Platform marks disbursement as "released" (demo mode — no real bank transfer)
10. Lease ends: either party clicks vacate early, OR daily background task auto-completes on `end_date`

---

### Booking Status Flow

```
pending_payment → pending_confirmation → active → completed
                                       ↘ cancelled
```

- `pending_payment` — Stripe PaymentIntent created, waiting for card
- `pending_confirmation` — Payment succeeded, waiting for renter to confirm in-person
- `active` — Renter confirmed; rent disbursements created; for sale: listing sold
- `completed` — Lease ended (vacated early or auto-completed at end_date)
- `cancelled` — Payment failed or abandoned

---

### Platform Fee Model

- Platform cut: **5% of total booking amount**
- For rent: cut taken entirely from month 1 disbursement
  - Month 1 payout = `monthly_price - platform_cut_amount`
  - Months 2–N = full `monthly_price`
- For sale: cut retained from total; owner receives `total_price × 95%`
- This guarantees platform revenue — money is collected upfront before any in-person meeting

---

### New Database Tables

**`bookings`:**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `listing_id` | UUID | FK listings |
| `renter_id` | UUID | FK profiles |
| `owner_id` | UUID | FK profiles |
| `booking_type` | VARCHAR(10) | `'rent'` or `'sale'` |
| `start_date` | DATE | rent only |
| `end_date` | DATE | rent only |
| `duration_months` | INT | rent only |
| `monthly_price` | DECIMAL | rent only |
| `total_price` | DECIMAL | required |
| `platform_cut_pct` | DECIMAL | default 5.0 |
| `platform_cut_amount` | DECIMAL | computed |
| `owner_amount` | DECIMAL | total - cut |
| `status` | VARCHAR | pending_payment → ... → completed |
| `stripe_payment_intent_id` | VARCHAR | Stripe PI id |
| `renter_confirmed_at` | TIMESTAMPTZ | when renter confirmed in-person |
| `tenant_vacated_at` | TIMESTAMPTZ | when vacated |
| `vacated_by` | VARCHAR(20) | `'renter'`, `'owner'`, or `'auto'` |

**`booking_disbursements`:**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `booking_id` | UUID | FK bookings |
| `month_number` | INT | 1, 2, 3... |
| `amount` | DECIMAL | month 1 = monthly - cut; others = monthly |
| `scheduled_date` | DATE | start_date + (month_number - 1) months |
| `status` | VARCHAR | `'scheduled'` or `'released'` |
| `owner_requested_at` | TIMESTAMPTZ | when owner clicked request |
| `released_at` | TIMESTAMPTZ | when platform released |

---

### Stripe Integration

- Mode: **test/sandbox** — uses `pk_test_*` / `sk_test_*` keys
- Test card: `4242 4242 4242 4242`, any future expiry, any CVC
- Backend: `stripe.PaymentIntent.create(amount=int(total*100), currency="egp", metadata={booking_id})`
- Frontend: `@stripe/stripe-js` + `@stripe/react-stripe-js`, `<Elements>` wrapper, `<CardElement>`, `stripe.confirmCardPayment(clientSecret)`
- Webhook: `payment_intent.succeeded` → update booking `pending_payment → pending_confirmation`
- Webhook local dev: `stripe listen --forward-to localhost:8000/api/stripe/webhook`
- Config keys needed: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` in `backend/.env`; `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `frontend/.env.local`

---

### Backend API Endpoints

| Method | Path | Who | What |
|---|---|---|---|
| `POST` | `/api/bookings` | Renter | Create booking, get `client_secret` |
| `GET` | `/api/bookings/my` | Renter | Own bookings |
| `GET` | `/api/bookings/received` | Owner | Bookings received on owned listings |
| `GET` | `/api/bookings/{id}` | Either party | Booking detail + disbursements |
| `POST` | `/api/bookings/{id}/confirm` | Renter | Confirm in-person visit — activates booking |
| `POST` | `/api/bookings/{id}/vacate` | Either party | Early lease termination |
| `POST` | `/api/bookings/{id}/disbursements/{month}/request` | Owner | Request monthly payout |
| `POST` | `/api/stripe/webhook` | Stripe (unsigned) | Handle `payment_intent.succeeded` |

**POST /api/bookings request body:**
```json
{
  "listing_id": "uuid",
  "booking_type": "rent | sale",
  "start_date": "YYYY-MM-DD",     // rent only
  "duration_months": 3            // rent only: 1 | 2 | 3 | 6 | 12
}
```

**POST /api/bookings response:**
```json
{
  "booking_id": "uuid",
  "client_secret": "pi_xxx_secret_xxx",
  "total_price": 15000,
  "platform_cut_amount": 750,
  "owner_amount": 14250,
  "booking_type": "rent"
}
```

---

### Lease Expiry Logic

- Daily `asyncio` background task runs in FastAPI lifespan
- Finds all `active` bookings where `end_date <= today`
- Sets status → `completed`, `vacated_by = 'auto'`
- Decrements `filled_spots` on the listing
- Notifies both renter and owner
- Also runs 7-day warning notifications for leases ending in exactly 7 days

**Early vacate** (either party):
- `POST /api/bookings/{id}/vacate` — callable by renter or owner
- Same effect: status → `completed`, `vacated_by = 'renter'|'owner'`
- Decrements `filled_spots`

---

### Frontend: Booking Flow UI

**BookNowButton** (`frontend/src/components/booking/BookNowButton.tsx`, `"use client"`):
- Placed on property page sidebar for `for_rent` and `for_sale` listings only
- Shows "Sold" (disabled) if listing status is `"sold"`
- Not logged in → redirect to `/login?next=/property/{id}`
- Text: "Buy Now" (for_sale) or "Book & Pay" (for_rent)
- Opens `BookingModal` dynamically

**BookingModal** (`frontend/src/components/booking/BookingModal.tsx`):

3 steps:

1. **Form step:**
   - Listing summary card (image + title + price)
   - Move-in date picker (rent only)
   - Duration selector: 1 / 2 / 3 / 6 / 12 months (rent only)
   - Price breakdown panel:
     - Total: `EGP X,XXX`
     - Platform fee (5%): `− EGP XXX`
     - Owner receives: `EGP X,XXX`
   - "Proceed to Payment" button → calls `POST /api/bookings` → gets `client_secret`

2. **Payment step:**
   - Stripe `<Elements>` wrapper with `clientSecret`
   - `<CardElement>` form
   - "Pay EGP X,XXX" button → calls `stripe.confirmCardPayment(clientSecret)`

3. **Success step:**
   - Confirms payment received
   - "View My Booking" link → `/booking/{id}`

**Booking detail page** (`frontend/src/app/booking/[id]/page.tsx`):
- Status badge + listing thumbnail + price breakdown
- `pending_confirmation` + is renter: "Confirm — Property is Real" button
- `active` + is owner: disbursement timeline with "Request Payment" button per month
- `active` + either party: "Mark as Vacated" button
- `completed`: shows completion info

---

### Frontend: Dashboard Tabs (additions)

The existing dashboard `<Tabs>` gains two more tabs:

**"My Bookings" tab** (`frontend/src/components/dashboard/MyBookingsTab.tsx`):
- Lists own bookings as renter/buyer
- Status badge per booking
- Links to `/booking/{id}`

**"Bookings Received" tab** (`frontend/src/components/dashboard/BookingsReceivedTab.tsx`):
- Lists bookings received on owned listings
- Renter avatar + name
- Disbursement schedule per active booking with "Request Payment" button per month
- Shows month amount and scheduled date

---

### Payment & Booking: Edge Cases

| Case | Behaviour |
|---|---|
| Owner tries to book own listing | 403 from backend |
| For-sale listing already has active booking | 409 — cannot book twice |
| Stripe payment fails | Booking stays `pending_payment`; no confirmation sent |
| Renter vacates before lease end | `filled_spots` decremented; owner notified |
| Disbursement requested before booking is active | 400 — only allowed on active bookings |
| Listing deleted after booking created | Booking data preserved; listing_id FK retained |

---

### Payment & Booking: New/Modified Files

**New backend files:**
- `backend/app/bookings/__init__.py`
- `backend/app/bookings/router.py`
- `backend/app/bookings/lease_checker.py`
- `backend/app/stripe_webhooks/__init__.py`
- `backend/app/stripe_webhooks/router.py`
- `backend/app/stripe_client.py`

**Modified backend files:**
- `backend/app/config.py` — add `stripe_secret_key`, `stripe_webhook_secret`
- `backend/requirements.txt` — add `stripe>=8.0.0`, `python-dateutil>=2.8.0`
- `backend/app/main.py` — register routers, add lifespan for daily task
- `backend/.env` — add Stripe keys

**New frontend files:**
- `frontend/src/components/booking/BookingModal.tsx`
- `frontend/src/components/booking/BookNowButton.tsx`
- `frontend/src/app/booking/[id]/page.tsx`
- `frontend/src/components/dashboard/MyBookingsTab.tsx`
- `frontend/src/components/dashboard/BookingsReceivedTab.tsx`

**Modified frontend files:**
- `frontend/src/types/api.ts` — add `BookingBrief`, `BookingDisbursement`, `CreateBookingResponse`
- `frontend/src/lib/queries.ts` — add booking queries and mutations
- `frontend/src/app/dashboard/page.tsx` — add My Bookings + Bookings Received tabs
- `frontend/src/app/property/[id]/page.tsx` — add BookNowButton for rent/sale
- `frontend/.env.local` — add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## Part 3 — AddListingModal Fee Preview

**Goal:** When an owner sets a price in the Add Listing form, show them a live breakdown of the platform's 5% cut and their net earnings. Makes the fee transparent and the form feel professional.

**Location:** `frontend/src/components/dashboard/AddListingModal.tsx`

**Behaviour:**
- Triggered by: price field input (onChange)
- Only shown when a numeric price > 0 is entered
- Hides if price is empty or 0

**Display (for `for_rent` listings):**

```
Your price:          EGP 5,000 / month
Platform fee (5%):  − EGP 250 / month
You receive:         EGP 4,750 / month
```

**Display (for `for_sale` listings):**

```
Listing price:       EGP 2,500,000
Platform fee (5%):  − EGP 125,000
You receive:         EGP 2,375,000
```

**Display (for `shared_housing` listings):**

Same as for_rent (per month). Note: shared housing uses the applications system — no Stripe payment — but the platform still reserves the right to take a fee in the future. Show the same preview to keep UI consistent, or hide it entirely for shared_housing (owner's choice).

**UI Notes:**
- Rendered as a small info card or highlighted row below the price input field
- Colour scheme: neutral/muted — not alarming (it's expected to have a fee)
- Amounts formatted as `EGP X,XXX` using the existing `formatEGP` utility
- No API call — purely client-side calculation

**Implementation note:** The fee percentage (`0.05`) should be a constant, not hardcoded inline, so it can be updated in one place when the rate changes.

---

## Dashboard Tabs: Final Combined Structure

After all features are implemented, the dashboard `<Tabs>` should have:

| Tab | Component | Who sees it usefully |
|---|---|---|
| My Listings | `MyListings` | All users |
| Bookings Received | `BookingsReceivedTab` | Owners of rent/sale listings |
| My Bookings | `MyBookingsTab` | Renters/buyers |
| Applications Received | `ApplicationsReceivedTab` | Owners of shared housing |
| My Applications | `MyApplicationsTab` | Applicants |
| Liked | `LikedProperties` | All users |
| Viewings | `MyViewings` | All users |

All tabs are always visible — the empty states explain what to do to use them.

---

## TypeScript Types Summary

### `frontend/src/types/api.ts` additions

```typescript
// Applications
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
  lifestyle_data: ListingLifestylePreferences | null;
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

// Bookings
export interface BookingDisbursement {
  id: string;
  booking_id: string;
  month_number: number;
  amount: number;
  scheduled_date: string;
  status: "scheduled" | "released";
  owner_requested_at: string | null;
  released_at: string | null;
  created_at: string;
}

export interface BookingBrief {
  id: string;
  listing_id: string;
  listing_title: string | null;
  listing_image: string | null;
  listing_location: string | null;
  renter_id: string;
  owner_id: string;
  booking_type: "rent" | "sale";
  start_date: string | null;
  end_date: string | null;
  duration_months: number | null;
  monthly_price: number | null;
  total_price: number;
  platform_cut_pct: number;
  platform_cut_amount: number;
  owner_amount: number;
  status: "pending_payment" | "pending_confirmation" | "active" | "completed" | "cancelled";
  renter_confirmed_at: string | null;
  tenant_vacated_at: string | null;
  vacated_by: string | null;
  disbursements: BookingDisbursement[];
  renter_name?: string | null;
  renter_avatar?: string | null;
  created_at: string;
}

export interface CreateBookingResponse {
  booking_id: string;
  client_secret: string;
  total_price: number;
  platform_cut_amount: number;
  owner_amount: number;
  booking_type: "rent" | "sale";
}
```

### `DashboardResponse` additions

```typescript
export interface DashboardResponse {
  // existing fields...
  pending_applications: number;   // shared housing pending applications
}
```
