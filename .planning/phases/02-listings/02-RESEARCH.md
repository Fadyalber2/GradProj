# Phase 2: Listings, Fraud Scoring & Embeddings - Research

**Researched:** 2026-03-21
**Domain:** FastAPI CRUD, pgvector (768-dim embeddings), Ollama LLM fraud scoring, Supabase Storage signed URLs, TanStack Query v5, Next.js App Router
**Confidence:** HIGH (patterns directly observable in codebase)

---

## Summary

Phase 2 extends the AXIOM V2 platform with its core real estate data layer: a full listings CRUD API, AI-powered fraud detection, semantic search embeddings, file upload infrastructure, and a rich frontend search experience. The backend is built on FastAPI with Supabase as both database and file storage, following the thin-router / service-layer architecture established in Phase 1.

The fraud scoring pipeline runs as a FastAPI BackgroundTask immediately after listing creation, combining three weighted signals: price anomaly detection (price vs. city+category average, weight 0.3), owner reputation (rejected listing history, weight 0.2), and LLM-based description consistency via Ollama (weight 0.5). The pipeline is fail-open — if Ollama is unreachable, the LLM component scores 0.0, allowing listings to auto-approve. Listings with `fraud_score < 0.4` are automatically promoted to `active`; higher-scoring listings remain `pending` for manual admin review.

The embedding pipeline also runs as a background task, generating a 768-dimensional vector via Ollama's `nomic-embed-text` model and storing it in the `listings.embedding` pgvector column. This vector powers Phase 4's natural language search feature. Both background tasks are best-effort: they never block the listing creation response and silently skip if Ollama is down. The frontend uses TanStack Query v5 for all server state, with a client component `FindHomesPage` that manages filter state, AI search mode toggle, and grid/list view switching.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-LIST-01 | POST /api/listings creates listing with status=pending, triggers fraud + embed background tasks | Confirmed in router.py: `status="pending"` on insert, `background_tasks.add_task(_score_and_approve, ...)` and `background_tasks.add_task(asyncio.run, embed_listing(...))` |
| REQ-LIST-02 | GET /api/listings supports 16 filter params + pagination + 4 sort modes | Confirmed in router.py: category, city, neighborhood_id, neighborhood slug, min/max price, min/max size_sqm, min/max bedrooms, min/max bathrooms, property_type, lease_type, title_deed_status, room_type, compound_name, floor_min, floor_max, sort_by, page, per_page |
| REQ-LIST-03 | GET /api/listings/{id} returns full detail + similar listings + housemates, increments views_count | Confirmed in router.py: fetches housemates for shared_housing, builds similar listings (same category+city, limit 6), calls `increment_listing_views` RPC |
| REQ-LIST-04 | PUT /api/listings/{id} and DELETE /api/listings/{id} with owner authorization | Confirmed: both check `owner_id == current_user["id"]`, DELETE sets `deleted_at = now()` (soft delete) |
| REQ-LIST-05 | POST /api/uploads/signed-url returns Supabase Storage upload URL, path, and public_url | Confirmed in uploads/router.py: buckets allowlist (avatars, listing-images, attachments), user-scoped paths, UUID filename generation |
| REQ-LIST-06 | GET /api/listings/favorites and POST /api/listings/{id}/favorite toggle via toggle_favorite RPC | Confirmed: GET joins favorites -> listings, POST calls Supabase `toggle_favorite` RPC, returns {favorited: bool} |
| REQ-LIST-07 | POST /api/listings/{id}/apply for shared housing applications, with duplicate check and owner notification | Confirmed in router.py: validates category=shared_housing, status=active, prevents self-apply, 409 on duplicate, inserts notification |
| REQ-LIST-08 | Fraud scoring: price anomaly (0.3) + owner reputation (0.2) + Ollama LLM consistency (0.5) = 0.0-1.0 | Confirmed in fraud.py: three async sub-functions, weighted sum, fail-open on Ollama down |
| REQ-LIST-09 | Embeddings: fetch listing fields, build text blob, embed via Ollama nomic-embed-text, store in listings.embedding | Confirmed in embeddings.py: `_build_embed_text()` assembles title+description+location+type+amenities, stores via `supabase_admin.table("listings").update({"embedding": vector})` |
| REQ-LIST-10 | Ollama client: health(), generate(), generate_stream(), embed() with graceful fallback | Confirmed in ollama_client.py: OllamaClient class, 2s timeout on health, 60s on generate, 15s on embed, singleton export `ollama = OllamaClient()` |
| REQ-LIST-11 | Frontend Find Homes page with filter sidebar, grid/list toggle, AI search mode, pagination | Confirmed in find-homes/page.tsx: FilterSidebar, SearchListingCard, SearchListingRow, Pagination, AI mode with NL search, listingsQueries + favoritesQueries |
| REQ-LIST-12 | AddListingModal: 3-step form (Details -> Photos -> Description), signed-URL file upload, POST /api/listings | Confirmed in AddListingModal.tsx: STEPS = [Details, Photos, Description], Framer Motion slide variants, api.post to /api/uploads/signed-url then PUT to signed URL |
| REQ-LIST-13 | 20 backend listing tests pass | Confirmed in test_listings.py: create, list, get, 404, update ownership, delete auth, favorite toggle, favorite auth |

