import json
import asyncio
import re
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Any
from app.ai.ollama_client import ollama
from app.ai.rag import rag_retriever
from app.database import supabase_admin
from app.dependencies import get_current_user, get_optional_user

router = APIRouter()

AI_UNAVAILABLE = {"ai_unavailable": True}


# ─── Request Bodies ───────────────────────────────────────────────────────────

class NLSearchRequest(BaseModel):
    query: str
    limit: int = 20


class ChatRequest(BaseModel):
    message: str
    conversation_history: list[dict] = []


class CompatibilityRequest(BaseModel):
    listing_id: str
    lifestyle_data: dict[str, Any]


class DescriptionRequest(BaseModel):
    title: str
    property_type: str
    category: str
    city: str
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    size_sqm: Optional[float] = None
    amenities: list[str] = []
    price: Optional[float] = None
    extra_notes: Optional[str] = None


class AmenityValidationRequest(BaseModel):
    amenity: str = Field(..., max_length=200)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _build_listing_brief(row: dict) -> dict:
    """Shared helper — same as listings/router._build_listing_brief."""
    nbhd = row.get("neighborhoods")
    neighborhood_name = nbhd.get("name") if isinstance(nbhd, dict) else None
    return {
        "id": row["id"],
        "title": row["title"],
        "location": row["location"],
        "price": float(row["price"]),
        "currency": row.get("currency", "EGP"),
        "price_period": row.get("price_period"),
        "category": row["category"],
        "property_type": row["property_type"],
        "images": row.get("images") or [],
        "verified": bool(row.get("verified", False)),
        "is_new": bool(row.get("is_new", True)),
        "status": row.get("status", "active"),
        "bedrooms": row.get("bedrooms"),
        "bathrooms": row.get("bathrooms"),
        "size_sqm": float(row["size_sqm"]) if row.get("size_sqm") is not None else None,
        "floor_number": row.get("floor_number"),
        "neighborhood": neighborhood_name,
        "compound_name": row.get("compound_name"),
        "views_count": row.get("views_count", 0),
        "created_at": row.get("created_at", ""),
    }


async def _extract_filters_from_query(query: str) -> dict:
    """
    Use Ollama to parse a natural-language query into structured filters.
    Falls back to an empty dict if Ollama is down.
    """
    system = (
        "You are a real estate search assistant for Egypt. "
        "Extract search filters from the user's query. "
        "Return ONLY a JSON object with these optional keys: "
        "location (string, Egyptian city or neighborhood), "
        "max_price (number in EGP), min_price (number), "
        "bedrooms (number), bathrooms (number), "
        "category (for_rent|for_sale|shared_housing), "
        "property_type (apartment|villa|studio|duplex|penthouse|commercial|room|chalet|townhouse|twin_house|land|whole_building|office). "
        "Output ONLY valid JSON, no explanation."
    )
    try:
        raw = await ollama.generate(prompt=query, system=system)
        # Extract JSON from response (model may add extra text)
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except Exception:
        pass
    return {}


def _detect_property_search(message: str) -> int:
    """
    Score a message for property search intent.
    Returns int score; >= 40 means run listing search.
    """
    msg = message.lower()
    score = 0

    cities = [
        "cairo", "giza", "alexandria", "new cairo", "new capital", "maadi",
        "zamalek", "heliopolis", "nasr city", "sheikh zayed", "6th october",
        "6th of october", "october city", "north coast", "hurghada", "sharm",
        "dokki", "mohandessin", "rehab", "mostakbal",
        # Arabic city names
        "القاهرة", "الجيزة", "الإسكندرية", "المعادي", "الزمالك",
        "مدينة نصر", "الشيخ زايد", "أكتوبر", "الرحاب", "المستقبل",
    ]
    if any(city in msg for city in cities):
        score += 40

    category_words = [
        "apartment", "flat", "villa", "rent", "sale", "room", "studio",
        "شقة", "فيلا", "إيجار", "للبيع", "للإيجار",
    ]
    if any(w in msg for w in category_words):
        score += 30

    if re.search(r'\b\d[\d,]*\s*(k|m|egp|pound|جنيه)\b|\begp\b', msg):
        score += 25

    bedroom_words = ["bedroom", "beds", "غرف", "أوض"]
    if any(w in msg for w in bedroom_words) or re.search(r'\bbr\b', msg):
        score += 20

    question_words = ["how ", "what is", "explain", "كيف", "ما هو"]
    if any(w in msg for w in question_words) and score == 0:
        score -= 30

    return score


