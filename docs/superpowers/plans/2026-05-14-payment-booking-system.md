# Payment & Booking System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full Stripe-powered booking and payment system for `for_rent` and `for_sale` listings — renter/buyer pays upfront via Stripe test mode, platform takes 5% cut, owner requests monthly disbursements from dashboard, and lease expiry auto-reopens listing spots.

**Architecture:** Renter pays full duration upfront via Stripe PaymentIntent (test/sandbox mode). Backend computes platform cut (5% of total), stores the booking, and returns a `client_secret` for the frontend to complete payment with Stripe.js. After payment succeeds (Stripe webhook), renter confirms the listing is real after in-person visit → booking goes `active` → monthly disbursement records created. Owner requests each month's payout via dashboard button; backend marks it `released` (simulated in demo — no real bank transfer). A daily asyncio background task auto-completes leases past their `end_date` and decrements `filled_spots`. For-sale bookings follow the same flow but without disbursements; confirmation marks the listing `sold`.

**Tech Stack:** Stripe Python SDK (`stripe`), `@stripe/stripe-js`, `@stripe/react-stripe-js`, `python-dateutil`, FastAPI asyncio background task, Supabase PostgreSQL, TanStack Query v5, shadcn/ui (Dialog, Select, Badge, Button, Input, Label)

---

## File Manifest

### New files
| File | Purpose |
|------|---------|
| `backend/app/bookings/__init__.py` | Module init |
| `backend/app/bookings/router.py` | All booking endpoints |
| `backend/app/bookings/lease_checker.py` | Daily auto-vacate background task |
| `backend/app/stripe_webhooks/__init__.py` | Module init |
| `backend/app/stripe_webhooks/router.py` | Stripe webhook handler |
| `backend/app/stripe_client.py` | Stripe singleton |
| `frontend/src/components/booking/BookingModal.tsx` | Date/duration form + Stripe Elements |
| `frontend/src/components/booking/BookNowButton.tsx` | Client wrapper placed on property page |
| `frontend/src/app/booking/[id]/page.tsx` | Booking status + confirm + vacate page |
| `frontend/src/components/dashboard/MyBookingsTab.tsx` | Renter: own bookings |
| `frontend/src/components/dashboard/BookingsReceivedTab.tsx` | Owner: received bookings + disbursements |

### Modified files
| File | Change |
|------|--------|
| `backend/app/config.py` | Add `stripe_secret_key`, `stripe_webhook_secret` |
| `backend/requirements.txt` | Add `stripe`, `python-dateutil` |
| `backend/app/main.py` | Register bookings + stripe_webhooks routers; add lifespan |
| `frontend/src/types/api.ts` | Add `BookingBrief`, `BookingDisbursement`, `CreateBookingResponse` |
| `frontend/src/lib/queries.ts` | Add booking query factories and mutations |
| `frontend/src/app/dashboard/page.tsx` | Add My Bookings + Bookings Received tabs |
| `frontend/src/app/property/[id]/page.tsx` | Add `BookNowButton` for for_rent + for_sale |
| `frontend/.env.local` | Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `backend/.env` | Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

---

## Task 1: Database Migration

**Files:**
- Run SQL via Supabase MCP or dashboard SQL editor

- [ ] **Step 1: Run migration SQL**

Open Supabase dashboard → SQL Editor and run:

```sql
-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id              UUID NOT NULL REFERENCES listings(id),
  renter_id               UUID NOT NULL REFERENCES profiles(id),
  owner_id                UUID NOT NULL REFERENCES profiles(id),
  booking_type            VARCHAR(10) NOT NULL CHECK (booking_type IN ('rent', 'sale')),

  -- Rent-only
  start_date              DATE,
  end_date                DATE,
  duration_months         INT,
  monthly_price           DECIMAL(12,2),

  -- Pricing (both types)
  total_price             DECIMAL(12,2) NOT NULL,
  platform_cut_pct        DECIMAL(5,2)  NOT NULL DEFAULT 5.0,
  platform_cut_amount     DECIMAL(12,2) NOT NULL,
  owner_amount            DECIMAL(12,2) NOT NULL,

  -- Status
  status                  VARCHAR(30) NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'pending_confirmation', 'active', 'completed', 'cancelled')),

  -- Stripe
  stripe_payment_intent_id VARCHAR(255) UNIQUE,

  -- Timestamps
  renter_confirmed_at     TIMESTAMPTZ,
  tenant_vacated_at       TIMESTAMPTZ,
  vacated_by              VARCHAR(20),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Monthly disbursement records (rent bookings only)
CREATE TABLE IF NOT EXISTS booking_disbursements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id           UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  month_number         INT  NOT NULL,
  amount               DECIMAL(12,2) NOT NULL,
  scheduled_date       DATE NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'released')),
  owner_requested_at   TIMESTAMPTZ,
  released_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, month_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_renter   ON bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner    ON bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_listing  ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_end_date ON bookings(end_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_disb_booking      ON booking_disbursements(booking_id);
```

- [ ] **Step 2: Verify tables exist**

In Supabase dashboard → Table Editor, confirm `bookings` and `booking_disbursements` appear.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(db): add bookings and booking_disbursements tables"
```

---

## Task 2: Backend Stripe Setup

**Files:**
- Create: `backend/app/stripe_client.py`
- Modify: `backend/app/config.py`
- Modify: `backend/requirements.txt`
- Modify: `backend/.env`

- [ ] **Step 1: Add Stripe to requirements**

Open `backend/requirements.txt` and add at the end:

```
stripe>=8.0.0
python-dateutil>=2.8.0
```

- [ ] **Step 2: Install**

```bash
cd backend
pip install stripe python-dateutil
```

Expected: no errors.

- [ ] **Step 3: Add config fields**

In `backend/app/config.py`, add two fields inside the `Settings` class (after `twilio_verify_service_sid`):

```python
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
```

- [ ] **Step 4: Create stripe_client.py**

Create `backend/app/stripe_client.py`:

```python
import stripe as _stripe
from app.config import settings

_stripe.api_key = settings.stripe_secret_key

stripe = _stripe
```

- [ ] **Step 5: Add env vars**

In `backend/.env` add:

```
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

Get keys from https://dashboard.stripe.com/test/apikeys (sign in or create free account).  
Get webhook secret after Step 9 (Task 8 webhook registration).

- [ ] **Step 6: Commit**

```bash
git add backend/app/stripe_client.py backend/app/config.py backend/requirements.txt
git commit -m "feat(backend): add Stripe client and config fields"
```

---

## Task 3: Bookings Router — POST /api/bookings

**Files:**
- Create: `backend/app/bookings/__init__.py`
- Create: `backend/app/bookings/router.py` (first endpoint only)

- [ ] **Step 1: Create module**

Create `backend/app/bookings/__init__.py` (empty file).

- [ ] **Step 2: Create router with CreateBooking endpoint**

Create `backend/app/bookings/router.py`:

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import date, timezone, datetime
from dateutil.relativedelta import relativedelta
from app.database import supabase_admin
from app.dependencies import get_current_user
from app.stripe_client import stripe

router = APIRouter()


class CreateBookingRequest(BaseModel):
    listing_id: str
    duration_months: Optional[int] = None  # required for rent
    start_date: Optional[str] = None        # ISO date YYYY-MM-DD, required for rent


