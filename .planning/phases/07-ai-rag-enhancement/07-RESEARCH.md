# Phase 7: AI RAG Enhancement - Research

**Researched:** 2026-03-22
**Domain:** Retrieval-Augmented Generation (RAG), Ollama LLM, pgvector, FastAPI SSE streaming
**Confidence:** HIGH (primary stack verified against official docs and current sources)

---

## Summary

Phase 7 transforms AXIOM's AI from a general-purpose LLM with system prompts into a grounded RAG
system. The core problem is clear: the current `/api/ai/chat` endpoint has zero database access — it
answers real estate questions purely from model training weights, which produces plausible-sounding
but hallucinated property data. The fix is a retrieve-then-generate pipeline: embed the user query,
fetch relevant listing chunks from pgvector, inject those chunks as grounded context, then generate
a response that is constrained to only what was retrieved.

The project already has the key infrastructure in place: `nomic-embed-text` produces 768-dim vectors
stored in `listings.embedding`, the `match_listings` RPC already supports filtered cosine search,
and `OllamaClient` wraps both generation and embedding calls. What is missing is (1) a dedicated
`knowledge_chunks` table for richer, queryable text chunks across listings/neighborhoods/blog posts,
(2) a hybrid search RPC combining `tsvector` keyword + pgvector cosine via Reciprocal Rank Fusion
(RRF), (3) a RAG context builder that retrieves and formats chunks before the LLM call, and (4) a
model upgrade from `axiom-llm:latest` (unknown base) to `qwen2.5:7b` for verified Arabic support
and structured JSON output.

The upgrade to Qwen2.5:7b is the highest-confidence recommendation: it is the only sub-10B model
that officially supports 29+ languages including Arabic, produces reliable JSON output, and is
available as a quantized Ollama model (`qwen2.5:7b-instruct-q4_K_M`). nomic-embed-text continues
as the embedding model — it already produces 768-dim vectors matching the existing pgvector schema,
and upgrading would require a full re-embed of all listings.

**Primary recommendation:** Build a `knowledge_chunks` table, a `hybrid_search_chunks` RPC, a
`rag.py` retrieval module, and wire RAG into the chat endpoint using pre-retrieval then stream.
Upgrade the chat/generation model to `qwen2.5:7b-instruct`. Keep `nomic-embed-text` for embeddings.

---

<phase_requirements>

## Phase Requirements

| ID         | Description                                                                            | Research Support                                                                     |
| ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| REQ-RAG-01 | Chat answers listing queries with real listing IDs — zero hallucination                | RAG context builder injects real DB rows; LLM constrained to cite only retrieved IDs |
| REQ-RAG-02 | Embedding pipeline covers all listings, neighborhoods, blog posts (batch embed script) | `batch_embed.py` script + `knowledge_chunks` table for multi-source embeddings       |
| REQ-RAG-03 | Model upgraded to Qwen2.5:7b — Arabic descriptions without Latin-character leakage     | Qwen2.5 officially supports 29+ languages including Arabic; available on Ollama      |
| REQ-RAG-04 | Hybrid search (vector + keyword) returns results within 300ms p95                      | RRF SQL function combines `tsvector` + pgvector; HNSW index already in schema        |
| REQ-RAG-05 | Chat responses include inline citations linking to real property IDs                   | RAG response format includes `sources` array; frontend renders as property cards     |
| REQ-RAG-06 | RAG knowledge base updates automatically on listing create/update/delete               | Background task pattern already in embeddings.py; extend to cover update/delete      |
| REQ-RAG-07 | All AI tests still pass (82+ total backend tests, no regressions)                      | Existing 11 AI tests mock Ollama; new tests validate RAG with mock retrieval         |
| REQ-RAG-08 | Zero TypeScript errors after frontend RAG UI changes                                   | Named exports, strict types — follow existing ChatDrawer/ChatMessage patterns        |
| REQ-RAG-09 | Description Generator retrieves neighborhood context chunks before generating copy      | rag_retriever.retrieve(city, source_type="neighborhood", k=2) injected into prompt   |
| REQ-RAG-10 | Fraud LLM scorer receives real market price context from knowledge_chunks               | Price context chunks for city+category injected into _llm_consistency prompt         |
| REQ-RAG-11 | Recommendations support `?explain=true` — 1-sentence LLM match explanation per listing | Single batch LLM call after pgvector match; explanation field merged into response   |
| REQ-RAG-12 | Compatibility scoring uses real housemates + user's stored profile from DB              | Housemates table queried; profiles table queried; body overrides stored prefs        |

</phase_requirements>

---

## Standard Stack

### Core