def _build_listing_refs(candidates: list[dict]) -> list[dict]:
    """Build the listing_refs SSE payload from DB rows. Strips embeddings."""
    return [
        {
            "id": row["id"],
            "title": row["title"],
            "location": row["location"],
            "price": float(row["price"]),
            "currency": row.get("currency", "EGP"),
            "bedrooms": row.get("bedrooms"),
            "size_sqm": float(row["size_sqm"]) if row.get("size_sqm") else None,
            "images": row.get("images") or [],
        }
        for row in candidates
    ]


async def _search_listings_for_chat(
    message: str,
    filters: dict,
    current_user: dict | None,
) -> tuple[list[dict], str]:
    """
    Returns (listing_refs, source). source is "search" or "personalized".
    Total budget: 3 seconds. Returns ([], "search") on any failure or timeout.
    """
    import math

    async def _do_search() -> tuple[list[dict], str]:
        # ── Personalized path (logged-in users with favorites) ────────────────
        if current_user:
            try:
                fav_result = (
                    supabase_admin.table("favorites")
                    .select("listing_id")
                    .eq("user_id", current_user["id"])
                    .order("created_at", desc=True)
                    .limit(5)
                    .execute()
                )
                fav_ids = [r["listing_id"] for r in (fav_result.data or [])]
                for fav_id in fav_ids:
                    ref = (
                        supabase_admin.table("listings")
                        .select("embedding")
                        .eq("id", fav_id)
                        .single()
                        .execute()
                    )
                    if ref.data and ref.data.get("embedding"):
                        rpc_result = supabase_admin.rpc("match_listings", {
                            "query_embedding": ref.data["embedding"],
                            "match_threshold": 0.5,
                            "match_count": 10,
                            "filter_category": filters.get("category"),
                            # IMPORTANT: RPC param is filter_city; extractor key is location (not city)
                            "filter_city": filters.get("location"),
                        }).execute()
                        candidates = rpc_result.data or []
                        # Post-filter price (RPC has no max_price/min_price params)
                        if filters.get("max_price"):
                            candidates = [
                                c for c in candidates
                                if c.get("price", float("inf")) <= filters["max_price"]
                            ]
                        if filters.get("min_price"):
                            candidates = [
                                c for c in candidates
                                if c.get("price", 0) >= filters["min_price"]
                            ]
                        for c in candidates:
                            c.pop("embedding", None)
                        if candidates:
                            return _build_listing_refs(candidates[:3]), "personalized"
            except Exception:
                pass  # fall through to structured search

        # ── Structured search path ─────────────────────────────────────────────
        db_query = (
            supabase_admin.table("listings")
            .select(
                "id, title, location, city, price, currency, "
                "bedrooms, size_sqm, images, views_count, embedding"
            )
            .eq("status", "active")
            .is_("deleted_at", "null")
        )
        if filters.get("category"):
            db_query = db_query.eq("category", filters["category"])
        if filters.get("min_price") is not None:
            db_query = db_query.gte("price", filters["min_price"])
        if filters.get("max_price") is not None:
            db_query = db_query.lte("price", filters["max_price"])
        if filters.get("bedrooms") is not None:
            db_query = db_query.eq("bedrooms", filters["bedrooms"])
        if filters.get("location"):
            loc = filters["location"]
            db_query = db_query.or_(f"city.ilike.%{loc}%,location.ilike.%{loc}%")

        result = db_query.order("views_count", desc=True).limit(10).execute()
        candidates = result.data or []

        # Semantic re-rank (only if Ollama healthy and candidates non-empty)
        if candidates and await ollama.health():
            try:
                msg_embedding = await ollama.embed(message)

                def cosine_sim(a: list[float], b: list[float]) -> float:
                    dot = sum(x * y for x, y in zip(a, b))
                    mag = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(x * x for x in b))
                    return dot / mag if mag else 0.0

                scored = [
                    (cosine_sim(msg_embedding, c["embedding"]), c)
                    for c in candidates
                    if c.get("embedding")
                ]
                if len(scored) >= 3:
                    scored.sort(key=lambda x: x[0], reverse=True)
                    candidates = [c for _, c in scored[:3]]
                else:
                    candidates = candidates[:3]
            except Exception:
                candidates = candidates[:3]
        else:
            candidates = candidates[:3]

        # Strip embedding vectors before building refs
        for c in candidates:
            c.pop("embedding", None)

        return _build_listing_refs(candidates), "search"

    try:
        return await asyncio.wait_for(_do_search(), timeout=3.0)
    except Exception:
        return [], "search"


