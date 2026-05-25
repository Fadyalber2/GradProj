"""Tests for booking creation."""

import asyncio
from datetime import date
from unittest.mock import MagicMock, patch

from app.bookings.router import CreateBookingRequest, create_booking
from tests.conftest import FAKE_PROFILE, FAKE_USER_ID


def _result(data):
    result = MagicMock()
    result.data = data
    return result


def test_create_booking_without_payment_provider():
    listing = {
        "id": "listing-001",
        "owner_id": "owner-001",
        "category": "for_rent",
        "status": "active",
        "price": 15000,
    }
    booking = {
        "id": "booking-001",
        "listing_id": listing["id"],
        "renter_id": FAKE_USER_ID,
        "owner_id": listing["owner_id"],
        "booking_type": "rent",
        "start_date": "2026-06-01",
        "end_date": "2026-09-01",
        "duration_months": 3,
        "monthly_price": 15000,
        "total_price": 45000,
        "platform_cut_pct": 5,
        "platform_cut_amount": 2250,
        "owner_amount": 42750,
        "status": "pending_confirmation",
    }

    listings_chain = MagicMock()
    listings_chain.select.return_value = listings_chain
    listings_chain.eq.return_value = listings_chain
    listings_chain.is_.return_value = listings_chain
    listings_chain.single.return_value = listings_chain
    listings_chain.execute.return_value = _result(listing)

    insert_chain = MagicMock()
    insert_chain.execute.return_value = _result([booking])
    bookings_table = MagicMock()
    bookings_table.insert.return_value = insert_chain

    supabase_admin = MagicMock()
    supabase_admin.table.side_effect = [listings_chain, bookings_table]

    with patch("app.bookings.router.supabase_admin", supabase_admin):
        response = asyncio.run(
            create_booking(
                CreateBookingRequest(
                    listing_id=listing["id"],
                    booking_type="rent",
                    start_date=date(2026, 6, 1),
                    duration_months=3,
                ),
                FAKE_PROFILE,
            )
        )

    assert response == {
        "booking_id": booking["id"],
        "total_price": 45000,
        "platform_cut_amount": 2250,
        "owner_amount": 42750,
        "booking_type": "rent",
    }
    assert bookings_table.update.call_count == 0
