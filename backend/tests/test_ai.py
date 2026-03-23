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


# ─── RAG retrieval layer tests ────────────────────────────────────────────────


def test_rag_build_context_empty():
    from app.ai.rag import RAGRetriever
    from app.ai.schemas import Chunk  # noqa: F401
    r = RAGRetriever()
    assert r.build_context([]) == ""


def test_rag_build_context_formats_chunks():
    from app.ai.rag import RAGRetriever
    from app.ai.schemas import Chunk
    r = RAGRetriever()
    chunks = [
        Chunk(id="a1", source_type="listing", source_id="uuid-1",
              chunk_text="Nice apartment in Maadi", metadata={}, score=0.9),
        Chunk(id="a2", source_type="neighborhood", source_id="uuid-2",
              chunk_text="Maadi is a leafy suburb", metadata={}, score=0.7),
    ]
    ctx = r.build_context(chunks)
    assert "[1][listing:uuid-1]" in ctx
    assert "[2][neighborhood:uuid-2]" in ctx
    assert "Nice apartment in Maadi" in ctx


def test_rag_format_citations_listing():
    from app.ai.rag import RAGRetriever
    from app.ai.schemas import Chunk
    r = RAGRetriever()
    chunk = Chunk(id="c1", source_type="listing", source_id="prop-uuid",
                  chunk_text="3BR villa", metadata={"title": "Villa in Cairo"}, score=0.8)
    cits = r.format_citations([chunk])
    assert len(cits) == 1
    assert cits[0].url == "/property/prop-uuid"
    assert cits[0].title == "Villa in Cairo"


def test_rag_format_citations_deduplicates():
    from app.ai.rag import RAGRetriever
    from app.ai.schemas import Chunk
    r = RAGRetriever()
    chunk = Chunk(id="c1", source_type="listing", source_id="same-id",
                  chunk_text="Apartment", metadata={}, score=0.9)
    cits = r.format_citations([chunk, chunk])
    assert len(cits) == 1


# ─── RAG-augmented chat + search tests ───────────────────────────────────────


async def _async_iter(items):
    for item in items:
        yield item


def test_rag_chat_with_context(client, mock_supabase):
    """Chat endpoint emits citations SSE event when RAG retrieves chunks."""
    import app.ai.router as ai_router
    from unittest.mock import AsyncMock, MagicMock, patch
    from app.ai.schemas import Chunk, Citation

    fake_chunk = Chunk(
        id="chunk-1",
        source_type="listing",
        source_id="listing-uuid-1",
        chunk_text="3BR apartment in Maadi, 5000 EGP/month",
        metadata={"city": "Cairo", "price": 5000.0, "title": "Maadi Apartment"},
        score=0.9,
    )
    fake_citation = Citation(
        source_type="listing",
        source_id="listing-uuid-1",
        title="Maadi Apartment",
        url="/property/listing-uuid-1",
    )

    with patch.object(ai_router.rag_retriever, "retrieve", new=AsyncMock(return_value=[fake_chunk])), \
         patch.object(ai_router.rag_retriever, "build_context", return_value="[1][listing:listing-uuid-1] 3BR apartment in Maadi"), \
         patch.object(ai_router.rag_retriever, "format_citations", return_value=[fake_citation]):

        ai_router.ollama.health = AsyncMock(return_value=True)
        ai_router.ollama.generate_stream = MagicMock(
            return_value=_async_iter(["Found ", "it!"])
        )

        resp = client.post("/api/ai/chat", json={"message": "3BR in Maadi?", "conversation_history": []})
        assert resp.status_code == 200
        body = resp.text
        assert '"citations"' in body
        assert "listing-uuid-1" in body


def test_rag_chat_no_context(client, mock_supabase):
    """Chat endpoint streams normally when RAG retrieves nothing."""
    import app.ai.router as ai_router
    from unittest.mock import AsyncMock, MagicMock, patch

    with patch.object(ai_router.rag_retriever, "retrieve", new=AsyncMock(return_value=[])), \
         patch.object(ai_router.rag_retriever, "build_context", return_value=""), \
         patch.object(ai_router.rag_retriever, "format_citations", return_value=[]):

        ai_router.ollama.health = AsyncMock(return_value=True)
        ai_router.ollama.generate_stream = MagicMock(return_value=_async_iter(["Hello"]))

        resp = client.post("/api/ai/chat", json={"message": "hello", "conversation_history": []})
        assert resp.status_code == 200
        assert "[DONE]" in resp.text


