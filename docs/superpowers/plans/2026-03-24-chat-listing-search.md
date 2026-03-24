# Chat Listing Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user asks the chatbot about properties, automatically search the DB and stream back matching listing cards alongside the AI response.

**Architecture:** Backend scores intent, extracts filters, runs hybrid search (structured + semantic re-rank) or personalized RPC path, then emits a `listing_refs` SSE event after streaming. Frontend handles the new event and renders cards with a source label using the already-built `ListingRefCard` component.

**Tech Stack:** Python/FastAPI (backend search pipeline), React/TypeScript (SSE handler + label), Supabase (listings table + match_listings RPC), Ollama (embed for re-ranking).

**Spec:** `docs/superpowers/specs/2026-03-24-chat-listing-search-design.md`

---

## File Map

| File | Change |
|---|---|
| `backend/app/ai/router.py` | Add `_detect_property_search()`, `_build_listing_refs()`, `_search_listings_for_chat()` helpers; wire into `chat` endpoint |
| `backend/tests/test_ai.py` | Add tests for `_detect_property_search()` and listing injection |
| `frontend/src/components/ai/ChatMessage.tsx` | Add `listing_source` to `ChatMessageData`; update listing cards block with label |
| `frontend/src/components/ai/ChatDrawer.tsx` | Handle `listing_refs` + `source` in SSE reader loop |

---

## Task 1: Backend — Intent Detection Helper

**Files:**
- Modify: `backend/app/ai/router.py` (add helpers after existing `_extract_filters_from_query`)
- Test: `backend/tests/test_ai.py`

- [ ] **Step 1: Write failing tests for `_detect_property_search`**

  Add to `backend/tests/test_ai.py`:

  ```python
  from app.ai.router import _detect_property_search

  def test_detect_property_search_city_and_category():
      assert _detect_property_search("apartment in cairo") >= 40

  def test_detect_property_search_price_signal():
      assert _detect_property_search("flat under 2m egp") >= 40

  def test_detect_property_search_question_only():
      assert _detect_property_search("how does renting work in egypt") < 40

  def test_detect_property_search_arabic():
      assert _detect_property_search("شقة في القاهرة") >= 40

  def test_detect_property_search_vague():
      # No city, no category, no price → below threshold
      assert _detect_property_search("I need a place") < 40
  ```

- [ ] **Step 2: Run tests — expect FAIL (ImportError)**

  ```bash
  cd "G:/AI/AXIOM-V2/backend"
  python -m pytest tests/test_ai.py::test_detect_property_search_city_and_category -v
  ```
  Expected: `ImportError: cannot import name '_detect_property_search'`

- [ ] **Step 3: Implement `_detect_property_search` in `router.py`**

  Add after `_extract_filters_from_query` (around line 103):

  ```python
  def _detect_property_search(message: str) -> int:
      """
      Score a message for property search intent.
      Returns int score; >= 40 means run listing search.
      """
      import re
      msg = message.lower()
      score = 0

      cities = [
          "cairo", "giza", "alexandria", "new cairo", "new capital", "maadi",
          "zamalek", "heliopolis", "nasr city", "sheikh zayed", "6th october",
          "6th of october", "october city", "north coast", "hurghada", "sharm",
          "dokki", "mohandessin", "rehab", "mostakbal",
      ]
      if any(city in msg for city in cities):
          score += 40

      category_words = [
          "apartment", "villa", "rent", "sale", "room", "studio",
          "شقة", "فيلا", "إيجار", "للبيع", "للإيجار",
      ]
      if any(w in msg for w in category_words):
          score += 30

      if re.search(r'\b\d[\d,]*\s*(k|m|egp|pound|جنيه)\b|\begp\b', msg):
          score += 25

      bedroom_words = ["bedroom", "bed", " br ", "غرف", "أوض"]
      if any(w in msg for w in bedroom_words):
          score += 20

      question_words = ["how ", "what is", "explain", "كيف", "ما هو"]
      if any(w in msg for w in question_words) and score == 0:
          score -= 30

      return score
  ```

