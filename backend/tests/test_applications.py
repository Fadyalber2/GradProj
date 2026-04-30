"""Tests for the shared housing applications module."""

from unittest.mock import MagicMock
from tests.conftest import FAKE_USER_ID, FAKE_PROFILE


FAKE_LISTING_SH = {
    "id": "listing-sh-001",
    "owner_id": "other-user-id",
    "title": "Shared Room in Maadi",
    "category": "shared_housing",
    "status": "active",
}


# ── Create application ────────────────────────────────────────────────────────

def test_create_application_success(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase

    call_idx = 0

    def table_side_effect(name):
        nonlocal call_idx
        call_idx += 1
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.is_.return_value = chain
        chain.single.return_value = chain
        chain.limit.return_value = chain
        chain.insert.return_value = chain

        result = MagicMock()

        if name == "profiles":
            result.data = FAKE_PROFILE
        elif name == "listings":
            result.data = FAKE_LISTING_SH
        elif name == "listing_applications":
            if call_idx <= 3:
                # Check for existing — none found
                result.data = []
            else:
                # Insert result
                result.data = {
                    "id": "app-001",
                    "listing_id": FAKE_LISTING_SH["id"],
                    "applicant_id": FAKE_USER_ID,
                    "message": "I'm interested",
                    "status": "pending",
                }
        elif name == "notifications":
            result.data = {"id": "notif-001"}
        else:
            result.data = []

        chain.execute.return_value = result
        return chain

    mock_admin.table.side_effect = table_side_effect

    res = client.post(
        "/api/applications",
        json={"listing_id": FAKE_LISTING_SH["id"], "message": "I'm interested"},
        headers=auth_header,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "pending"


# ── Create application — not shared housing ───────────────────────────────────

def test_create_application_not_shared_housing(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase

    def table_side_effect(name):
        chain = MagicMock()
        chain.select.return_value = chain
        chain.eq.return_value = chain
        chain.is_.return_value = chain
        chain.single.return_value = chain

        result = MagicMock()

        if name == "profiles":
            result.data = FAKE_PROFILE
        elif name == "listings":
            result.data = {
                "id": "listing-regular",
                "owner_id": "other-user-id",
                "title": "Regular Apartment",
                "category": "for_rent",
                "status": "active",
            }
        else:
            result.data = []

        chain.execute.return_value = result
        return chain

    mock_admin.table.side_effect = table_side_effect

    res = client.post(
        "/api/applications",
        json={"listing_id": "listing-regular"},
        headers=auth_header,
    )
    assert res.status_code == 400
    assert "shared housing" in res.json()["detail"].lower()


# ── Create application — no auth ──────────────────────────────────────────────

def test_create_application_no_auth(client, mock_supabase):
    res = client.post("/api/applications", json={"listing_id": "xyz"})
    assert res.status_code == 401
