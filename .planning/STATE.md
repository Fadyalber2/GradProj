---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Completed 07-ai-rag-enhancement/07-05-PLAN.md (awaiting human-verify checkpoint)
last_updated: "2026-03-23T19:29:27.501Z"
progress:
  total_phases: 8
  completed_phases: 4
  total_plans: 24
  completed_plans: 13
---

# AXIOM V2 — GSD State

## Current Position

- **Active phase:** Phase 7 — AI RAG Enhancement (Plan 5/7 — awaiting human-verify checkpoint)
- **Last completed:** Phase 7 Plan 05 — RAG Frontend Citation UI (2026-03-23)
- **Next action:** User approves citation UI checkpoint → Phase 7 fully complete. Then execute Phase 5.5 (Payment Integration) or Phase 6 (Hardening)
- **Stopped At:** Completed 07-ai-rag-enhancement/07-05-PLAN.md (awaiting human-verify checkpoint)

## Project Health

| Check | Status |
|---|---|
| Backend tests | 98/98 ✅ (07-07 adds 4 tests: fraud market context, compatibility housemates/profile) |
| TypeScript errors | 0 ✅ |
| Frontend wired to backend | Yes ✅ |
| DB schema live in Supabase | 13 tables ✅ (knowledge_chunks pending manual migration) |

## Key Context