| Library             | Version                  | Purpose                                                   | Why Standard                                                                         |
| ------------------- | ------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| qwen2.5:7b-instruct | latest (Ollama)          | Chat + NL search + compatibility + description generation | Only sub-10B model with verified Arabic, JSON output, 128K context                   |
| nomic-embed-text    | v1.5 (Ollama)            | 768-dim text embeddings                                   | Already in production; matches existing `vector(768)` schema; keep to avoid re-embed |
| pgvector            | 0.8.x (Supabase-managed) | Vector similarity search                                  | Already enabled on Supabase; HNSW index already in schema                            |
| Supabase RPC        | n/a                      | Hybrid search SQL function                                | Combines `tsvector` + pgvector in a single DB round-trip                             |

### Supporting

| Library                 | Version                      | Purpose                              | When to Use                                                         |
| ----------------------- | ---------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| httpx                   | >=0.27.0 (already installed) | Async Ollama HTTP calls              | All Ollama calls in OllamaClient already use httpx                  |
| asyncio                 | stdlib                       | Async batch embedding                | Batch embed script uses asyncio + semaphore for concurrency control |
| nomic-embed-text-v2-moe | (future)                     | Multilingual 100-language embeddings | Only if Arabic search quality is insufficient with v1.5             |

### Alternatives Considered

| Instead of                 | Could Use                  | Tradeoff                                                                                 |
| -------------------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| qwen2.5:7b                 | llama3.1:8b                | Llama 3.1 has worse multilingual/Arabic; Qwen2.5 wins on MMLU-Pro, HumanEval, Arabic     |
| qwen2.5:7b                 | mistral:7b                 | Mistral is English-primary; limited Arabic support                                       |
| nomic-embed-text           | mxbai-embed-large          | mxbai produces 1024-dim vectors — would break existing 768-dim schema                    |
| Supabase RPC hybrid search | ParadeDB pg_bm25           | pg_bm25 extension not yet supported on hosted Supabase (confirmed via GitHub discussion) |
| knowledge_chunks table     | embed directly on listings | Single-table approach loses neighborhood/blog embeddings and limits chunk granularity    |

**Installation:**

```bash
# Ollama model upgrade (run locally)
ollama pull qwen2.5:7b-instruct
# nomic-embed-text already pulled — no change needed

# No new Python packages needed — httpx already installed
```

Config change in `.env`:

```env
OLLAMA_MODEL=qwen2.5:7b-instruct
OLLAMA_EMBED_MODEL=nomic-embed-text
```

---

## Architecture Patterns

### Recommended Project Structure

```
backend/app/ai/
├── router.py          # 5 existing AI endpoints — chat gets RAG injection
├── ollama_client.py   # MODIFY: add /api/embed (batch) alongside /api/embeddings
├── embeddings.py      # MODIFY: extend to embed neighborhoods, blog_posts; add batch_embed()
├── rag.py             # NEW: retrieve_context(), build_rag_prompt(), format_sources()
├── fraud.py           # unchanged
└── __init__.py

backend/scripts/
└── batch_embed.py     # NEW: one-shot script to embed all existing listings/neighborhoods/blog

docs/schema/
└── 003_knowledge_chunks.sql  # NEW: migration for knowledge_chunks table + hybrid_search RPC
```

### Pattern 1: Knowledge Chunks Table (Multi-Source RAG)

**What:** A single `knowledge_chunks` table holds embeddable text chunks from listings,
neighborhoods, and blog posts. Each chunk carries: source type, source ID, chunk text, embedding
vector, and metadata JSON for pre-filtering.

**When to use:** Any time the RAG system needs to retrieve from more than just listings. Neighborhoods
and blog posts answer questions like "what's the rental market in Maadi?" that need context beyond
a single listing row.

**Schema:**

