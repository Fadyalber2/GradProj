# Chat Listing Search Design
**Date:** 2026-03-24
**Status:** Approved

## Problem Statement

When a user asks the chatbot about properties (e.g. "apartment in Cairo under 1.5M EGP"), the AI responds with generic advice about using search filters instead of surfacing actual matching listings. The frontend already has `ListingRefCard` and `listing_refs` rendering infrastructure — it's never populated because the backend never queries the DB from the chat endpoint.

---

## Approved Design

### Section 1 — Backend: Professional Search Pipeline (`backend/app/ai/router.py`)

The `chat` endpoint gains a new pre-stream step: detect property search intent, query listings, emit results as an SSE event. This runs **before** streaming begins.

**Total timeout budget for Steps A–C: 3 seconds.** If the budget is exceeded at any point, skip listing search entirely and proceed to streaming with no `listing_refs` event.

#### Step A: Scored Intent Detection

A scoring function — no LLM call, purely deterministic:

| Signal | Score |
|---|---|
| Egyptian city/neighborhood name matched | +40 |
| Category word (`apartment`, `villa`, `rent`, `sale`, `room`, `studio`, `شقة`, `فيلا`, `إيجار`, `للبيع`, `للإيجار`) | +30 |
| Price pattern (EGP / number with k, m, or comma formatting) | +25 |
| Bedroom/room count (`bedroom`, `bed`, `br`, `غرف`, `أوض`) | +20 |
| Question-only phrasing (`how`, `what is`, `explain`, `كيف`, `ما هو`) with no property signal | −30 |

**Threshold ≥ 40 → run search.**

City/neighborhood list (case-insensitive substring match on full phrase, not individual words):
```
cairo, giza, alexandria, new cairo, new capital, maadi, zamalek, heliopolis,
nasr city, sheikh zayed, 6th october, 6th of october, october city,
north coast, hurghada, sharm, dokki, mohandessin, rehab, mostakbal
```

Note: multi-word phrases like "north coast" and "6th october" require whole-phrase matching. Match against the full message string, not word-by-word tokens. "6th of october" is treated as equivalent to "6th october".

#### Step B: Filter Extraction + Structured Query

**Always run first — even on the personalized path:**

Call `_extract_filters_from_query(message)` (existing). This returns a dict that may contain:
- `location` (string) — NOT `city`. Use `filters.get("location")`.
- `max_price`, `min_price` (number)
- `bedrooms` (number)
- `category` (string)

**Pass 1 — Structured DB query (10 candidates):**

```python
db_query = (
    supabase_admin.table("listings")
    .select("id, title, location, city, price, currency, bedrooms, size_sqm, images, views_count, embedding")
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
candidates = db_query.order("views_count", desc=True).limit(10).execute().data or []
```

**Pass 2 — Semantic re-ranking (if Ollama healthy AND candidates non-empty):**
- Guard: `if candidates and await ollama.health():`
- Embed the user message: `msg_embedding = await ollama.embed(message)`
- Re-rank the 10 candidates by cosine similarity between `msg_embedding` and each `listing.embedding` (skip listings with null embedding)
- Return top 3 by similarity score; fall back to top 3 by `views_count` if fewer than 3 have embeddings

Falls back to Pass 1 top-3 if Ollama is down or all embeddings are null.

After re-ranking, strip embedding vectors from all candidates: `for c in candidates: c.pop("embedding", None)`

#### Step C: Personalized Ranking (logged-in users with favorites)

**Runs instead of Pass 1's DB query — but filter extraction (Step B first sub-step) has already run.**

Conditions: `current_user` is set AND user has at least one favorited listing with a non-null embedding.

```python
# Fetch user's most recent favorite with embedding
fav = supabase_admin.table("favorites")
    .select("listing_id")
    .eq("user_id", user_id)
    .order("created_at", desc=True)
    .limit(5).execute()
# Find first favorite that has a non-null embedding
ref_embedding = ... # from listings table for that favorite
```

Run `match_listings` RPC:
```python
rpc_result = supabase_admin.rpc("match_listings", {
    "query_embedding": ref_embedding,
    "match_threshold": 0.5,
    "match_count": 10,
    "filter_category": filters.get("category"),
    "filter_city": filters.get("location"),  # IMPORTANT: RPC param is filter_city; extractor key is location (not city)
}).execute()
```

**Post-filter in Python** (RPC has no max_price parameter):
```python
candidates = rpc_result.data or []
# Strip embedding vectors from candidates after use — each is 768 floats (~6KB)
for c in candidates:
    c.pop("embedding", None)
if filters.get("max_price"):
    candidates = [c for c in candidates if c.get("price", float("inf")) <= filters["max_price"]]
if filters.get("min_price"):
    candidates = [c for c in candidates if c.get("price", 0) >= filters["min_price"]]
candidates = candidates[:3]
```

Set `source = "personalized"`. Fall back to Step B results if RPC fails or returns 0 results.

#### Step D: Build Listing Refs + SSE Event

For the top 3 candidates, build the payload:
```python
listing_refs = [
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
    for row in candidates[:3]
]
```

Emitted **after streaming completes, before `[DONE]`** (same position as citations):

```
data: {"listing_refs": [...], "source": "search"}
data: [DONE]
```

If intent score < 40 OR candidates is empty after all paths → no `listing_refs` event.

---

### Section 2 — Frontend: SSE Handler + Label

#### Type Extension (update `ChatMessageData` FIRST, before SSE handler)

In `frontend/src/components/ai/ChatMessage.tsx`, add `listing_source` to `ChatMessageData`:

```tsx
export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  listing_refs?: ListingRef[];
  listing_source?: "search" | "personalized";  // ← add this
  citations?: Citation[];
  timestamp: Date;
}
```

#### SSE Handler (`frontend/src/components/ai/ChatDrawer.tsx`)

In the SSE reader loop, alongside `parsed.token` and `parsed.citations`, add:

```tsx
if (parsed.listing_refs) {
  setIsSearching(false);
  setMessages((prev) =>
    prev.map((m) =>
      m.id === assistantMsgId
        ? {
            ...m,
            listing_refs: parsed.listing_refs,
            // Safe conditional — never use `as` cast on runtime data from the wire
            listing_source: parsed.source === "personalized" ? "personalized" : "search",
          }
        : m,
    ),
  );
}
```

#### Label Rendering (`frontend/src/components/ai/ChatMessage.tsx`)

Replace the existing `listing_refs` render block with:

```tsx
{message.listing_refs && message.listing_refs.length > 0 && (
  <div className="flex flex-col gap-2 w-full mt-2">
    <p className="text-xs text-muted-foreground font-medium px-1">
      {message.listing_source === "personalized"
        ? "Recommended for you"
        : "Matching listings"}
    </p>
    {message.listing_refs.map((listing) => (
      <ListingRefCard key={listing.id} listing={listing} />
    ))}
  </div>
)}
```

---

## Files Changed

| File | Change |
|---|---|
| `backend/app/ai/router.py` | Add `_detect_property_search()` scoring helper; add hybrid search + personalized path in `chat` endpoint; emit `listing_refs` SSE event |
| `frontend/src/components/ai/ChatMessage.tsx` | Add `listing_source` to `ChatMessageData`; update listing cards render block with label |
| `frontend/src/components/ai/ChatDrawer.tsx` | Handle `listing_refs` + `source` in SSE reader loop |

## Out of Scope
- Changing the RAG retrieval pipeline
- Modifying `ListingRefCard` UI (already polished)
- Pagination of listing results in chat
- Listing results on the NL search page
