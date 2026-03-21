"""Tests for /api/dashboard/me endpoint."""

from unittest.mock import MagicMock
from tests.conftest import FAKE_USER_ID, FAKE_PROFILE


def test_dashboard_requires_auth(client):
    """GET /api/dashboard/me without token returns 401."""
    resp = client.get("/api/dashboard/me")
    assert resp.status_code == 401


def test_dashboard_returns_structure(client, mock_supabase, auth_header):
    """GET /api/dashboard/me returns all 6 sections with correct shapes."""
    _, mock_admin = mock_supabase

    # Auth: profile lookup via single() chain
    profile_result = MagicMock()
    profile_result.data = FAKE_PROFILE
    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_result

    # User listings
    listings_result = MagicMock()
    listings_result.data = [
        {
            "id": "list-001",
            "title": "Test Apartment",
            "location": "Cairo",
            "price": 5000.0,
            "images": [],
            "status": "active",
            "views_count": 42,
            "created_at": "2026-03-01T00:00:00Z",
        }
    ]
    mock_admin.table.return_value.select.return_value.eq.return_value.is_.return_value.order.return_value.execute.return_value = listings_result

    # Favorites count
    fav_count_result = MagicMock()
    fav_count_result.count = 3
    mock_admin.table.return_value.select.return_value.eq.return_value.execute.return_value = fav_count_result

    # RPC: get_user_conversations → empty list is fine
    rpc_result = MagicMock()
    rpc_result.data = []
    mock_admin.rpc.return_value.execute.return_value = rpc_result

    # Liked properties (favorites join) → empty
    fav_join_result = MagicMock()
    fav_join_result.data = []
    mock_admin.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = fav_join_result

    # Viewings → empty
    viewings_result = MagicMock()
    viewings_result.data = []
    mock_admin.table.return_value.select.return_value.or_.return_value.in_.return_value.gte.return_value.order.return_value.limit.return_value.execute.return_value = viewings_result

    resp = client.get("/api/dashboard/me", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()

    # Verify all 6 sections are present
    assert "profile" in data
    assert "analytics" in data
    assert "listings" in data
    assert "recent_messages" in data
    assert "liked_properties" in data
    assert "upcoming_viewings" in data

    # Verify analytics shape: 4 items, each with label and value
    assert isinstance(data["analytics"], list)
    assert len(data["analytics"]) == 4
    for item in data["analytics"]:
        assert "label" in item
        assert "value" in item