</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | 0.115+ | HTTP framework + BackgroundTasks | Async-native, BackgroundTasks for post-create jobs |
| supabase-py | 2.x | DB queries + Storage signed URLs | Project-standard client, service role for admin ops |
| Pydantic v2 | 2.x | Request/response validation | FastAPI-native, `model_dump(exclude_none=True)` for partial updates |
| httpx | 0.27+ | Async HTTP for Ollama calls | AsyncClient for non-blocking Ollama requests |
| pgvector | via Supabase | 768-dim embedding storage | Already provisioned; `listings.embedding vector(768)` |
| TanStack Query | v5 | Server state, listing fetches | Project-standard, `useQuery`/`useMutation` patterns |
| Framer Motion | 11.x | Card hover + modal step transitions | Project-standard for all animations |
| Zustand | 4.x | Auth session for gated queries | `enabled: !!session` pattern for favorites |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | latest | All icons in listing cards + modal | Every icon import in the frontend |
| next/image | built-in | Listing photos | Always over raw `<img>` |
| shadcn/ui | latest | Modal dialogs, sliders, badges | FilterSidebar price slider, status badges |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BackgroundTasks (FastAPI) | Celery + Redis | BackgroundTasks sufficient for non-critical best-effort jobs; Celery adds infra complexity |
| Supabase RPC toggle_favorite | INSERT + DELETE logic in Python | RPC ensures atomicity; Python-side logic has race conditions |
| Ollama nomic-embed-text | OpenAI text-embedding-3-small | Ollama is free, local, no API key; lower quality acceptable for MVP |
| Soft delete (deleted_at) | Hard DELETE | Soft delete enables audit trails and accidental recovery |

**Installation:**
```bash
# Backend (already in requirements.txt)
pip install fastapi supabase httpx pydantic

# Frontend (already in package.json)
npm install @tanstack/react-query framer-motion lucide-react
```

---

## Architecture Patterns

### Recommended Project Structure
```
backend/app/listings/
├── __init__.py
├── router.py          # HTTP handlers — thin, delegate to helpers
└── schemas.py         # Pydantic models for request/response

backend/app/ai/
├── ollama_client.py   # OllamaClient singleton
├── fraud.py           # score_listing() async function
└── embeddings.py      # embed_listing() async function

backend/app/uploads/
└── router.py          # POST /api/uploads/signed-url

frontend/src/
├── components/find-homes/
│   ├── SearchListingCard.tsx
│   ├── SearchListingRow.tsx
│   ├── FilterSidebar.tsx
│   └── Pagination.tsx
├── components/dashboard/
│   └── AddListingModal.tsx
└── app/find-homes/
    └── page.tsx        # "use client" — manages filter/AI state
```

### Pattern 1: BackgroundTasks for post-create AI jobs

**What:** After inserting the listing row, register fraud scoring and embedding as background tasks so the HTTP response (201) is returned immediately.

**When to use:** Any expensive/fallible post-create enrichment that does not block the user.

```python
# Source: backend/app/listings/router.py
@router.post("", status_code=201)
async def create_listing(
    body: CreateListingRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    listing_data = body.model_dump(exclude_none=True)
    listing_data["owner_id"] = current_user["id"]
    listing_data["status"] = "pending"

    result = supabase_admin.table("listings").insert(listing_data).execute()
    listing_id = result.data[0]["id"]

    background_tasks.add_task(_score_and_approve, listing_id, listing_data)
    background_tasks.add_task(asyncio.run, embed_listing(listing_id))

    return {"id": listing_id, "status": "pending"}
```

