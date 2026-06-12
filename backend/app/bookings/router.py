from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.database import supabase_admin
from app.dependencies import get_current_user
from app.stripe_client import get_stripe

router = APIRouter()

RENT_DURATIONS = {1, 2, 3, 6, 12}

# Payment model: AXIOM charges a small platform fee only — a reservation fee for
# sales and a booking deposit for rentals. Every charge lands in the single
# platform Stripe account; there is no Stripe Connect and no owner payout.
# See docs/superpowers/specs/2026-05-29-payment-monetization-model.md.


class CreatePaymentIntentRequest(BaseModel):
    listing_id: str
    booking_type: str  # "rent" — sale listings are lead-gen only, no online payment
    start_date: date | None = None
    duration_months: int | None = None


class SyncPaymentRequest(BaseModel):
    payment_intent_id: str


# ── helpers ──────────────────────────────────────────────────────────────


def _money(value) -> float:
    return float(value or 0)


def _to_piastres(value) -> int:
    return int(round(_money(value) * 100))


def _add_months(value: date, months: int) -> date:
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return date(year, month, day)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _stripe_error_detail(error: Exception) -> str:
    return getattr(error, "user_message", None) or str(error)


def _field(source, key: str):
    if isinstance(source, dict):
        return source.get(key)
    return getattr(source, key, None)


def _stripe_mapping(value) -> dict:
    if not value:
        return {}
    if hasattr(value, "to_dict"):
        return value.to_dict()
    if isinstance(value, dict):
        return value
    return dict(value)


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


