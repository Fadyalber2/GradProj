---
phase: 07-ai-rag-enhancement
plan: "02"
subsystem: api
tags: [ollama, embeddings, rag, knowledge_chunks, batch_embed, background_tasks]

# Dependency graph
requires:
  - phase: 07-ai-rag-enhancement/07-01
    provides: knowledge_chunks table with source_type/source_id/chunk_text/embedding/metadata schema

provides:
  - embed_listing_chunk() and delete_listing_chunk() in app/ai/embeddings.py
  - Auto-embed on listing create/update, auto-delete on listing soft-delete via BackgroundTasks
  - backend/scripts/batch_embed.py — one-shot population of knowledge_chunks for all three source types

affects:
  - 07-ai-rag-enhancement/07-03 (RAG chat relies on populated knowledge_chunks)
  - 07-ai-rag-enhancement/07-04 (RAG recommendations relies on knowledge_chunks)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "embed_listing_chunk uses upsert with on_conflict='source_type,source_id' for idempotent re-embedding"
    - "batch_embed.py uses asyncio.Semaphore(10) for concurrency control + asyncio.as_completed for streaming progress"
    - "Router PUT/DELETE handlers gain BackgroundTasks param solely for RAG hooks — no change to response behavior"

key-files:
  created:
    - backend/scripts/batch_embed.py
  modified:
    - backend/app/ai/embeddings.py
    - backend/app/listings/router.py

key-decisions:
  - "embed_listing() kept unchanged — still writes to listings.embedding for vector similarity recommendations"
  - "embed_listing_chunk() uses a richer _build_chunk_text() format (natural language) vs _build_embed_text() (structured); both exist for different retrieval modes"
  - "batch_embed.py skips already-embedded listings via set diff (not re-embedding all) to allow incremental runs"
  - "Blog embed falls back to fetching all posts if status column query fails — defensive pattern for schema variation"
  - "logging.warning() used for per-item failures so a single bad row doesn't abort the batch"

requirements-completed:
  - REQ-RAG-02
  - REQ-RAG-06

# Metrics
duration: 12min
completed: 2026-03-22
---

# Phase 7 Plan 02: RAG Embedding Pipeline Summary

**knowledge_chunks population pipeline: embed_listing_chunk/delete_listing_chunk in embeddings.py, auto-wired on listing create/update/delete, plus batch_embed.py one-shot script covering listings + neighborhoods + blog with concurrency control**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-22T20:50:42Z
- **Completed:** 2026-03-22T21:02:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created)

## Accomplishments

- Added `embed_listing_chunk()` to `embeddings.py` — fetches listing, builds natural-language chunk text, generates 768-dim embedding via Ollama `/api/embed`, upserts to `knowledge_chunks` with structured metadata (city, category, price, bedrooms, property_type)
- Added `delete_listing_chunk()` — removes a listing's row from `knowledge_chunks` when the listing is soft-deleted, preventing stale RAG results
- Wired both functions as `BackgroundTasks` in the listings router: create calls `embed_listing_chunk`, update re-embeds the chunk, delete calls `delete_listing_chunk`
- Created `backend/scripts/batch_embed.py` with `embed_all_listings()` (skips already-embedded), `embed_all_neighborhoods()`, and `embed_all_blog()` — each guarded with `asyncio.Semaphore(10)` for concurrency control

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend embeddings.py with embed_listing_chunk() for knowledge_chunks** - `57505f2` (feat)
2. **Task 2: Wire auto-embed hooks into listings router + create batch_embed.py** - `eee22fc` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `backend/app/ai/embeddings.py` - Added `embed_listing_chunk()`, `delete_listing_chunk()`, and `_build_chunk_text()` helper
- `backend/app/listings/router.py` - Added BackgroundTasks import for PUT/DELETE handlers; wired all three embed hooks
- `backend/scripts/batch_embed.py` - New one-shot batch embedding script for listings, neighborhoods, and blog posts

## Decisions Made

- `embed_listing()` left completely unchanged — it writes to `listings.embedding` for vector similarity in the recommendations endpoint. The two functions serve different retrieval modes and must coexist.
- `_build_chunk_text()` uses a natural-language sentence format ("3 bed, 2 bath, 90 sqm. Price: 5000 EGP.") rather than the keyword format of `_build_embed_text()` — better match quality for conversational RAG queries.
- `batch_embed.py` computes a set diff between all active listing IDs and already-embedded IDs to allow incremental re-runs without re-embedding unchanged listings.
- Blog embedding falls back to fetching all posts if the `status='published'` query throws (defensive against schema variation between environments).

## Deviations from Plan

None - plan executed exactly as written. The PUT endpoint did not have `BackgroundTasks` as the plan anticipated — this was added as specified.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The `batch_embed.py` script requires the `knowledge_chunks` table (from Plan 01 migration) and a running Ollama instance before it can run.

## Next Phase Readiness

- Plans 03 and 04 can now query `knowledge_chunks` for RAG retrieval — table will be populated as listings are created/updated, and the batch script can seed existing data once the migration is applied
- All 78 backend tests still pass — no regressions

## Self-Check: PASSED

- FOUND: backend/app/ai/embeddings.py
- FOUND: backend/scripts/batch_embed.py
- FOUND: .planning/phases/07-ai-rag-enhancement/07-02-SUMMARY.md
- FOUND: commit 57505f2 (Task 1)
- FOUND: commit eee22fc (Task 2)

---
*Phase: 07-ai-rag-enhancement*
*Completed: 2026-03-22*
