from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.database import supabase_admin
from app.stripe_client import get_stripe

logger = logging.getLogger(__name__)

router = APIRouter()


def _field(source, key: str):
    if isinstance(source, dict):
        return source.get(key)
    return getattr(source, key, None)


def _epoch_to_iso(value):
    if not value:
        return None
    return datetime.fromtimestamp(int(value), tz=timezone.utc).isoformat()


def _sync_subscription(obj) -> None:
    md = _field(obj, "metadata") or {}
    user_id = (md.get("user_id") if isinstance(md, dict) else None)
    if not user_id:
        return
    status = _field(obj, "status")
    plan = (md.get("plan") if isinstance(md, dict) else None) or "basic"
    if status in ("canceled", "unpaid", "incomplete_expired"):
        plan, status = "free", "canceled"
    # upsert: if the subscription row doesn't exist yet (e.g. customer.subscription.created
    # fires before our own insert), create it rather than silently no-op with .update()
    supabase_admin.table("subscriptions").upsert({
        "user_id": user_id,
        "plan": plan,
        "status": status if status in ("active", "trialing", "past_due", "canceled") else "active",
        "stripe_subscription_id": _field(obj, "id"),
        "stripe_customer_id": _field(obj, "customer"),
        "current_period_end": _epoch_to_iso(_field(obj, "current_period_end")),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }, on_conflict="user_id").execute()
    # Lazy import: lapse.py created in Task 6; only reached for live subscription events.
    from app.subscriptions.lapse import pause_excess_for_user
    pause_excess_for_user(user_id)


@router.post("/webhook")
async def stripe_webhook(request: Request):
    stripe = get_stripe()
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhook secret is not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=settings.stripe_webhook_secret,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature")

    event_type = _field(event, "type")
    obj = _field(_field(event, "data"), "object")
    try:
        if event_type == "payment_intent.succeeded":
            from app.bookings.router import _create_booking_from_paid_intent
            _create_booking_from_paid_intent(obj)
        elif event_type == "payment_intent.canceled":
            # Revert the listing lock set when the PaymentIntent was created.
            md = _field(obj, "metadata") or {}
            listing_id = (md.get("listing_id") if isinstance(md, dict) else None)
            if listing_id:
                try:
                    supabase_admin.table("listings").update({"status": "active"}).eq(
                        "id", listing_id
                    ).eq("status", "pending_payment").execute()
                except Exception as e:
                    logger.error("Failed to revert listing %s from pending_payment: %s", listing_id, e)
        elif event_type in (
            "customer.subscription.created",
            "customer.subscription.updated",
            "customer.subscription.deleted",
        ):
            _sync_subscription(obj)
    except HTTPException:
        # Re-raise known HTTP errors (e.g. 409 duplicate booking) — these are
        # idempotent; returning non-2xx would cause Stripe to retry unnecessarily.
        raise
    except Exception as e:
        # Log and return 500 so Stripe retries the webhook (up to 3 days).
        # Swallowing here would mean a charged user with no booking and no retry.
        logger.error("Stripe webhook handler failed for event %s: %s", event_type, e)
        raise HTTPException(status_code=500, detail="Webhook processing failed")

    return {"received": True}