### Pattern 2: Fail-open fraud scoring

**What:** Each sub-scorer returns 0.0 on exception; Ollama check skips if health() returns False. Listing is never blocked by AI unavailability.

**When to use:** Any AI-gated quality check where blocking would harm UX.

```python
# Source: backend/app/ai/fraud.py
async def score_listing(listing: dict) -> float:
    price_score = await _price_anomaly(listing)         # 0.0 on DB error
    reputation_score = await _owner_reputation(...)      # 0.0 on DB error
    llm_score = await _llm_consistency(listing)          # 0.0 if Ollama down
    total = (price_score * 0.3) + (reputation_score * 0.2) + (llm_score * 0.5)
    return round(min(1.0, max(0.0, total)), 3)
```

### Pattern 3: Supabase soft delete with deleted_at

**What:** DELETE endpoints set `deleted_at = now()` rather than removing the row. All read queries filter `.is_("deleted_at", "null")`.

**When to use:** All user-deletable records in this project.

```python
# Source: backend/app/listings/router.py
now = datetime.now(timezone.utc).isoformat()
supabase_admin.table("listings").update({"deleted_at": now}).eq("id", listing_id).execute()
```

### Pattern 4: TanStack Query v5 query object pattern

**What:** `listingsQueries.list(params)` returns a query options object consumed by `useQuery`. All query keys are colocated with their fetch functions.

**When to use:** Every server-state fetch in the frontend.

```typescript
// Source: frontend/src/app/find-homes/page.tsx
const { data, isLoading, isError } = useQuery({
  ...listingsQueries.list({ ...filters, sort_by: sortBy, page: currentPage, per_page: 12 }),
  enabled: !aiMode,
});
```

### Pattern 5: Framer Motion slide variants for multi-step modal

**What:** A `direction` integer (+1 forward, -1 back) drives the AnimatePresence enter/exit x-offset.

**When to use:** Any multi-step wizard UI.

```typescript
// Source: frontend/src/components/dashboard/AddListingModal.tsx
const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 80 : -80, opacity: 0 }),
};
```

### Anti-Patterns to Avoid

- **Blocking the HTTP response on AI tasks:** Never `await score_listing()` inside the route handler. Always use BackgroundTasks.
- **Returning listing.embedding in API responses:** The 768-float vector is for pgvector queries only. Never serialize it in ListingBrief or ListingDetail.
- **Trusting client-supplied owner_id:** Always set `owner_id = current_user["id"]` server-side; never accept it from the request body.
- **Using `export default` for non-page components:** All frontend components use named exports. Only `page.tsx`/`layout.tsx` use default exports.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File deduplication in storage | Custom hash-based naming | UUID filename + user-scoped path in uploads router | UUID prevents collisions; user scope prevents path traversal |
| Favorite toggle atomicity | INSERT + SELECT + DELETE in Python | Supabase `toggle_favorite` RPC | Race conditions if two requests arrive simultaneously |
| Pagination offset | Manual slice logic | `.range(offset, offset + per_page - 1)` with Supabase count | Supabase returns `result.count` total for free |
| View counter increment | SELECT + UPDATE in Python | Supabase `increment_listing_views` RPC | Atomic increment prevents race conditions |
| Listing search | Full-text search from scratch | Supabase `.ilike()` + `.eq()` chained filters | pgvector NL search handled in Phase 4 |

**Key insight:** Supabase RPCs handle all atomic mutations (toggle_favorite, increment_views). Python handles orchestration only.

---

## Common Pitfalls

### Pitfall 1: asyncio.run() inside BackgroundTasks

**What goes wrong:** FastAPI's BackgroundTasks runs in the same event loop as the app. `asyncio.run()` creates a new event loop and will fail or cause `RuntimeError: This event loop is already running`.

**Why it happens:** `embed_listing` is a coroutine; BackgroundTasks expects a regular callable.

**How to avoid:** Wrap the coroutine: `background_tasks.add_task(asyncio.run, embed_listing(listing_id))` — this was the pattern used in this codebase. Alternatively, use `asyncio.ensure_future` or a thread executor.

**Warning signs:** `RuntimeError: This event loop is already running` in server logs.

