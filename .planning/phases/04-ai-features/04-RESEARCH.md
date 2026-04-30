# Phase 4: AI Features (Chat, NL Search, Recommendations, Compatibility, Description Gen) - Research

**Researched:** 2026-03-21
**Domain:** Ollama (local LLM), Server-Sent Events (SSE), pgvector similarity search, FastAPI StreamingResponse
**Confidence:** HIGH (implementation directly observable in backend/app/ai/router.py and all frontend components)

---

## Summary

Phase 4 adds five distinct AI-powered features to AXIOM, all backed by a local Ollama inference server running the custom `axiom-llm:latest` model. The Ollama integration is deliberately thin: a single `OllamaClient` class in `backend/app/ai/ollama_client.py` wraps the Ollama HTTP API with four async methods (`health`, `generate`, `generate_stream`, `embed`). Every AI endpoint begins with a `health()` check and returns `{"ai_unavailable": true}` (HTTP 200) rather than a 5xx error when Ollama is down — this is the single most important design decision in the phase, allowing the frontend to degrade gracefully without breaking the user flow.

The chat feature uses FastAPI's `StreamingResponse` with `media_type="text/event-stream"` to push tokens to the browser as they are generated. Each token chunk is framed as `data: {"token": "..."}\n\n` and the stream ends with `data: [DONE]\n\n`. The frontend reads this stream via `fetch` + `ReadableStream` (not `EventSource`, because `EventSource` does not support POST with a request body). The ChatDrawer component accumulates tokens into a message object in state, updating React state on each chunk so the user sees the text appear word-by-word.

The recommendations feature is the most architecturally layered: it first attempts pgvector cosine similarity via a Supabase RPC function `match_listings` (768-dimensional vectors produced by Ollama `nomic-embed-text`), then falls back to category+city filtering, then falls back to newest listings. This three-tier fallback ensures the feature is useful even before listings have embeddings. NL search uses Ollama to extract structured JSON filters from a free-text query, then applies those filters to a normal Supabase query — it is essentially a natural-language interface over the existing filter system. Compatibility scoring and description generation are simpler Ollama JSON extraction tasks.

**Primary recommendation:** Implement `OllamaClient` first with `health()` as a gate, wire all five endpoints behind it, and test every endpoint with Ollama mocked both up and down.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-AI-01 | POST /api/ai/search: Ollama extracts filters as JSON → Supabase query → {query, parsed_filters, results, total}; {ai_unavailable:true} if Ollama down | Implemented in router.py lines 106–152. `_extract_filters_from_query` greps first `{` to last `}` from Ollama output. |
| REQ-AI-02 | POST /api/ai/chat: FastAPI StreamingResponse, text/event-stream; tokens as `data: {"token":"..."}\n\n`; ends with `data: [DONE]\n\n`; optional auth | Implemented in router.py lines 156–202. `generate_sse()` is an async generator. |
| REQ-AI-03 | GET /api/ai/recommendations: auth required; pgvector `match_listings` RPC with 3-tier fallback (vector → category/city → newest) | Implemented in router.py lines 206–303. |
| REQ-AI-04 | POST /api/ai/compatibility: auth required; body {listing_id, lifestyle_data}; returns {listing_id, compatibility_score 0-100, reasons:[]}; 400 if not shared_housing | Implemented in router.py lines 307–375. Score clamped with max(0, min(100, ...)) |
| REQ-AI-05 | POST /api/ai/description: auth required; returns {english, arabic}; bilingual JSON from Ollama | Implemented in router.py lines 379–430. |
| REQ-AI-06 | All AI endpoints return {ai_unavailable:true} (HTTP 200, not 5xx) when Ollama is down | Pattern: `AI_UNAVAILABLE = {"ai_unavailable": True}` at module top; checked on every endpoint. |
| REQ-AI-07 | `match_listings` pgvector RPC in Supabase: 768-dim cosine similarity, filters by category + city, threshold 0.5 | SQL function needed: `1 - (embedding <=> query_embedding) AS similarity`, cosine distance operator `<=>`. |
| REQ-AI-08 | Frontend: ChatDrawer with real-time SSE token streaming, session persistence in localStorage, clear chat | ChatDrawer.tsx: fetch + ReadableStream, `axiom_chat_session` in localStorage. |
| REQ-AI-09 | Frontend: NL search integrated into Find Homes page; "Smart Search" toggle; parsed_filters displayed as chip tags | find-homes/page.tsx: inline AI mode with `aiMode` state toggle, chip tags for location/price/bedrooms/property_type/category. |
| REQ-AI-10 | Frontend: RecommendationsSection (on-demand fetch) + CompatibilityScore (circular SVG ring) + AI description generator in AddListingModal | All three confirmed in their respective component files. |
| REQ-AI-11 | 10 backend AI tests in test_ai.py, all passing | test_ai.py has exactly 10 test functions covering all 5 endpoints + Ollama-down scenarios. |

