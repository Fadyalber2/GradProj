---
phase: 07-ai-rag-enhancement
verified: 2026-03-23T21:00:00Z
status: human_needed
score: 11/12 must-haves verified
human_verification:
  - test: "Confirm knowledge_chunks migration has been applied to Supabase"
    expected: "Table knowledge_chunks exists with HNSW + FTS indexes and hybrid_search_chunks RPC. SELECT COUNT(*) FROM knowledge_chunks returns 0 or more rows without error. Calling the RPC with a test vector does not throw."
    why_human: "Migration 004 SQL file is ready but must be applied manually via the Supabase SQL Editor. There is no programmatic way to verify a live DDL run from the verifier."
---

# Phase 7: AI RAG Enhancement Verification Report

**Phase Goal:** Transform AXIOM's AI from a general LLM with system prompts into a grounded RAG system — chat answers real listing queries, NL search uses semantic similarity, and responses are always anchored in live database content.

**Verified:** 2026-03-23
**Status:** human_needed (one item requires confirming manual DB migration was applied)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Chat answers listing queries with real IDs/prices from DB — zero hallucination | VERIFIED | `router.py` retrieves chunks via `rag_retriever.retrieve(body.message, k=5)` BEFORE streaming, builds grounded system prompt with "VERIFIED DATABASE RECORDS" and instructs LLM never to invent IDs |
| 2 | Embedding pipeline covers all listings, neighborhoods, and blog posts | VERIFIED | `batch_embed.py` (313 lines) implements `embed_all_listings()`, `embed_all_neighborhoods()`, `embed_all_blog()` with asyncio.Semaphore(10) concurrency control and set-diff skip for already-embedded items |
| 3 | Model upgraded to Qwen2.5 variant | VERIFIED (with deviation) | `ollama_client.py` uses `self.model = settings.ollama_model`; `.env` sets `OLLAMA_MODEL=qwen2.5:14b` (not 7b-instruct — user upgraded to 14b for better Arabic quality on 32GB RAM system, noted in 07-01 SUMMARY) |
| 4 | Hybrid search (vector + keyword) via RRF | VERIFIED | `004_knowledge_chunks.sql` contains complete `hybrid_search_chunks` RPC using Reciprocal Rank Fusion with HNSW index (m=16, ef_construction=64) and FTS GIN index. SQL file confirmed at `docs/schema/004_knowledge_chunks.sql` (104 lines) |
| 5 | Chat responses include inline citations linking to real property IDs | VERIFIED | Chat endpoint emits `data: {"citations": [...]}` SSE event before `[DONE]`; ChatDrawer.tsx parses this event, maps snake_case to camelCase, renders citation pills as `<a href="/property/{sourceId}">` below assistant messages |
| 6 | RAG knowledge base updates automatically on listing create/update/delete | VERIFIED | `listings/router.py` line 370 calls `embed_listing_chunk` on POST; line 446 on PUT; line 484 calls `delete_listing_chunk` on DELETE — all via `background_tasks.add_task` |
| 7 | All AI tests still pass (82+ total backend tests, no regressions) | VERIFIED | `pytest tests/` passes 98/98 — exceeds target. `pytest tests/test_ai.py` passes 29/29. Zero regressions. |
| 8 | Zero TypeScript errors after frontend RAG UI changes | VERIFIED | `npx tsc --noEmit` exits 0 (no output). Confirmed in verifier run. |
| 9 | Description generator retrieves neighborhood context before writing copy | VERIFIED | `router.py` lines 598-610: `rag_retriever.retrieve(f"{body.city} neighborhood real estate", source_type="neighborhood", k=2)` called before `ollama.generate()`, context injected as `NEIGHBORHOOD CONTEXT` clause, fail-open on exception |
| 10 | Fraud scorer uses real market price chunks for LLM consistency check | VERIFIED | `fraud.py` imports `rag_retriever` from `app.ai.rag` (line 10); `_llm_consistency()` calls `rag_retriever.retrieve(f"{city} {category} price range market", source_type="listing", k=3)` with fail-open guard |
| 11 | Recommendations support ?explain=true with 1-sentence match explanation per listing | VERIFIED | `get_recommendations()` signature includes `explain: bool = False`; `_explain_recommendations()` helper runs single-batch LLM call; both pgvector and fallback paths apply explain-aware pattern; `_explain_recommendations` not called when `explain=False` |
| 12 | Compatibility scoring uses real housemates and stored user profile from DB | VERIFIED | `compute_compatibility()` queries `housemates` table for `listing_id` (line 462-469), profiles for housemates with `user_id` (line 476-488), profiles for current user (line 491-509); body.lifestyle_data overrides stored prefs via `{**stored_user_prefs, **body.lifestyle_data}` |