# ─── POST /api/ai/search ─────────────────────────────────────────────────────

@router.post("/search")
async def nl_search(body: NLSearchRequest):
    """
    Natural language property search.
    Primary path: semantic retrieval from knowledge_chunks (3+ results).
    Fallback path: LLM filter extraction -> structured DB query.
    Returns {ai_unavailable: true} if Ollama is down.
    """
    if not await ollama.health():
        return AI_UNAVAILABLE

    # Primary path: semantic retrieval from knowledge_chunks
    chunks = await rag_retriever.retrieve(body.query, source_type="listing", k=body.limit)

    if len(chunks) >= 3:
        # Enough semantic results — fetch full listing details for the top chunk source_ids
        listing_ids = list(dict.fromkeys(c.source_id for c in chunks))  # deduplicate, preserve order
        try:
            details_result = (
                supabase_admin.table("listings")
                .select("*, neighborhoods(name)")
                .in_("id", listing_ids[:body.limit])
                .eq("status", "active")
                .is_("deleted_at", "null")
                .execute()
            )
            listings = [_build_listing_brief(r) for r in (details_result.data or [])]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {e}")

        return {
            "query": body.query,
            "parsed_filters": {},
            "results": listings,
            "total": len(listings),
            "retrieval_method": "semantic",
        }

    # Fallback path: LLM filter extraction -> structured DB query
    filters = await _extract_filters_from_query(body.query)

    db_query = (
        supabase_admin.table("listings")
        .select("*, neighborhoods(name)")
        .eq("status", "active")
        .is_("deleted_at", "null")
    )

    if filters.get("category"):
        db_query = db_query.eq("category", filters["category"])
    if filters.get("property_type"):
        db_query = db_query.eq("property_type", filters["property_type"])
    if filters.get("min_price") is not None:
        db_query = db_query.gte("price", filters["min_price"])
    if filters.get("max_price") is not None:
        db_query = db_query.lte("price", filters["max_price"])
    if filters.get("bedrooms") is not None:
        db_query = db_query.eq("bedrooms", filters["bedrooms"])
    if filters.get("bathrooms") is not None:
        db_query = db_query.gte("bathrooms", filters["bathrooms"])
    if filters.get("location"):
        location = filters["location"]
        db_query = db_query.or_(f"city.ilike.%{location}%,location.ilike.%{location}%")

    try:
        result = db_query.order("views_count", desc=True).limit(body.limit).execute()
        listings = [_build_listing_brief(r) for r in (result.data or [])]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return {
        "query": body.query,
        "parsed_filters": filters,
        "results": listings,
        "total": len(listings),
        "retrieval_method": "keyword",
    }