</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `httpx` | Already in project | Async HTTP client for Ollama API calls | Non-blocking in async FastAPI routes; `AsyncClient` with per-call timeout |
| `fastapi.responses.StreamingResponse` | FastAPI built-in | SSE chat streaming endpoint | Native FastAPI, no extra deps; supports async generators |
| `supabase-py` | Already in project | pgvector RPC (`match_listings`), all DB queries | Single DB client already configured |
| `fetch` + `ReadableStream` | Browser Web API | SSE stream consumption in ChatDrawer | Only option that supports POST with body; `EventSource` is GET-only |
| Framer Motion | Already in project | ChatDrawer open/close animation, recommendation card hover | Consistent with project animation layer |
| TanStack Query v5 | Already in project | RecommendationsSection uses `api.get` directly (not useQuery); CompatibilityScore uses `api.post` directly | Simpler for on-demand AI features — no automatic background refetch |

### Supporting (Backend)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `json` (stdlib) | Python stdlib | Parse JSON from Ollama text output | Extract first `{` to last `}` from potentially noisy model output |
| `asyncio` | Python stdlib | Imported in router but Ollama streaming is handled via httpx async streaming | Background task coordination |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `fetch` + `ReadableStream` | `EventSource` API | EventSource is GET-only; POST body required for message + history; fetch+ReadableStream is the correct approach |
| Ollama (local, `axiom-llm:latest`) | OpenAI API | Ollama: zero cost, no internet, custom model. OpenAI: reliable but costs money and requires internet |
| Inline AI mode in find-homes/page.tsx | Separate NLSearchBar component | Implemented inline — simpler, avoids prop-drilling, co-locates all find-homes state |
| TanStack Query mutations | Direct `api.post` calls | For on-demand AI features (recommendations, compatibility, description), direct calls with local `useState` loading flags are simpler; no global cache invalidation needed |
| `pgvector` IVFFlat index | Exact cosine scan | No index: simpler to set up; acceptable at current listing count (< 100k rows). Index needed at scale. |

**Installation:** No new packages required. All dependencies already installed in Phase 2.

---

## Architecture Patterns

### Recommended Project Structure
```
backend/app/ai/
├── __init__.py
├── ollama_client.py    # OllamaClient class + module-level `ollama` singleton
├── router.py           # 5 AI endpoints
├── embeddings.py       # background embedding task (Phase 2)
└── fraud.py            # fraud scoring (Phase 2)

frontend/src/components/ai/
├── ChatMessage.tsx     # ChatMessageData type + message bubble + TypingIndicator
└── ChatDrawer.tsx      # SSE streaming chat UI

frontend/src/components/layout/
├── FloatingAIButton.tsx     # FAB that toggles ChatDrawer; lazy-loads ChatDrawer
└── ChatbotConditional.tsx   # Route-aware wrapper; hides on auth pages

frontend/src/components/sections/
├── RecommendationsSection.tsx   # On-demand AI recommendations grid
└── FeaturesSection.tsx          # Static marketing section

frontend/src/components/shared-housing/
└── CompatibilityScore.tsx       # Circular SVG score ring + reasons
```

### Pattern 1: Ollama Health Gate
**What:** Every AI endpoint calls `await ollama.health()` as the first operation. If False, return `AI_UNAVAILABLE` dict immediately.
**When to use:** All 5 AI endpoints. Never call `ollama.generate()` without a prior health check.
**Example:**
```python
# Source: backend/app/ai/router.py lines 106-113
AI_UNAVAILABLE = {"ai_unavailable": True}

@router.post("/search")
async def nl_search(body: NLSearchRequest):
    if not await ollama.health():
        return AI_UNAVAILABLE
    # ... proceed with Ollama calls
```

### Pattern 2: JSON Extraction from Ollama Output
**What:** Ollama may produce explanatory text around the JSON. Extract only the JSON object by finding first `{` and last `}`.
**When to use:** NL search filter extraction, compatibility scoring, description generation — any endpoint expecting structured JSON from Ollama.
**Example:**
```python
# Source: backend/app/ai/router.py lines 94-101
raw = await ollama.generate(prompt=query, system=system)
start = raw.find("{")
end = raw.rfind("}") + 1
if start >= 0 and end > start:
    return json.loads(raw[start:end])
# fallback
return {}
```