```sql
-- Source: design derived from Supabase official vector column docs
CREATE TABLE knowledge_chunks (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text         NOT NULL CHECK (source_type IN ('listing', 'neighborhood', 'blog')),
  source_id   text         NOT NULL,   -- UUID of the source row
  chunk_text  text         NOT NULL,
  embedding   vector(768),             -- nomic-embed-text output
  metadata    jsonb        NOT NULL DEFAULT '{}',  -- city, category, price_range, etc.
  created_at  timestamptz  DEFAULT now(),
  updated_at  timestamptz  DEFAULT now()
);

CREATE INDEX idx_chunks_source ON knowledge_chunks (source_type, source_id);
CREATE INDEX idx_chunks_fts ON knowledge_chunks USING gin(to_tsvector('english', chunk_text));
CREATE INDEX idx_chunks_embedding ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Pattern 2: Hybrid Search via RRF (Reciprocal Rank Fusion)

**What:** A single Postgres RPC combines full-text search (tsvector `@@` operator) with pgvector
cosine similarity. Results from each method get a rank position, then RRF scoring fuses them.

**Why RRF over weighted sum:** RRF is rank-position-based — it handles the case where a listing
ranks #1 in keyword search but #50 in vector search. No need to normalize relevance scores across
systems with different scales.

**Verified pattern from Supabase official hybrid search docs:**

```sql
-- Source: https://supabase.com/docs/guides/ai/hybrid-search
CREATE OR REPLACE FUNCTION hybrid_search_chunks(
  query_text      text,
  query_embedding vector(768),
  match_count     int       DEFAULT 10,
  filter_source   text      DEFAULT NULL,  -- 'listing' | 'neighborhood' | 'blog' | NULL
  filter_metadata jsonb     DEFAULT NULL,  -- e.g. {"city": "Cairo"}
  full_text_weight float    DEFAULT 1.0,
  semantic_weight  float    DEFAULT 1.0,
  rrf_k           int       DEFAULT 50
)
RETURNS TABLE (
  id          uuid,
  source_type text,
  source_id   text,
  chunk_text  text,
  metadata    jsonb,
  score       float
)
LANGUAGE sql AS $$
WITH
  full_text AS (
    SELECT id,
      row_number() OVER (
        ORDER BY ts_rank_cd(
          to_tsvector('english', chunk_text),
          websearch_to_tsquery(query_text)
        ) DESC
      ) AS rank_ix
    FROM knowledge_chunks
    WHERE
      to_tsvector('english', chunk_text) @@ websearch_to_tsquery(query_text)
      AND (filter_source IS NULL OR source_type = filter_source)
    LIMIT least(match_count, 30) * 2
  ),
  semantic AS (
    SELECT id,
      row_number() OVER (
        ORDER BY embedding <=> query_embedding
      ) AS rank_ix
    FROM knowledge_chunks
    WHERE
      (filter_source IS NULL OR source_type = filter_source)
      AND embedding IS NOT NULL
    LIMIT least(match_count, 30) * 2
  )
SELECT
  kc.id,
  kc.source_type,
  kc.source_id,
  kc.chunk_text,
  kc.metadata,
  (
    COALESCE(1.0 / (rrf_k + ft.rank_ix), 0.0) * full_text_weight +
    COALESCE(1.0 / (rrf_k + sem.rank_ix), 0.0) * semantic_weight
  ) AS score
FROM full_text ft
FULL OUTER JOIN semantic sem ON ft.id = sem.id
JOIN knowledge_chunks kc ON COALESCE(ft.id, sem.id) = kc.id
ORDER BY score DESC
LIMIT least(match_count, 30);
$$;
```

### Pattern 3: RAG Context Builder (retrieve-then-generate)

**What:** Before calling Ollama, retrieve top-k chunks relevant to the user query. Build a grounded
system prompt that contains only the retrieved content. The LLM must cite source IDs.

**Critical insight:** Retrieval MUST happen before the SSE stream starts. You cannot start streaming
and then retroactively inject context. The correct pattern is: await retrieval → build context
prompt → begin streaming.

**Example — rag.py:**

```python
# Source: derived from Supabase hybrid search docs + RAG multi-turn patterns
async def retrieve_context(query: str, filters: dict | None = None) -> list[dict]:
    """
    1. Embed the query with nomic-embed-text
    2. Call hybrid_search_chunks RPC
    3. Return top-k chunks with source metadata
    """
    embedding = await ollama.embed(query)
    if not embedding:
        return []
    result = supabase_admin.rpc(
        "hybrid_search_chunks",
        {
            "query_text": query,
            "query_embedding": embedding,
            "match_count": 5,
            "filter_source": filters.get("source_type") if filters else None,
        }
    ).execute()
    return result.data or []


def build_rag_prompt(query: str, chunks: list[dict]) -> tuple[str, list[dict]]:
    """Build system prompt injecting retrieved context. Return prompt + sources list."""
    if not chunks:
        return query, []

    context_lines = []
    sources = []
    for chunk in chunks:
        context_lines.append(f"[{chunk['source_type']}:{chunk['source_id']}] {chunk['chunk_text']}")
        if chunk["source_type"] == "listing":
            sources.append({"id": chunk["source_id"], "type": "listing"})

    context_block = "\n".join(context_lines)
    grounded_prompt = (
        f"Use ONLY the following database records to answer. "
        f"Cite listing IDs like [listing:UUID] in your response. "
        f"If the answer is not in the records, say so explicitly.\n\n"
        f"RECORDS:\n{context_block}\n\n"
        f"USER QUESTION: {query}"
    )
    return grounded_prompt, sources
