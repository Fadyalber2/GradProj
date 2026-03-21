"""Tests for /api/messages endpoints."""

from unittest.mock import MagicMock
from tests.conftest import FAKE_USER_ID, FAKE_PROFILE

FAKE_OTHER_USER = "11111111-2222-3333-4444-555555555555"
FAKE_CONV_ID = "cccccccc-dddd-eeee-ffff-000000000000"


# ── Test: list conversations requires auth ────────────────────────────────────

def test_list_conversations_requires_auth(client):
    resp = client.get("/api/messages/conversations")
    assert resp.status_code == 401


# ── Test: list conversations success ──────────────────────────────────────────

def test_list_conversations_success(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase

    # Auth: profile lookup
    profile_result = MagicMock()
    profile_result.data = FAKE_PROFILE
    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_result

    # RPC: get_user_conversations
    rpc_result = MagicMock()
    rpc_result.data = [
        {
            "conversation_id": FAKE_CONV_ID,
            "other_user_id": FAKE_OTHER_USER,
            "listing_id": None,
            "last_message_at": "2026-03-08T10:00:00Z",
            "unread_count": 2,
        }
    ]
    mock_admin.rpc.return_value.execute.return_value = rpc_result

    # Profile enrichment for other user — same chain as auth lookup,
    # but MagicMock returns same object so it gets FAKE_PROFILE data.
    # The router only reads full_name and avatar_url, which exist in FAKE_PROFILE.

    resp = client.get("/api/messages/conversations", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == FAKE_CONV_ID
    assert data[0]["other_user_id"] == FAKE_OTHER_USER
    assert data[0]["unread_count"] == 2


# ── Test: create conversation with self returns 400 ───────────────────────────

def test_create_conversation_self_error(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase

    # Auth: profile lookup
    profile_result = MagicMock()
    profile_result.data = FAKE_PROFILE
    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_result

    resp = client.post(
        "/api/messages/conversations",
        json={"other_user_id": FAKE_USER_ID},
        headers=auth_header,
    )
    assert resp.status_code == 400
    assert "yourself" in resp.json()["detail"]


# ── Test: send message requires auth ──────────────────────────────────────────

def test_send_message_requires_auth(client):
    resp = client.post(
        f"/api/messages/conversations/{FAKE_CONV_ID}",
        json={"text": "Hello"},
    )
    assert resp.status_code == 401


# ── Test: get messages — not a participant returns 403 ────────────────────────

def test_get_messages_not_participant(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase

    # We need two sequential .table().select().eq().single().execute() calls:
    # 1st: profile lookup (auth) → returns FAKE_PROFILE
    # 2nd: conversation check → returns conv where user is NOT a participant
    profile_result = MagicMock()
    profile_result.data = FAKE_PROFILE

    conv_result = MagicMock()
    conv_result.data = {
        "id": FAKE_CONV_ID,
        "user_a_id": FAKE_OTHER_USER,
        "user_b_id": "99999999-9999-9999-9999-999999999999",
    }

    # Use side_effect to return different results on successive calls
    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = [
        profile_result,
        conv_result,
    ]

    resp = client.get(
        f"/api/messages/conversations/{FAKE_CONV_ID}",
        headers=auth_header,
    )
    assert resp.status_code == 403
    assert "Not a participant" in resp.json()["detail"]


# ── Test: accept conversation success ─────────────────────────────────────────

def test_accept_conversation_success(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase

    # Auth profile lookup
    profile_result = MagicMock()
    profile_result.data = FAKE_PROFILE

    # _fetch_conversation — user is user_b (recipient), initiated_by is OTHER
    conv_result = MagicMock()
    conv_result.data = {
        "id": FAKE_CONV_ID,
        "user_a_id": FAKE_OTHER_USER,
        "user_b_id": FAKE_USER_ID,
        "status": "pending",
        "initiated_by": FAKE_OTHER_USER,
    }

    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = [
        profile_result,
        conv_result,
    ]

    resp = client.post(
        f"/api/messages/conversations/{FAKE_CONV_ID}/accept",
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["detail"] == "Conversation accepted"


# ── Test: reject conversation success ─────────────────────────────────────────

def test_reject_conversation_success(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase

    profile_result = MagicMock()
    profile_result.data = FAKE_PROFILE

    conv_result = MagicMock()
    conv_result.data = {
        "id": FAKE_CONV_ID,
        "user_a_id": FAKE_OTHER_USER,
        "user_b_id": FAKE_USER_ID,
        "status": "pending",
        "initiated_by": FAKE_OTHER_USER,
    }

    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = [
        profile_result,
        conv_result,
    ]

    resp = client.post(
        f"/api/messages/conversations/{FAKE_CONV_ID}/reject",
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["detail"] == "Conversation rejected"


# ── Test: initiator cannot accept own request ─────────────────────────────────

def test_initiator_cannot_accept_own_request(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase

    profile_result = MagicMock()
    profile_result.data = FAKE_PROFILE

    # initiated_by = FAKE_USER_ID (same as current user → should be rejected)
    conv_result = MagicMock()
    conv_result.data = {
        "id": FAKE_CONV_ID,
        "user_a_id": FAKE_USER_ID,
        "user_b_id": FAKE_OTHER_USER,
        "status": "pending",
        "initiated_by": FAKE_USER_ID,
    }

    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = [
        profile_result,
        conv_result,
    ]

    resp = client.post(
        f"/api/messages/conversations/{FAKE_CONV_ID}/accept",
        headers=auth_header,
    )
    assert resp.status_code == 403
    assert "recipient" in resp.json()["detail"]


# ── Test: send message blocked when pending (initiator) ───────────────────────

def test_send_message_blocked_when_pending_initiator(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase

    profile_result = MagicMock()
    profile_result.data = FAKE_PROFILE

    conv_result = MagicMock()
    conv_result.data = {
        "id": FAKE_CONV_ID,
        "user_a_id": FAKE_USER_ID,
        "user_b_id": FAKE_OTHER_USER,
        "status": "pending",
        "initiated_by": FAKE_USER_ID,
    }

    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = [
        profile_result,
        conv_result,
    ]

    resp = client.post(
        f"/api/messages/conversations/{FAKE_CONV_ID}",
        json={"text": "Hello there"},
        headers=auth_header,
    )
    assert resp.status_code == 403
    assert "accept" in resp.json()["detail"]


# ── Test: block user success ──────────────────────────────────────────────────

def test_block_user_success(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase

    profile_result = MagicMock()
    profile_result.data = FAKE_PROFILE

    # Auth lookup uses .single() chain
    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_result

    # Check existing blocks — returns empty (no prior block)
    block_check_result = MagicMock()
    block_check_result.data = []
    mock_admin.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = block_check_result

    # Insert block — fire and forget
    mock_admin.table.return_value.insert.return_value.execute.return_value = MagicMock()

    # Query conversations to reject them — returns empty list
    conv_query_result = MagicMock()
    conv_query_result.data = []
    mock_admin.table.return_value.select.return_value.or_.return_value.in_.return_value.execute.return_value = conv_query_result

    resp = client.post(
        "/api/messages/block",
        json={"user_id": FAKE_OTHER_USER, "reason": "spam"},
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["detail"] == "User blocked"


# ── Test: block self returns 400 ──────────────────────────────────────────────

def test_block_self_returns_400(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase

    profile_result = MagicMock()
    profile_result.data = FAKE_PROFILE
    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_result

    resp = client.post(
        "/api/messages/block",
        json={"user_id": FAKE_USER_ID, "reason": "test"},
        headers=auth_header,
    )
    assert resp.status_code == 400
    assert "yourself" in resp.json()["detail"]


# ── Test: create conversation returns id ──────────────────────────────────────

def test_create_conversation_returns_id(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase

    profile_result = MagicMock()
    profile_result.data = FAKE_PROFILE

    # Auth lookup uses .single() chain
    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_result

    # Block check — .or_().limit().execute() → empty (no blocks)
    block_check_result = MagicMock()
    block_check_result.data = []
    mock_admin.table.return_value.select.return_value.or_.return_value.limit.return_value.execute.return_value = block_check_result

    # Existing conv check — .or_().is_().limit().execute() → empty (no existing conv)
    existing_result = MagicMock()
    existing_result.data = []
    mock_admin.table.return_value.select.return_value.or_.return_value.is_.return_value.limit.return_value.execute.return_value = existing_result

    # Insert new conversation — .insert().select().single().execute()
    insert_result = MagicMock()
    insert_result.data = {"id": FAKE_CONV_ID}
    mock_admin.table.return_value.insert.return_value.select.return_value.single.return_value.execute.return_value = insert_result

    resp = client.post(
        "/api/messages/conversations",
        json={"other_user_id": FAKE_OTHER_USER},
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == FAKE_CONV_ID
