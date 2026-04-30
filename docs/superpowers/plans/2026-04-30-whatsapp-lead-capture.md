# WhatsApp Lead Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the in-app messaging system entirely and replace listing contact CTAs with WhatsApp deep links that silently record a lead (user name + phone + listing) in the database for agency billing.

**Architecture:** New `leads` table with `UNIQUE(user_id, listing_id)` dedup. Backend `POST /api/leads` resolves the correct WhatsApp target (agency phone or owner phone) and returns a `wa.me/` URL. Frontend replaces `MessageOwnerModal` with a `WhatsAppCTA` component in all three contact surfaces. Admin dashboard gains a read-only Leads tab.

**Tech Stack:** FastAPI + Supabase (backend), Next.js 16 / TypeScript / Tailwind / TanStack Query (frontend), `wa.me` deep links (WhatsApp)

**Design spec:** `docs/superpowers/specs/2026-04-30-whatsapp-lead-capture-design.md`

---

## File Map

**Backend — create**
- `backend/app/leads/__init__.py`
- `backend/app/leads/schemas.py`
- `backend/app/leads/router.py`
- `backend/tests/test_leads.py`

**Backend — modify**
- `backend/app/main.py` — remove messages import/router, add leads import/router
- `backend/app/listings/schemas.py` — add `contact_phone`, `contact_name` to `ListingDetailResponse`
- `backend/app/listings/router.py` — join agency/owner phone in `get_listing`
- `backend/app/dashboard/router.py` — remove `recent_messages` block + return key

**Backend — delete**
- `backend/app/messages/` (entire directory)
- `backend/tests/test_messages.py`

**Frontend — create**
- `frontend/src/components/property/WhatsAppCTA.tsx`

**Frontend — modify**
- `frontend/src/types/api.ts` — add `contact_phone`, `contact_name` to `ListingDetail`; remove message types
- `frontend/src/types/index.ts` — add `contactPhone`, `contactName` to `PropertyDetail`; remove message types
- `frontend/src/app/property/[id]/page.tsx` — map contact fields in `mapProperty()`; pass contact props to `SharedHousingSidebar`
- `frontend/src/components/property/PropertySidebar.tsx` — replace `MessageOwnerModal` with `WhatsAppCTA`
- `frontend/src/components/property/MobilePropertyCTA.tsx` — replace `MessageOwnerModal` with `WhatsAppCTA`
- `frontend/src/components/shared-housing/SharedHousingSidebar.tsx` — replace "Message Owner" with `WhatsAppCTA`
- `frontend/src/components/auth/SignUpForm.tsx` — make phone required
- `frontend/src/app/admin/dashboard/page.tsx` — add Leads section to `SECTIONS`
- `frontend/src/lib/queries.ts` — remove `messagesQueries`
- `frontend/src/components/layout/Navbar.tsx` — remove `/messages` nav links
- `frontend/src/components/layout/NotificationBell.tsx` — remove `new_message` handler
- `frontend/src/lib/constants.ts` — remove message mock fixtures

**Frontend — delete**
- `frontend/src/app/messages/page.tsx`
- `frontend/src/app/messages/layout.tsx`
- `frontend/src/components/messages/` (entire directory — 8 files)
- `frontend/src/components/property/MessageOwnerModal.tsx`
- `frontend/src/components/dashboard/RecentMessages.tsx`

---

## Task 1: Database — Create leads table

**Files:**
- Create: `docs/schema/004_leads.sql` (reference file — apply via Supabase dashboard)

- [ ] **Step 1: Write the migration SQL**

Create `docs/schema/004_leads.sql`:
```sql
-- Migration: 004_leads.sql
-- Creates the leads table for WhatsApp contact lead capture

CREATE TABLE IF NOT EXISTS leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id    uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  agency_id     uuid REFERENCES agencies(id) ON DELETE SET NULL,
  contact_name  text NOT NULL,
  contact_phone text NOT NULL,
  source        text NOT NULL CHECK (source IN ('whatsapp_click', 'schedule_viewing')),
  is_billable   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS leads_agency_id_idx ON leads(agency_id);
CREATE INDEX IF NOT EXISTS leads_listing_id_idx ON leads(listing_id);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);

-- RLS: admin reads all; users read their own
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_leads" ON leads
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "user_own_leads" ON leads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_insert_leads" ON leads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
```

- [ ] **Step 2: Apply the migration**

Go to Supabase Dashboard → SQL Editor → paste the contents of `docs/schema/004_leads.sql` → Run.

Verify: in Table Editor, confirm `leads` table exists with all 9 columns and the unique constraint.

