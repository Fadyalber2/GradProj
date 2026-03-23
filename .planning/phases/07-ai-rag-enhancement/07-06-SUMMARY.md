---
phase: 07-ai-rag-enhancement
plan: "06"
subsystem: backend-ai
tags: [rag, recommendations, description-generation, explain, neighborhood-context]
dependency_graph:
  requires: [07-03, 07-04]
  provides: [neighborhood-enriched-descriptions, explainable-recommendations]
  affects: [backend/app/ai/router.py, backend/tests/test_ai.py]
tech_stack:
  added: []
  patterns: [fail-open-rag, single-batch-llm, explain-query-param]
key_files:
  modified:
    - backend/app/ai/router.py
    - backend/tests/test_ai.py
decisions:
  - "_explain_recommendations() is a module-level async helper (not a method) so patch.object(ai_router, '_explain_recommendations') works cleanly in tests"
  - "Neighborhood context capped at 600 chars inside generate_description() — avoids bloating the system prompt beyond what qwen2.5:14b handles well"
  - "ref query extended to include id, title, location, category, city, embedding — the extra fields cost nothing at query time and enable meaningful fav_summary text"
  - "No-favorites early-return path deliberately left unenriched — explanation requires knowing the user's preferences (fav_ids must be non-empty)"
metrics:
  duration: "3 minutes"
  completed_date: "2026-03-23"
  tasks_completed: 2
  files_modified: 2
  tests_added: 4
---

# Phase 7 Plan 06: RAG-Enriched Description + Explainable Recommendations Summary

**One-liner:** Neighborhood RAG context injected into listing description generator; recommendations endpoint gains opt-in ?explain=true that runs a single-batch LLM call to add per-listing match explanations.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add neighborhood RAG context to generate_description() | d4a757c | backend/app/ai/router.py |
| 2 | Add ?explain=true to get_recommendations() and write 4 new tests | c63da79 | backend/app/ai/router.py, backend/tests/test_ai.py |

## What Was Built

### Task 1: Neighborhood-Enriched Description Generation

`generate_description()` now retrieves neighborhood knowledge chunks before calling `ollama.generate()`:

1. Calls `rag_retriever.retrieve(f"{body.city} neighborhood real estate", source_type="neighborhood", k=2)` before building the prompt
2. Joins retrieved chunk texts and caps at 600 characters
3. Injects as `\n\nNEIGHBORHOOD CONTEXT:\n{neighborhood_context}` appended to the system prompt
4. Any exception in `retrieve()` is caught silently — endpoint proceeds with original prompt unchanged (fail-open)

This grounds description copy in real neighborhood data rather than purely inferring from the property fields.

### Task 2: Explainable Recommendations

`_explain_recommendations()` helper added above `get_recommendations()`:
- Takes `fav_listings` (up to 3 used for fav_summary) and `candidate_listings`
- Makes a single batch `ollama.generate()` call that returns a JSON object mapping `listing_id -> explanation_string`
- Fail-open: returns `{}` on any Ollama failure

`get_recommendations()` updated:
- Signature: `explain: bool = False` query param added
- ref query extended: `select("id, title, location, category, city, embedding")` (was `"category, city, embedding"`)
- Both candidate return paths (pgvector similarity + category/city fallback) replaced with explain-aware pattern
- No-favorites early-return path left unchanged — it is never enriched
- When `explain=False` (default), `_explain_recommendations()` is never called — zero latency impact

### 4 New Tests

| Test | Covers |
|------|--------|
| `test_description_rag_with_neighborhood_context` | Verifies chunk text appears in system prompt |
| `test_description_rag_no_chunks_fallback` | Verifies endpoint works normally when RAG returns [] |
| `test_recommendations_with_explain` | Verifies explanation field merged into candidate listings |
| `test_recommendations_without_explain_unchanged` | Verifies `_explain_recommendations` not called when explain=False |

## Verification

```
grep "neighborhood_context" backend/app/ai/router.py  # 3 matches in generate_description
grep "_explain_recommendations" backend/app/ai/router.py  # helper + 2 call sites
grep "explain" backend/app/ai/router.py | grep "bool"  # explain: bool = False
```

All 94 backend tests pass (90 prior + 4 new).

## Deviations from Plan

None - plan executed exactly as written.

Task 1 was partially complete at execution start (the `generate_description()` RAG enrichment had already been applied as a side effect of Plan 07-04 work). The existing description tests confirmed correctness and the commit captured it properly.

## Self-Check

Files created/modified:
- backend/app/ai/router.py — modified (Tasks 1 and 2)
- backend/tests/test_ai.py — modified (Task 2 — 4 new tests appended)

Commits:
- d4a757c — feat(07-06): add neighborhood RAG context to generate_description()
- c63da79 — feat(07-06): add explain param to recommendations + 4 new RAG tests