- [ ] **Step 4: Run tests — expect PASS**

  ```bash
  cd "G:/AI/AXIOM-V2/backend"
  python -m pytest tests/test_ai.py::test_detect_property_search_city_and_category tests/test_ai.py::test_detect_property_search_price_signal tests/test_ai.py::test_detect_property_search_question_only tests/test_ai.py::test_detect_property_search_arabic tests/test_ai.py::test_detect_property_search_vague -v
  ```
  Expected: 5 PASS

- [ ] **Step 5: Commit**

  ```bash
  cd "G:/AI/AXIOM-V2"
  git add backend/app/ai/router.py backend/tests/test_ai.py
  git commit -m "feat(ai): add property search intent detection helper"
  ```

---

## Task 2: Backend — Search Pipeline + SSE Event

**Files:**
- Modify: `backend/app/ai/router.py`
- Test: `backend/tests/test_ai.py`

- [ ] **Step 1: Write failing test for chat listing injection**

  Add to `backend/tests/test_ai.py`:

  ```python
  def test_chat_listing_search_score_threshold():
      """High-intent query should score >= 40."""
      score = _detect_property_search("apartment in cairo under 1500000 egp")
      assert score >= 40

  def test_build_listing_refs_shape():
      from app.ai.router import _build_listing_refs
      rows = [{
          "id": "abc", "title": "Test", "location": "Cairo",
          "price": 1000000, "currency": "EGP", "bedrooms": 2,
          "size_sqm": 100.0, "images": [], "views_count": 5,
      }]
      refs = _build_listing_refs(rows)
      assert refs[0]["id"] == "abc"
      assert refs[0]["price"] == 1000000.0
      assert "embedding" not in refs[0]
  ```

- [ ] **Step 2: Run tests — expect FAIL**

  ```bash
  cd "G:/AI/AXIOM-V2/backend"
  python -m pytest tests/test_ai.py::test_build_listing_refs_shape -v
  ```
  Expected: `ImportError: cannot import name '_build_listing_refs'`

- [ ] **Step 3: Add `_build_listing_refs` helper to `router.py`**

  Add directly after `_detect_property_search`:

  ```python
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
  ```

- [ ] **Step 4: Add `_search_listings_for_chat` helper to `router.py`**

  Add after `_build_listing_refs`:

  ```python
  async def _search_listings_for_chat(
      message: str,
      filters: dict,
      current_user: dict | None,
  ) -> tuple[list[dict], str]:
      """
      Returns (listing_refs, source). source is "search" or "personalized".
      Total budget: 3 seconds. Returns ([], "search") on any failure or timeout.
      """
      import asyncio
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
  ```

- [ ] **Step 5: Wire into the `chat` endpoint**

  In the `chat` endpoint (around line 202, after RAG retrieval and before building the system prompt), add:

  ```python
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
  ```

  Then in the `generate_sse` inner function, add the `listing_refs` event **before** citations and `[DONE]`:

  ```python
  async def generate_sse():
      try:
          async for token in ollama.generate_stream(prompt=full_prompt, system=system):
              yield f"data: {json.dumps({'token': token})}\n\n"
          # Emit listing refs before citations before DONE
          if listing_refs:
              yield f"data: {json.dumps({'listing_refs': listing_refs, 'source': listing_source})}\n\n"
          if citations:
              yield f"data: {json.dumps({'citations': [c.model_dump() for c in citations]})}\n\n"
          yield "data: [DONE]\n\n"
      except Exception as e:
          yield f"data: {json.dumps({'error': str(e)})}\n\n"
  ```

  Note: `listing_refs` and `listing_source` are captured from the enclosing scope — same pattern as `citations`.