- [ ] **Step 3: Commit**

```bash
git add docs/schema/004_leads.sql
git commit -m "feat(db): add leads table with RLS policies"
```

---

## Task 2: Backend — Remove messaging module

**Files:**
- Delete: `backend/app/messages/` (directory)
- Delete: `backend/tests/test_messages.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/dashboard/router.py`

- [ ] **Step 1: Delete the messages module and tests**

```bash
rm -rf backend/app/messages
rm -f backend/tests/test_messages.py
```

- [ ] **Step 2: Remove messages router from `backend/app/main.py`**

In `backend/app/main.py`, remove line 7:
```python
from app.messages.router import router as messages_router
```
And remove line 41:
```python
app.include_router(messages_router, prefix="/api/messages", tags=["messages"])
```

- [ ] **Step 3: Remove `recent_messages` block from dashboard router**

In `backend/app/dashboard/router.py`, delete lines 106–155 (the entire `# ── Recent Messages ──` block including the `try/except`).

Then on the final `return` dict (was L213–220), remove the `"recent_messages": recent_messages,` key. The return should look like:
```python
    return {
        "profile": profile,
        "analytics": analytics,
        "listings": dashboard_listings,
        "liked_properties": liked_properties,
        "upcoming_viewings": upcoming_viewings,
    }
```

- [ ] **Step 4: Verify backend starts without errors**

```bash
cd backend && uvicorn app.main:app --reload
```
Expected: server starts, no ImportError. Visit `http://localhost:8000/docs` — no `/api/messages` routes listed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/main.py backend/app/dashboard/router.py
git commit -m "feat: remove in-app messaging system from backend"
```

---

## Task 3: Backend — Extend listing detail with contact info

**Files:**
- Modify: `backend/app/listings/schemas.py` (add 2 optional fields to `ListingDetailResponse`)
- Modify: `backend/app/listings/router.py` (join agency/owner phone in `get_listing`)
- Modify: `backend/tests/test_listings.py` (if it exists — update expected response shape)

- [ ] **Step 1: Add fields to `ListingDetailResponse` schema**

In `backend/app/listings/schemas.py`, after line 185 (`created_at: str`), add:
```python
    contact_phone: Optional[str] = None
    contact_name: Optional[str] = None
```

- [ ] **Step 2: Resolve contact info in `get_listing` endpoint**

In `backend/app/listings/router.py`, after the housemates fetch block (around line 252) and before the similar listings fetch, add:

```python
    # ── Resolve WhatsApp contact info ─────────────────────────────────────────
    contact_phone: str | None = None
    contact_name: str | None = None
    agency_id = listing.get("agency_id")

    if agency_id:
        try:
            ag = (
                supabase_admin.table("agencies")
                .select("name, phone")
                .eq("id", agency_id)
                .single()
                .execute()
            )
            if ag.data and ag.data.get("phone"):
                contact_phone = ag.data["phone"].lstrip("+")
                contact_name = ag.data.get("name")
        except Exception:
            pass
    else:
        owner_id = listing.get("owner_id")
        if owner_id:
            try:
                ow = (
                    supabase_admin.table("profiles")
                    .select("full_name, phone")
                    .eq("id", owner_id)
                    .single()
                    .execute()
                )
                if ow.data and ow.data.get("phone"):
                    contact_phone = ow.data["phone"].lstrip("+")
                    contact_name = ow.data.get("full_name")
            except Exception:
                pass