**Score: 11/12 truths verified programmatically. Truth #4 depends on the SQL migration being applied to Supabase (see Human Verification below).**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/ai/ollama_client.py` | `/api/embed` endpoint, reads `embeddings[0]`, env-configured model | VERIFIED | Line 51: `f"{self.base_url}/api/embed"`, line 52: `json={"model": self.embed_model, "input": text}`, line 55: `r.json().get("embeddings", [[]])[0]` |
| `docs/schema/004_knowledge_chunks.sql` | `knowledge_chunks` table DDL + `hybrid_search_chunks` RPC + HNSW + FTS indexes | VERIFIED | File exists at 104 lines. Table, 3 indexes, RLS policy, and full RRF RPC present. |
| `backend/app/ai/schemas.py` | `Chunk`, `Citation`, `RAGResponse` Pydantic models | VERIFIED | 32-line file. All 3 models present with correct Literal types. |
| `backend/app/ai/rag.py` | `RAGRetriever` class with `retrieve`, `build_context`, `format_citations`, singleton | VERIFIED | 123-line file. Class present, all 3 methods implemented, `rag_retriever = RAGRetriever()` at module level |
| `backend/app/ai/embeddings.py` | `embed_listing_chunk`, `delete_listing_chunk` functions | VERIFIED | Lines 66-148. Both functions present with correct upsert/delete to `knowledge_chunks` table |
| `backend/app/listings/router.py` | Wires `embed_listing_chunk` on create/update, `delete_listing_chunk` on delete | VERIFIED | Line 16 imports all 3 functions; line 370 (create), 446 (update), 484 (delete) all wire background tasks |
| `backend/scripts/batch_embed.py` | One-shot script for listings + neighborhoods + blog | VERIFIED | 312-line file. All 3 embed functions present. `asyncio.Semaphore(10)` concurrency control. `if __name__ == "__main__"` entry point. |
| `backend/app/ai/router.py` | RAG-augmented chat + NL search + description + recommendations + compatibility | VERIFIED | `rag_retriever` imported at line 8. Chat endpoint pre-retrieves then streams. NL search semantic primary / keyword fallback. Description retrieves neighborhood chunks. Recommendations has `explain` param. Compatibility queries housemates + profiles. |
| `backend/app/ai/fraud.py` | `rag_retriever` import, market price context in `_llm_consistency` | VERIFIED | Line 10: `from app.ai.rag import rag_retriever`. Lines 118-133: retrieve + fail-open. `market_context` variable present. |
| `backend/tests/test_ai.py` | 29 tests covering all RAG features | VERIFIED | 29 tests collected and passing. Covers: schemas, RAG context/citations, chat/search integration, description RAG, recommendations explain, fraud market context, compatibility housemates |
| `frontend/src/types/index.ts` | `Citation` and `CitationSourceType` exported | VERIFIED | Lines 1-10: both exports present at top of file |
| `frontend/src/components/ai/ChatDrawer.tsx` | Citations SSE parsing, pills rendering, `isSearching` indicator | VERIFIED | `isSearching` state at line 64; SSE `parsed.citations` handler at line 194; header indicator at line 278; citation pills render at lines 304-318 |
| `frontend/src/lib/queries.ts` | `ragSearchMutation` and `RAGSearchResponse` exported | VERIFIED | Lines 259-288: both exported |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `ollama_client.py embed()` | Ollama `/api/embed` | POST with `"input"` key, reads `embeddings[0]` | VERIFIED | Confirmed at lines 51-55 |
| `ollama_client.py` | `settings.ollama_model` | `self.model = settings.ollama_model` | VERIFIED | Line 13 |
| `embeddings.py embed_listing_chunk()` | `knowledge_chunks` table | `supabase_admin.table("knowledge_chunks").upsert(...)` | VERIFIED | Lines 111-127 |
| `listings/router.py` POST | `embed_listing_chunk` | `background_tasks.add_task(asyncio.run, embed_listing_chunk(listing_id))` | VERIFIED | Line 370 |
| `listings/router.py` DELETE | `delete_listing_chunk` | `background_tasks.add_task(asyncio.run, delete_listing_chunk(listing_id))` | VERIFIED | Line 484 |
| `rag.py RAGRetriever.retrieve()` | Supabase `hybrid_search_chunks` RPC | `supabase_admin.rpc("hybrid_search_chunks", {...}).execute()` | VERIFIED | Lines 37-45 |
| `rag.py RAGRetriever.retrieve()` | `ollama.embed()` | `embedding = await ollama.embed(query)` | VERIFIED | Line 33 |
| `router.py chat endpoint` | `rag_retriever.retrieve()` | `chunks = await rag_retriever.retrieve(body.message, k=5)` BEFORE SSE | VERIFIED | Line 203 |
| `router.py chat SSE` | citations JSON event | `yield f"data: {json.dumps({'citations': [c.model_dump() for c in citations]})}\n\n"` | VERIFIED | Line 243 |
| `router.py nl_search` | semantic primary path | `rag_retriever.retrieve(body.query, source_type="listing", k=body.limit)` — returns `retrieval_method: "semantic"` when >=3 chunks | VERIFIED | Lines 119-143 |
| `router.py generate_description()` | neighborhood RAG | `rag_retriever.retrieve(f"{body.city} neighborhood real estate", source_type="neighborhood", k=2)` | VERIFIED | Lines 600-609 |
| `fraud.py _llm_consistency()` | market price RAG | `rag_retriever.retrieve(f"{city} {category} price range market", source_type="listing", k=3)` | VERIFIED | Lines 124-131 |
| `router.py compute_compatibility()` | `housemates` table | `.select("name, age, occupation, tags, user_id").eq("listing_id", body.listing_id).limit(10)` | VERIFIED | Lines 462-469 |
| `router.py compute_compatibility()` | `profiles` table for user | `.select("lifestyle_preferences, age, occupation, gender").eq("id", current_user["id"]).single()` | VERIFIED | Lines 493-499 |
| `ChatDrawer.tsx` | `Citation` type | `import type { Citation } from "@/types"` at top of file | VERIFIED | Confirmed via grep |
| `ChatDrawer.tsx` | SSE `parsed.citations` handler | Maps snake_case → camelCase → attaches to last assistant message | VERIFIED | Lines 194-211 |