- [ ] **Step 6: Run all AI tests**

  ```bash
  cd "G:/AI/AXIOM-V2/backend"
  python -m pytest tests/test_ai.py -v
  ```
  Expected: all tests pass (including new ones added in Tasks 1 and 2).

- [ ] **Step 7: Commit**

  ```bash
  cd "G:/AI/AXIOM-V2"
  git add backend/app/ai/router.py backend/tests/test_ai.py
  git commit -m "feat(ai): add hybrid listing search pipeline to chat endpoint"
  ```

---

## Task 3: Frontend — Type Update + Label Rendering

**Files:**
- Modify: `frontend/src/components/ai/ChatMessage.tsx`

- [ ] **Step 1: Add `listing_source` to `ChatMessageData` interface**

  In `ChatMessage.tsx`, find the `ChatMessageData` interface (around line 87). Add `listing_source`:

  ```tsx
  export interface ChatMessageData {
    id: string;
    role: "user" | "assistant";
    content: string;
    listing_refs?: ListingRef[];
    listing_source?: "search" | "personalized";  // ← add this line
    citations?: Citation[];
    timestamp: Date;
  }
  ```

- [ ] **Step 2: Update the listing cards render block with a label**

  Find the existing listing refs render block (around line 196 — the one that checks `message.listing_refs && message.listing_refs.length > 0`). Replace the entire block with:

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

- [ ] **Step 3: Run TypeScript check**

  ```bash
  cd "G:/AI/AXIOM-V2/frontend"
  npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 4: Commit**

  ```bash
  cd "G:/AI/AXIOM-V2"
  git add frontend/src/components/ai/ChatMessage.tsx
  git commit -m "feat(chat): add listing_source type and source label to listing cards"
  ```

---

## Task 4: Frontend — SSE Handler in ChatDrawer

**Files:**
- Modify: `frontend/src/components/ai/ChatDrawer.tsx`

- [ ] **Step 1: Add `listing_refs` handler to the SSE reader loop**

  In `ChatDrawer.tsx`, find the SSE parsing block inside the `while (true)` loop. It currently handles `parsed.token` and `parsed.citations`. Add the `listing_refs` handler **between** them:

  ```tsx
  if (parsed.token) {
    setIsSearching(false);
    accumulated += parsed.token;
    const snap = accumulated;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMsgId ? { ...m, content: snap } : m,
      ),
    );
  }
  // ← ADD THIS BLOCK
  if (parsed.listing_refs) {
    setIsSearching(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMsgId
          ? {
              ...m,
              listing_refs: parsed.listing_refs,
              // Safe conditional — never use `as` cast on runtime wire data
              listing_source:
                parsed.source === "personalized" ? "personalized" : "search",
            }
          : m,
      ),
    );
  }
  if (parsed.citations) {
    // existing citations handler unchanged
  }
  ```

- [ ] **Step 2: Run TypeScript check**

  ```bash
  cd "G:/AI/AXIOM-V2/frontend"
  npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  cd "G:/AI/AXIOM-V2"
  git add frontend/src/components/ai/ChatDrawer.tsx
  git commit -m "feat(chat): handle listing_refs SSE event in chat drawer"
  ```

---

## Task 5: Final Verification

- [ ] **Step 1: Run full backend test suite**

  ```bash
  cd "G:/AI/AXIOM-V2/backend"
  python -m pytest tests/ -v
  ```
  Expected: all tests pass.

- [ ] **Step 2: Run TypeScript check**

  ```bash
  cd "G:/AI/AXIOM-V2/frontend"
  npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 3: Manual smoke test**

  Start both servers. Open the chat drawer and verify:
  - "apartment in cairo under 1500000 egp" → 3 listing cards appear below the AI response, labeled "Matching listings"
  - "how does renting work in egypt" → NO listing cards (question-only query)
  - Logged-in user with favorites → cards labeled "Recommended for you"
  - Both servers down / Ollama down → chat still works, just no listing cards (fail-open)