def test_rag_search_semantic_primary(client, mock_supabase):
    """NL search uses semantic retrieval when 3+ chunks returned."""
    _, mock_admin = mock_supabase
    import app.ai.router as ai_router
    from unittest.mock import AsyncMock, patch
    from app.ai.schemas import Chunk

    chunks = [
        Chunk(id=f"c{i}", source_type="listing", source_id=f"lid-{i}",
              chunk_text="Apartment", metadata={}, score=0.9 - i * 0.1)
        for i in range(3)
    ]

    fake_listing = {
        "id": "lid-0", "title": "Apt", "location": "Cairo", "price": 5000,
        "currency": "EGP", "price_period": "month", "category": "for_rent",
        "property_type": "apartment", "images": [], "verified": False, "is_new": True,
        "status": "active", "bedrooms": 2, "bathrooms": 1, "size_sqm": 80,
        "floor_number": 1, "neighborhoods": None, "compound_name": None,
        "views_count": 10, "created_at": "2026-01-01T00:00:00Z",
    }
    mock_admin.table("listings").select(
        "*, neighborhoods(name)"
    ).in_("id", ["lid-0", "lid-1", "lid-2"]).eq(
        "status", "active"
    ).is_("deleted_at", "null").execute.return_value.data = [fake_listing]

    with patch.object(ai_router.rag_retriever, "retrieve", new=AsyncMock(return_value=chunks)):
        ai_router.ollama.health = AsyncMock(return_value=True)
        resp = client.post("/api/ai/search", json={"query": "apartment in Cairo"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["retrieval_method"] == "semantic"


def test_rag_search_fallback(client, mock_supabase):
    """NL search falls back to LLM filters when fewer than 3 chunks returned."""
    _, mock_admin = mock_supabase
    import app.ai.router as ai_router
    from unittest.mock import AsyncMock, patch
    from app.ai.schemas import Chunk

    # Only 1 chunk — below threshold
    chunks = [
        Chunk(id="c0", source_type="listing", source_id="lid-0",
              chunk_text="Apartment", metadata={}, score=0.9),
    ]

    mock_admin.table("listings").select(
        "*, neighborhoods(name)"
    ).eq("status", "active").is_(
        "deleted_at", "null"
    ).order("views_count", desc=True).limit(20).execute.return_value.data = []

    with patch.object(ai_router.rag_retriever, "retrieve", new=AsyncMock(return_value=chunks)):
        ai_router.ollama.health = AsyncMock(return_value=True)
        ai_router.ollama.generate = AsyncMock(return_value='{"location": "Cairo"}')
        resp = client.post("/api/ai/search", json={"query": "apartment in Cairo"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["retrieval_method"] == "keyword"
    assert "parsed_filters" in data


# ─── Description RAG tests (REQ-RAG-09) ──────────────────────────────────────

def test_description_rag_with_neighborhood_context(client, mock_supabase, auth_header):
    """generate_description injects neighborhood chunk text into system prompt."""
    _, mock_admin = mock_supabase
    import app.ai.router as ai_router
    from unittest.mock import AsyncMock, patch
    from app.ai.schemas import Chunk

    mock_admin.table("profiles").select("*").eq(
        "id", FAKE_USER_ID
    ).single().execute.return_value.data = FAKE_PROFILE

    fake_chunk = Chunk(
        id="nbhd-chunk-1",
        source_type="neighborhood",
        source_id="nbhd-new-cairo",
        chunk_text="New Cairo is a planned satellite city east of Cairo known for gated compounds.",
        metadata={"city": "New Cairo"},
        score=0.88,
    )

    captured_system = {}

    async def fake_generate(prompt, system=""):
        captured_system["value"] = system
        return '{"english": "A great apartment.", "arabic": "شقة رائعة."}'

    with patch.object(ai_router.rag_retriever, "retrieve", new=AsyncMock(return_value=[fake_chunk])):
        ai_router.ollama.health = AsyncMock(return_value=True)
        ai_router.ollama.generate = fake_generate

        resp = client.post(
            "/api/ai/description",
            json={
                "title": "2BR Apartment",
                "property_type": "apartment",
                "category": "for_rent",
                "city": "New Cairo",
                "bedrooms": 2,
            },
            headers=auth_header,
        )

    assert resp.status_code == 200
    assert "english" in resp.json()
    assert "New Cairo is a planned satellite city" in captured_system.get("value", "")


def test_description_rag_no_chunks_fallback(client, mock_supabase, auth_header):
    """generate_description proceeds normally when RAG returns no chunks."""
    _, mock_admin = mock_supabase
    import app.ai.router as ai_router
    from unittest.mock import AsyncMock, patch

    mock_admin.table("profiles").select("*").eq(
        "id", FAKE_USER_ID
    ).single().execute.return_value.data = FAKE_PROFILE

    with patch.object(ai_router.rag_retriever, "retrieve", new=AsyncMock(return_value=[])):
        ai_router.ollama.health = AsyncMock(return_value=True)
        ai_router.ollama.generate = AsyncMock(
            return_value='{"english": "A lovely apartment.", "arabic": "شقة رائعة."}'
        )

        resp = client.post(
            "/api/ai/description",
            json={
                "title": "Studio",
                "property_type": "studio",
                "category": "for_rent",
                "city": "Alexandria",
            },
            headers=auth_header,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["english"] == "A lovely apartment."
    assert data["arabic"] == "شقة رائعة."


# ─── Recommendations explain tests (REQ-RAG-11) ───────────────────────────────

def test_recommendations_with_explain(client, mock_supabase, auth_header):
    """get_recommendations?explain=true merges explanation field into each listing."""
    _, mock_admin = mock_supabase
    import app.ai.router as ai_router
    from unittest.mock import AsyncMock, patch

    mock_admin.table("profiles").select("*").eq(
        "id", FAKE_USER_ID
    ).single().execute.return_value.data = FAKE_PROFILE

    # Has one favorite
    mock_admin.table("favorites").select("listing_id").eq(
        "user_id", FAKE_USER_ID
    ).limit(10).execute.return_value.data = [{"listing_id": "fav-listing-1"}]

    # Reference listing — extended select includes id, title, location
    ref_listing = {
        "id": "fav-listing-1",
        "title": "Cozy 2BR in Maadi",
        "location": "Maadi, Cairo",
        "category": "for_rent",
        "city": "Cairo",
        "embedding": None,  # no vector — forces fallback path
    }
    mock_admin.table("listings").select(
        "id, title, location, category, city, embedding"
    ).eq("id", "fav-listing-1").single().execute.return_value.data = ref_listing

    # Fallback path result
    candidate = {
        "id": "candidate-1",
        "title": "Nice Apartment",
        "location": "Cairo",
        "price": 6000,
        "currency": "EGP",
        "price_period": "month",
        "category": "for_rent",
        "property_type": "apartment",
        "images": [],
        "verified": False,
        "is_new": True,
        "status": "active",
        "bedrooms": 2,
        "bathrooms": 1,
        "size_sqm": 90.0,
        "floor_number": 2,
        "neighborhoods": None,
        "compound_name": None,
        "views_count": 5,
        "created_at": "2026-01-01T00:00:00Z",
    }
    mock_admin.table("listings").select(
        "*, neighborhoods(name)"
    ).eq("status", "active").is_(
        "deleted_at", "null"
    ).not_.in_(
        "id", ["fav-listing-1"]
    ).eq("category", "for_rent").ilike(
        "city", "%Cairo%"
    ).order("views_count", desc=True).limit(8).execute.return_value.data = [candidate]

    with patch.object(
        ai_router,
        "_explain_recommendations",
        new=AsyncMock(return_value={"candidate-1": "Matches your Cairo rental preference."}),
    ):
        ai_router.ollama.health = AsyncMock(return_value=True)
        resp = client.get("/api/ai/recommendations?explain=true", headers=auth_header)

    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["explanation"] == "Matches your Cairo rental preference."


def test_recommendations_without_explain_unchanged(client, mock_supabase, auth_header):
    """get_recommendations without explain=true returns listings with no explanation field, even when favorites exist."""
    _, mock_admin = mock_supabase
    import app.ai.router as ai_router
    from unittest.mock import AsyncMock, patch

    mock_admin.table("profiles").select("*").eq(
        "id", FAKE_USER_ID
    ).single().execute.return_value.data = FAKE_PROFILE

    # Has one favorite — exercises the has-favorites path, not the early-return
    mock_admin.table("favorites").select("listing_id").eq(
        "user_id", FAKE_USER_ID
    ).limit(10).execute.return_value.data = [{"listing_id": "fav-listing-2"}]

    # Reference listing — no embedding so fallback path is taken
    mock_admin.table("listings").select(
        "id, title, location, category, city, embedding"
    ).eq("id", "fav-listing-2").single().execute.return_value.data = {
        "id": "fav-listing-2",
        "title": "Old Flat",
        "location": "Heliopolis",
        "category": "for_rent",
        "city": "Cairo",
        "embedding": None,
    }

    candidate = {
        "id": "candidate-2",
        "title": "Another Apartment",
        "location": "Cairo",
        "price": 5000,
        "currency": "EGP",
        "price_period": "month",
        "category": "for_rent",
        "property_type": "apartment",
        "images": [],
        "verified": False,
        "is_new": False,
        "status": "active",
        "bedrooms": 1,
        "bathrooms": 1,
        "size_sqm": 70.0,
        "floor_number": 1,
        "neighborhoods": None,
        "compound_name": None,
        "views_count": 3,
        "created_at": "2026-01-01T00:00:00Z",
    }
    mock_admin.table("listings").select(
        "*, neighborhoods(name)"
    ).eq("status", "active").is_(
        "deleted_at", "null"
    ).not_.in_(
        "id", ["fav-listing-2"]
    ).eq("category", "for_rent").ilike(
        "city", "%Cairo%"
    ).order("views_count", desc=True).limit(8).execute.return_value.data = [candidate]

    ai_router.ollama.health = AsyncMock(return_value=True)
    # _explain_recommendations must NOT be called when explain=False
    with patch.object(
        ai_router,
        "_explain_recommendations",
        new=AsyncMock(return_value={}),
    ) as mock_explain:
        resp = client.get("/api/ai/recommendations", headers=auth_header)
        mock_explain.assert_not_called()

    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    # No explanation field — explain=False (default) must never enrich
    assert "explanation" not in data[0]