def _fetch_active_listing(listing_id: str) -> dict:
    try:
        listing = (
            supabase_admin.table("listings")
            .select("id, owner_id, category, status, price")
            .eq("id", listing_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        ).data
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found")
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.get("status") in ("sold", "rented"):
        raise HTTPException(status_code=409, detail="Listing is no longer available")
    if listing.get("status") in ("reserved", "booked", "pending_payment"):
        raise HTTPException(status_code=409, detail="Listing already has a pending booking")
    if listing.get("status") != "active":
        raise HTTPException(status_code=400, detail="Listing is not active")
    return listing


def _compute_fee(body: CreatePaymentIntentRequest, listing: dict) -> dict:
    """Returns the platform fee to charge. Only rent bookings are paid online.
    Sale listings use lead-gen / WhatsApp contact — no online payment."""
    if body.booking_type != "rent":
        raise HTTPException(status_code=400, detail="Only rent bookings can be paid online. Sale listings use contact/WhatsApp.")

    if body.start_date is None or body.duration_months not in RENT_DURATIONS:
        raise HTTPException(
            status_code=400,
            detail="Rent bookings require start_date and duration 1, 2, 3, 6, or 12",
        )
    if listing.get("category") not in ("for_rent", "shared_housing"):
        raise HTTPException(status_code=400, detail="Rent bookings require a rental or shared housing listing")
    return {
        "kind": "booking_deposit",
        "fee": round(_money(settings.rent_booking_fee), 2),
        "monthly_price": _money(listing["price"]),
        "end_date": _add_months(body.start_date, int(body.duration_months)),
    }


def _create_booking_from_paid_intent(intent) -> dict:
    intent_id = _field(intent, "id")
    if not intent_id:
        raise HTTPException(status_code=400, detail="Missing PaymentIntent id")
    if _field(intent, "status") != "succeeded":
        raise HTTPException(status_code=400, detail="Payment is not complete")

    existing = (
        supabase_admin.table("bookings")
        .select("*")
        .eq("stripe_payment_intent_id", intent_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]

    metadata = _stripe_mapping(_field(intent, "metadata"))
    listing_id = metadata.get("listing_id")
    renter_id = metadata.get("renter_id")
    booking_type = metadata.get("booking_type")
    if not listing_id or not renter_id or booking_type != "rent":
        raise HTTPException(status_code=400, detail="PaymentIntent metadata is incomplete")

    body = CreatePaymentIntentRequest(
        listing_id=listing_id,
        booking_type=booking_type,
        start_date=date.fromisoformat(metadata["start_date"]) if metadata.get("start_date") else None,
        duration_months=int(metadata["duration_months"]) if metadata.get("duration_months") else None,
    )
    listing = _fetch_active_listing(listing_id)
    values = _compute_fee(body, listing)
    paid_amount = _field(intent, "amount_received") or _field(intent, "amount")
    if int(paid_amount or 0) < _to_piastres(values["fee"]):
        raise HTTPException(status_code=400, detail="Payment amount is below the required fee")

    fee = values["fee"]
    insert_data = {
        "listing_id": listing_id,
        "renter_id": renter_id,
        "owner_id": listing["owner_id"],
        "booking_type": booking_type,
        "start_date": body.start_date.isoformat() if body.start_date else None,
        "end_date": values["end_date"].isoformat() if values["end_date"] else None,
        "duration_months": body.duration_months,
        "monthly_price": values["monthly_price"],
        "total_price": fee,
        "platform_cut_pct": 100.0,
        "platform_cut_amount": fee,
        "owner_amount": 0,
        "status": "pending_confirmation",
        "stripe_payment_intent_id": intent_id,
    }
    result = supabase_admin.table("bookings").insert(insert_data).execute()
    booking = (result.data or [None])[0]
    if not booking:
        raise HTTPException(status_code=500, detail="Failed to create booking from payment")

    # Record the charge in the platform payments ledger.
    try:
        supabase_admin.table("payments").insert({
            "user_id": renter_id,
            "listing_id": listing_id,
            "booking_id": booking["id"],
            "kind": values["kind"],
            "amount": fee,
            "currency": "egp",
            "stripe_payment_intent_id": intent_id,
            "status": "succeeded",
        }).execute()
    except Exception:
        pass

    # Lock the listing so it cannot be double-booked.
    try:
        (
            supabase_admin.table("listings")
            .update({"status": "booked"})
            .eq("id", listing_id)
            .execute()
        )
    except Exception:
        pass

    return booking


# ── endpoints ────────────────────────────────────────────────────────────


@router.get("/fees")
async def get_fees():
    """Public fee config — frontend reads this instead of hardcoding amounts."""
    return {
        "rent_booking_fee": round(_money(settings.rent_booking_fee), 2),
        "currency": "EGP",
    }


@router.post("/payment-intent")
async def create_payment_intent(
    body: CreatePaymentIntentRequest,
    current_user: dict = Depends(get_current_user),
):
    stripe = get_stripe()
    user_id = current_user["id"]
    listing = _fetch_active_listing(body.listing_id)
    if not listing.get("owner_id"):
        raise HTTPException(status_code=400, detail="Listing has no owner assigned")
    if listing["owner_id"] == user_id:
        raise HTTPException(status_code=403, detail="Cannot book your own listing")
    values = _compute_fee(body, listing)

    metadata = {
        "listing_id": body.listing_id,
        "renter_id": user_id,
        "owner_id": listing["owner_id"],
        "booking_type": body.booking_type,
        "kind": values["kind"],
        "start_date": body.start_date.isoformat() if body.start_date else "",
        "duration_months": str(body.duration_months or ""),
        "monthly_price": str(values["monthly_price"] or ""),
        "fee": str(values["fee"]),
    }
    try:
        intent = stripe.PaymentIntent.create(
            amount=_to_piastres(values["fee"]),
            currency="egp",
            payment_method_types=["card"],
            metadata=metadata,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=_stripe_error_detail(e))

    # Lock listing immediately so a second concurrent buyer cannot also get a PaymentIntent.
    # Reverted to "active" by the payment_intent.canceled webhook if the user abandons payment.
    try:
        supabase_admin.table("listings").update({"status": "pending_payment"}).eq(
            "id", body.listing_id
        ).execute()
    except Exception:
        pass

    return {
        "client_secret": intent.client_secret,
        "payment_intent_id": intent.id,
        "booking_preview": {
            "listing_id": body.listing_id,
            "booking_type": body.booking_type,
            "start_date": body.start_date.isoformat() if body.start_date else None,
            "duration_months": body.duration_months,
            "monthly_price": values["monthly_price"],
            "total_price": values["fee"],
            "fee_kind": values["kind"],
        },
    }


@router.post("/sync-payment")
async def sync_payment(
    body: SyncPaymentRequest,
    current_user: dict = Depends(get_current_user),
):
    stripe = get_stripe()
    try:
        intent = stripe.PaymentIntent.retrieve(body.payment_intent_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=_stripe_error_detail(e))

    metadata = _stripe_mapping(_field(intent, "metadata"))
    if metadata.get("renter_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    booking = _create_booking_from_paid_intent(intent)
    return _booking_response(booking)


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


@router.get("/by-intent/{intent_id}")
async def get_booking_by_intent(intent_id: str, current_user: dict = Depends(get_current_user)):
    try:
        booking = (
            _select_booking_query()
            .eq("stripe_payment_intent_id", intent_id)
            .single()
            .execute()
        ).data
    except Exception:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if current_user["id"] not in (booking["renter_id"], booking["owner_id"]):
        raise HTTPException(status_code=403, detail="Not allowed")
    return _booking_response(booking)


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
    return await get_booking(booking_id, current_user)


@router.post("/{booking_id}/refund")
async def refund_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel an unconfirmed booking and refund the platform fee."""
    booking = _get_booking_for_action(booking_id, current_user["id"])
    if booking["status"] != "pending_confirmation":
        raise HTTPException(status_code=400, detail="Only unconfirmed bookings can be cancelled")

    intent_id = booking.get("stripe_payment_intent_id")
    if intent_id:
        stripe = get_stripe()
        try:
            stripe.Refund.create(payment_intent=intent_id)
        except Exception as e:
            raise HTTPException(status_code=502, detail=_stripe_error_detail(e))
        (
            supabase_admin.table("payments")
            .update({"status": "refunded", "refunded_at": _now_iso()})
            .eq("stripe_payment_intent_id", intent_id)
            .execute()
        )

    now = _now_iso()
    (
        supabase_admin.table("bookings")
        .update({"status": "cancelled", "updated_at": now})
        .eq("id", booking_id)
        .execute()
    )
    try:
        (
            supabase_admin.table("listings")
            .update({"status": "active"})
            .eq("id", booking["listing_id"])
            .execute()
        )
    except Exception:
        pass
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
    try:
        (
            supabase_admin.table("listings")
            .update({"status": "active"})
            .eq("id", booking["listing_id"])
            .execute()
        )
    except Exception:
        pass
    return await get_booking(booking_id, current_user)