@router.post("", status_code=201)
async def create_booking(
    body: CreateBookingRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create booking + Stripe PaymentIntent. Returns client_secret for frontend."""
    user_id = current_user["id"]

    # Fetch listing
    try:
        listing_res = (
            supabase_admin.table("listings")
            .select("id, owner_id, title, category, price, status, total_spots, filled_spots")
            .eq("id", body.listing_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = listing_res.data
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing["status"] != "active":
        raise HTTPException(status_code=400, detail="Listing not active")
    if listing["owner_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot book your own listing")
    if listing["category"] not in ("for_rent", "for_sale", "shared_housing"):
        raise HTTPException(status_code=400, detail="Invalid listing category")

    booking_type = "sale" if listing["category"] == "for_sale" else "rent"

    # For sale: block if already sold or has active booking
    if booking_type == "sale":
        if listing["status"] == "sold":
            raise HTTPException(status_code=409, detail="Listing already sold")
        conflict = (
            supabase_admin.table("bookings")
            .select("id")
            .eq("listing_id", body.listing_id)
            .in_("status", ["pending_confirmation", "active"])
            .execute()
        )
        if conflict.data:
            raise HTTPException(status_code=409, detail="Listing already has an active booking")

    # For rent: check not already rented (active booking exists)
    if booking_type == "rent":
        if not body.duration_months or body.duration_months < 1:
            raise HTTPException(status_code=400, detail="duration_months required for rent")
        if not body.start_date:
            raise HTTPException(status_code=400, detail="start_date required for rent")
        conflict = (
            supabase_admin.table("bookings")
            .select("id")
            .eq("listing_id", body.listing_id)
            .eq("renter_id", user_id)
            .in_("status", ["pending_payment", "pending_confirmation", "active"])
            .execute()
        )
        if conflict.data:
            raise HTTPException(status_code=409, detail="You already have an active booking for this listing")

    # Pricing
    monthly_price = float(listing["price"])
    duration = body.duration_months if booking_type == "rent" else 1
    total_price = round(monthly_price * duration, 2)
    platform_cut_pct = 5.0
    platform_cut_amount = round(total_price * platform_cut_pct / 100, 2)
    owner_amount = round(total_price - platform_cut_amount, 2)

    # Dates
    start = None
    end = None
    if booking_type == "rent":
        start = body.start_date
        end = (date.fromisoformat(body.start_date) + relativedelta(months=duration)).isoformat()

    # Create Stripe PaymentIntent
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(total_price * 100),  # piastres
            currency="egp",
            automatic_payment_methods={"enabled": True},
            metadata={
                "listing_id": body.listing_id,
                "renter_id": user_id,
                "booking_type": booking_type,
            },
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")

    # Insert booking
    booking_data = {
        "listing_id": body.listing_id,
        "renter_id": user_id,
        "owner_id": listing["owner_id"],
        "booking_type": booking_type,
        "start_date": start,
        "end_date": end,
        "duration_months": duration if booking_type == "rent" else None,
        "monthly_price": monthly_price if booking_type == "rent" else None,
        "total_price": total_price,
        "platform_cut_pct": platform_cut_pct,
        "platform_cut_amount": platform_cut_amount,
        "owner_amount": owner_amount,
        "status": "pending_payment",
        "stripe_payment_intent_id": intent.id,
    }

    try:
        result = (
            supabase_admin.table("bookings")
            .insert(booking_data)
            .select("id")
            .single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create booking: {e}")

    return {
        "booking_id": result.data["id"],
        "client_secret": intent.client_secret,
        "total_price": total_price,
        "platform_cut_amount": platform_cut_amount,
        "owner_amount": owner_amount,
        "booking_type": booking_type,
    }
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/bookings/
git commit -m "feat(bookings): add POST /api/bookings with Stripe PaymentIntent"
```

---

## Task 4: Bookings Router — GET Endpoints

**Files:**
- Modify: `backend/app/bookings/router.py` (append)

- [ ] **Step 1: Append GET endpoints to router.py**

Append to `backend/app/bookings/router.py`:

```python

@router.get("/my")
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    """Renter's own bookings."""
    user_id = current_user["id"]

    result = (
        supabase_admin.table("bookings")
        .select("*, listings(title, images, location, full_address)")
        .eq("renter_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    bookings = []
    for b in result.data or []:
        listing_data = b.pop("listings", None) or {}
        images = listing_data.get("images") or []
        bookings.append({
            **b,
            "listing_title": listing_data.get("title"),
            "listing_image": images[0] if images else None,
            "listing_location": listing_data.get("location"),
            "listing_full_address": listing_data.get("full_address"),
        })
    return bookings


@router.get("/received")
async def get_received_bookings(current_user: dict = Depends(get_current_user)):
    """Owner's received bookings, with disbursements for active rent bookings."""
    user_id = current_user["id"]

    result = (
        supabase_admin.table("bookings")
        .select("*, listings(title, images, location)")
        .eq("owner_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    bookings = []
    for b in result.data or []:
        listing_data = b.pop("listings", None) or {}
        images = listing_data.get("images") or []

        # Fetch renter profile
        renter_name = None
        renter_avatar = None
        try:
            profile_res = (
                supabase_admin.table("profiles")
                .select("full_name, avatar_url")
                .eq("id", b["renter_id"])
                .single()
                .execute()
            )
            if profile_res.data:
                renter_name = profile_res.data.get("full_name")
                renter_avatar = profile_res.data.get("avatar_url")
        except Exception:
            pass

        # Fetch disbursements if active rent
        disbursements = []
        if b.get("booking_type") == "rent" and b.get("status") == "active":
            disb_res = (
                supabase_admin.table("booking_disbursements")
                .select("*")
                .eq("booking_id", b["id"])
                .order("month_number")
                .execute()
            )
            disbursements = disb_res.data or []

        bookings.append({
            **b,
            "listing_title": listing_data.get("title"),
            "listing_image": images[0] if images else None,
            "listing_location": listing_data.get("location"),
            "renter_name": renter_name,
            "renter_avatar": renter_avatar,
            "disbursements": disbursements,
        })
    return bookings


@router.get("/{booking_id}")
async def get_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Single booking detail. Must be renter or owner."""
    user_id = current_user["id"]

    try:
        result = (
            supabase_admin.table("bookings")
            .select("*, listings(title, images, location, full_address)")
            .eq("id", booking_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Booking not found")

    b = result.data
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    if b["renter_id"] != user_id and b["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    listing_data = b.pop("listings", None) or {}
    images = listing_data.get("images") or []

    disbursements = []
    if b.get("booking_type") == "rent":
        disb_res = (
            supabase_admin.table("booking_disbursements")
            .select("*")
            .eq("booking_id", booking_id)
            .order("month_number")
            .execute()
        )
        disbursements = disb_res.data or []

    return {
        **b,
        "listing_title": listing_data.get("title"),
        "listing_image": images[0] if images else None,
        "listing_location": listing_data.get("location"),
        "listing_full_address": listing_data.get("full_address"),
        "disbursements": disbursements,
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/bookings/router.py
git commit -m "feat(bookings): add GET /my, /received, /{id} endpoints"
```

---

## Task 5: Bookings Router — Confirm & Vacate

**Files:**
- Modify: `backend/app/bookings/router.py` (append)

- [ ] **Step 1: Append confirm and vacate endpoints**

Append to `backend/app/bookings/router.py`:

```python

@router.post("/{booking_id}/confirm")
async def confirm_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Renter confirms they visited the property in person and it is real.
    Transitions booking from pending_confirmation → active.
    Creates monthly disbursement records for rent bookings.
    """
    user_id = current_user["id"]

    try:
        result = (
            supabase_admin.table("bookings")
            .select("*")
            .eq("id", booking_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking = result.data
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["renter_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the renter can confirm")
    if booking["status"] != "pending_confirmation":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot confirm booking in status '{booking['status']}'",
        )

    now = datetime.now(timezone.utc).isoformat()

    # Activate booking
    supabase_admin.table("bookings").update({
        "status": "active",
        "renter_confirmed_at": now,
    }).eq("id", booking_id).execute()

    # Rent: create disbursement schedule
    if booking["booking_type"] == "rent":
        start = date.fromisoformat(booking["start_date"])
        monthly = float(booking["monthly_price"])
        cut = float(booking["platform_cut_amount"])
        disbursements = []
        for i in range(1, booking["duration_months"] + 1):
            amount = round(monthly - cut, 2) if i == 1 else monthly
            disbursements.append({
                "booking_id": booking_id,
                "month_number": i,
                "amount": amount,
                "scheduled_date": (start + relativedelta(months=i - 1)).isoformat(),
                "status": "scheduled",
            })
        supabase_admin.table("booking_disbursements").insert(disbursements).execute()

        # Increment filled_spots (for shared_housing or multi-unit)
        try:
            listing = (
                supabase_admin.table("listings")
                .select("filled_spots, total_spots")
                .eq("id", booking["listing_id"])
                .single()
                .execute()
                .data
            )
            if listing:
                current = listing.get("filled_spots") or 0
                cap = listing.get("total_spots") or 9999
                supabase_admin.table("listings").update({
                    "filled_spots": min(current + 1, cap)
                }).eq("id", booking["listing_id"]).execute()
        except Exception:
            pass

    # Sale: mark listing sold
    if booking["booking_type"] == "sale":
        try:
            supabase_admin.table("listings").update(
                {"status": "sold"}
            ).eq("id", booking["listing_id"]).execute()
        except Exception:
            pass

    # Notify owner
    try:
        supabase_admin.table("notifications").insert({
            "user_id": booking["owner_id"],
            "type": "booking_confirmed",
            "title": "Booking Confirmed",
            "body": "Your property booking has been confirmed by the renter.",
            "metadata": {"booking_id": booking_id},
        }).execute()
    except Exception:
        pass

    return {"status": "active", "booking_id": booking_id}


@router.post("/{booking_id}/vacate")
async def vacate_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Either the renter or owner marks the tenancy as ended.
    Decrements filled_spots on the listing so it reopens.
    """
    user_id = current_user["id"]

    try:
        result = (
            supabase_admin.table("bookings")
            .select("*")
            .eq("id", booking_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking = result.data
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["renter_id"] != user_id and booking["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if booking["status"] != "active":
        raise HTTPException(status_code=400, detail="Booking is not active")

    vacated_by = "renter" if booking["renter_id"] == user_id else "owner"
    now = datetime.now(timezone.utc).isoformat()

    supabase_admin.table("bookings").update({
        "status": "completed",
        "tenant_vacated_at": now,
        "vacated_by": vacated_by,
    }).eq("id", booking_id).execute()

    # Decrement filled_spots for rent bookings
    if booking["booking_type"] == "rent":
        try:
            listing = (
                supabase_admin.table("listings")
                .select("filled_spots")
                .eq("id", booking["listing_id"])
                .single()
                .execute()
                .data
            )
            if listing:
                new_filled = max((listing.get("filled_spots") or 1) - 1, 0)
                supabase_admin.table("listings").update({
                    "filled_spots": new_filled
                }).eq("id", booking["listing_id"]).execute()
        except Exception:
            pass

    # Notify the other party
    other_uid = booking["owner_id"] if vacated_by == "renter" else booking["renter_id"]
    try:
        supabase_admin.table("notifications").insert({
            "user_id": other_uid,
            "type": "tenant_vacated",
            "title": "Tenant Has Vacated",
            "body": "The tenancy has been marked as ended. The listing is now available.",
            "metadata": {"booking_id": booking_id},
        }).execute()
    except Exception:
        pass

    return {"status": "completed", "vacated_by": vacated_by}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/bookings/router.py
git commit -m "feat(bookings): add confirm and vacate endpoints"
```

---

## Task 6: Bookings Router — Disbursement Request

**Files:**
- Modify: `backend/app/bookings/router.py` (append)

- [ ] **Step 1: Append disbursement request endpoint**

Append to `backend/app/bookings/router.py`:

```python

@router.post("/{booking_id}/disbursements/{month_number}/request")
async def request_disbursement(
    booking_id: str,
    month_number: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Owner requests release of a monthly payment.
    In demo mode this immediately marks the disbursement as released
    (no real Stripe transfer to owner's bank account).
    """
    user_id = current_user["id"]

    # Verify ownership
    try:
        booking = (
            supabase_admin.table("bookings")
            .select("owner_id, renter_id, status")
            .eq("id", booking_id)
            .single()
            .execute()
            .data
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Booking not found")

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can request disbursement")
    if booking["status"] != "active":
        raise HTTPException(status_code=400, detail="Booking is not active")

    # Fetch disbursement
    try:
        disb = (
            supabase_admin.table("booking_disbursements")
            .select("*")
            .eq("booking_id", booking_id)
            .eq("month_number", month_number)
            .single()
            .execute()
            .data
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Disbursement not found")

    if not disb:
        raise HTTPException(status_code=404, detail="Disbursement not found")
    if disb["status"] != "scheduled":
        raise HTTPException(status_code=400, detail=f"Disbursement already {disb['status']}")

    now = datetime.now(timezone.utc).isoformat()

    # Demo: mark released immediately (real impl would call stripe.Transfer.create)
    supabase_admin.table("booking_disbursements").update({
        "status": "released",
        "owner_requested_at": now,
        "released_at": now,
    }).eq("id", disb["id"]).execute()

    # Notify renter
    try:
        supabase_admin.table("notifications").insert({
            "user_id": booking["renter_id"],
            "type": "disbursement_released",
            "title": "Payment Released",
            "body": f"Month {month_number} rent payment has been released to the owner.",
            "metadata": {"booking_id": booking_id, "month_number": month_number},
        }).execute()
    except Exception:
        pass

    return {"status": "released", "month_number": month_number, "amount": float(disb["amount"])}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/bookings/router.py
git commit -m "feat(bookings): add disbursement request endpoint"
```

---

## Task 7: Lease Checker Background Task

**Files:**
- Create: `backend/app/bookings/lease_checker.py`

- [ ] **Step 1: Create lease_checker.py**

Create `backend/app/bookings/lease_checker.py`:

```python
"""
Daily background task that:
1. Auto-completes rent bookings whose end_date has passed.
2. Sends 7-day reminder notifications before lease end.
Both run once every 24 hours after the server starts.
"""

import asyncio
from datetime import date, timedelta, datetime, timezone


async def check_expired_leases() -> None:
    from app.database import supabase_admin

    today = date.today().isoformat()
    now = datetime.now(timezone.utc).isoformat()

    # --- Auto-complete overdue leases ---
    try:
        overdue = (
            supabase_admin.table("bookings")
            .select("id, renter_id, owner_id, listing_id, booking_type")
            .eq("status", "active")
            .eq("booking_type", "rent")
            .lte("end_date", today)
            .execute()
        )
        for booking in overdue.data or []:
            supabase_admin.table("bookings").update({
                "status": "completed",
                "tenant_vacated_at": now,
                "vacated_by": "system",
            }).eq("id", booking["id"]).execute()

            # Decrement filled_spots
            try:
                listing = (
                    supabase_admin.table("listings")
                    .select("filled_spots")
                    .eq("id", booking["listing_id"])
                    .single()
                    .execute()
                    .data
                )
                if listing:
                    new_filled = max((listing.get("filled_spots") or 1) - 1, 0)
                    supabase_admin.table("listings").update(
                        {"filled_spots": new_filled}
                    ).eq("id", booking["listing_id"]).execute()
            except Exception:
                pass

            # Notify both parties
            for uid in [booking["renter_id"], booking["owner_id"]]:
                try:
                    supabase_admin.table("notifications").insert({
                        "user_id": uid,
                        "type": "lease_ended",
                        "title": "Lease Ended",
                        "body": "Your lease period has ended. The property is now available for new bookings.",
                        "metadata": {"booking_id": booking["id"]},
                    }).execute()
                except Exception:
                    pass
    except Exception:
        pass

    # --- 7-day warnings ---
    warning_date = (date.today() + timedelta(days=7)).isoformat()
    try:
        ending_soon = (
            supabase_admin.table("bookings")
            .select("id, renter_id, owner_id")
            .eq("status", "active")
            .eq("booking_type", "rent")
            .eq("end_date", warning_date)
            .execute()
        )
        for booking in ending_soon.data or []:
            for uid in [booking["renter_id"], booking["owner_id"]]:
                try:
                    supabase_admin.table("notifications").insert({
                        "user_id": uid,
                        "type": "lease_ending_soon",
                        "title": "Lease Ending in 7 Days",
                        "body": "Your lease ends in 7 days. Please plan accordingly.",
                        "metadata": {"booking_id": booking["id"]},
                    }).execute()
                except Exception:
                    pass
    except Exception:
        pass


async def run_daily_lease_checker() -> None:
    """Runs check_expired_leases once every 24 hours."""
    while True:
        await asyncio.sleep(86400)
        await check_expired_leases()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/bookings/lease_checker.py
git commit -m "feat(bookings): add daily lease-expiry background task"
```

---

## Task 8: Stripe Webhook Handler

**Files:**
- Create: `backend/app/stripe_webhooks/__init__.py`
- Create: `backend/app/stripe_webhooks/router.py`

- [ ] **Step 1: Create module init**

Create `backend/app/stripe_webhooks/__init__.py` (empty file).

- [ ] **Step 2: Create webhook router**

Create `backend/app/stripe_webhooks/router.py`:

```python
from fastapi import APIRouter, HTTPException, Request
from app.database import supabase_admin
from app.config import settings
from app.stripe_client import stripe

router = APIRouter()


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handles Stripe events. Only processes payment_intent.succeeded.
    On success: booking status pending_payment → pending_confirmation,
    then notifies the renter to confirm after in-person visit.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "payment_intent.succeeded":
        pi_id = event["data"]["object"]["id"]

        result = (
            supabase_admin.table("bookings")
            .update({"status": "pending_confirmation"})
            .eq("stripe_payment_intent_id", pi_id)
            .eq("status", "pending_payment")
            .select("id, renter_id, booking_type")
            .execute()
        )

        if result.data:
            booking = result.data[0]
            booking_type_label = "property purchase" if booking["booking_type"] == "sale" else "booking"
            try:
                supabase_admin.table("notifications").insert({
                    "user_id": booking["renter_id"],
                    "type": "booking_paid",
                    "title": "Payment Successful",
                    "body": (
                        f"Your payment was received. Please visit the property in person "
                        f"and confirm your {booking_type_label} from your dashboard."
                    ),
                    "metadata": {"booking_id": booking["id"]},
                }).execute()
            except Exception:
                pass

    return {"received": True}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/stripe_webhooks/
git commit -m "feat(stripe): add webhook handler for payment_intent.succeeded"
```

---

## Task 9: Register Routers + Lifespan in main.py

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Update main.py**

Replace the full contents of `backend/app/main.py` with:

```python
from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.auth.router import router as auth_router
from app.listings.router import router as listings_router
from app.dashboard.router import router as dashboard_router
from app.notifications.router import router as notifications_router
from app.agencies.router import router as agencies_router
from app.viewings.router import router as viewings_router
from app.blog.router import router as blog_router
from app.admin.router import router as admin_router
from app.ai.router import router as ai_router
from app.uploads.router import router as uploads_router
from app.applications.router import router as applications_router
from app.projects.router import router as projects_router
from app.leads.router import router as leads_router
from app.bookings.router import router as bookings_router
from app.stripe_webhooks.router import router as stripe_webhooks_router
from app.bookings.lease_checker import run_daily_lease_checker


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(run_daily_lease_checker())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="AXIOM V2 API",
    version="2.0.0",
    description="AI-powered real estate platform API for Egypt",
    lifespan=lifespan,
)

_dev_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        _dev_origins if settings.environment == "development" else [settings.frontend_url]
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}


app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(listings_router, prefix="/api/listings", tags=["listings"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
app.include_router(agencies_router, prefix="/api/agencies", tags=["agencies"])
app.include_router(viewings_router, prefix="/api/viewings", tags=["viewings"])
app.include_router(blog_router, prefix="/api/blog", tags=["blog"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(ai_router, prefix="/api/ai", tags=["ai"])
app.include_router(uploads_router, prefix="/api/uploads", tags=["uploads"])
app.include_router(applications_router, prefix="/api/applications", tags=["applications"])
app.include_router(projects_router, prefix="/api/projects", tags=["projects"])
app.include_router(leads_router, prefix="/api", tags=["leads"])
app.include_router(bookings_router, prefix="/api/bookings", tags=["bookings"])
app.include_router(stripe_webhooks_router, prefix="/api/stripe", tags=["stripe"])
```

- [ ] **Step 2: Test server starts**

```bash
cd backend
uvicorn app.main:app --reload
```

Expected: server starts, no import errors, `GET http://localhost:8000/api/health` returns `{"status":"ok"}`.

- [ ] **Step 3: Register Stripe webhook (dev)**

In a separate terminal run the Stripe CLI to forward webhooks to the dev server:

```bash
stripe listen --forward-to localhost:8000/api/stripe/webhook
```

Copy the `whsec_...` secret printed to the terminal into `backend/.env` as `STRIPE_WEBHOOK_SECRET`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/main.py
git commit -m "feat(backend): register bookings + stripe routers, add lifespan lease checker"
```

---

## Task 10: Frontend TypeScript Types

**Files:**
- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Add types at end of api.ts**

Append to `frontend/src/types/api.ts`:

```typescript
// ── Bookings ──

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
  listing_full_address: string | null;
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
  // present in /received response only
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

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(types): add BookingBrief, BookingDisbursement, CreateBookingResponse"
```

---

## Task 11: Install Stripe Frontend Packages

**Files:**
- Modify: `frontend/package.json` (via npm)
- Modify: `frontend/.env.local`

- [ ] **Step 1: Install packages**

```bash
cd frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

Expected: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Add publishable key env var**

In `frontend/.env.local` add:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

Get key from https://dashboard.stripe.com/test/apikeys (Publishable key).

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): install @stripe/stripe-js and @stripe/react-stripe-js"
```

---

## Task 12: Frontend Query Factories

**Files:**
- Modify: `frontend/src/lib/queries.ts`

- [ ] **Step 1: Add imports to queries.ts**

At the top of `frontend/src/lib/queries.ts`, add to the existing import block:

```typescript
import type {
  // ... existing imports ...
  BookingBrief,
  CreateBookingResponse,
} from "@/types/api";
```

- [ ] **Step 2: Append booking queries and mutations**

Append to `frontend/src/lib/queries.ts`:

```typescript
// ── Bookings ──

export interface CreateBookingInput {
  listing_id: string;
  duration_months?: number;
  start_date?: string;
}

export const bookingsQueries = {
  my: () => ({
    queryKey: ["bookings", "my"],
    queryFn: () => api.get<BookingBrief[]>("/api/bookings/my"),
  }),

  received: () => ({
    queryKey: ["bookings", "received"],
    queryFn: () => api.get<BookingBrief[]>("/api/bookings/received"),
  }),

  detail: (id: string) => ({
    queryKey: ["bookings", id],
    queryFn: () => api.get<BookingBrief>(`/api/bookings/${id}`),
  }),
};

export const createBookingMutation = {
  mutationFn: (data: CreateBookingInput) =>
    api.post<CreateBookingResponse>("/api/bookings", data),
};

export const confirmBookingMutation = {
  mutationFn: (bookingId: string) =>
    api.post<{ status: string; booking_id: string }>(
      `/api/bookings/${bookingId}/confirm`
    ),
};

export const vacateBookingMutation = {
  mutationFn: (bookingId: string) =>
    api.post<{ status: string; vacated_by: string }>(
      `/api/bookings/${bookingId}/vacate`
    ),
};

export const requestDisbursementMutation = {
  mutationFn: ({
    bookingId,
    monthNumber,
  }: {
    bookingId: string;
    monthNumber: number;
  }) =>
    api.post<{ status: string; month_number: number; amount: number }>(
      `/api/bookings/${bookingId}/disbursements/${monthNumber}/request`
    ),
};
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/queries.ts
git commit -m "feat(queries): add booking query factories and mutations"
```

---

## Task 13: BookingModal Component

**Files:**
- Create: `frontend/src/components/booking/BookingModal.tsx`

- [ ] **Step 1: Create BookingModal.tsx**

Create `frontend/src/components/booking/BookingModal.tsx`:

```typescript
"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createBookingMutation } from "@/lib/queries";
import type { ListingDetail, CreateBookingResponse } from "@/types/api";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// ── Inner Stripe payment form (must be inside <Elements>) ──

function PaymentForm({
  clientSecret,
  onSuccess,
}: {
  clientSecret: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setPaying(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: { card } }
    );

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Try again.");
      setPaying(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-white/10 bg-white/5 p-3">
        <CardElement
          options={{
            style: {
              base: {
                color: "#ffffff",
                fontSize: "15px",
                "::placeholder": { color: "#6b7280" },
              },
              invalid: { color: "#f87171" },
            },
          }}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button
        onClick={handlePay}
        disabled={paying || !stripe}
        className="w-full"
      >
        {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {paying ? "Processing…" : "Confirm Payment"}
      </Button>
      <p className="text-center text-xs text-gray-500">
        Test card: 4242 4242 4242 4242 · any expiry · any CVC
      </p>
    </div>
  );
}

// ── Booking Modal ──

interface BookingModalProps {
  listing: ListingDetail;
  open: boolean;
  onClose: () => void;
}

export default function BookingModal({
  listing,
  open,
  onClose,
}: BookingModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [duration, setDuration] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [bookingData, setBookingData] = useState<CreateBookingResponse | null>(
    null
  );

  const isRent = listing.category !== "for_sale";
  const durationMonths = isRent ? parseInt(duration) : 1;
  const totalPrice = listing.price * durationMonths;
  const platformCut = Math.round(totalPrice * 0.05 * 100) / 100;

  const todayStr = new Date().toISOString().split("T")[0];

  const { mutate: startBooking, isPending } = useMutation({
    ...createBookingMutation,
    onSuccess: (data) => {
      setBookingData(data);
      setStep("payment");
    },
  });

  const handleSubmitForm = () => {
    if (isRent && !startDate) return;
    startBooking({
      listing_id: listing.id,
      duration_months: isRent ? durationMonths : undefined,
      start_date: isRent ? startDate : undefined,
    });
  };

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    setStep("success");
  };

  const handleClose = () => {
    setStep("form");
    setDuration("1");
    setStartDate("");
    setBookingData(null);
    onClose();
  };

  const listingImage = listing.images?.[0];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md border-white/10 bg-[#0d1117] text-white">
        <DialogHeader>
          <DialogTitle>
            {step === "success"
              ? "Booking Confirmed!"
              : isRent
              ? "Book This Property"
              : "Purchase This Property"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Form ── */}
        {step === "form" && (
          <div className="space-y-4">
            {/* Listing summary */}
            <div className="flex gap-3 rounded-md border border-white/10 bg-white/5 p-3">
              {listingImage && (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded">
                  <Image
                    src={listingImage}
                    alt={listing.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{listing.title}</p>
                <p className="text-xs text-gray-400">{listing.location}</p>
                <p className="mt-1 text-sm text-primary">
                  EGP {listing.price.toLocaleString()}
                  {isRent ? "/mo" : ""}
                </p>
              </div>
            </div>

            {/* Rent-only fields */}
            {isRent && (
              <>
                <div className="space-y-1">
                  <Label>Move-in Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    min={todayStr}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-white/10 bg-white/5"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="border-white/10 bg-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 6, 12].map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m} month{m > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Price breakdown */}
            <div className="space-y-2 rounded-md border border-white/10 p-3 text-sm">
              {isRent && (
                <div className="flex justify-between text-gray-400">
                  <span>
                    EGP {listing.price.toLocaleString()} × {durationMonths}{" "}
                    month{durationMonths > 1 ? "s" : ""}
                  </span>
                  <span>EGP {totalPrice.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-400">
                <span>Platform fee (5%)</span>
                <span>EGP {platformCut.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 font-semibold">
                <span>Total due now</span>
                <span>EGP {totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <Button
              onClick={handleSubmitForm}
              disabled={isPending || (isRent && !startDate)}
              className="w-full"
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Continue to Payment
            </Button>
          </div>
        )}

        {/* ── Step 2: Payment ── */}
        {step === "payment" && bookingData && (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: bookingData.client_secret }}
          >
            <div className="space-y-4">
              <div className="rounded-md border border-white/10 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total charged</span>
                  <span className="font-semibold">
                    EGP {bookingData.total_price.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>Platform fee included</span>
                  <span>EGP {bookingData.platform_cut_amount.toLocaleString()}</span>
                </div>
              </div>
              <PaymentForm
                clientSecret={bookingData.client_secret}
                onSuccess={handlePaymentSuccess}
              />
            </div>
          </Elements>
        )}

        {/* ── Step 3: Success ── */}
        {step === "success" && (
          <div className="space-y-3 py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-400" />
            <p className="font-semibold">Payment received!</p>
            <p className="text-sm text-gray-400">
              Visit the property in person to verify it's real, then confirm
              your booking from your dashboard to release the first payment.
            </p>
            <Button
              className="w-full"
              onClick={() => {
                handleClose();
                window.location.href = `/booking/${bookingData?.booking_id}`;
              }}
            >
              View My Booking
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/booking/BookingModal.tsx
git commit -m "feat(booking): add BookingModal with Stripe Elements payment form"
```

---

## Task 14: BookNowButton Component

**Files:**
- Create: `frontend/src/components/booking/BookNowButton.tsx`

- [ ] **Step 1: Create BookNowButton.tsx**

Create `frontend/src/components/booking/BookNowButton.tsx`:

```typescript
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import type { ListingDetail } from "@/types/api";

const BookingModal = dynamic(() => import("./BookingModal"), { ssr: false });

interface BookNowButtonProps {
  listing: ListingDetail;
}

export default function BookNowButton({ listing }: BookNowButtonProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isForSale = listing.category === "for_sale";

  // For sale: block if already sold
  if (listing.status === "sold") {
    return (
      <Button disabled variant="outline" className="w-full">
        Sold
      </Button>
    );
  }

  const handleClick = () => {
    if (!user) {
      router.push(`/login?next=/property/${listing.id}`);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button onClick={handleClick} className="w-full">
        {isForSale ? "Buy Now" : "Book & Pay"}
      </Button>
      {open && (
        <BookingModal
          listing={listing}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/booking/BookNowButton.tsx
git commit -m "feat(booking): add BookNowButton client wrapper"
```

---

## Task 15: Booking Status Page

**Files:**
- Create: `frontend/src/app/booking/[id]/page.tsx`

- [ ] **Step 1: Create booking status page**

Create `frontend/src/app/booking/[id]/page.tsx`:

```typescript
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import {
  bookingsQueries,
  confirmBookingMutation,
  vacateBookingMutation,
  requestDisbursementMutation,
} from "@/lib/queries";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock, MapPin, CalendarDays } from "lucide-react";
import type { BookingDisbursement } from "@/types/api";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting Payment",
  pending_confirmation: "Awaiting Your Confirmation",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  pending_confirmation: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  active: "bg-green-500/20 text-green-300 border-green-500/30",
  completed: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
};

const DISB_COLORS: Record<string, string> = {
  scheduled: "bg-gray-500/20 text-gray-300",
  released: "bg-green-500/20 text-green-300",
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    ...bookingsQueries.detail(id),
    enabled: !!user,
  });

  const { mutate: confirm, isPending: confirming } = useMutation({
    ...confirmBookingMutation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings", id] }),
  });

  const { mutate: vacate, isPending: vacating } = useMutation({
    ...vacateBookingMutation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings", id] }),
  });

  const { mutate: requestDisb, isPending: requestingDisb } = useMutation({
    ...requestDisbursementMutation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings", id] }),
  });

  if (!user) {
    router.replace(`/login?next=/booking/${id}`);
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <p className="py-20 text-center text-gray-400">Booking not found.</p>
    );
  }

  const isRenter = booking.renter_id === user.id;
  const isOwner = booking.owner_id === user.id;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {booking.listing_title ?? "Booking"}
          </h1>
          {booking.listing_location && (
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-400">
              <MapPin className="h-3 w-3" />
              {booking.listing_full_address ?? booking.listing_location}
            </p>
          )}
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            STATUS_COLORS[booking.status] ?? ""
          }`}
        >
          {STATUS_LABELS[booking.status] ?? booking.status}
        </span>
      </div>

      {/* Listing image */}
      {booking.listing_image && (
        <div className="relative mb-6 h-52 w-full overflow-hidden rounded-xl">
          <Image
            src={booking.listing_image}
            alt={booking.listing_title ?? "Listing"}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Price summary */}
      <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm">
        {booking.booking_type === "rent" && (
          <>
            <div className="flex justify-between text-gray-400">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {booking.start_date} → {booking.end_date}
              </span>
              <span>{booking.duration_months} months</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Monthly price</span>
              <span>EGP {booking.monthly_price?.toLocaleString()}</span>
            </div>
          </>
        )}
        <div className="flex justify-between text-gray-400">
          <span>Platform fee (5%)</span>
          <span>EGP {booking.platform_cut_amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-2 font-semibold">
          <span>Total paid</span>
          <span>EGP {booking.total_price.toLocaleString()}</span>
        </div>
      </div>

      {/* Renter: confirm after in-person visit */}
      {isRenter && booking.status === "pending_confirmation" && (
        <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <p className="mb-3 text-sm text-blue-200">
            Have you visited the property and confirmed it's real? Click below
            to activate your booking and release the first payment to the owner.
          </p>
          <Button
            onClick={() => confirm(booking.id)}
            disabled={confirming}
            className="w-full"
          >
            {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Confirm — Property Is Real
          </Button>
        </div>
      )}

      {/* Either party: vacate */}
      {booking.status === "active" && (isRenter || isOwner) && (
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => vacate(booking.id)}
            disabled={vacating}
            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            {vacating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRenter ? "I Have Moved Out" : "Confirm Tenant Has Vacated"}
          </Button>
        </div>
      )}

      {/* Disbursement schedule (both parties, rent active) */}
      {booking.booking_type === "rent" &&
        booking.status === "active" &&
        booking.disbursements.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-white">
              Monthly Payment Schedule
            </h2>
            <div className="space-y-2">
              {booking.disbursements.map((d: BookingDisbursement) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Month {d.month_number}
                    </p>
                    <p className="text-xs text-gray-400">{d.scheduled_date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      EGP {d.amount.toLocaleString()}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        DISB_COLORS[d.status]
                      }`}
                    >
                      {d.status === "released" ? "Paid" : "Pending"}
                    </span>
                    {isOwner && d.status === "scheduled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          requestDisb({
                            bookingId: booking.id,
                            monthNumber: d.month_number,
                          })
                        }
                        disabled={requestingDisb}
                        className="h-7 px-2 text-xs"
                      >
                        Request
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Completed state */}
      {booking.status === "completed" && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-400" />
          <p className="text-sm text-green-300">
            This booking has been completed.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/booking/
git commit -m "feat(booking): add booking status and confirmation page"
```

---

## Task 16: MyBookingsTab (Renter Dashboard)

**Files:**
- Create: `frontend/src/components/dashboard/MyBookingsTab.tsx`

- [ ] **Step 1: Create MyBookingsTab.tsx**

Create `frontend/src/components/dashboard/MyBookingsTab.tsx`:

```typescript
"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { bookingsQueries } from "@/lib/queries";
import { Loader2, MapPin, CalendarDays, ArrowRight } from "lucide-react";
import type { BookingBrief } from "@/types/api";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting Payment",
  pending_confirmation: "Needs Confirmation",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-yellow-500/20 text-yellow-300",
  pending_confirmation: "bg-blue-500/20 text-blue-300",
  active: "bg-green-500/20 text-green-300",
  completed: "bg-gray-500/20 text-gray-400",
  cancelled: "bg-red-500/20 text-red-400",
};

export default function MyBookingsTab() {
  const { data: bookings, isLoading } = useQuery(bookingsQueries.my());

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!bookings?.length) {
    return (
      <p className="py-16 text-center text-gray-400">
        No bookings yet.{" "}
        <Link href="/find-homes" className="text-primary underline">
          Find a property
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((b: BookingBrief) => (
        <Link
          key={b.id}
          href={`/booking/${b.id}`}
          className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
        >
          {/* Image */}
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
            {b.listing_image ? (
              <Image
                src={b.listing_image}
                alt={b.listing_title ?? "Listing"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-white/10" />
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-white">
              {b.listing_title ?? "Listing"}
            </p>
            {b.listing_location && (
              <p className="flex items-center gap-1 truncate text-xs text-gray-400">
                <MapPin className="h-3 w-3 shrink-0" />
                {b.listing_location}
              </p>
            )}
            {b.booking_type === "rent" && b.start_date && (
              <p className="flex items-center gap-1 text-xs text-gray-400">
                <CalendarDays className="h-3 w-3 shrink-0" />
                {b.start_date} → {b.end_date}
              </p>
            )}
            <p className="mt-1 text-sm font-semibold text-primary">
              EGP {b.total_price.toLocaleString()}
            </p>
          </div>

          {/* Status + arrow */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                STATUS_COLOR[b.status] ?? ""
              }`}
            >
              {STATUS_LABEL[b.status] ?? b.status}
            </span>
            <ArrowRight className="h-4 w-4 text-gray-500" />
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard/MyBookingsTab.tsx
git commit -m "feat(dashboard): add MyBookingsTab for renter bookings"
```

---

## Task 17: BookingsReceivedTab (Owner Dashboard)

**Files:**
- Create: `frontend/src/components/dashboard/BookingsReceivedTab.tsx`

- [ ] **Step 1: Create BookingsReceivedTab.tsx**

Create `frontend/src/components/dashboard/BookingsReceivedTab.tsx`:

```typescript
"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingsQueries, requestDisbursementMutation } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MapPin, CalendarDays, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { BookingBrief, BookingDisbursement } from "@/types/api";

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-yellow-500/20 text-yellow-300",
  pending_confirmation: "bg-blue-500/20 text-blue-300",
  active: "bg-green-500/20 text-green-300",
  completed: "bg-gray-500/20 text-gray-400",
  cancelled: "bg-red-500/20 text-red-400",
};

export default function BookingsReceivedTab() {
  const queryClient = useQueryClient();
  const { data: bookings, isLoading } = useQuery(bookingsQueries.received());
  const [expanded, setExpanded] = useState<string | null>(null);

  const { mutate: requestDisb, isPending: requesting } = useMutation({
    ...requestDisbursementMutation,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["bookings", "received"] }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!bookings?.length) {
    return (
      <p className="py-16 text-center text-gray-400">
        No bookings received yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((b: BookingBrief) => {
        const isExpanded = expanded === b.id;
        return (
          <div
            key={b.id}
            className="rounded-xl border border-white/10 bg-white/5"
          >
            {/* Header row */}
            <div className="flex items-center gap-4 p-4">
              {/* Listing image */}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                {b.listing_image ? (
                  <Image
                    src={b.listing_image}
                    alt={b.listing_title ?? "Listing"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-white/10" />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">
                  {b.listing_title}
                </p>
                {b.listing_location && (
                  <p className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin className="h-3 w-3" />
                    {b.listing_location}
                  </p>
                )}
                {b.booking_type === "rent" && b.start_date && (
                  <p className="flex items-center gap-1 text-xs text-gray-400">
                    <CalendarDays className="h-3 w-3" />
                    {b.start_date} → {b.end_date}
                  </p>
                )}
              </div>

              {/* Right: renter + status + expand */}
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={b.renter_avatar ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {b.renter_name?.[0] ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-300">
                    {b.renter_name ?? "Renter"}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLOR[b.status] ?? ""
                  }`}
                >
                  {b.status}
                </span>
                <p className="text-sm font-semibold text-primary">
                  EGP {b.owner_amount.toLocaleString()} to you
                </p>
              </div>

              {/* Expand toggle (active rent only) */}
              {b.booking_type === "rent" &&
                b.status === "active" &&
                b.disbursements.length > 0 && (
                  <button
                    onClick={() =>
                      setExpanded(isExpanded ? null : b.id)
                    }
                    className="ml-2 shrink-0 rounded-full p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
            </div>

            {/* Disbursement schedule (expanded) */}
            {isExpanded &&
              b.booking_type === "rent" &&
              b.disbursements.length > 0 && (
                <div className="border-t border-white/10 px-4 pb-4 pt-3">
                  <p className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Monthly Payments
                  </p>
                  <div className="space-y-2">
                    {b.disbursements.map((d: BookingDisbursement) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm">Month {d.month_number}</p>
                          <p className="text-xs text-gray-400">
                            Due {d.scheduled_date}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">
                            EGP {d.amount.toLocaleString()}
                          </span>
                          {d.status === "released" ? (
                            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-300">
                              Paid
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                requestDisb({
                                  bookingId: b.id,
                                  monthNumber: d.month_number,
                                })
                              }
                              disabled={requesting}
                              className="h-7 px-3 text-xs"
                            >
                              {requesting ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Request Payment"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/dashboard/BookingsReceivedTab.tsx
git commit -m "feat(dashboard): add BookingsReceivedTab for owner bookings + disbursements"
```

---

## Task 18: Dashboard — Add Booking Tabs

**Files:**
- Modify: `frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Replace dashboard/page.tsx**

Replace the full contents of `frontend/src/app/dashboard/page.tsx` with:

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardProfile from "@/components/dashboard/DashboardProfile";
import DashboardStats from "@/components/dashboard/DashboardStats";
import MyListings from "@/components/dashboard/MyListings";
import dynamic from "next/dynamic";
const AddListingModal = dynamic(
  () => import("@/components/dashboard/AddListingModal"),
  { ssr: false }
);
import LikedProperties from "@/components/dashboard/LikedProperties";
import MyViewings from "@/components/dashboard/MyViewings";
import MyBookingsTab from "@/components/dashboard/MyBookingsTab";
import BookingsReceivedTab from "@/components/dashboard/BookingsReceivedTab";
import { dashboardQueries } from "@/lib/queries";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import type { ApiDashboardListing } from "@/types/api";
import type {
  UserProfile,
  AnalyticsStat,
  DashboardListing,
  DashboardViewingBrief,
} from "@/types";

function mapListing(listing: ApiDashboardListing): DashboardListing {
  const statusMap: Record<string, DashboardListing["status"]> = {
    active: "active",
    pending: "pending",
    rejected: "rejected",
    draft: "draft",
  };
  return {
    id: listing.id,
    name: listing.title,
    listingId: `LIST-${listing.id.slice(0, 6).toUpperCase()}`,
    image: listing.images[0] ?? undefined,
    location: listing.full_address || listing.location,
    status: statusMap[listing.status] ?? "draft",
    price: `EGP ${listing.price.toLocaleString()}`,
    priceSuffix: listing.category === "for_rent" ? "/mo" : undefined,
    views: `${listing.views_count}`,
  };
}

export default function DashboardPage() {
  const { user, isInitialized } = useAuthStore();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    ...dashboardQueries.me(),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login?redirect=/dashboard");
    }
  }, [isInitialized, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-20 text-center text-red-400">
        Failed to load dashboard. Please try again.
      </p>
    );
  }

  const profile: UserProfile = {
    name: user?.full_name || user?.email?.split("@")[0] || "User",
    avatar: user?.avatar_url || "",
    isVerifiedSeller: user?.is_verified_seller ?? false,
    subtitle: "AXIOM Member",
    info: [
      { label: "Email", value: user?.email ?? "" },
      { label: "Phone", value: "Not set" },
      { label: "Country", value: "+20" },
    ],
  };

  const analyticsStats: AnalyticsStat[] = [
    {
      label: "Active Listings",
      value: String(data?.active_count ?? 0),
      icon: "TrendingUp",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      bars: [30, 50, 40, 70, 60, 80, 65],
      barColor: "bg-primary",
      trendPercent: "0%",
      trendUp: true,
    },
    {
      label: "Pending Review",
      value: String(data?.pending_count ?? 0),
      icon: "Clock",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      bars: [20, 30, 25, 40, 35, 50, 45],
      barColor: "bg-amber-500",
      trendPercent: "0%",
      trendUp: false,
    },
  ];

  const listings = (data?.listings ?? []).map(mapListing);
  const viewings: DashboardViewingBrief[] = [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 2xl:max-w-[1600px]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      </div>

      <DashboardProfile user={profile} />
      <DashboardStats stats={analyticsStats} />

      <Tabs defaultValue="listings" className="mt-8">
        <TabsList className="mb-6 flex-wrap gap-1 h-auto">
          <TabsTrigger value="listings">My Listings</TabsTrigger>
          <TabsTrigger value="bookings_received">Bookings Received</TabsTrigger>
          <TabsTrigger value="my_bookings">My Bookings</TabsTrigger>
          <TabsTrigger value="liked">Liked</TabsTrigger>
          <TabsTrigger value="viewings">Viewings</TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <MyListings
            listings={listings}
            onAddNew={() => setModalOpen(true)}
          />
        </TabsContent>

        <TabsContent value="bookings_received">
          <BookingsReceivedTab />
        </TabsContent>

        <TabsContent value="my_bookings">
          <MyBookingsTab />
        </TabsContent>

        <TabsContent value="liked">
          <LikedProperties />
        </TabsContent>

        <TabsContent value="viewings">
          <MyViewings viewings={viewings} />
        </TabsContent>
      </Tabs>

      <AddListingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
```

**Note on field names:** `dashboardQueries.me()` returns `DashboardResponse` which has `active_count` and `pending_count` (not `data.active` / `data.pending` from the old `getDashboardListings` call). The stats section above uses `data?.active_count` and `data?.pending_count`.

- [ ] **Step 2: Check DashboardResponse has active_count / pending_count**

Open `frontend/src/types/api.ts` and verify `DashboardResponse` has these fields. The backend `GET /api/dashboard/me` returns `analytics` array (not direct count fields).

If `DashboardResponse` doesn't have `active_count` / `pending_count`, update the stats values to use `data?.listings?.filter(l => l.status === "active").length ?? 0` instead:

```typescript
value: String(data?.listings?.filter(l => l.status === "active").length ?? 0),
// and
value: String(data?.listings?.filter(l => l.status === "pending").length ?? 0),
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/page.tsx
git commit -m "feat(dashboard): add My Bookings and Bookings Received tabs"
```

---

## Task 19: Property Page — Add BookNowButton

**Files:**
- Modify: `frontend/src/app/property/[id]/page.tsx`

- [ ] **Step 1: Add BookNowButton import and placement**

In `frontend/src/app/property/[id]/page.tsx`:

Add import after the existing imports:

```typescript
import BookNowButton from "@/components/booking/BookNowButton";
```

In the **regular property layout** (the `return` block starting at line 150), after `<PropertySidebar property={property} />`, add `BookNowButton`:

```typescript
  // Regular property layout
  return (
    <main className="max-w-[1600px] mx-auto pb-28 md:pb-20">
      <PropertyHero property={property} />
      <div className="px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col lg:flex-row gap-12">
          <PropertyInfo property={property} />
          <div className="lg:w-[30%] space-y-4">
            <PropertySidebar property={property} />
            {(property.category === "for_rent" ||
              property.category === "for_sale") && (
              <BookNowButton listing={data} />
            )}
          </div>
        </div>
      </div>
      <MobilePropertyCTA
        price={property.price}
        category={property.category}
        listingId={property.id}
        contactPhone={property.contactPhone}
        contactName={property.contactName}
      />
    </main>
  );
```

Note: `data` is the raw `ListingDetailWithSimilar` — pass it directly to `BookNowButton` since `ListingDetail` is the base type.

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/property/
git commit -m "feat(property): add BookNowButton for for_rent and for_sale listings"
```

---

## Task 20: Final Check + ROADMAP

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Full TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Test full flow manually**

1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Start Stripe webhook forwarder: `stripe listen --forward-to localhost:8000/api/stripe/webhook`
4. Navigate to a `for_rent` listing → verify "Book & Pay" button appears
5. Click "Book & Pay" → fill move-in date + duration → click "Continue to Payment"
6. Enter test card `4242 4242 4242 4242`, any expiry, any CVC → "Confirm Payment"
7. Verify Stripe CLI shows `payment_intent.succeeded` event forwarded
8. Click "View My Booking" → booking page shows "Awaiting Your Confirmation"
9. Click "Confirm — Property Is Real" → status changes to "Active", disbursement schedule appears
10. Navigate to `/dashboard` → "Bookings Received" tab shows the booking with "Request Payment" buttons
11. Click "Request Payment" on month 1 → status changes to "Paid"
12. Click "I Have Moved Out" on booking page → status changes to "Completed"

- [ ] **Step 3: Update ROADMAP.md**

Mark payment & booking system as complete in `docs/ROADMAP.md`.

- [ ] **Step 4: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: mark payment and booking system as complete in ROADMAP"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|-------------|------|
| Stripe sandbox integration | Tasks 2, 3, 8 |
| 5% platform cut from first month | Tasks 3, 5 |
| Upfront full duration payment | Task 3 |
| Owner requests monthly disbursements | Tasks 6, 17 |
| Renter in-person confirmation before activation | Tasks 5, 15 |
| For-sale full payment | Task 3 (booking_type=sale branch) |
| Lease end auto-reopens spot | Task 7 |
| 7-day lease end reminder | Task 7 |
| Owner/renter early vacate | Tasks 5, 15 |
| Dashboard tabs (renter + owner) | Tasks 16, 17, 18 |
| BookNowButton on property page | Tasks 14, 19 |
| DB schema | Task 1 |

All requirements covered. No placeholders found.

**Type consistency check:**
- `BookingBrief` defined Task 10 → used in Tasks 15, 16, 17 ✓
- `BookingDisbursement` defined Task 10 → used in Tasks 15, 17 ✓
- `CreateBookingResponse` defined Task 10 → used in Task 13 ✓
- `bookingsQueries` defined Task 12 → used in Tasks 15, 16, 17 ✓
- `confirmBookingMutation` defined Task 12 → used in Task 15 ✓
- `vacateBookingMutation` defined Task 12 → used in Task 15 ✓
- `requestDisbursementMutation` defined Task 12 → used in Tasks 15, 17 ✓
- `createBookingMutation` defined Task 12 → used in Task 13 ✓