### Pattern 3: FastAPI SSE StreamingResponse
**What:** Async generator yields SSE-framed token strings; FastAPI wraps in StreamingResponse.
**When to use:** The chat endpoint only.
**Example:**
```python
# Source: backend/app/ai/router.py lines 186-202
async def generate_sse():
    try:
        async for token in ollama.generate_stream(prompt=full_prompt, system=system):
            yield f"data: {json.dumps({'token': token})}\n\n"
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
```

### Pattern 4: Ollama httpx Streaming
**What:** `httpx.AsyncClient.stream()` iterates response lines; each line is a JSON object from Ollama's streaming API.
**When to use:** `generate_stream()` in OllamaClient.
**Example:**
```python
# Source: backend/app/ai/ollama_client.py lines 56-85
async def generate_stream(self, prompt: str, system: str = ""):
    payload = {"model": self.model, "prompt": prompt, "stream": True}
    if system:
        payload["system"] = system
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", f"{self.base_url}/api/generate", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.strip():
                    data = json.loads(line)
                    token = data.get("response", "")
                    if token:
                        yield token
                    if data.get("done"):
                        break
```

### Pattern 5: Frontend SSE with fetch + ReadableStream
**What:** `fetch()` returns a response with `.body` (ReadableStream). Read chunks, decode, split on newlines, parse `data:` lines.
**When to use:** ChatDrawer — the only frontend SSE consumer.
**Example:**
```typescript
// Source: frontend/src/components/ai/ChatDrawer.tsx lines 154-193
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";  // keep incomplete line in buffer

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (payload === "[DONE]") continue;
    const parsed = JSON.parse(payload);
    if (parsed.token) {
      accumulated += parsed.token;
      setMessages((prev) =>
        prev.map((m) => m.id === assistantMsgId ? { ...m, content: accumulated } : m)
      );
    }
  }
}
```

### Pattern 6: pgvector Three-Tier Fallback for Recommendations
**What:** Vector similarity → category+city filter → newest listings. Each tier is tried only if the previous fails or returns no results.
**When to use:** GET /api/ai/recommendations only.
```
Tier 1: fav_ids empty → newest 8 active listings (no AI needed)
Tier 2: embedding exists + Ollama healthy → match_listings RPC → top 8 non-fav matches
Tier 3: no embedding or Ollama down → same category+city, order by views_count DESC, limit 8
```

### Anti-Patterns to Avoid
- **Calling `ollama.generate()` without a health check:** Ollama is optional infrastructure; always gate on `health()` and return `AI_UNAVAILABLE`.
- **Using `EventSource` API for chat:** EventSource is GET-only. The chat endpoint requires POST with `{message, conversation_history}` body.
- **Returning 503 when Ollama is down:** The contract is HTTP 200 with `{ai_unavailable: true}`. A 5xx would trigger `ApiError` in the frontend and break the UI.
- **Blocking the event loop with Ollama calls:** All Ollama methods use `httpx.AsyncClient`. Never use `requests` (synchronous) in async FastAPI routes.
- **Storing the full conversation in the chat endpoint:** The endpoint is stateless — it receives `conversation_history` from the client on each request. State lives in the frontend's localStorage.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async HTTP to Ollama | Custom `aiohttp` wrapper | `httpx.AsyncClient` (already in project) | httpx has built-in streaming support with `client.stream()` |
| SSE framing | Custom streaming protocol | FastAPI `StreamingResponse` + SSE `data: ...\n\n` format | Browser-native; EventSource and fetch+ReadableStream both understand it |
| Token streaming in browser | WebSocket | fetch + ReadableStream (SSE) | SSE is one-way (server→client) which is exactly what token streaming needs; no WS handshake overhead |
| pgvector cosine distance | Custom vector math in Python | Supabase `<=>` operator in SQL RPC | pgvector handles vectorized cosine distance in C; far faster than Python |
| JSON parsing from noisy LLM output | Regex-based extraction | `raw.find("{") ... raw.rfind("}")` | Simple and robust for extracting the first JSON object from mixed text |

**Key insight:** The Ollama API is simple HTTP — health check on `/api/tags`, generate on `/api/generate`, embed on `/api/embeddings`. No SDK needed; httpx is sufficient.

---

## Common Pitfalls

### Pitfall 1: Incomplete SSE Buffer Handling
**What goes wrong:** A single `reader.read()` chunk may contain a partial `data:` line split across two reads. Joining chunks without a buffer causes `JSON.parse` to fail on partial lines.
**Why it happens:** TCP packets don't align with SSE message boundaries.
**How to avoid:** Keep a `buffer` string; append each decoded chunk; split on `\n`; keep the last (potentially incomplete) element in the buffer with `lines.pop()`.
**Warning signs:** Occasional `JSON.parse` errors in the console, or tokens appearing in wrong order.

