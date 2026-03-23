"""Tests for /api/ai endpoints — all mock Ollama."""

import asyncio
from unittest.mock import AsyncMock

from tests.conftest import FAKE_USER_ID, FAKE_PROFILE


def _get_ollama(client):
    """Get the patched ollama mock from the running app context."""
    import app.ai.router as ai_router
    return ai_router.ollama


# ─── POST /api/ai/search ──────────────────────────────────────────────────────


def test_ai_search_ollama_down(client, mock_supabase):
    ollama = _get_ollama(client)
    ollama.health = AsyncMock(return_value=False)

    resp = client.post("/api/ai/search", json={"query": "2BR in Maadi"})
    assert resp.status_code == 200
    assert resp.json()["ai_unavailable"] is True


def test_ai_search_success(client, mock_supabase):
    _, mock_admin = mock_supabase
    ollama = _get_ollama(client)

    ollama.health = AsyncMock(return_value=True)
    ollama.generate = AsyncMock(return_value='{"location": "Maadi", "bedrooms": 2}')

    # Mock DB query chain
    fake_listing = {
        "id": "listing-1",
        "title": "Nice 2BR in Maadi",
        "location": "Maadi, Cairo",
        "price": 5000,
        "currency": "EGP",
        "price_period": "month",
        "category": "for_rent",
        "property_type": "apartment",
        "images": [],
        "verified": True,
        "is_new": False,
        "status": "active",
        "bedrooms": 2,
        "bathrooms": 1,
        "size_sqm": 90,
        "floor_number": 3,
        "neighborhoods": {"name": "Maadi"},
        "compound_name": None,
        "views_count": 50,
        "created_at": "2026-03-01T00:00:00Z",
    }
    mock_admin.table("listings").select(
        "*, neighborhoods(name)"
    ).eq("status", "active").is_(
        "deleted_at", "null"
    ).eq("bedrooms", 2).or_(
        "city.ilike.%Maadi%,location.ilike.%Maadi%"
    ).order(
        "views_count", desc=True
    ).limit(20).execute.return_value.data = [fake_listing]

    resp = client.post("/api/ai/search", json={"query": "2BR in Maadi"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["results"][0]["title"] == "Nice 2BR in Maadi"
    assert "parsed_filters" in data


# ─── POST /api/ai/chat ────────────────────────────────────────────────────────


def test_ai_chat_ollama_down(client, mock_supabase):
    ollama = _get_ollama(client)
    ollama.health = AsyncMock(return_value=False)

    resp = client.post("/api/ai/chat", json={"message": "Hi"})
    assert resp.status_code == 200
    assert resp.json()["ai_unavailable"] is True


def test_ai_chat_streams(client, mock_supabase):
    ollama = _get_ollama(client)
    ollama.health = AsyncMock(return_value=True)

    async def fake_stream(prompt, system=""):
        for token in ["Hello", " there", "!"]:
            yield token

    ollama.generate_stream = fake_stream

    resp = client.post("/api/ai/chat", json={"message": "Hi"})
    assert resp.status_code == 200
    # SSE response — check that it contains data lines
    body = resp.text
    assert "data:" in body
    assert "[DONE]" in body


# ─── GET /api/ai/recommendations ──────────────────────────────────────────────


def test_recommendations_no_auth(client, mock_supabase):
    resp = client.get("/api/ai/recommendations")
    assert resp.status_code == 401


def test_recommendations_no_favorites(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase
    ollama = _get_ollama(client)

    # Auth: profile lookup
    mock_admin.table("profiles").select("*").eq(
        "id", FAKE_USER_ID
    ).single().execute.return_value.data = FAKE_PROFILE

    # No favorites
    mock_admin.table("favorites").select("listing_id").eq(
        "user_id", FAKE_USER_ID
    ).limit(10).execute.return_value.data = []

    # Fallback: newest active listings
    mock_admin.table("listings").select(
        "*, neighborhoods(name)"
    ).eq("status", "active").is_(
        "deleted_at", "null"
    ).order("created_at", desc=True).limit(8).execute.return_value.data = []

    resp = client.get("/api/ai/recommendations", headers=auth_header)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ─── POST /api/ai/compatibility ───────────────────────────────────────────────


def test_compatibility_not_shared_housing(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase
    ollama = _get_ollama(client)
    ollama.health = AsyncMock(return_value=True)

    # Auth: profile lookup
    mock_admin.table("profiles").select("*").eq(
        "id", FAKE_USER_ID
    ).single().execute.return_value.data = FAKE_PROFILE

    # Listing exists but is for_rent, not shared_housing
    mock_admin.table("listings").select(
        "category, lifestyle_preferences, title"
    ).eq("id", "listing-1").single().execute.return_value.data = {
        "category": "for_rent",
        "lifestyle_preferences": {},
        "title": "Regular apartment",
    }

    resp = client.post(
        "/api/ai/compatibility",
        json={"listing_id": "listing-1", "lifestyle_data": {}},
        headers=auth_header,
    )
    assert resp.status_code == 400
    assert "shared housing" in resp.json()["detail"].lower()


# ─── POST /api/ai/description ─────────────────────────────────────────────────


def test_description_success(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase
    ollama = _get_ollama(client)
    ollama.health = AsyncMock(return_value=True)
    ollama.generate = AsyncMock(
        return_value='{"english": "A lovely apartment.", "arabic": "شقة رائعة."}'
    )

    # Auth: profile lookup
    mock_admin.table("profiles").select("*").eq(
        "id", FAKE_USER_ID
    ).single().execute.return_value.data = FAKE_PROFILE

    resp = client.post(
        "/api/ai/description",
        json={
            "title": "2BR Apartment",
            "property_type": "apartment",
            "category": "for_rent",
            "city": "Cairo",
            "bedrooms": 2,
            "bathrooms": 1,
            "amenities": ["WiFi", "AC"],
            "price": 5000,
        },
        headers=auth_header,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["english"] == "A lovely apartment."
    assert data["arabic"] == "شقة رائعة."


def test_description_ollama_down(client, mock_supabase, auth_header):
    _, mock_admin = mock_supabase
    ollama = _get_ollama(client)
    ollama.health = AsyncMock(return_value=False)

    # Auth: profile lookup
    mock_admin.table("profiles").select("*").eq(
        "id", FAKE_USER_ID
    ).single().execute.return_value.data = FAKE_PROFILE

    resp = client.post(
        "/api/ai/description",
        json={
            "title": "Test",
            "property_type": "apartment",
            "category": "for_rent",
            "city": "Cairo",
        },
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["ai_unavailable"] is True


# ─── schemas.py: Chunk, Citation, RAGResponse Pydantic models ─────────────────


def test_schemas_chunk_valid():
    from app.ai.schemas import Chunk
    chunk = Chunk(
        id="abc",
        source_type="listing",
        source_id="uuid-1",
        chunk_text="Nice apartment",
        metadata={"title": "Test"},
        score=0.9,
    )
    assert chunk.id == "abc"
    assert chunk.source_type == "listing"


def test_schemas_citation_valid():
    from app.ai.schemas import Citation
    cit = Citation(
        source_type="neighborhood",
        source_id="nbhd-1",
        title="Maadi neighborhood",
        url="/find-homes?location=Maadi",
    )
    assert cit.url == "/find-homes?location=Maadi"


def test_schemas_rag_response_valid():
    from app.ai.schemas import Citation, RAGResponse
    cit = Citation(
        source_type="blog",
        source_id="post-1",
        title="Blog post",
        url="/blog/post-1",
    )
    resp = RAGResponse(answer="Here is the answer.", citations=[cit])
    assert resp.answer == "Here is the answer."
    assert len(resp.citations) == 1


def test_schemas_chunk_invalid_source_type():
    from pydantic import ValidationError
    from app.ai.schemas import Chunk
    try:
        Chunk(
            id="x",
            source_type="invalid_type",
            source_id="s1",
            chunk_text="text",
            metadata={},
            score=0.5,
        )
        assert False, "Should have raised ValidationError"
    except ValidationError:
        pass
