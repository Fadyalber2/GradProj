"""Tests for /api/notifications endpoints."""

from tests.conftest import FAKE_USER_ID, FAKE_PROFILE

FAKE_NOTIF_ID = "nnnnnnnn-0000-1111-2222-333333333333"


def test_list_notifications_requires_auth(client):
    resp = client.get("/api/notifications")
    assert resp.status_code == 401


def test_list_notifications_success(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase
    mock_admin.table("profiles").select("*").eq("id", FAKE_USER_ID).single().execute.return_value.data = FAKE_PROFILE
    mock_admin.table("notifications").select("*").eq(
        "user_id", FAKE_USER_ID
    ).order("created_at", desc=True).execute.return_value.data = [
        {
            "id": FAKE_NOTIF_ID,
            "user_id": FAKE_USER_ID,
            "type": "new_message",
            "title": "New Message",
            "body": "Someone sent you a message",
            "metadata": {},
            "is_read": False,
            "created_at": "2026-03-08T10:00:00Z",
        }
    ]

    resp = client.get("/api/notifications", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["type"] == "new_message"


def test_mark_all_read(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase
    mock_admin.table("profiles").select("*").eq("id", FAKE_USER_ID).single().execute.return_value.data = FAKE_PROFILE
    mock_admin.table("notifications").update({"is_read": True}).eq(
        "user_id", FAKE_USER_ID
    ).eq("is_read", False).execute.return_value.data = []

    resp = client.put("/api/notifications/read-all", headers=auth_header)
    assert resp.status_code == 200
    assert "read" in resp.json()["message"].lower()