### Pitfall 2: Ollama generate() timeout on large prompts
**What goes wrong:** Ollama can take 30–60s on a cold model or complex prompt. A short timeout causes `httpx.ReadTimeout`.
**Why it happens:** `axiom-llm:latest` may need to load weights on first call.
**How to avoid:** Use a long timeout for generation (60s for generate, 120s for streaming). Use a short timeout (2s) only for the health check.
**Warning signs:** `ReadTimeout` exceptions in logs on first request after server restart.

### Pitfall 3: match_listings RPC Function Missing
**What goes wrong:** `supabase_admin.rpc("match_listings", ...)` raises an exception if the SQL function doesn't exist in Supabase.
**Why it happens:** The function must be created via a SQL migration; it's not auto-created by the schema.
**How to avoid:** Include the `match_listings` SQL function in a migration file; verify it exists before testing recommendations.
**Warning signs:** Recommendations endpoint returns empty list silently (exception is caught and falls through to category/city fallback).

### Pitfall 4: EventSource vs fetch for POST SSE
**What goes wrong:** Using the browser `EventSource` API for the chat endpoint fails silently because EventSource only supports GET requests without a body.
**Why it happens:** Developers familiar with SSE often reach for `EventSource` first.
**How to avoid:** Use `fetch()` + `res.body.getReader()` for all SSE consumption in this project.
**Warning signs:** Chat requests never reach the backend (no POST in network tab).

### Pitfall 5: JSON extraction from Ollama output fails on valid JSON with trailing text
**What goes wrong:** If Ollama returns `{"score": 75, "reasons": [...]}  Great match!`, the `rfind("}")` approach correctly finds the outer `}` — but if Ollama nests the JSON in explanation text like `Here is the score: {...} Hope this helps`, the extraction works. If it returns only text with no `{`, `start` is -1 and the `if start >= 0` guard falls to the default.
**Why it happens:** LLMs don't always respect strict JSON output instructions.
**How to avoid:** Always wrap extraction in try/except; provide sensible defaults (score=50, reasons=[]).
**Warning signs:** Compatibility always shows score of 50; description returns empty string.

---

## Code Examples

### OllamaClient Singleton Pattern
```python
# Source: backend/app/ai/ollama_client.py
class OllamaClient:
    def __init__(self) -> None:
        self.base_url = settings.ollama_base_url   # http://localhost:11434
        self.model = settings.ollama_model          # axiom-llm:latest
        self.embed_model = settings.ollama_embed_model  # nomic-embed-text

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False

    async def generate(self, prompt: str, system: str = "") -> str:
        payload = {"model": self.model, "prompt": prompt, "stream": False}
        if system:
            payload["system"] = system
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(f"{self.base_url}/api/generate", json=payload)
            r.raise_for_status()
            return r.json().get("response", "")

    async def embed(self, text: str) -> list[float]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.embed_model, "prompt": text},
            )
            r.raise_for_status()
            return r.json().get("embedding", [])

ollama = OllamaClient()  # module-level singleton
```

### pgvector match_listings SQL Function
```sql
-- Required in Supabase before recommendations endpoint works
CREATE OR REPLACE FUNCTION match_listings(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 12,
  filter_category text DEFAULT NULL,
  filter_city text DEFAULT NULL
)
RETURNS TABLE (id uuid, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT id, 1 - (embedding <=> query_embedding) AS similarity
  FROM listings
  WHERE status = 'active'
    AND deleted_at IS NULL
    AND embedding IS NOT NULL
    AND (filter_category IS NULL OR category = filter_category)
    AND (filter_city IS NULL OR city ILIKE '%' || filter_city || '%')
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### Compatibility Score: Circular SVG Ring
```typescript
// Source: frontend/src/components/shared-housing/CompatibilityScore.tsx
function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  // SVG circle with strokeDashoffset to show filled percentage
  // strokeDashoffset: 0 = full, circumference = empty
}
```

### ChatbotConditional: Route-Aware Global Wrapper
```typescript
// Source: frontend/src/components/layout/ChatbotConditional.tsx
const HIDDEN_PATHS = ["/login", "/signup", "/forgot-password", "/auth/"];

export default function ChatbotConditional() {
  const pathname = usePathname();
  const hidden = HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p));
  if (hidden) return null;
  return <FloatingAIButton />;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OpenAI API for chat | Ollama local inference | Phase 4 decision | Zero cost, no internet dependency, custom model; tradeoff: model quality lower than GPT-4 |