# ─── POST /api/ai/chat ────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(
    body: ChatRequest,
    current_user: dict | None = Depends(get_optional_user),
):
    """
    RAG-augmented streaming SSE chatbot powered by Ollama.
    Retrieves relevant context BEFORE streaming, then emits a citations event
    before [DONE] so the frontend can render source links.
    Returns {ai_unavailable: true} if Ollama is down.
    """
    if not await ollama.health():
        return AI_UNAVAILABLE

    # Step 1: Retrieve relevant context BEFORE streaming
    chunks = await rag_retriever.retrieve(body.message, k=5)
    context_str = rag_retriever.build_context(chunks)
    citations = rag_retriever.format_citations(chunks)

    # ── Property search injection ────────────────────────────────────────────────
    listing_refs: list[dict] = []
    listing_source = "search"
    if _detect_property_search(body.message) >= 40:
        try:
            search_filters = await _extract_filters_from_query(body.message)
            listing_refs, listing_source = await _search_listings_for_chat(
                body.message, search_filters, current_user
            )
        except Exception:
            pass  # fail-open: chat continues without listing cards

    # Step 2: Build grounded system prompt
    if context_str:
        system = (
            "You are AXIOM AI — the assistant built into AXIOM, Egypt's real estate platform.\n"
            "Users are already on the AXIOM website browsing properties.\n\n"
            "PLATFORM:\n"
            "- AXIOM lists properties across Egypt: Cairo, Giza, Alexandria, New Capital, "
            "North Coast, Hurghada, Sharm El Sheikh\n"
            "- Categories: apartments for rent, homes for sale, shared housing rooms\n"
            "- Users can message landlords, save favorites, and apply to listings\n\n"
            "BEHAVIOR:\n"
            "- Answer from the verified database records below ONLY\n"
            "- When a listing is relevant, describe it naturally (title, location, price) "
            "— do NOT expose raw UUIDs to the user\n"
            "- If the user's need isn't in the records, say 'I don't see that in our listings "
            "right now' — never send them to another website\n"
            "- Ask one clarifying question if the query is vague (e.g. no city or budget given)\n\n"
            "STYLE — CRITICAL:\n"
            "- Short and conversational: 1-2 sentences for simple questions\n"
            "- Use bullet points ONLY when listing 3+ properties or features\n"
            "- Never use numbered lists, markdown headers (##), or bold (**) for chat replies\n"
            "- Never open with 'Great question!' or 'Of course!' or any filler phrase\n"
            "- Match the user's language (Arabic or English)\n\n"
            f"VERIFIED DATABASE RECORDS:\n{context_str}"
        )
    else:
        system = (
            "You are AXIOM AI — the assistant built into AXIOM, Egypt's real estate platform.\n"
            "Answer general Egyptian real estate questions (pricing norms, neighborhood guides, "
            "lease terms, buying process). Stay focused on helping the user find what they need "
            "on AXIOM. Never mention or link to Aqarmap, Bayut, Property Finder, or any other "
            "platform. Do not assert specific listing availability, prices, or addresses — "
            "you don't have live listing data for this query. "
            "Keep answers to 2-3 sentences. Match the user's language."
        )

    # Step 3: Build prompt with conversation history (last 4 turns)
    history_text = ""
    for msg in body.conversation_history[-4:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        history_text += f"{role.capitalize()}: {content}\n"

    full_prompt = f"{history_text}User: {body.message}\nAssistant:"

    # Step 4: Stream response, emit listing_refs + citations as final SSE events before [DONE]
    async def generate_sse():
        try:
            async for token in ollama.generate_stream(prompt=full_prompt, system=system):
                yield f"data: {json.dumps({'token': token})}\n\n"
            if listing_refs:
                yield f"data: {json.dumps({'listing_refs': listing_refs, 'source': listing_source})}\n\n"
            # Emit citations before DONE so frontend can parse them
            if citations:
                yield f"data: {json.dumps({'citations': [c.model_dump() for c in citations]})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ─── GET /api/ai/recommendations ─────────────────────────────────────────────

async def _explain_recommendations(
    fav_listings: list[dict],
    candidate_listings: list[dict],
) -> dict[str, str]:
    """
    Single-batch LLM call that returns a dict of listing_id -> 1-sentence explanation.
    Fail-open: returns {} if Ollama call fails.
    """
    if not fav_listings or not candidate_listings:
        return {}

    fav_summary = "; ".join(
        f"{l.get('title', '')} in {l.get('location', '')} ({l.get('category', '')})"
        for l in fav_listings[:3]
    )
    candidates_text = "\n".join(
        f"ID:{l['id']} | {l.get('title', '')} | {l.get('location', '')} | {l.get('category', '')} | {l.get('price', '')} EGP"
        for l in candidate_listings
    )

    system = (
        "You are a real estate recommendation assistant. "
        "Given a user's favorites and a list of candidate listings, "
        "write a single sentence explaining why each candidate matches the user's preferences. "
        "Return ONLY a JSON object mapping listing ID to explanation string. "
        "Example: {\"uuid-1\": \"Similar to your Maadi favorites — same area and price range.\"}"
    )
    prompt = (
        f"User's favorites: {fav_summary}\n\n"
        f"Candidate listings:\n{candidates_text}\n\n"
        "Return a JSON object with an explanation for each candidate ID."
    )

    try:
        raw = await ollama.generate(prompt=prompt, system=system)
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(raw[start:end])
            # Ensure all values are strings
            return {k: str(v) for k, v in result.items() if isinstance(k, str)}
    except Exception:
        pass

    return {}


@router.get("/recommendations")
async def get_recommendations(
    current_user: dict = Depends(get_current_user),
    explain: bool = False,
):
    """
    Return property recommendations based on the user's favorited listings.
    Uses pgvector cosine similarity if embeddings exist, otherwise falls back to
    category/location matching.
    Returns {ai_unavailable: true} if Ollama is down and no embeddings available.
    """
    user_id = current_user["id"]

    # Fetch user's favorite listing IDs
    try:
        fav_result = (
            supabase_admin.table("favorites")
            .select("listing_id")
            .eq("user_id", user_id)
            .limit(10)
            .execute()
        )
        fav_ids = [r["listing_id"] for r in (fav_result.data or [])]
    except Exception:
        fav_ids = []

    if not fav_ids:
        # No favorites — return newest active listings
        try:
            result = (
                supabase_admin.table("listings")
                .select("*, neighborhoods(name)")
                .eq("status", "active")
                .is_("deleted_at", "null")
                .order("created_at", desc=True)
                .limit(8)
                .execute()
            )
            return [_build_listing_brief(r) for r in (result.data or [])]
        except Exception:
            return []

    # Fetch one of the favorited listings to use as reference for category/city
    # Extended select includes id, title, location for _explain_recommendations() fav_summary
    try:
        ref_result = (
            supabase_admin.table("listings")
            .select("id, title, location, category, city, embedding")
            .eq("id", fav_ids[0])
            .single()
            .execute()
        )
        ref = ref_result.data or {}
    except Exception:
        ref = {}

    # Try vector similarity first (if embedding exists)
    if ref.get("embedding") and await ollama.health():
        try:
            sim_result = supabase_admin.rpc(
                "match_listings",
                {
                    "query_embedding": ref["embedding"],
                    "match_threshold": 0.5,
                    "match_count": 12,
                    "filter_category": ref.get("category"),
                    "filter_city": ref.get("city"),
                },
            ).execute()
            # Get full listing details for matched IDs
            if sim_result.data:
                matched_ids = [r["id"] for r in sim_result.data if r["id"] not in fav_ids]
                if matched_ids:
                    details_result = (
                        supabase_admin.table("listings")
                        .select("*, neighborhoods(name)")
                        .in_("id", matched_ids[:8])
                        .execute()
                    )
                    candidates = [_build_listing_brief(r) for r in (details_result.data or [])]
                    if explain and fav_ids:
                        fav_details = [ref] if ref else []
                        explanations = await _explain_recommendations(fav_details, candidates)
                        for listing in candidates:
                            listing["explanation"] = explanations.get(listing["id"], "")
                    return candidates
        except Exception:
            pass

    # Fallback: same category + city, excluding already favorited
    try:
        fb_result = (
            supabase_admin.table("listings")
            .select("*, neighborhoods(name)")
            .eq("status", "active")
            .is_("deleted_at", "null")
            .not_.in_("id", fav_ids)
        )
        if ref.get("category"):
            fb_result = fb_result.eq("category", ref["category"])
        if ref.get("city"):
            fb_result = fb_result.ilike("city", f"%{ref['city']}%")

        final = fb_result.order("views_count", desc=True).limit(8).execute()
        candidates = [_build_listing_brief(r) for r in (final.data or [])]
        if explain and fav_ids:
            fav_details = [ref] if ref else []
            explanations = await _explain_recommendations(fav_details, candidates)
            for listing in candidates:
                listing["explanation"] = explanations.get(listing["id"], "")
        return candidates
    except Exception:
        return []


# ─── POST /api/ai/compatibility ──────────────────────────────────────────────

@router.post("/compatibility")
async def compute_compatibility(
    body: CompatibilityRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Compute a roommate compatibility score (0-100) between the current user
    and a shared housing listing, using real housemates and stored user profile.
    Returns {ai_unavailable: true} if Ollama is down.
    """
    if not await ollama.health():
        return AI_UNAVAILABLE

    # Step 1: Fetch listing
    try:
        listing_result = (
            supabase_admin.table("listings")
            .select("category, lifestyle_preferences, title")
            .eq("id", body.listing_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found")

    if not listing_result.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = listing_result.data
    if listing.get("category") != "shared_housing":
        raise HTTPException(status_code=400, detail="Not a shared housing listing")

    listing_prefs = listing.get("lifestyle_preferences") or {}

    # Step 2: Query housemates for this listing
    housemates: list[dict] = []
    try:
        housemates_result = (
            supabase_admin.table("housemates")
            .select("name, age, occupation, tags, user_id")
            .eq("listing_id", body.listing_id)
            .limit(10)
            .execute()
        )
        housemates = housemates_result.data or []
    except Exception:
        pass  # fail-open: proceed without housemate data

    # Step 3: For housemates with user_id, fetch their lifestyle_preferences
    housemate_profiles: dict[str, dict] = {}
    housemate_user_ids = [h["user_id"] for h in housemates if h.get("user_id")]
    if housemate_user_ids:
        try:
            hp_result = (
                supabase_admin.table("profiles")
                .select("id, lifestyle_preferences")
                .in_("id", housemate_user_ids)
                .execute()
            )
            for row in (hp_result.data or []):
                if row.get("lifestyle_preferences"):
                    housemate_profiles[row["id"]] = row["lifestyle_preferences"]
        except Exception:
            pass  # fail-open

    # Step 4: Fetch current user's stored profile
    stored_user_prefs: dict = {}
    try:
        profile_result = (
            supabase_admin.table("profiles")
            .select("lifestyle_preferences, age, occupation, gender")
            .eq("id", current_user["id"])
            .single()
            .execute()
        )
        if profile_result.data:
            p = profile_result.data
            stored_user_prefs = {
                "age": p.get("age"),
                "occupation": p.get("occupation"),
                "gender": p.get("gender"),
                **(p.get("lifestyle_preferences") or {}),
            }
    except Exception:
        pass  # fail-open

    # Step 5: Merge — body.lifestyle_data overrides stored prefs
    merged_user_prefs = {**stored_user_prefs, **body.lifestyle_data}

    # Step 6: Build housemate context string
    housemate_lines = []
    for h in housemates:
        parts = [h.get("name", "Unknown")]
        if h.get("age"):
            parts.append(f"age {h['age']}")
        if h.get("occupation"):
            parts.append(h["occupation"])
        if h.get("tags"):
            parts.append(f"tags: {', '.join(h['tags'])}")
        uid = h.get("user_id")
        if uid and uid in housemate_profiles:
            lp = housemate_profiles[uid]
            parts.append(f"lifestyle: {json.dumps(lp)}")
        housemate_lines.append(" | ".join(parts))

    housemate_context = (
        "\n\nCURRENT HOUSEMATES:\n" + "\n".join(f"- {line}" for line in housemate_lines)
        if housemate_lines
        else ""
    )

    # Step 7: LLM call with enriched prompt
    system = (
        "You are a roommate compatibility expert. "
        "Score compatibility between a person's lifestyle preferences and a shared housing listing. "
        "Consider: gender preference, smoking, pets, guests policy, noise level, "
        "cleanliness, sleep schedule, occupation. "
        "If housemate information is provided, also note compatibility with current residents. "
        "Return ONLY a JSON object: "
        "{\"score\": <0-100>, \"reasons\": [\"...\", \"...\"], \"housemate_notes\": [\"...\"]}"
        f"{housemate_context}"
    )
    prompt = (
        f"Listing preferences: {json.dumps(listing_prefs)}\n"
        f"Applicant preferences: {json.dumps(merged_user_prefs)}\n"
        "Compute compatibility score."
    )

    # Step 8: Parse response
    try:
        raw = await ollama.generate(prompt=prompt, system=system)
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(raw[start:end])
            score = max(0, min(100, int(parsed.get("score", 50))))
            reasons = parsed.get("reasons", [])
            housemate_notes = parsed.get("housemate_notes", [])
            if not isinstance(housemate_notes, list):
                housemate_notes = []
        else:
            score = 50
            reasons = []
            housemate_notes = []
    except Exception:
        score = 50
        reasons = []
        housemate_notes = []

    return {
        "listing_id": body.listing_id,
        "compatibility_score": score,
        "reasons": reasons,
        "housemate_notes": housemate_notes,
    }


# ─── POST /api/ai/description ────────────────────────────────────────────────

@router.post("/description")
async def generate_description(
    body: DescriptionRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a bilingual (English + Arabic) listing description using Ollama.
    Retrieves neighborhood context from knowledge_chunks before generating.
    Returns {ai_unavailable: true} if Ollama is down.
    """
    if not await ollama.health():
        return AI_UNAVAILABLE

    # Step 1: Retrieve neighborhood context (fail-open — proceed even if this fails)
    neighborhood_context = ""
    try:
        nbhd_chunks = await rag_retriever.retrieve(
            f"{body.city} neighborhood real estate",
            source_type="neighborhood",
            k=2,
        )
        if nbhd_chunks:
            # Build context string capped at 600 chars to avoid bloating the prompt
            raw_context = " ".join(c.chunk_text for c in nbhd_chunks)
            neighborhood_context = raw_context[:600]
    except Exception:
        pass  # fail-open: proceed without neighborhood context

    amenities_str = ", ".join(body.amenities) if body.amenities else "none listed"
    price_str = f"EGP {body.price:,.0f}" if body.price else "price not specified"

    # Step 2: Build system prompt with optional context clause
    context_clause = (
        f"\n\nNEIGHBORHOOD CONTEXT:\n{neighborhood_context}"
        if neighborhood_context
        else ""
    )
    system = (
        "You are a professional real estate copywriter specializing in Egyptian property listings. "
        "Write compelling, accurate descriptions in both English and Arabic. "
        "Be specific to Egyptian market context and culture. "
        "Return ONLY JSON: {\"english\": \"...\", \"arabic\": \"...\"}"
        f"{context_clause}"
    )

    prompt = (
        f"Property details:\n"
        f"- Title: {body.title}\n"
        f"- Type: {body.property_type}\n"
        f"- Category: {body.category}\n"
        f"- City: {body.city}\n"
        f"- Bedrooms: {body.bedrooms or 'N/A'}\n"
        f"- Bathrooms: {body.bathrooms or 'N/A'}\n"
        f"- Size: {body.size_sqm or 'N/A'} sqm\n"
        f"- Price: {price_str}\n"
        f"- Amenities: {amenities_str}\n"
        f"- Extra notes: {body.extra_notes or 'none'}\n\n"
        "Write a 3-4 sentence property description in both English and Arabic."
    )

    try:
        raw = await ollama.generate(prompt=prompt, system=system)
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(raw[start:end])
            return {
                "english": parsed.get("english", ""),
                "arabic": parsed.get("arabic", ""),
            }
    except Exception:
        pass

    # Fallback if JSON parse fails — return raw text as English only
    return {"english": raw if "raw" in dir() else "", "arabic": ""}


# ─── POST /api/ai/validate-amenity ───────────────────────────────────────────

@router.post("/validate-amenity")
async def validate_amenity(
    body: AmenityValidationRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Check whether a custom amenity string is appropriate for a property listing.
    Fail-open: returns ok=True if Ollama is unavailable.
    """
    value = body.amenity.strip()
    if not value:
        return {"ok": False, "reason": "Amenity name cannot be empty"}

    if not await ollama.health():
        return {"ok": True, "reason": ""}

    system = (
        "You are a content moderation system for a real estate platform in Egypt. "
        "Determine whether the given amenity name is appropriate for a property listing. "
        "Flag anything that is: offensive, sexual, discriminatory, harmful, or entirely unrelated to real estate. "
        "Legitimate examples: 'Rooftop Terrace', 'Private Entrance', 'Solar Panels', 'Maid's Room'. "
        "Return ONLY valid JSON with no extra text: "
        '{\"appropriate\": true, \"reason\": \"\"} '
        'or {\"appropriate\": false, \"reason\": \"short reason\"}'
    )
    prompt = f'Is this amenity appropriate for a real estate listing? Amenity: "{value}"'

    try:
        raw = await ollama.generate(prompt=prompt, system=system)
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(raw[start:end])
            ok = bool(parsed.get("appropriate", True))
            reason = str(parsed.get("reason", ""))
            return {"ok": ok, "reason": reason}
    except Exception:
        pass

    # Fail-open on any parse error
    return {"ok": True, "reason": ""}
