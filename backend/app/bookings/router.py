from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database import supabase_admin
from app.dependencies import get_current_user

router = APIRouter()

PLATFORM_CUT_PCT = 5.0
RENT_DURATIONS = {1, 2, 3, 6, 12}


class CreateBookingRequest(BaseModel):
    listing_id: str
    booking_type: str  # "rent" | "sale"
    start_date: date | None = None
    duration_months: int | None = None


def _add_months(value: date, months: int) -> date:
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return date(year, month, day)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _money(value) -> float:
    return float(value or 0)


def _image(listing: dict | None) -> str | None:
    images = (listing or {}).get("images") or []
    return images[0] if images else None


def _fetch_booking_related(row: dict) -> tuple[dict, dict, list[dict]]:
    listing: dict = {}
    renter: dict = {}
    disbursements: list[dict] = []
    try:
        listing = (
            supabase_admin.table("listings")
            .select("title, images, location")
            .eq("id", row["listing_id"])
            .single()
            .execute()
        ).data or {}
    except Exception:
        pass
    try:
        renter = (
            supabase_admin.table("profiles")
            .select("full_name, avatar_url")
            .eq("id", row["renter_id"])
            .single()
            .execute()
        ).data or {}
    except Exception:
        pass
    try:
        disbursements = (
            supabase_admin.table("booking_disbursements")
            .select("*")
            .eq("booking_id", row["id"])
            .order("month_number", desc=False)
            .execute()
        ).data or []
    except Exception:
        pass
    return listing, renter, disbursements


def _booking_response(row: dict) -> dict:
    listing, renter, disbursements = _fetch_booking_related(row)
    return {
        "id": row["id"],
        "listing_id": row["listing_id"],
        "listing_title": listing.get("title"),
        "listing_image": _image(listing),
        "listing_location": listing.get("location"),
        "renter_id": row["renter_id"],
        "owner_id": row["owner_id"],
        "booking_type": row["booking_type"],
        "start_date": row.get("start_date"),
        "end_date": row.get("end_date"),
        "duration_months": row.get("duration_months"),
        "monthly_price": _money(row.get("monthly_price")) if row.get("monthly_price") is not None else None,
        "total_price": _money(row.get("total_price")),
        "platform_cut_pct": _money(row.get("platform_cut_pct")),
        "platform_cut_amount": _money(row.get("platform_cut_amount")),
        "owner_amount": _money(row.get("owner_amount")),
        "status": row["status"],
        "renter_confirmed_at": row.get("renter_confirmed_at"),
        "tenant_vacated_at": row.get("tenant_vacated_at"),
        "vacated_by": row.get("vacated_by"),
        "disbursements": [
            {
                "id": d["id"],
                "booking_id": d["booking_id"],
                "month_number": d["month_number"],
                "amount": _money(d["amount"]),
                "scheduled_date": d["scheduled_date"],
                "status": d["status"],
                "owner_requested_at": d.get("owner_requested_at"),
                "released_at": d.get("released_at"),
                "created_at": d.get("created_at", ""),
            }
            for d in disbursements
        ],
        "renter_name": renter.get("full_name"),
        "renter_avatar": renter.get("avatar_url"),
        "created_at": row.get("created_at", ""),
    }


def _select_booking_query():
    return supabase_admin.table("bookings").select("*")