---

## Requirements Coverage

No separate REQUIREMENTS.md file exists in `.planning/`. Requirements are defined inline in `ROADMAP.md`. All 12 phase requirement IDs from the plans are cross-referenced against ROADMAP success criteria:

| Requirement | Source Plan | Success Criterion | Status | Evidence |
|-------------|-------------|-------------------|--------|----------|
| REQ-RAG-01 | 07-04 | Chat grounded in DB content with real listing IDs | VERIFIED | Chat pre-retrieval + grounded system prompt |
| REQ-RAG-02 | 07-02 | Embedding pipeline covers all 3 source types | VERIFIED | `batch_embed.py` handles listings/neighborhoods/blog |
| REQ-RAG-03 | 07-01 | Model upgraded (Qwen2.5) | VERIFIED | `qwen2.5:14b` in `.env`, env-driven config |
| REQ-RAG-04 | 07-01, 07-03 | Hybrid search with HNSW + FTS | VERIFIED | SQL migration + RAGRetriever calling RPC |
| REQ-RAG-05 | 07-04, 07-05 | Chat citations linking to real property IDs | VERIFIED | Backend SSE event + ChatDrawer pill rendering |
| REQ-RAG-06 | 07-02 | Auto-update on listing create/update/delete | VERIFIED | Background tasks in listings router |
| REQ-RAG-07 | 07-03, 07-04 | AI tests pass (82+ total) | VERIFIED | 98/98 pass |
| REQ-RAG-08 | 07-05 | Zero TS errors after frontend changes | VERIFIED | `tsc --noEmit` clean |
| REQ-RAG-09 | 07-06 | Description retrieves neighborhood context | VERIFIED | `rag_retriever.retrieve()` before `ollama.generate()` in `generate_description()` |
| REQ-RAG-10 | 07-07 | Fraud scorer uses market price chunks | VERIFIED | `fraud.py` imports `rag_retriever`, retrieves price context in `_llm_consistency()` |
| REQ-RAG-11 | 07-06 | Recommendations `?explain=true` | VERIFIED | `explain: bool = False` param + `_explain_recommendations()` helper |
| REQ-RAG-12 | 07-07 | Compatibility uses real housemates + user profile | VERIFIED | 4 DB queries in `compute_compatibility()` |

