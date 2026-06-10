"""Tests for the booking payment flow (platform-fee model).

AXIOM charges a small platform fee only: a flat booking deposit for rentals and
a capped 1% reservation fee for sales. No Stripe Connect, no owner payout.
"""

import asyncio
from datetime import date
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.bookings.router import (
    CreatePaymentIntentRequest,
    _compute_fee,
    create_payment_intent,
)
from tests.conftest import FAKE_PROFILE


def _result(data):
    result = MagicMock()
    result.data = data
    return result


def _listings_chain(listing):
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.is_.return_value = chain
    chain.single.return_value = chain
    chain.execute.return_value = _result(listing)
    return chain



# ── fee math ────────────────────────────────────────────────────────────


def test_compute_fee_rent_is_flat_deposit():
    listing = {"category": "for_rent", "price": 15000}
    body = CreatePaymentIntentRequest(
        listing_id="x", booking_type="rent", start_date=date(2026, 6, 1), duration_months=3
    )
    values = _compute_fee(body, listing)
    assert values["fee"] == 2000
    assert values["kind"] == "booking_deposit"
    assert values["monthly_price"] == 15000


def test_compute_fee_rejects_sale_booking_type():
    """Sale listings use lead-gen / WhatsApp contact — no online payment."""
    listing = {"category": "for_sale", "price": 8_000_000}
    body = CreatePaymentIntentRequest(listing_id="x", booking_type="sale")
    with pytest.raises(HTTPException) as exc:
        _compute_fee(body, listing)
    assert exc.value.status_code == 400


def test_compute_fee_rejects_category_mismatch():
    listing = {"category": "for_sale", "price": 15000}
    body = CreatePaymentIntentRequest(
        listing_id="x", booking_type="rent", start_date=date(2026, 6, 1), duration_months=3
    )
    with pytest.raises(HTTPException):
        _compute_fee(body, listing)


def test_compute_fee_shared_housing_is_flat_deposit():
    """Shared housing uses same flat deposit model as for_rent."""
    listing = {"category": "shared_housing", "price": 3000}
    body = CreatePaymentIntentRequest(
        listing_id="x", booking_type="rent", start_date=date(2026, 6, 1), duration_months=3
    )
    values = _compute_fee(body, listing)
    assert values["fee"] == 2000
    assert values["kind"] == "booking_deposit"
    assert values["monthly_price"] == 3000


# ── payment intent ────────────────────────────────────────────────────────


def test_create_payment_intent_charges_flat_rent_deposit():
    listing = {
        "id": "listing-001",
        "owner_id": "owner-001",
        "category": "for_rent",
        "status": "active",
        "price": 15000,
    }
    supabase_admin = MagicMock()
    supabase_admin.table.side_effect = [_listings_chain(listing)]

    fake_stripe = MagicMock()
    fake_intent = MagicMock()
    fake_intent.id = "pi_123"
    fake_intent.client_secret = "pi_123_secret_abc"
    fake_stripe.PaymentIntent.create.return_value = fake_intent

    with (
        patch("app.bookings.router.supabase_admin", supabase_admin),
        patch("app.bookings.router.get_stripe", return_value=fake_stripe),
    ):
        response = asyncio.run(
            create_payment_intent(
                CreatePaymentIntentRequest(
                    listing_id=listing["id"],
                    booking_type="rent",
                    start_date=date(2026, 6, 1),
                    duration_months=3,
                ),
                FAKE_PROFILE,
            )
        )

    kwargs = fake_stripe.PaymentIntent.create.call_args.kwargs
    assert kwargs["amount"] == 200000  # 2000 EGP in piastres
    assert kwargs["currency"] == "egp"
    assert kwargs["metadata"]["listing_id"] == listing["id"]
    assert kwargs["metadata"]["kind"] == "booking_deposit"
    assert "destination" not in kwargs
    assert "owner_stripe_account_id" not in kwargs["metadata"]
    fake_stripe.Account.create.assert_not_called()
    assert response["booking_preview"]["total_price"] == 2000
    assert response["booking_preview"]["fee_kind"] == "booking_deposit"