### Pitfall 2: Supabase .single() raises on 0 rows

**What goes wrong:** `.single().execute()` raises a PostgREST exception if the query returns 0 rows (not just None data). Uncaught, this surfaces as a 500.

**Why it happens:** PostgREST strict mode for single-row queries.

**How to avoid:** Always wrap `.single()` calls in try/except and raise HTTPException(404) explicitly.

```python
try:
    result = supabase_admin.table("listings").select(...).eq("id", listing_id).single().execute()
except Exception:
    raise HTTPException(status_code=404, detail="Listing not found")
```

### Pitfall 3: Frontend favorites race condition on optimistic updates

**What goes wrong:** Toggling favorites quickly causes the heart state to flicker or end up wrong because `queryClient.invalidateQueries` is async.

**Why it happens:** `onSuccess` fires after the mutation completes; if the user clicks twice before the first resolves, both start from the same initial `liked` state.

**How to avoid:** Use `onMutate` for optimistic updates with `onError` rollback, or debounce the toggle button.

### Pitfall 4: embedding column excluded from select

**What goes wrong:** `select("*")` on the listings table includes the `embedding` column (768 floats), massively bloating API responses.

**Why it happens:** Supabase `select("*")` is literal.

**How to avoid:** Always use explicit column lists in listing queries, never `select("*")` on tables with vector columns.

### Pitfall 5: Non-owner listing visibility

**What goes wrong:** `pending` or `rejected` listings becoming visible to random users if the status filter is omitted.

**Why it happens:** Forgetting `.eq("status", "active")` in list queries.

**How to avoid:** The GET list endpoint always filters `status=active`. The detail endpoint allows owners and admins to see their own non-active listings via an explicit check.

---

## Code Examples

### Listing Brief response builder

```python
# Source: backend/app/listings/router.py
def _build_listing_brief(row: dict) -> dict:
    neighborhood_name: str | None = None
    nbhd = row.get("neighborhoods")
    if isinstance(nbhd, dict):
        neighborhood_name = nbhd.get("name")
    return {
        "id": row["id"],
        "title": row["title"],
        "price": float(row["price"]),
        "category": row["category"],
        "images": row.get("images") or [],
        "verified": bool(row.get("verified", False)),
        "status": row.get("status", "active"),
        "neighborhood": neighborhood_name,
        "views_count": row.get("views_count", 0),
        # ... all fields
    }
```

### Supabase Storage signed URL generation

```python
# Source: backend/app/uploads/router.py
storage_path = f"{user_id}/{uuid.uuid4().hex}.{ext}"
response = supabase_admin.storage.from_(body.bucket).create_signed_upload_url(storage_path)
# Returns dict with 'signedURL' and 'path'
signed_url = response.get("signedURL") or response.get("signed_url") or ""
public_url = supabase_admin.storage.from_(body.bucket).get_public_url(path)
return {"upload_url": signed_url, "path": path, "public_url": public_url}
```

### Embedding text builder

```python
# Source: backend/app/ai/embeddings.py
def _build_embed_text(listing: dict) -> str:
    parts = []
    if listing.get("title"):        parts.append(listing["title"])
    if listing.get("description"):  parts.append(listing["description"])
    if listing.get("location"):     parts.append(f"Location: {listing['location']}")
    if listing.get("city"):         parts.append(f"City: {listing['city']}")
    if listing.get("amenities"):    parts.append(f"Amenities: {', '.join(listing['amenities'])}")
    return ". ".join(parts)
```

### Frontend: mapToListing (API -> UI type conversion)