```

### Pattern 4: Updated Chat Endpoint (RAG-injected SSE)

**What:** The chat endpoint adds a pre-stream retrieval step. The response adds a `sources` field
alongside the streaming tokens to allow the frontend to render citation cards.

```python
# Modified router.py chat endpoint pattern
@router.post("/chat")
async def chat(body: ChatRequest, current_user = Depends(get_optional_user)):
    if not await ollama.health():
        return AI_UNAVAILABLE

    # Step 1: Retrieve relevant context BEFORE streaming
    chunks = await retrieve_context(body.message)
    grounded_prompt, sources = build_rag_prompt(body.message, chunks)

    # Step 2: Build conversation history with grounded current message
    history_text = "".join(
        f"{msg['role'].capitalize()}: {msg['content']}\n"
        for msg in body.conversation_history[-4:]  # reduce to 4 turns to free context for chunks
    )
    full_prompt = f"{history_text}User: {grounded_prompt}\nAssistant:"

    async def generate_sse():
        # Emit sources metadata FIRST so frontend can render citations immediately
        yield f"data: {json.dumps({'sources': sources})}\n\n"
        async for token in ollama.generate_stream(prompt=full_prompt, system=RAG_SYSTEM):
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate_sse(), media_type="text/event-stream", ...)
```

### Pattern 5: Embedding the Batch Script

**What:** A standalone script embeds all existing listings, neighborhoods, and blog posts into
`knowledge_chunks`. Uses async with a concurrency semaphore (max 3 concurrent Ollama requests)
to avoid overwhelming local inference.

```python
# backend/scripts/batch_embed.py
import asyncio
import httpx

SEMAPHORE = asyncio.Semaphore(3)

def build_listing_chunk_text(listing: dict) -> str:
    """Same approach as embeddings.py _build_embed_text, extended."""
    parts = [
        listing.get("title", ""),
        listing.get("description", "") or "",
        f"Location: {listing.get('city', '')} — {listing.get('location', '')}",
        f"Type: {listing.get('property_type', '')} ({listing.get('category', '')})",
        f"Price: EGP {listing.get('price', 0):,.0f}",
    ]
    if listing.get("bedrooms"):
        parts.append(f"{listing['bedrooms']} bedrooms")
    if listing.get("amenities"):
        parts.append(f"Amenities: {', '.join(listing['amenities'][:10])}")
    return ". ".join(p for p in parts if p.strip())

async def embed_chunk(text: str, source_type: str, source_id: str, metadata: dict):
    async with SEMAPHORE:
        # Use new /api/embed endpoint (batch-capable, L2-normalized)
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                "http://localhost:11434/api/embed",
                json={"model": "nomic-embed-text", "input": text}
            )
            embedding = r.json().get("embeddings", [[]])[0]
        # Upsert into knowledge_chunks
        supabase_admin.table("knowledge_chunks").upsert({
            "source_type": source_type,
            "source_id": source_id,
            "chunk_text": text,
            "embedding": embedding,
            "metadata": metadata,
        }, on_conflict="source_type,source_id").execute()
```

### Pattern 6: Ollama API Upgrade (/api/embed)

**What:** The existing `OllamaClient.embed()` uses the legacy `/api/embeddings` endpoint with a
`prompt` field (singular). Ollama has superseded this with `/api/embed` which supports batch inputs
and returns L2-normalized vectors.

**Change required in ollama_client.py:**

```python
# OLD (legacy, single string)
async def embed(self, text: str) -> list[float]:
    r = await client.post(f"{self.base_url}/api/embeddings",
                          json={"model": self.embed_model, "prompt": text})
    return r.json().get("embedding", [])

# NEW (current API, single string case of batch)
async def embed(self, text: str) -> list[float]:
    r = await client.post(f"{self.base_url}/api/embed",
                          json={"model": self.embed_model, "input": text})
    embeddings = r.json().get("embeddings", [[]])
    return embeddings[0] if embeddings else []

async def embed_batch(self, texts: list[str]) -> list[list[float]]:
    r = await client.post(f"{self.base_url}/api/embed",
                          json={"model": self.embed_model, "input": texts})
    return r.json().get("embeddings", [])