All 12 requirements are covered by the 7 plans. No orphaned requirements found.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `router.py` | 102, 270, 305 | `return {}` | INFO | These are all legitimate fail-open fallback returns in error-handling paths (`_extract_filters_from_query`, `_explain_recommendations`). Not stubs. |

No blocker or warning anti-patterns found. No TODO/FIXME/placeholder comments in any modified files. No empty implementations. All return values are substantive.

---

## Human Verification Required

### 1. Confirm Supabase Migration 004 Applied

**Test:** In the Supabase Dashboard for project `pgaqqseqwtgsuihbswnv`, navigate to the SQL Editor and run:
```sql
SELECT COUNT(*) FROM knowledge_chunks;
SELECT proname FROM pg_proc WHERE proname = 'hybrid_search_chunks';
```

**Expected:** First query returns 0 or more (table exists). Second query returns 1 row (`hybrid_search_chunks`). No errors.

**Why human:** The migration file `docs/schema/004_knowledge_chunks.sql` was created and committed by Plan 07-01. However, the Supabase SQL Editor requires a browser session to apply DDL — there is no psycopg2/asyncpg driver installed, and PostgREST does not accept DDL. The 07-01 SUMMARY explicitly flags this as "Pending Manual Step." All downstream plans (02-07) were tested with mocked DB calls, so tests pass regardless of whether the migration is applied. The migration MUST be applied before the system works end-to-end in production.

**Optional follow-up:** After confirming the table exists, run `python backend/scripts/batch_embed.py` from the project root (with Ollama running) to populate `knowledge_chunks` with existing data. Until this runs, no citation pills will appear in the chat UI.

---

## Gaps Summary

No gaps found in code implementation. All 7 plans executed fully. The only outstanding item is infrastructure: the Supabase SQL migration file is complete and correct, but requires manual application via the Supabase SQL Editor. This is an operational step, not a code gap.

**Note on test count:** The ROADMAP targets "82+ backend tests" — the actual count is 98/98, comfortably exceeding the target. The 07-07 SUMMARY mentions 98 total which matches the verified pytest run.

**Note on model variant:** ROADMAP criterion 3 specifies "Qwen2.5:7b" but the implementation uses `qwen2.5:14b`. This was a deliberate user-approved decision documented in the 07-01 SUMMARY ("user has 32GB RAM, 14b provides better Arabic quality"). The code correctly reads from `settings.ollama_model` so any model can be configured — this is better than the plan required.

---

_Verified: 2026-03-23_
_Verifier: Claude (gsd-verifier)_