```

> Note: `lstrip("+")` converts `+201234567890` → `201234567890` for the `wa.me/` URL format.

- [ ] **Step 3: Add contact fields to the return dict**

In `get_listing`, in the `return {` dict (around line 275), add at the end before `"created_at"`:
```python
        "contact_phone": contact_phone,
        "contact_name": contact_name,
```

- [ ] **Step 4: Verify endpoint returns new fields**

Start the backend and run:
```bash
curl http://localhost:8000/api/listings/<a-listing-id-with-agency>
```
Expected: response JSON includes `"contact_phone": "201XXXXXXXXX"` and `"contact_name": "Agency Name"`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/listings/schemas.py backend/app/listings/router.py
git commit -m "feat(listings): return contact_phone and contact_name in listing detail"
```

---

## Task 4: Backend — Create leads module

**Files:**
- Create: `backend/app/leads/__init__.py`
- Create: `backend/app/leads/schemas.py`
- Create: `backend/app/leads/router.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_leads.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_leads.py`:
```python
"""Tests for POST /api/leads and GET /api/admin/leads."""

import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import make_supabase_jwt, FAKE_USER_ID, FAKE_PROFILE

FAKE_LISTING_ID = "11111111-2222-3333-4444-555555555555"
FAKE_AGENCY_ID = "aaaaaaaa-1111-2222-3333-444444444444"

FAKE_LISTING_WITH_AGENCY = {
    "id": FAKE_LISTING_ID,
    "title": "Luxury Apartment",
    "price": 5000000,
    "agency_id": FAKE_AGENCY_ID,
    "owner_id": FAKE_USER_ID,
    "status": "active",
    "deleted_at": None,
}

FAKE_AGENCY = {
    "id": FAKE_AGENCY_ID,
    "name": "Cairo Realty",
    "phone": "+201234567890",
}


@pytest.fixture
def client(mock_supabase):
    from app.main import app
    return TestClient(app)


def test_post_leads_creates_lead_returns_whatsapp_url(mock_supabase):
    """POST /api/leads returns wa.me URL and records lead."""
    mock_admin = mock_supabase["admin"]

    # Listing fetch
    mock_admin.table.return_value.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value.data = FAKE_LISTING_WITH_AGENCY

    # Agency fetch
    agency_mock = MagicMock()
    agency_mock.execute.return_value.data = FAKE_AGENCY

    # Profile fetch (get_current_user)
    profile_mock = MagicMock()
    profile_mock.execute.return_value.data = FAKE_PROFILE

    # Insert lead (ON CONFLICT DO NOTHING)
    insert_mock = MagicMock()
    insert_mock.execute.return_value.data = [{"id": "new-lead"}]

    client = TestClient(app)
    token = make_supabase_jwt()
    resp = client.post(
        "/api/leads",
        json={"listing_id": FAKE_LISTING_ID, "source": "whatsapp_click"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "whatsapp_url" in body
    assert body["whatsapp_url"].startswith("https://wa.me/")


def test_post_leads_requires_auth(mock_supabase):
    """POST /api/leads returns 403 without auth token."""
    client = TestClient(app)
    resp = client.post("/api/leads", json={"listing_id": FAKE_LISTING_ID, "source": "whatsapp_click"})
    assert resp.status_code == 403


def test_get_admin_leads_requires_admin(mock_supabase):
    """GET /api/admin/leads returns 403 for non-admin users."""
    client = TestClient(app)
    token = make_supabase_jwt()
    # FAKE_PROFILE has role "user", not "admin"
    resp = client.get(
        "/api/admin/leads",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd backend && pytest tests/test_leads.py -v
```
Expected: `ImportError` or `ModuleNotFoundError` (module doesn't exist yet).

- [ ] **Step 3: Create `backend/app/leads/__init__.py`**

```python
```
(empty file)

- [ ] **Step 4: Create `backend/app/leads/schemas.py`**

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CreateLeadRequest(BaseModel):
    listing_id: str
    source: str  # "whatsapp_click" | "schedule_viewing"


class LeadResponse(BaseModel):
    whatsapp_url: str
    already_existed: bool


class AdminLeadRow(BaseModel):
    id: str
    contact_name: str
    contact_phone: str
    listing_title: Optional[str] = None
    agency_name: Optional[str] = None
    source: str
    is_billable: bool
    created_at: str


class AdminLeadsResponse(BaseModel):
    leads: list[AdminLeadRow]
    total: int
    page: int
    per_page: int
```

- [ ] **Step 5: Create `backend/app/leads/router.py`**

```python
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, Query
from app.leads.schemas import CreateLeadRequest, LeadResponse, AdminLeadRow, AdminLeadsResponse
from app.database import supabase_admin
from app.dependencies import get_current_user, get_admin_user

router = APIRouter()

_TEMPLATES = {
    "whatsapp_click": "Hi, I'm {name}, I'm interested in your listing: {title} ({price} EGP).",
    "schedule_viewing": "Hi, I'm {name}, I'd like to schedule a viewing for: {title} ({price} EGP).",
}


@router.post("", response_model=LeadResponse)
async def create_lead(
    body: CreateLeadRequest,
    current_user: dict = Depends(get_current_user),
):
    if body.source not in _TEMPLATES:
        raise HTTPException(status_code=422, detail="Invalid source. Must be 'whatsapp_click' or 'schedule_viewing'.")

    user_phone: str | None = current_user.get("phone")
    user_name: str = current_user.get("full_name") or "A buyer"

    if not user_phone:
        raise HTTPException(status_code=422, detail="Please add a phone number to your profile before contacting listings.")

    # Fetch listing
    try:
        listing_res = (
            supabase_admin.table("listings")
            .select("id, title, price, agency_id, owner_id, status, deleted_at")
            .eq("id", body.listing_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found.")

    listing = listing_res.data
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")

    # Resolve WhatsApp target
    agency_id: str | None = listing.get("agency_id")
    contact_phone: str | None = None
    is_billable = False

    if agency_id:
        try:
            ag_res = (
                supabase_admin.table("agencies")
                .select("name, phone")
                .eq("id", agency_id)
                .single()
                .execute()
            )
            if ag_res.data and ag_res.data.get("phone"):
                contact_phone = ag_res.data["phone"].lstrip("+")
                is_billable = True
        except Exception:
            pass
    else:
        owner_id = listing.get("owner_id")
        if owner_id:
            try:
                ow_res = (
                    supabase_admin.table("profiles")
                    .select("phone")
                    .eq("id", owner_id)
                    .single()
                    .execute()
                )
                if ow_res.data and ow_res.data.get("phone"):
                    contact_phone = ow_res.data["phone"].lstrip("+")
            except Exception:
                pass

    if not contact_phone:
        raise HTTPException(status_code=422, detail="Contact information is not available for this listing.")

    # Upsert lead (ON CONFLICT DO NOTHING)
    lead_data = {
        "user_id": current_user["id"],
        "listing_id": body.listing_id,
        "agency_id": agency_id,
        "contact_name": user_name,
        "contact_phone": current_user["phone"],
        "source": body.source,
        "is_billable": is_billable,
    }
    try:
        insert_res = (
            supabase_admin.table("leads")
            .insert(lead_data, on_conflict="user_id,listing_id", ignore_duplicates=True)
            .execute()
        )
        already_existed = not bool(insert_res.data)
    except Exception:
        already_existed = True  # If insert fails due to conflict, treat as existing

    # Build wa.me URL
    price_str = f"{int(listing.get('price', 0)):,}"
    message = _TEMPLATES[body.source].format(
        name=user_name,
        title=listing.get("title", "the listing"),
        price=price_str,
    )
    whatsapp_url = f"https://wa.me/{contact_phone}?text={quote(message)}"

    return {"whatsapp_url": whatsapp_url, "already_existed": already_existed}


@router.get("/admin/leads", response_model=AdminLeadsResponse)
async def get_admin_leads(
    agency_id: str | None = Query(None),
    source: str | None = Query(None),
    is_billable: bool | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _admin: dict = Depends(get_admin_user),
):
    query = (
        supabase_admin.table("leads")
        .select(
            "id, contact_name, contact_phone, source, is_billable, created_at, "
            "listings(title), agencies(name)",
            count="exact",
        )
        .order("created_at", desc=True)
    )

    if agency_id:
        query = query.eq("agency_id", agency_id)
    if source:
        query = query.eq("source", source)
    if is_billable is not None:
        query = query.eq("is_billable", is_billable)
    if date_from:
        query = query.gte("created_at", date_from)
    if date_to:
        query = query.lte("created_at", date_to)

    offset = (page - 1) * per_page
    result = query.range(offset, offset + per_page - 1).execute()

    rows = []
    for r in result.data or []:
        rows.append(AdminLeadRow(
            id=r["id"],
            contact_name=r["contact_name"],
            contact_phone=r["contact_phone"],
            listing_title=(r.get("listings") or {}).get("title"),
            agency_name=(r.get("agencies") or {}).get("name"),
            source=r["source"],
            is_billable=r["is_billable"],
            created_at=r["created_at"],
        ))

    return AdminLeadsResponse(
        leads=rows,
        total=result.count or 0,
        page=page,
        per_page=per_page,
    )
```

- [ ] **Step 6: Mount leads router in `backend/app/main.py`**

Add after the last import (line 16):
```python
from app.leads.router import router as leads_router
```

Add after the last `include_router` call:
```python
app.include_router(leads_router, prefix="/api", tags=["leads"])
```

> Note: prefix is `/api` (not `/api/leads`) because the router defines both `/leads` (POST) and `/admin/leads` (GET) with their own paths.

- [ ] **Step 7: Run tests — confirm they pass**

```bash
cd backend && pytest tests/test_leads.py -v
```
Expected: all 3 tests pass. (The auth tests check status codes; the create test validates the URL shape with mock data.)

- [ ] **Step 8: Verify endpoint in browser**

Start backend and open `http://localhost:8000/docs` — confirm `POST /api/leads` and `GET /api/admin/leads` appear.

- [ ] **Step 9: Commit**

```bash
git add backend/app/leads/ backend/app/main.py backend/tests/test_leads.py
git commit -m "feat(leads): add POST /api/leads and GET /api/admin/leads endpoints"
```

---

## Task 5: Frontend — Delete messaging code

**Files:**
- Delete directories/files listed in the file map above
- Modify: `frontend/src/lib/queries.ts`
- Modify: `frontend/src/types/api.ts`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/components/layout/Navbar.tsx`
- Modify: `frontend/src/components/layout/NotificationBell.tsx`
- Modify: `frontend/src/lib/constants.ts`

- [ ] **Step 1: Delete messaging directories and files**

```bash
rm -rf frontend/src/app/messages
rm -rf frontend/src/components/messages
rm -f frontend/src/components/property/MessageOwnerModal.tsx
rm -f frontend/src/components/dashboard/RecentMessages.tsx
```

- [ ] **Step 2: Remove message types from `frontend/src/types/api.ts`**

In `frontend/src/types/api.ts`, find and remove the following interface definitions:
- `ConversationPreview`
- `ConversationsListResponse`
- `ApiMessage`
- `MessagesListResponse`
- Any `conversation_id` field on `ApiDashboardMessage`

Also remove the entire `ApiDashboardMessage` interface if it only existed for the `recent_messages` field.

- [ ] **Step 3: Remove message types from `frontend/src/types/index.ts`**

In `frontend/src/types/index.ts`, find and delete:
- `DashboardMessage` interface
- `InboxContact` interface
- `ChatMessage` interface

- [ ] **Step 4: Remove `messagesQueries` from `frontend/src/lib/queries.ts`**

In `frontend/src/lib/queries.ts`, delete lines 187–233 (the entire `messagesQueries` object and all related mutations: `acceptConversationMutation`, `rejectConversationMutation`, `blockUserMutation`, `unblockUserMutation`, `deleteConversationMutation`).

- [ ] **Step 5: Remove `/messages` nav links from `Navbar.tsx`**

In `frontend/src/components/layout/Navbar.tsx`:
- Line ~223: remove the desktop dropdown item that links to `/messages`
- Line ~285: remove the mobile sheet item that links to `/messages`

Search for `"/messages"` and remove the entire nav item JSX block for each.

- [ ] **Step 6: Remove `new_message` handler from `NotificationBell.tsx`**

In `frontend/src/components/layout/NotificationBell.tsx`, find lines ~178–179 where the `case "new_message":` arm routes to `/messages`. Remove the entire `case "new_message":` block.

- [ ] **Step 7: Remove message mock fixtures from `frontend/src/lib/constants.ts`**

In `frontend/src/lib/constants.ts`, find and delete:
- `DASHBOARD_MESSAGES` array/constant
- `USER_MESSAGES` array/constant
- `CHAT_MESSAGES` array/constant

- [ ] **Step 8: Remove `RecentMessages` from dashboard page**

In `frontend/src/app/dashboard/page.tsx`, find the `RecentMessages` import and usage and remove both. If it was in a sidebar column, remove the column or replace with nothing.

- [ ] **Step 9: Quick TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```
Expected: errors only about missing `contactPhone`/`contactName` (not yet added) and any `MessageOwnerModal` import. Fix any unexpected errors before proceeding.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: delete in-app messaging system from frontend"
```

---

## Task 6: Frontend — Create `WhatsAppCTA` component

**Files:**
- Create: `frontend/src/components/property/WhatsAppCTA.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/property/WhatsAppCTA.tsx`:
```tsx
"use client";

import { useState } from "react";
import { MessageCircle, CalendarDays, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

interface WhatsAppCTAProps {
  listingId: string;
  contactPhone: string | null | undefined;
  contactName: string | null | undefined;
  showSchedule?: boolean;
}

async function openWhatsApp(
  listingId: string,
  source: "whatsapp_click" | "schedule_viewing",
  token: string,
): Promise<void> {
  const data = await api.post<{ whatsapp_url: string; already_existed: boolean }>(
    "/api/leads",
    { listing_id: listingId, source },
    token,
  );
  window.open(data.whatsapp_url, "_blank", "noopener,noreferrer");
}

export default function WhatsAppCTA({
  listingId,
  contactPhone,
  contactName,
  showSchedule = true,
}: WhatsAppCTAProps) {
  const { user, session } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState<"contact" | "schedule" | null>(null);

  // No contact phone available for this listing
  if (!contactPhone) {
    return (
      <div className="text-center text-sm text-gray-500 py-3">
        Contact information unavailable
      </div>
    );
  }

  function requireAuth(action: () => void) {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!user.phone) {
      toast.error("Please add your phone number in your profile to contact listings.", {
        action: { label: "Go to Profile", onClick: () => router.push("/dashboard") },
      });
      return;
    }
    action();
  }

  async function handleClick(source: "whatsapp_click" | "schedule_viewing") {
    requireAuth(async () => {
      setLoading(source === "whatsapp_click" ? "contact" : "schedule");
      try {
        await openWhatsApp(listingId, source, session!.access_token);
      } catch {
        toast.error("Could not open WhatsApp. Please try again.");
      } finally {
        setLoading(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      {contactName && (
        <p className="text-xs text-gray-500 text-center">
          Contacting: <span className="text-gray-300">{contactName}</span>
        </p>
      )}

      {showSchedule && (
        <button
          onClick={() => handleClick("schedule_viewing")}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          {loading === "schedule" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarDays className="h-4 w-4" />
          )}
          Schedule a Viewing
        </button>
      )}

      <button
        onClick={() => handleClick("whatsapp_click")}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
      >
        {loading === "contact" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageCircle className="h-4 w-4" />
        )}
        Contact via WhatsApp
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Check how `api.post` is called in the codebase**

Run:
```bash
grep -n "api\.post" frontend/src/lib/api.ts | head -5
grep -n "api\.post(" frontend/src/components/ -r | head -5
```

Confirm the signature of `api.post` — it typically takes `(path, body, token?)`. If the signature differs in `frontend/src/lib/api.ts`, adjust the `openWhatsApp` call accordingly. The key is passing the auth token so the backend can verify the user.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/property/WhatsAppCTA.tsx
git commit -m "feat(ui): add WhatsAppCTA component with lead capture"
```

---

## Task 7: Frontend — Wire `WhatsAppCTA` into property sidebars

**Files:**
- Modify: `frontend/src/types/api.ts`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/app/property/[id]/page.tsx`
- Modify: `frontend/src/components/property/PropertySidebar.tsx`
- Modify: `frontend/src/components/property/MobilePropertyCTA.tsx`
- Modify: `frontend/src/components/shared-housing/SharedHousingSidebar.tsx`

- [ ] **Step 1: Add `contact_phone`/`contact_name` to `ListingDetail` in `api.ts`**

In `frontend/src/types/api.ts`, find the `ListingDetail` interface (around line 80) and add after `created_at`:
```ts
  contact_phone: string | null;
  contact_name: string | null;
```

- [ ] **Step 2: Add `contactPhone`/`contactName` to `PropertyDetail` in `index.ts`**

In `frontend/src/types/index.ts`, find `PropertyDetail` (line 381) and add after `housemates?`:
```ts
  contactPhone?: string | null;
  contactName?: string | null;
```

- [ ] **Step 3: Map contact fields in `mapProperty()` and pass to `SharedHousingSidebar`**

In `frontend/src/app/property/[id]/page.tsx`:

In `mapProperty()`, add after `housemates: ...`:
```ts
    contactPhone: data.contact_phone ?? null,
    contactName: data.contact_name ?? null,
```

For the shared housing layout section (around line 113), find the `<SharedHousingSidebar housing={housing} />` call and change it to:
```tsx
<SharedHousingSidebar
  housing={housing}
  contactPhone={property.contactPhone}
  contactName={property.contactName}
/>
```

- [ ] **Step 4: Replace CTAs in `PropertySidebar.tsx`**

In `frontend/src/components/property/PropertySidebar.tsx`:

Remove the import of `MessageOwnerModal` (line 12) and `MessageSquare` from lucide (line 7).
Remove the `const [msgOpen, setMsgOpen] = useState(false);` state.
Remove the `<MessageOwnerModal ... />` at the bottom.

Replace the CTAs div (lines 69–84) with:
```tsx
          {/* CTAs */}
          <WhatsAppCTA
            listingId={property.id}
            contactPhone={property.contactPhone}
            contactName={property.contactName}
            showSchedule={true}
          />
```

Add the import at the top:
```tsx
import WhatsAppCTA from "@/components/property/WhatsAppCTA";
```

Also remove the `onSchedule` prop from the interface (it was only used to open the messaging modal) and the `requireAuth` helper function (now handled inside `WhatsAppCTA`).

- [ ] **Step 5: Replace CTAs in `MobilePropertyCTA.tsx`**

In `frontend/src/components/property/MobilePropertyCTA.tsx`:

Remove `MessageOwnerModal` import, `MessageSquare` import, `useState`, `ownerId`, `propertyTitle` props.
Add `listingId`, `contactPhone`, `contactName` to props.

New file:
```tsx
"use client";

import { CalendarDays } from "lucide-react";
import { formatEGP } from "@/lib/utils";
import WhatsAppCTA from "@/components/property/WhatsAppCTA";

interface MobilePropertyCTAProps {
  price: number;
  category?: string;
  listingId: string;
  contactPhone?: string | null;
  contactName?: string | null;
}

export default function MobilePropertyCTA({
  price,
  category,
  listingId,
  contactPhone,
  contactName,
}: MobilePropertyCTAProps) {
  const suffix = category === "for_sale" ? "" : "/mo";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0f0f0f]/95 backdrop-blur-md border-t border-white/10 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-0.5">
            <span className="text-white font-bold text-lg leading-none">
              {formatEGP(price)}
            </span>
            {suffix && <span className="text-gray-400 text-xs">{suffix}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <WhatsAppCTA
            listingId={listingId}
            contactPhone={contactPhone}
            contactName={contactName}
            showSchedule={false}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Find where `MobilePropertyCTA` is called and update its props**

In `frontend/src/app/property/[id]/page.tsx`, find `<MobilePropertyCTA` and update props:
```tsx
<MobilePropertyCTA
  price={property.price}
  category={property.category}
  listingId={property.id}
  contactPhone={property.contactPhone}
  contactName={property.contactName}
/>
```

- [ ] **Step 7: Replace "Message Owner" in `SharedHousingSidebar.tsx`**

In `frontend/src/components/shared-housing/SharedHousingSidebar.tsx`:

Add `contactPhone` and `contactName` to the component props interface:
```ts
interface SharedHousingSidebarProps {
  housing: SharedHousingDetail;
  contactPhone?: string | null;
  contactName?: string | null;
}
```

Remove: `MessageOwnerModal` import, `useState` for `msgOpen`, the `<MessageOwnerModal>` at the bottom.

Replace the "Message Owner" button (lines ~75–80):
```tsx
<WhatsAppCTA
  listingId={housing.id}
  contactPhone={contactPhone}
  contactName={contactName}
  showSchedule={false}
/>
```

Add import at top:
```tsx
import WhatsAppCTA from "@/components/property/WhatsAppCTA";
```

- [ ] **Step 8: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -60
```
Expected: zero errors. Fix any type mismatches before proceeding.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/
git commit -m "feat(ui): wire WhatsAppCTA into property and shared-housing sidebars"
```

---

## Task 8: Frontend — Make phone required at signup

**Files:**
- Modify: `frontend/src/components/auth/SignUpForm.tsx`

- [ ] **Step 1: Update SignUpForm to require phone**

In `frontend/src/components/auth/SignUpForm.tsx`, make these changes:

1. Change the label at line ~178 from `Phone Number (optional)` to `Phone Number *`:
```tsx
Phone Number <span className="text-red-400">*</span>
```

2. Change `canSubmit` at line ~46 from:
```ts
const canSubmit = !phoneInput.trim() || phoneVerified;
```
to:
```ts
const canSubmit = phoneInput.trim().length > 0 && phoneVerified;
```

3. In `handleSubmit`, change the validation at line ~73 from:
```ts
if (!full_name || !email || !password) {
  setError("Name, email, and password are required.");
```
to:
```ts
if (!full_name || !email || !password) {
  setError("Name, email, and password are required.");
  return;
}
if (!phoneInput.trim()) {
  setError("Phone number is required.");
```

4. Remove the check for unverified phone (lines ~85–88) since now `canSubmit` already enforces verification:
```ts
// remove: if (phoneInput.trim() && !phoneVerified) { ... }
```

5. In `signup()` call, change `phone: e164Phone || undefined` to `phone: e164Phone` (always required now):
```ts
await signup({
  email,
  password,
  full_name,
  phone: e164Phone,
  country_code: countryCode,
  gender: gender || undefined,
});
```

- [ ] **Step 2: Verify signup form behavior in the browser**

Start the dev server:
```bash
cd frontend && npm run dev
```
Navigate to `http://localhost:3000/signup`. Confirm:
- The "Sign Up" button is disabled until a phone is entered AND verified
- Submitting without a phone shows the error "Phone number is required."
- The phone label shows an asterisk

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/auth/SignUpForm.tsx
git commit -m "feat(auth): make phone number required at signup"
```

---

## Task 9: Admin dashboard — Add Leads section

**Files:**
- Modify: `frontend/src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Add Leads to SECTIONS registry**

In `frontend/src/app/admin/dashboard/page.tsx`, after the `notifications` section (around line 375), add:
```ts
  leads: {
    title: "Leads",
    apiSection: "leads",
    searchPlaceholder: "Search by buyer name…",
    readOnly: true,
    extraFilters: [
      { key: "source", label: "Source", type: "select", options: ["whatsapp_click", "schedule_viewing"] },
      { key: "is_billable", label: "Billable", type: "select", options: ["true", "false"] },
    ],
    columns: [
      { key: "contact_name", label: "Buyer Name" },
      { key: "contact_phone", label: "Phone" },
      { key: "listing_title", label: "Listing" },
      { key: "agency_name", label: "Agency" },
      {
        key: "source", label: "Source",
        render: (v) => (
          <Badge color={v === "schedule_viewing" ? "green" : "blue"}>
            {v === "schedule_viewing" ? "Viewing" : "Contact"}
          </Badge>
        ),
      },
      {
        key: "is_billable", label: "Billable",
        render: (v) => <Badge color={v ? "green" : "gray"}>{v ? "Yes" : "No"}</Badge>,
      },
      { key: "created_at", label: "Date", render: (v) => formatDate(v) },
    ],
    editFields: [],
  },
```

- [ ] **Step 2: Add "Leads" to the admin sidebar nav**

Search for where the sidebar navigation items are defined (look for an array with `{ key: "users", label: "Users" }` etc.). Add:
```ts
{ key: "leads", label: "Leads", icon: PhoneCall },
```
Import `PhoneCall` from `lucide-react` at the top of the file.

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 4: Test the admin leads view in the browser**

Start backend + frontend. Log in as admin → navigate to Admin Dashboard → click "Leads". Confirm the tab loads (may show empty table if no leads yet). The table columns should match the spec.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/admin/dashboard/page.tsx
git commit -m "feat(admin): add Leads section to admin dashboard"
```

---

## Task 10: Final TypeScript check + docs update

**Files:**
- Modify: `docs/API_REFERENCE.md`
- Modify: `docs/ROADMAP.md`
- Modify: memory `MEMORY.md`

- [ ] **Step 1: Full TypeScript check — must be clean**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors, zero warnings. Fix any remaining type errors before proceeding.

- [ ] **Step 2: Update `docs/API_REFERENCE.md`**

Remove the entire Messages section (endpoints like `GET /api/messages/conversations`, `POST /api/messages/conversations`, etc.).

Add a new Leads section:
```markdown
## Leads

### POST /api/leads
Auth: required
Body: `{ listing_id: string, source: "whatsapp_click" | "schedule_viewing" }`
Response: `{ whatsapp_url: string, already_existed: boolean }`

Creates a lead record and returns a wa.me deep-link URL. Deduped by (user_id, listing_id) — subsequent clicks return already_existed: true but still return the URL.

### GET /api/admin/leads
Auth: admin required
Query params: agency_id?, source?, is_billable?, date_from?, date_to?, page?, per_page?
Response: `{ leads: AdminLeadRow[], total: number, page: number, per_page: number }`

AdminLeadRow shape:
- id, contact_name, contact_phone, listing_title, agency_name, source, is_billable, created_at
```

Also update `GET /api/listings/{id}` to document the new `contact_phone` and `contact_name` response fields.

- [ ] **Step 3: Update `docs/ROADMAP.md`**

Mark the messaging system as removed. Mark WhatsApp lead capture as complete.

- [ ] **Step 4: Final end-to-end smoke test**

With backend and frontend both running:

1. Sign up with a phone number → verify you can't sign up without one
2. Browse to a listing with an agency → see "Schedule a Viewing" + "Contact via WhatsApp" buttons
3. Click "Contact via WhatsApp" → WhatsApp opens with pre-filled message
4. Click again → WhatsApp opens again, no new DB row (check Supabase table editor)
5. Browse to `/messages` → 404
6. Admin dashboard → Leads tab → see the captured lead

- [ ] **Step 5: Final commit**

```bash
git add docs/API_REFERENCE.md docs/ROADMAP.md
git commit -m "docs: update API_REFERENCE and ROADMAP for WhatsApp lead capture"
```

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `POST /api/leads` returns `whatsapp_url` and opens WhatsApp on click
- [ ] Second click on same listing returns `already_existed: true`, WhatsApp still opens
- [ ] Agency listing: WhatsApp target is agency phone, `is_billable = true`
- [ ] Private listing: WhatsApp target is owner phone, `is_billable = false`
- [ ] Agency with no phone: buttons show "Contact information unavailable"
- [ ] Unauthenticated click: redirect to `/login?redirect=...`
- [ ] User with no phone: toast with link to dashboard
- [ ] `/messages` route returns 404
- [ ] Signup without phone: blocked with validation error
- [ ] Admin Leads tab: shows captured leads with correct columns