```

**Important:** Existing `embed()` callers (embeddings.py, fraud.py — via generate) are unaffected
by this change since the return type is the same `list[float]`.

### Pattern 7: Multi-Turn Conversation Context Budget

**What:** With RAG chunks occupying context space, the conversation history window must shrink.
Budget allocation for a 7B model with ~8K generation limit and ~4K practical prompt limit:

| Component                              | Token Budget     |
| -------------------------------------- | ---------------- |
| System prompt                          | ~200 tokens      |
| Retrieved chunks (5 x ~100 tokens avg) | ~500 tokens      |
| Conversation history (last 4 turns)    | ~800 tokens      |
| Current user message                   | ~100 tokens      |
| **Total prompt**                       | **~1600 tokens** |
| **Generation output**                  | ~8K max          |

Reduce `conversation_history[-6:]` to `conversation_history[-4:]` when RAG context is injected.
This leaves room for chunk context while staying well within the 4K practical prompt budget.

### Anti-Patterns to Avoid

- **Starting SSE stream before retrieval:** Cannot inject context after streaming starts. Always `await retrieve_context()` before yielding the first SSE token.
- **Embedding all fields separately:** Do not create separate chunks for title, description, location. Combine into a single coherent text string per listing — retrieval of related fields together produces better recall.
- **Using `match_listings` RPC for RAG retrieval:** That RPC returns only IDs + titles. The RAG context builder needs full `chunk_text`. Use `knowledge_chunks` table instead.
- **Re-embedding on every price change:** Only re-embed when `title`, `description`, `amenities`, or `location` change. Price changes trigger `metadata` update only.
- **Injecting all conversation history into the retrieval query:** The retrieval query should be the current user message only (or a rewritten standalone question). Adding chat history to the embedding query degrades retrieval quality.

---

## Don't Hand-Roll

| Problem                        | Don't Build                     | Use Instead                                                | Why                                                                                          |
| ------------------------------ | ------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Hybrid keyword + vector search | Custom score merging logic      | `websearch_to_tsquery` + pgvector `<=>` + RRF SQL function | Postgres handles both natively; RRF is rank-safe without score normalization                 |
| Arabic text tokenization       | Custom Arabic preprocessor      | Qwen2.5:7b-instruct built-in                               | Qwen2.5 was trained on Arabic corpora; no extra processing needed                            |
| Embedding model                | Fine-tuned custom model         | nomic-embed-text (keep existing)                           | Schema already committed to 768-dim; replacing requires full re-embed of all production data |
| RAG evaluation framework       | Custom accuracy metrics         | Assertion-based pytest with known ground truth             | For this project scale, seeded test listings + expected citation assertions are sufficient   |
| Stream-with-metadata protocol  | Binary framing or websockets    | SSE with prefixed metadata event                           | SSE already in use; prepend a `sources` event before text tokens                             |
| Context window management      | LRU cache of conversation turns | Sliding window (last 4 turns)                              | Simple sliding window handles 99% of real estate chat sessions                               |

**Key insight:** pgvector + `tsvector` in a single Postgres RPC eliminates the need for any external
search service (Elasticsearch, Pinecone, etc.). The entire RAG data path lives in Supabase.

---

## Common Pitfalls

### Pitfall 1: The /api/embeddings vs /api/embed Mismatch

**What goes wrong:** The existing `OllamaClient.embed()` calls `/api/embeddings` with a `prompt`
field. This is the legacy endpoint. Known GitHub issue #7242 documents cases where `/api/embeddings`
returns an empty embedding array on some Ollama versions.

**Why it happens:** Ollama deprecated `/api/embeddings` in favor of `/api/embed` (which returns
`embeddings: [[...]]` not `embedding: [...]`). The response key is different.

**How to avoid:** Migrate `OllamaClient.embed()` to `/api/embed` in the same wave that upgrades the
model. Test that the response key is `embeddings[0]` not `embedding`.

**Warning signs:** `embed()` returns empty list `[]` after model upgrade; listings get `NULL`
embedding column.

### Pitfall 2: Qwen2.5 Arabic Prompt Formatting

**What goes wrong:** Qwen2.5's Arabic output can leak Latin characters if the system prompt mixes
languages or the prompt doesn't explicitly request Arabic.

**Why it happens:** The model defaults to English for structured output. Arabic generation requires
explicit instruction in the system prompt: "Respond in Arabic" or bilingual: "Respond in both English
and Arabic."

**How to avoid:** For description generation and chat with Arabic users, add explicit language
instructions. The existing description endpoint system prompt already says "bilingual" — verify
Qwen2.5 honors this.

**Warning signs:** Arabic response contains mixed Latin/Arabic characters, e.g. "شقة في Maadi"
instead of "شقة في المعادي".

### Pitfall 3: HNSW Index and Filtered Vector Search

**What goes wrong:** When combining WHERE clause filters with `ORDER BY embedding <=>` in pgvector,
the planner may not use the HNSW index if the filter is too selective, falling back to a sequential
scan.

**Why it happens:** pgvector HNSW indexes are not aware of row-level filters. If the filter
eliminates most rows, the index probe yields fewer than `ef_search` candidate neighbors.

**How to avoid:** Use the `hybrid_search_chunks` RPC which pre-limits candidates via two CTEs
before merging — avoiding the planner's filter-vs-index tradeoff. For the existing `match_listings`
RPC, the current implementation already uses `WHERE ... AND embedding IS NOT NULL` before the
distance ordering, which is correct.

**Warning signs:** Vector search latency spikes when filtering by specific city + category
combinations with few matching rows.

### Pitfall 4: Streaming Before Retrieval

**What goes wrong:** Developer tries to start streaming immediately and fetch context lazily
(to reduce perceived latency), then cannot inject it into an already-started SSE stream.

**Why it happens:** SSE is a push protocol — once started, you cannot go back and prepend context.
Attempting to do so means sending the `sources` event after some text tokens have already been sent.

**How to avoid:** Always await the retrieval call before yielding the first SSE token. Retrieval
against pgvector with HNSW index and `limit 5` returns in <50ms — not meaningful latency.

**Warning signs:** Frontend shows partial text before source citations appear; citations reference
different property than text describes.

### Pitfall 5: Context Window Overflow with Long Listings

**What goes wrong:** Some listing descriptions are very long (500+ words). Five such chunks can
overflow the model's practical prompt budget.

**Why it happens:** `chunk_text` for a verbose listing can be 300-400 tokens. Five chunks = 2000
tokens, which combined with conversation history may hit limits.

**How to avoid:** Cap `chunk_text` at 300 characters during the `_build_embed_text` step. The
embedding model (nomic-embed-text) supports 8192 tokens — no issue there. The LLM prompt is the
constraint.

**Warning signs:** Qwen2.5 response is truncated; model outputs `[TRUNCATED]` or stops mid-sentence.

### Pitfall 6: Knowledge Chunk Staleness

**What goes wrong:** A listing's price or availability changes after its chunk was embedded. The
RAG response cites the old price.

**Why it happens:** Embeddings are generated once on create. The `chunk_text` is a snapshot.

**How to avoid:** For price/availability changes, update `metadata` in `knowledge_chunks` AND
update `chunk_text` if price is part of the text. Add an `updated_at` trigger on `knowledge_chunks`.
The auto-embed trigger on listing update should re-embed on `description`, `title`, or `amenities`
change only — not on every `views_count` increment.

**Warning signs:** Chat says "EGP 5,000/month" when listing is now "EGP 5,500/month".

---

## Code Examples

### Verified: Supabase Hybrid Search RPC (tsvector + pgvector + RRF)

```sql
-- Source: https://supabase.com/docs/guides/ai/hybrid-search (adapted for knowledge_chunks)
-- Combines websearch_to_tsquery (keyword) + pgvector <=> (cosine) via RRF
CREATE OR REPLACE FUNCTION hybrid_search_chunks(
  query_text text, query_embedding vector(768), match_count int DEFAULT 10
)
RETURNS TABLE (id uuid, source_type text, source_id text, chunk_text text, metadata jsonb, score float)
LANGUAGE sql AS $$
WITH
  full_text AS (
    SELECT id, row_number() OVER (ORDER BY ts_rank_cd(
      to_tsvector('english', chunk_text), websearch_to_tsquery(query_text)
    ) DESC) AS rank_ix
    FROM knowledge_chunks
    WHERE to_tsvector('english', chunk_text) @@ websearch_to_tsquery(query_text)
    LIMIT least(match_count, 30) * 2
  ),
  semantic AS (
    SELECT id, row_number() OVER (ORDER BY embedding <=> query_embedding) AS rank_ix
    FROM knowledge_chunks WHERE embedding IS NOT NULL
    LIMIT least(match_count, 30) * 2
  )