| `EventSource` for SSE | `fetch` + `ReadableStream` | Phase 4 implementation | Enables POST body for message + conversation history |
| TanStack Query for all AI features | Direct `api.get/post` with local useState | Phase 4 implementation | AI responses should not be cached globally; on-demand fetch is more appropriate |
| Separate NLSearchBar component | Inline AI mode state in find-homes/page.tsx | Phase 4 implementation | Avoids prop drilling, co-locates filter state |

**Deprecated/outdated:**
- `sse.ts` utility file: planned in the original 04-02-PLAN.md but not created. SSE logic lives directly in ChatDrawer.tsx using inline fetch+ReadableStream. No separate utility needed.
- `useRecommendations` / `useNLSearch` TanStack Query hooks: planned but not implemented. Direct `api.get/post` calls with local loading state were used instead.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (all backend tests) |
| Config file | `backend/pytest.ini` or inline in `pyproject.toml` |
| Quick run command | `cd backend && python -m pytest tests/test_ai.py -v` |
| Full suite command | `cd backend && python -m pytest tests/ -v` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-AI-01 | NL search returns results with parsed_filters | unit | `pytest tests/test_ai.py::test_ai_search_success -x` | Yes |
| REQ-AI-01 | NL search returns ai_unavailable when Ollama down | unit | `pytest tests/test_ai.py::test_ai_search_ollama_down -x` | Yes |
| REQ-AI-02 | Chat streams SSE tokens with [DONE] sentinel | unit | `pytest tests/test_ai.py::test_ai_chat_streams -x` | Yes |
| REQ-AI-02 | Chat returns ai_unavailable when Ollama down | unit | `pytest tests/test_ai.py::test_ai_chat_ollama_down -x` | Yes |
| REQ-AI-03 | Recommendations returns list when no favorites | unit | `pytest tests/test_ai.py::test_recommendations_no_favorites -x` | Yes |
| REQ-AI-03 | Recommendations requires auth | unit | `pytest tests/test_ai.py::test_recommendations_no_auth -x` | Yes |
| REQ-AI-04 | Compatibility returns 400 for non-shared_housing | unit | `pytest tests/test_ai.py::test_compatibility_not_shared_housing -x` | Yes |
| REQ-AI-05 | Description returns {english, arabic} | unit | `pytest tests/test_ai.py::test_description_success -x` | Yes |
| REQ-AI-05 | Description returns ai_unavailable when Ollama down | unit | `pytest tests/test_ai.py::test_description_ollama_down -x` | Yes |
| REQ-AI-06 | All endpoints HTTP 200 (not 5xx) when Ollama down | unit | `pytest tests/test_ai.py -k "ollama_down" -x` | Yes |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/test_ai.py -v`
- **Per wave merge:** `cd backend && python -m pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — `backend/tests/test_ai.py` exists with 10 tests covering all phase requirements.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `backend/app/ai/router.py` — all 5 endpoint implementations
- Direct code inspection: `backend/app/ai/ollama_client.py` — OllamaClient with health, generate, generate_stream, embed
- Direct code inspection: `backend/tests/test_ai.py` — 10 test functions, all patterns confirmed
- Direct code inspection: `frontend/src/components/ai/ChatDrawer.tsx` — SSE streaming implementation
- Direct code inspection: `frontend/src/components/shared-housing/CompatibilityScore.tsx` — circular ring UI
- Direct code inspection: `frontend/src/app/find-homes/page.tsx` — inline NL search mode
- Direct code inspection: `frontend/src/components/sections/RecommendationsSection.tsx`
- Direct code inspection: `frontend/src/components/layout/FloatingAIButton.tsx`
- Direct code inspection: `frontend/src/components/layout/ChatbotConditional.tsx`
- Direct code inspection: `frontend/src/components/dashboard/AddListingModal.tsx` (lines 250–294) — description generator

### Secondary (MEDIUM confidence)
- Ollama API reference: `/api/tags` for health, `/api/generate` for text, `/api/embeddings` for vectors, `stream: true` for streaming — consistent with ollama_client.py implementation

### Tertiary (LOW confidence)
- pgvector `<=>` cosine distance operator behavior at scale — not benchmarked; acceptable at current listing counts

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — directly verified from source files
- Architecture: HIGH — all patterns confirmed in implementation
- Pitfalls: HIGH for SSE/buffer/Ollama-down; MEDIUM for pgvector scale

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (stable domain; Ollama API unlikely to change)