- Supabase project: `pgaqqseqwtgsuihbswnv` (eu-west-1)
- Backend path: `G:\AI\AXIOM-V2\backend\`
- Frontend path: `G:\AI\AXIOM-V2\frontend\`
- JWT: Supabase signs with ES256 (ECDSA P-256); backend fetches JWKS at startup with HS256 fallback

## Session Log

| Date | Action |
|---|---|
| 2026-03-21 | GSD planning initialized for this project. Phases 5.5 and 6 are pending. |
| 2026-03-21 | Created retroactive plans for Phases 1–4 (gap-fill pass). 8 PLAN files written. |
| 2026-03-21 | Executed 01-02-PLAN.md (Frontend Auth Wiring). Added serverFetch to api.ts and OAuth store methods. Zero TS errors. |
| 2026-03-21 | Executed 01-01-PLAN.md (Backend Auth). Gap-fill pass — all code existed. 7 tasks committed, 8/8 auth tests pass. |
| 2026-03-21 | Executed 02-01-PLAN.md (Backend Listings). Gap-fill pass — code existed, added 10 missing tests. 8 tasks committed, 20/20 listing tests, 73/73 total. |
| 2026-03-21 | Executed 02-02-PLAN.md (Frontend Listings UI). Gap-fill pass — most code existed. Added ApiListingBrief/ApiListingDetail aliases, listing CRUD mutations, delete action in MyListings. 0 TS errors. |
| 2026-03-21 | Executed 03-01-PLAN.md (Backend Messaging). Gap-fill pass — all code existed except test_dashboard_returns_structure. Added missing test. 5 tasks committed. 74/74 tests pass. |
| 2026-03-21 | Executed 03-02-PLAN.md (Frontend Messaging UI). Gap-fill pass — all 17 components existed. Fixed 3 gaps: DashboardStats Framer Motion animation, RecentMessages deep-link navigation, Messages URL param pre-selection. 0 TS errors. |
| 2026-03-22 | Executed 07-01-PLAN.md (RAG Infrastructure). Migrated embed() to /api/embed, set OLLAMA_MODEL=qwen2.5:14b, created 004_knowledge_chunks.sql with HNSW+FTS hybrid search RPC. 78/78 tests pass. |
| 2026-03-22 | Executed 07-02-PLAN.md (RAG Embedding Pipeline). Added embed_listing_chunk/delete_listing_chunk to embeddings.py. Wired auto-embed hooks on listing create/update/delete. Created batch_embed.py for all three source types. 78/78 tests pass. |
| 2026-03-23 | Executed 07-03-PLAN.md (RAG Retrieval Module). Created schemas.py (Chunk/Citation/RAGResponse) and rag.py (RAGRetriever with retrieve/build_context/format_citations + singleton). 8 new unit tests. 86/86 tests pass. |
| 2026-03-23 | Executed 07-04-PLAN.md (RAG-Augmented Endpoints). Rewrote chat endpoint with RAG pre-retrieval, grounded system prompt, citations SSE event. Rewrote NL search with semantic primary (3+ chunks) + keyword fallback. 4 new integration tests. 90/90 tests pass. |
| 2026-03-23 | Executed 07-06-PLAN.md (RAG-Enriched Description + Explainable Recommendations). Injected neighborhood RAG context into generate_description() system prompt (600 char cap, fail-open). Added _explain_recommendations() helper + explain: bool = False param to get_recommendations(). 4 new tests. 94/94 tests pass. |
| 2026-03-23 | Executed 07-07-PLAN.md (Market-Aware Fraud + Housemate-Enriched Compatibility). Added rag_retriever import + market context injection to _llm_consistency() in fraud.py. Enriched compute_compatibility() with housemates DB query + stored user profile merge. 4 new tests. 98/98 tests pass. |
| 2026-03-23 | Executed 07-05-PLAN.md (RAG Frontend Citation UI). Added Citation/CitationSourceType types, extended ChatMessageData with citations, added isSearching indicator to ChatDrawer, citation pill rendering, ragSearchMutation. Zero TS errors. Awaiting human-verify checkpoint. |

## Key Decisions

- AuthUser uses snake_case fields (full_name, avatar_url) matching backend Pydantic schema — not camelCase
- supabase.ts stays on @supabase/supabase-js createClient (not @supabase/ssr) — @supabase/ssr not installed, existing works
- serverFetch uses Next.js `next.revalidate` for ISR (60s default), 8s timeout via AbortController
- OAuth providers (Google, Facebook) accessible both via OAuthButton component and authStore.loginWithGoogle/loginWithFacebook
- Fraud score < 0.4 auto-approves listing to active; score >= 0.4 keeps pending for manual review
- embed_listing and score_listing run as BackgroundTasks — never block listing creation response
- LLM fraud check returns 0.0 when Ollama is unreachable — fail-open design throughout AI pipeline
- Find Homes page implemented as client component (not server) — necessary for live filter state + AI search toggle
- ApiListingBrief/ApiListingDetail are type aliases to ListingBrief/ListingDetailWithSimilar — no duplication
- Conversation analytics computed from listings already in memory — no extra DB query for views/active/pending counts
- get_user_conversations uses Supabase RPC; status+initiated_by fetched via single .in_() query after RPC call
- Route ordering critical: block/accept/reject before /{conversation_id}; /read-all before /{id}/read in notifications
- Query naming uses object-spread pattern (messagesQueries.conversations()) not hook-style names — consistent with full codebase
- Messages page reads ?conversation=<id> URL param to pre-select conversation (for deep-linking from dashboard)
- OLLAMA_MODEL=qwen2.5:14b chosen over 7b-instruct — user has 32GB RAM, 14b provides better Arabic language quality
- embed() uses /api/embed with "input" key + reads embeddings[0] (Ollama v0.5+ API; old /api/embeddings deprecated)
- hybrid_search_chunks RPC uses RRF with configurable weights — enables tuning FTS vs semantic balance per use case
- Migration 004 requires manual application via Supabase SQL Editor (no psycopg2/asyncpg installed in project)
- embed_listing() and embed_listing_chunk() coexist: former writes listings.embedding for recommendations, latter writes knowledge_chunks for RAG
- batch_embed.py uses set diff to skip already-embedded listings — safe for incremental re-runs
- Blog embedding falls back to fetching all posts if status column query fails (defensive against schema variation)
- RAGRetriever is a class (not module functions) to enable easy mock injection in tests
- retrieve() never raises — silently returns [] on embed failure or RPC exception (fail-open consistent with AI pipeline)
- Citation URL scheme: /property/{id} for listings, /find-homes?location={name} for neighborhoods, /blog/{id} for blog
- rag_retriever singleton exported at module level for clean import in router.py
- Conversation history trimmed from 6 to 4 turns in chat endpoint — leaves room for RAG context in LLM window
- Citations SSE event skipped when citations list is empty — avoids unnecessary client-side parsing overhead
- Semantic search threshold is 3+ chunks — below this LLM filter extraction provides better precision for specific queries
- _async_iter defined at module level in test_ai.py — reusable async generator mock helper for SSE endpoint tests
- _explain_recommendations() is a module-level async helper (not a method) — enables clean patch.object(ai_router, "_explain_recommendations") in tests
- neighborhood context capped at 600 chars in generate_description() — avoids bloating qwen2.5:14b prompt window beyond what it handles well
- ref query in get_recommendations() extended to include id, title, location — extra fields cost nothing at query time and enable meaningful fav_summary for explain LLM call
- patch.object used for ollama singleton in fraud tests — direct attribute assignment (fraud_module.ollama.health = ...) contaminates embed_listing background tasks in subsequent listing tests
- side_effect list used for MagicMock chain sequential returns in compatibility tests — all mock_admin.table().select().eq().single().execute() calls share one mock object regardless of arguments
- market context in fraud.py truncated to 400 chars — compact, consistent with description RAG 600 char pattern; enough for price range reference
- Citation pills use anchor tags not Link — citations can point to external or non-router paths (neighborhood /find-homes?location=..., blog /blog/{id})
- isSearching resets in finally block to guarantee cleanup on SSE error or normal completion
- Citation rendering in ChatDrawer not ChatMessage — keeps ChatMessage stateless, focused on text bubbles and listing_refs