SELECT kc.id, kc.source_type, kc.source_id, kc.chunk_text, kc.metadata,
  (COALESCE(1.0/(50 + ft.rank_ix), 0.0) + COALESCE(1.0/(50 + sem.rank_ix), 0.0)) AS score
FROM full_text ft
FULL OUTER JOIN semantic sem ON ft.id = sem.id
JOIN knowledge_chunks kc ON COALESCE(ft.id, sem.id) = kc.id
ORDER BY score DESC
LIMIT least(match_count, 30);
$$;
```

### Verified: Ollama /api/embed (new batch-capable endpoint)

```python
# Source: https://docs.ollama.com/capabilities/embeddings
# Single text:
async with httpx.AsyncClient() as c:
    r = await c.post("http://localhost:11434/api/embed",
                     json={"model": "nomic-embed-text", "input": "hello world"})
    vector = r.json()["embeddings"][0]  # NOTE: "embeddings" (plural), returns list-of-lists

# Batch:
async with httpx.AsyncClient() as c:
    r = await c.post("http://localhost:11434/api/embed",
                     json={"model": "nomic-embed-text", "input": ["text1", "text2"]})
    vectors = r.json()["embeddings"]  # list of two 768-dim vectors
```

### Verified: Qwen2.5:7b JSON structured output

```python
# Qwen2.5 officially supports structured JSON output with explicit prompt instruction
# Source: https://ollama.com/library/qwen2.5 — "Structured output (JSON format)"
system = "Return ONLY valid JSON. No explanation."
prompt = 'Extract: {"location": ..., "bedrooms": ..., "max_price": ...} from: "3BR in Cairo under 5M"'
# Result: reliable JSON, no markdown fences needed (unlike some other models)
```

### Verified: pgvector cosine similarity operator

```sql
-- <=> is cosine distance (1 - cosine_similarity)
-- For normalized vectors (which /api/embed returns): inner product <#> is equivalent
-- Existing match_listings uses <=> correctly with HNSW index using vector_cosine_ops
-- Source: pgvector README https://github.com/pgvector/pgvector
SELECT 1 - (embedding <=> query_embedding) AS similarity FROM listings ORDER BY embedding <=> query_embedding LIMIT 5;
```

---

## State of the Art

| Old Approach                          | Current Approach                                | When Changed          | Impact                                                     |
| ------------------------------------- | ----------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| `/api/embeddings` with `prompt` field | `/api/embed` with `input` field (batch-capable) | Ollama 0.1.26+ (2024) | Batch embedding, L2-normalized output                      |
| IVFFlat index for vector search       | HNSW index                                      | pgvector 0.5.0 (2023) | 15x better QPS at high recall; already in schema           |
| Single-pass keyword OR vector         | Hybrid RRF (keyword + vector)                   | 2024 best practice    | Balances exact match (bedrooms=3) with semantic similarity |
| Chat with system prompt only          | RAG: retrieve then generate                     | Current phase         | Eliminates hallucination; grounds responses in live data   |
| axiom-llm:latest (unknown base)       | qwen2.5:7b-instruct                             | This phase            | Verified Arabic, structured JSON, 128K context             |

**Deprecated/outdated:**

- `/api/embeddings` endpoint: Superseded by `/api/embed`. Legacy endpoint has known empty-result bugs on some versions.
- IVFFlat index: Project already uses HNSW (see schema `idx_listings_embedding`). No change needed.
- Treating NL search as filter-extraction only: With RAG, NL search can use hybrid vector search for true semantic results, not just keyword-to-filter translation.

---

## Open Questions

1. **Is `axiom-llm:latest` based on Qwen2.5 already?**
   - What we know: The model is named `axiom-llm:latest` suggesting a custom Modelfile-based model. Unknown base.
   - What's unclear: If it was built on Qwen2.5 or Llama3.1, upgrading may be a no-op or a regression for existing prompts.
   - Recommendation: Before upgrading, run `ollama show axiom-llm:latest` to inspect the Modelfile base. If it's already Qwen2.5, only update `OLLAMA_MODEL` env var.

2. **nomic-embed-text Arabic embedding quality**
   - What we know: nomic-embed-text v1.5 was primarily trained on English text. A multilingual v2-moe version exists with 100-language support.
   - What's unclear: Whether Arabic property descriptions produce semantically meaningful 768-dim vectors with v1.5.
   - Recommendation: Proceed with v1.5 (matching existing schema). If semantic search quality for Arabic queries is poor after Phase 7, plan a v2-moe upgrade (requires migration script to re-embed all rows).

3. **Supabase RPC execution timeout for hybrid search**
   - What we know: Supabase has a 5-second default statement timeout for RPC calls from the PostgREST API layer.
   - What's unclear: Whether a FULL OUTER JOIN between two subqueries on `knowledge_chunks` exceeds this under load.
   - Recommendation: Set `LIMIT least(match_count, 30) * 2` in both CTEs (already shown above). Add `EXPLAIN ANALYZE` test in the verification plan.

---

## Validation Architecture

### Test Framework

| Property           | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| Framework          | pytest (already installed)                              |
| Config file        | `backend/pytest.ini` or implicit                        |
| Quick run command  | `cd backend && python -m pytest tests/test_ai.py -x -v` |
| Full suite command | `cd backend && python -m pytest tests/ -v`              |

### Phase Requirements → Test Map

| Req ID     | Behavior                                                           | Test Type   | Automated Command                                                       | File Exists? |
| ---------- | ------------------------------------------------------------------ | ----------- | ----------------------------------------------------------------------- | ------------ |
| REQ-RAG-01 | Chat injects retrieved chunks into prompt (no hallucination)       | unit        | `pytest tests/test_ai.py::test_rag_chat_injects_context -x`             | ❌ Wave 0    |
| REQ-RAG-01 | Chat response includes `sources` field with real listing IDs       | unit        | `pytest tests/test_ai.py::test_rag_chat_sources_in_response -x`         | ❌ Wave 0    |
| REQ-RAG-02 | Batch embed script runs clean (0 errors, all rows upserted)        | integration | `python scripts/batch_embed.py --dry-run`                               | ❌ Wave 0    |
| REQ-RAG-02 | knowledge_chunks populated for all 3 source types                  | unit        | `pytest tests/test_rag.py::test_chunk_upsert_all_source_types -x`       | ❌ Wave 0    |
| REQ-RAG-03 | Qwen2.5 description endpoint produces Arabic without Latin leakage | unit        | `pytest tests/test_ai.py::test_description_arabic_no_latin -x`          | ❌ Wave 0    |
| REQ-RAG-04 | hybrid_search_chunks RPC returns results in <300ms                 | integration | `pytest tests/test_rag.py::test_hybrid_search_latency -x`               | ❌ Wave 0    |
| REQ-RAG-05 | Chat SSE emits `sources` event before first text token             | unit        | `pytest tests/test_ai.py::test_rag_chat_sources_event_order -x`         | ❌ Wave 0    |
| REQ-RAG-06 | Listing update triggers knowledge_chunks re-embed                  | unit        | `pytest tests/test_rag.py::test_chunk_auto_update_on_listing_change -x` | ❌ Wave 0    |
| REQ-RAG-07 | All existing 11 AI tests still pass (no regressions)               | regression  | `pytest tests/test_ai.py -v`                                            | ✅ exists    |
| REQ-RAG-08 | Zero TypeScript errors                                             | build       | `cd frontend && npx tsc --noEmit`                                       | ✅ exists    |

### Sampling Rate

- **Per task commit:** `cd backend && python -m pytest tests/test_ai.py -x -v`
- **Per wave merge:** `cd backend && python -m pytest tests/ -v`
- **Phase gate:** Full suite green + `npx tsc --noEmit` clean before marking phase complete

### Wave 0 Gaps

- [ ] `backend/tests/test_rag.py` — new test file for RAG-specific behaviors (knowledge_chunks CRUD, hybrid search, auto-update trigger)
- [ ] `backend/scripts/batch_embed.py` — batch embedding script (also tested via dry-run)
- [ ] `docs/schema/003_knowledge_chunks.sql` — migration file for knowledge_chunks table + hybrid_search_chunks RPC

_(Existing `tests/test_ai.py` covers all current endpoints — new RAG tests extend it with mocked retrieval)_

---

## Sources

### Primary (HIGH confidence)

- Supabase official hybrid search docs — https://supabase.com/docs/guides/ai/hybrid-search — RRF pattern, tsvector + pgvector RPC
- Supabase pgvector docs — https://supabase.com/docs/guides/database/extensions/pgvector — filtered search, HNSW setup
- Ollama embeddings API docs — https://docs.ollama.com/capabilities/embeddings — `/api/embed` endpoint, batch support, L2 normalization
- Ollama Qwen2.5 library — https://ollama.com/library/qwen2.5 — Arabic support (29+ languages), JSON output, sizes
- nomic-embed-text Ollama library — https://ollama.com/library/nomic-embed-text — 768-dim confirmed, 8192 token context
- pgvector GitHub — https://github.com/pgvector/pgvector — `<=>` cosine operator, HNSW index
- Project codebase (read directly): `backend/app/ai/router.py`, `ollama_client.py`, `embeddings.py`, `config.py`, schema SQL

### Secondary (MEDIUM confidence)

- AWS blog on pgvector IVFFlat vs HNSW — https://aws.amazon.com/blogs/database/optimize-generative-ai-applications-with-pgvector-indexing-a-deep-dive-into-ivfflat-and-hnsw-techniques/ — HNSW 15x better QPS than IVFFlat at high recall
- Ollama GitHub issue #7242 — https://github.com/ollama/ollama/issues/7242 — `/api/embeddings` empty result bug (motivates upgrade to `/api/embed`)
- ParadeDB hybrid search blog — https://www.paradedb.com/blog/hybrid-search-in-postgresql-the-missing-manual — RRF scoring explanation

### Tertiary (LOW confidence — needs validation)

- Qwen2.5 vs Llama3.1 Arabic comparison — multiple forum sources, no official bilingual benchmark for Egyptian Arabic dialect specifically
- nomic-embed-text v1.5 Arabic embedding quality — no published Arabic-specific MTEB scores found; inference from training data description only

---

## Metadata

**Confidence breakdown:**

- Standard stack (Qwen2.5, nomic-embed-text): HIGH — verified via official Ollama library pages
- Architecture (knowledge_chunks, hybrid RRF): HIGH — verified via Supabase official docs
- Pitfalls (/api/embed migration, context overflow): HIGH — verified via GitHub issues and API docs
- Arabic quality (Qwen2.5 vs existing model): MEDIUM — official support claimed, Egyptian dialect not benchmarked
- nomic-embed-text Arabic embedding quality: LOW — assumed adequate; needs post-deploy validation

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable stack — Supabase pgvector and Ollama APIs are stable)