@router.post("", status_code=201)
async def create_booking(
    body: CreateBookingRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    if body.booking_type not in ("rent", "sale"):
        raise HTTPException(status_code=400, detail="booking_type must be rent or sale")
    if body.booking_type == "rent" and (
        body.start_date is None or body.duration_months not in RENT_DURATIONS
    ):
        raise HTTPException(status_code=400, detail="Rent bookings require start_date and duration 1, 2, 3, 6, or 12")

    try:
        listing = (
            supabase_admin.table("listings")
            .select("id, owner_id, category, status, price")
            .eq("id", body.listing_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        ).data
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found")

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing["owner_id"] == user_id:
        raise HTTPException(status_code=403, detail="Cannot book your own listing")
    if body.booking_type == "rent" and listing.get("category") not in ("for_rent", "shared_housing"):
        raise HTTPException(status_code=400, detail="Rent bookings require a rental or shared housing listing")
    if body.booking_type == "sale" and listing.get("category") != "for_sale":
        raise HTTPException(status_code=400, detail="Sale bookings require a sale listing")
    if listing.get("status") == "sold":
        raise HTTPException(status_code=409, detail="Listing is already sold")
    if listing.get("status") != "active":
        raise HTTPException(status_code=400, detail="Listing is not active")

    if body.booking_type == "sale":
        existing = (
            supabase_admin.table("bookings")
            .select("id")
            .eq("listing_id", body.listing_id)
            .eq("booking_type", "sale")
            .in_("status", ["pending_confirmation", "active"])
            .limit(1)
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail="This listing already has an active sale booking")

    monthly_price = _money(listing["price"]) if body.booking_type == "rent" else None
    total_price = monthly_price * int(body.duration_months or 1) if body.booking_type == "rent" else _money(listing["price"])
    platform_cut_amount = round(total_price * (PLATFORM_CUT_PCT / 100), 2)
    owner_amount = round(total_price - platform_cut_amount, 2)
    end_date = _add_months(body.start_date, int(body.duration_months)) if body.booking_type == "rent" and body.start_date else None

    insert_data = {
        "listing_id": body.listing_id,
        "renter_id": user_id,
        "owner_id": listing["owner_id"],
        "booking_type": body.booking_type,
        "start_date": body.start_date.isoformat() if body.start_date else None,
        "end_date": end_date.isoformat() if end_date else None,
        "duration_months": body.duration_months,
        "monthly_price": monthly_price,
        "total_price": total_price,
        "platform_cut_pct": PLATFORM_CUT_PCT,
        "platform_cut_amount": platform_cut_amount,
        "owner_amount": owner_amount,
        "status": "pending_confirmation",
    }

    try:
        result = supabase_admin.table("bookings").insert(insert_data).execute()
        booking = (result.data or [None])[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create booking: {e}")
    if not booking:
        raise HTTPException(status_code=500, detail="Failed to create booking: no row returned")

    return {
        "booking_id": booking["id"],
        "total_price": total_price,
        "platform_cut_amount": platform_cut_amount,
        "owner_amount": owner_amount,
        "booking_type": body.booking_type,
    }


@router.get("/my")
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    try:
        result = (
            _select_booking_query()
            .eq("renter_id", current_user["id"])
            .order("created_at", desc=True)
            .execute()
        )
    except Exception:
        # The dashboard should remain usable before the booking migration is applied.
        return []
    return [_booking_response(row) for row in result.data or []]


@router.get("/received")
async def get_received_bookings(current_user: dict = Depends(get_current_user)):
    try:
        result = (
            _select_booking_query()
            .eq("owner_id", current_user["id"])
            .order("created_at", desc=True)
            .execute()
        )
    except Exception:
        # The dashboard should remain usable before the booking migration is applied.
        return []
    return [_booking_response(row) for row in result.data or []]


@router.get("/{booking_id}")
async def get_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    try:
        booking = _select_booking_query().eq("id", booking_id).single().execute().data
    except Exception:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if current_user["id"] not in (booking["renter_id"], booking["owner_id"]):
        raise HTTPException(status_code=403, detail="Not allowed")
    return _booking_response(booking)


def _get_booking_for_action(booking_id: str, user_id: str) -> dict:
    try:
        booking = (
            supabase_admin.table("bookings")
            .select("*")
            .eq("id", booking_id)
            .single()
            .execute()
        ).data
    except Exception:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if user_id not in (booking["renter_id"], booking["owner_id"]):
        raise HTTPException(status_code=403, detail="Not allowed")
    return booking


@router.post("/{booking_id}/confirm")
async def confirm_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = _get_booking_for_action(booking_id, current_user["id"])
    if booking["renter_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the renter can confirm")
    if booking["status"] != "pending_confirmation":
        raise HTTPException(status_code=400, detail="Booking is not waiting for confirmation")

    now = _now_iso()
    (
        supabase_admin.table("bookings")
        .update({"status": "active", "renter_confirmed_at": now, "updated_at": now})
        .eq("id", booking_id)
        .execute()
    )

    if booking["booking_type"] == "rent":
        existing = (
            supabase_admin.table("booking_disbursements")
            .select("id")
            .eq("booking_id", booking_id)
            .limit(1)
            .execute()
        )
        if not existing.data:
            start = date.fromisoformat(booking["start_date"])
            rows = []
            for month_number in range(1, int(booking["duration_months"] or 0) + 1):
                monthly_price = _money(booking["monthly_price"])
                amount = monthly_price - _money(booking["platform_cut_amount"]) if month_number == 1 else monthly_price
                rows.append({
                    "booking_id": booking_id,
                    "month_number": month_number,
                    "amount": max(0, amount),
                    "scheduled_date": _add_months(start, month_number - 1).isoformat(),
                    "status": "scheduled",
                })
            if rows:
                supabase_admin.table("booking_disbursements").insert(rows).execute()
    else:
        (
            supabase_admin.table("listings")
            .update({"status": "sold"})
            .eq("id", booking["listing_id"])
            .execute()
        )

    return await get_booking(booking_id, current_user)


@router.post("/{booking_id}/vacate")
async def vacate_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = _get_booking_for_action(booking_id, current_user["id"])
    if booking["status"] != "active":
        raise HTTPException(status_code=400, detail="Only active bookings can be vacated")
    vacated_by = "renter" if booking["renter_id"] == current_user["id"] else "owner"
    now = _now_iso()
    (
        supabase_admin.table("bookings")
        .update({
            "status": "completed",
            "tenant_vacated_at": now,
            "vacated_by": vacated_by,
            "updated_at": now,
        })
        .eq("id", booking_id)
        .execute()
    )
    return await get_booking(booking_id, current_user)


@router.post("/{booking_id}/disbursements/{month_number}/request")
async def request_disbursement(
    booking_id: str,
    month_number: int,
    current_user: dict = Depends(get_current_user),
):
    booking = _get_booking_for_action(booking_id, current_user["id"])
    if booking["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can request disbursement")
    if booking["status"] != "active":
        raise HTTPException(status_code=400, detail="Disbursement requests require an active booking")

    now = _now_iso()
    result = (
        supabase_admin.table("booking_disbursements")
        .update({"owner_requested_at": now, "status": "released", "released_at": now})
        .eq("booking_id", booking_id)
        .eq("month_number", month_number)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Disbursement not found")
    return result.data[0]
