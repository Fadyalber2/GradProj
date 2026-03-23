---
phase: 07-ai-rag-enhancement
plan: "04"
subsystem: backend-ai
tags: [rag, chat, nl-search, sse, citations, semantic-search]
dependency_graph:
  requires: ["07-01", "07-02", "07-03"]
  provides: ["rag-augmented-chat", "semantic-nl-search"]
  affects: ["backend/app/ai/router.py", "backend/tests/test_ai.py"]
tech_stack:
  added: []
  patterns: ["RAG pre-retrieval before SSE stream", "semantic primary + keyword fallback search", "citations SSE event"]
key_files:
  modified:
    - backend/app/ai/router.py
    - backend/tests/test_ai.py
decisions:
  - "Conversation history trimmed from 6 to 4 turns — reduces context window pressure with RAG context now included"
  - "Citations SSE event emitted only when citations exist (empty list skipped) — avoids unnecessary client parsing"
  - "Semantic search threshold is 3+ chunks — below this, LLM filter extraction provides better precision"
  - "_async_iter defined as module-level async generator in test_ai.py for reuse across RAG test functions"
metrics:
  duration_seconds: 195
  tasks_completed: 2
  files_modified: 2
  completed_date: "2026-03-23"
---

# Phase 7 Plan 04: RAG-Augmented Endpoints Summary

**One-liner:** Chat endpoint gets RAG pre-retrieval with grounded system prompt and citations SSE event; NL search uses semantic chunks as primary path with LLM filter extraction as fallback.

## What Was Built

### Task 1: RAG-Augmented Chat and NL Search (router.py)

**Chat endpoint** (`POST /api/ai/chat`):
- Imports `rag_retriever` singleton from `app.ai.rag`
- Before starting the SSE stream, calls `rag_retriever.retrieve(body.message, k=5)` to fetch relevant chunks
- Builds a grounded system prompt using `build_context()` when chunks exist; falls back to generic prompt when empty
- Grounded prompt instructs LLM to cite listings as `[listing:UUID]` and never invent property IDs
- After streaming all tokens, emits `data: {"citations": [...]}` SSE event before `data: [DONE]`
- Conversation history trimmed from 6 to 4 turns (reduced to leave room for RAG context)

**NL Search endpoint** (`POST /api/ai/search`):
- Primary path: `rag_retriever.retrieve(body.query, source_type="listing", k=body.limit)`
- If 3+ chunks returned: deduplicate source_ids, fetch full listing records by ID, return with `retrieval_method: "semantic"`
- If fewer than 3 chunks: fall through to existing LLM filter extraction path, return with `retrieval_method: "keyword"`
- Both paths include `parsed_filters` key in response for API consistency

### Task 2: RAG Integration Tests (test_ai.py)

Four new tests appended (no existing tests modified):

| Test | What it verifies |
|------|-----------------|
| `test_rag_chat_with_context` | Citations SSE event emitted and contains source_id when chunks retrieved |
| `test_rag_chat_no_context` | Stream completes with `[DONE]` normally when no chunks |
| `test_rag_search_semantic_primary` | `retrieval_method="semantic"` when 3+ chunks returned |
| `test_rag_search_fallback` | `retrieval_method="keyword"` and `parsed_filters` present with <3 chunks |

All tests use `patch.object(ai_router.rag_retriever, ...)` for clean mock injection without touching the singleton.

## Test Results

- AI tests: 21/21 pass (was 17 — 4 new RAG tests added)
- Full backend suite: 90/90 pass (no regressions)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `99315e4` | feat(07-04): RAG-augmented chat and NL search endpoints |
| 2 | `fb4b1c3` | test(07-04): add RAG integration tests for chat and NL search |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `backend/app/ai/router.py` — exists, contains `rag_retriever` import and both endpoint rewrites
- `backend/tests/test_ai.py` — exists, contains 4 new RAG test functions
- Commit `99315e4` — verified via git log
- Commit `fb4b1c3` — verified via git log
- 90/90 backend tests pass