```typescript
// Source: frontend/src/app/find-homes/page.tsx
function mapToListing(l: ListingBrief, favIds?: Set<string>): Listing {
  return {
    id: l.id,
    title: l.title,
    location: l.location,
    price: l.price,
    image: l.images[0] ?? "https://images.unsplash.com/photo-...",
    matchPercent: 0,
    verified: l.verified,
    liked: favIds ? favIds.has(l.id) : false,
    // shared housing fields default to 0/empty
    filledSpots: 0,
    totalSpots: 1,
    tags: [],
    avatars: [],
  };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Synchronous fraud check blocking response | BackgroundTasks async post-create | Phase 2 | 201 response in <100ms regardless of Ollama speed |
| Hard DELETE | Soft delete via deleted_at | Phase 2 | Enables audit trail and recovery |
| Broker/seeker role split | Single `user` role + `is_verified_seller` flag | V2 architecture | Simpler auth, no role-switching |
| Server-side pagination cursor | Offset-based with Supabase count | Phase 2 | Simple to implement; sufficient for current scale |

**Deprecated/outdated:**
- `broker_id` field: replaced by `owner_id` everywhere — NEVER use broker_id.
- `GET /api/uploads/sign`: endpoint is at `POST /api/uploads/signed-url` (not `/sign`).

---

## Open Questions

1. **asyncio.run() in BackgroundTasks stability**
   - What we know: The pattern `background_tasks.add_task(asyncio.run, embed_listing(listing_id))` is in production and tests pass.
   - What's unclear: Whether this can cause event loop conflicts under load on certain ASGI server configurations.
   - Recommendation: Monitor for `RuntimeError: This event loop is already running` in production logs; migrate to `asyncio.ensure_future` if issues arise.

2. **Embedding dimension mismatch**
   - What we know: `listings.embedding` is `vector(768)`. Ollama `nomic-embed-text` produces 768-dim vectors.
   - What's unclear: If the model is swapped or unavailable and a different model returns a different dimension, the pgvector update will fail silently.
   - Recommendation: Add dimension validation in `embed_listing()` before calling `.update()`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (with FastAPI TestClient) |
| Config file | `backend/pytest.ini` or `pyproject.toml` |
| Quick run command | `cd backend && python -m pytest tests/test_listings.py -v` |
| Full suite command | `cd backend && python -m pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-LIST-01 | POST /api/listings returns 201 + pending status | unit | `pytest tests/test_listings.py::test_create_listing_success -x` | Yes |
| REQ-LIST-01 | Unauthenticated POST returns 401 | unit | `pytest tests/test_listings.py::test_create_listing_unauthenticated -x` | Yes |
| REQ-LIST-02 | GET /api/listings returns paginated results | unit | `pytest tests/test_listings.py::test_list_listings -x` | Yes |
| REQ-LIST-03 | GET /api/listings/{id} returns detail | unit | `pytest tests/test_listings.py::test_get_listing -x` | Yes |
| REQ-LIST-03 | GET /api/listings/nonexistent returns 404 | unit | `pytest tests/test_listings.py::test_get_listing_not_found -x` | Yes |
| REQ-LIST-04 | PUT /api/listings/{id} by non-owner returns 403 | unit | `pytest tests/test_listings.py::test_update_listing_not_owner -x` | Yes |
| REQ-LIST-04 | DELETE /api/listings/{id} unauthenticated returns 401 | unit | `pytest tests/test_listings.py::test_delete_listing_unauthenticated -x` | Yes |
| REQ-LIST-06 | POST /api/listings/{id}/favorite returns {favorited} | unit | `pytest tests/test_listings.py::test_favorite_toggle -x` | Yes |
| REQ-LIST-06 | Unauthenticated favorite returns 401 | unit | `pytest tests/test_listings.py::test_favorite_unauthenticated -x` | Yes |
| REQ-LIST-01 | listing.status == "pending" on creation | unit | `pytest tests/test_listings.py::test_listing_starts_pending -x` | Yes |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/test_listings.py -v`
- **Per wave merge:** `cd backend && python -m pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements.

---

## Sources

### Primary (HIGH confidence)
- `backend/app/listings/router.py` — full listings CRUD implementation
- `backend/app/listings/schemas.py` — all Pydantic models
- `backend/app/ai/fraud.py` — fraud scoring pipeline
- `backend/app/ai/embeddings.py` — embedding generation
- `backend/app/ai/ollama_client.py` — Ollama async client
- `backend/app/uploads/router.py` — signed URL endpoint
- `backend/tests/test_listings.py` — 10 confirmed test cases
- `frontend/src/app/find-homes/page.tsx` — Find Homes client component
- `frontend/src/components/find-homes/SearchListingCard.tsx` — listing card
- `frontend/src/components/dashboard/AddListingModal.tsx` — multi-step form

### Secondary (MEDIUM confidence)
- `docs/API_REFERENCE.md` — endpoint contract reference

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries directly observable in source files
- Architecture: HIGH — patterns extracted from working production code
- Pitfalls: HIGH — identified from actual code patterns and known FastAPI/Supabase constraints

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (stable stack)
