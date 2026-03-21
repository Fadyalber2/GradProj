"""Shared test fixtures — mocks Supabase so tests don't hit the real DB."""

import time
import pytest
import jwt
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.config import settings


# ── Fake profile data ────────────────────────────────────────────────────────

FAKE_USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

FAKE_PROFILE = {
    "id": FAKE_USER_ID,
    "email": "test@example.com",
    "full_name": "Test User",
    "avatar_url": None,
    "phone": "+201234567890",
    "bio": None,
    "role": "user",
    "is_verified_seller": False,
    "gender": "male",
    "country_code": "+20",
    "badges": [],
    "age": None,
    "occupation": None,
    "lifestyle_preferences": None,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
}


def make_supabase_jwt(user_id: str = FAKE_USER_ID, expired: bool = False) -> str:
    """Create a valid Supabase-style JWT for testing."""
    now = int(time.time())
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now - 60,
        "exp": (now - 120) if expired else (now + 3600),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


@pytest.fixture
def mock_supabase():
    """Patch both supabase_client and supabase_admin with MagicMocks."""
    mock_client = MagicMock()
    mock_admin = MagicMock()

    mock_ollama = MagicMock()

    with (
        patch("app.database.supabase_client", mock_client),
        patch("app.database.supabase_admin", mock_admin),
        patch("app.auth.router.supabase_client", mock_client),
        patch("app.auth.router.supabase_admin", mock_admin),
        patch("app.dependencies.supabase_admin", mock_admin),
        patch("app.listings.router.supabase_admin", mock_admin),
        patch("app.uploads.router.supabase_admin", mock_admin),
        patch("app.ai.router.supabase_admin", mock_admin),
        patch("app.ai.router.ollama", mock_ollama),
        patch("app.messages.router.supabase_admin", mock_admin),
        patch("app.notifications.router.supabase_admin", mock_admin),
        patch("app.dashboard.router.supabase_admin", mock_admin),
        patch("app.agencies.router.supabase_admin", mock_admin),
        patch("app.viewings.router.supabase_admin", mock_admin),
        patch("app.blog.router.supabase_admin", mock_admin),
        patch("app.admin.router.supabase_admin", mock_admin),
        patch("app.applications.router.supabase_admin", mock_admin),
        patch("app.projects.router.supabase_admin", mock_admin),
    ):
        yield mock_client, mock_admin




@pytest.fixture
def client(mock_supabase):
    """TestClient with mocked Supabase — import app after patching."""
    # Import inside fixture so patches are active
    from app.main import app
    return TestClient(app)


@pytest.fixture
def auth_header():
    """Authorization header with a valid JWT."""
    token = make_supabase_jwt()
    return {"Authorization": f"Bearer {token}"}
