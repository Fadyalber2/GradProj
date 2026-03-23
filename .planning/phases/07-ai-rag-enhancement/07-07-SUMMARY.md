---
phase: 07-ai-rag-enhancement
plan: "07"
subsystem: backend-ai
tags: [rag, fraud-detection, compatibility, housemates, profile-enrichment]
requirements: [REQ-RAG-10, REQ-RAG-12]

dependency_graph:
  requires: ["07-03", "07-04"]
  provides: ["market-aware-fraud-scoring", "housemate-enriched-compatibility"]
  affects: ["backend/app/ai/fraud.py", "backend/app/ai/router.py", "backend/tests/test_ai.py"]

tech_stack:
  added: []
  patterns:
    - "RAG context injection into fraud scoring system prompt via rag_retriever.retrieve()"
    - "Housemate DB enrichment for compatibility scoring with fail-open guards"
    - "Stored user profile merge with body.lifestyle_data (body overrides)"
    - "patch.object for ollama singleton to prevent test contamination across test modules"
    - "side_effect list on MagicMock chain for sequential mock return values in compatibility tests"

key_files:
  modified:
    - backend/app/ai/fraud.py
    - backend/app/ai/router.py
    - backend/tests/test_ai.py

decisions:
  - "patch.object used instead of direct attribute assignment on ollama singleton in fraud tests — prevents health=AsyncMock(return_value=True) from persisting across test module boundaries"
  - "side_effect=[r1,r2,r3] on mock_admin.table().select().eq().single().execute used in compatibility tests because all MagicMock chains share one execute mock — side_effect sequences the three single() calls (auth, listing, user_profile)"
  - "rag_retriever.retrieve() in _llm_consistency uses source_type='listing' and k=3, truncates result to 400 chars — matches 07-04 pattern for keeping context compact"
  - "housemate_context injected into system (not prompt) to keep it in the instruction space, consistent with description and chat RAG patterns"

metrics:
  duration_minutes: 21
  completed_date: "2026-03-23"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
  tests_added: 4
  tests_total: 98
---

# Phase 7 Plan 07: RAG Grounding for Fraud + Compatibility Summary

Market-aware fraud scoring and housemate-enriched compatibility via RAG context injection and live DB queries.

## What Was Built

### Task 1: Market price context in fraud.py _llm_consistency()

`backend/app/ai/fraud.py` now imports `rag_retriever` from `app.ai.rag` and retrieves real listing price chunks before building the LLM system prompt.

The retrieval query is `"{city} {category} price range market"` with `source_type="listing"` and `k=3`. The raw chunk text is joined and truncated to 400 characters, then injected as a `MARKET CONTEXT` clause in the system prompt. Any exception in `retrieve()` is silently caught — the fraud score is always returned (fail-open consistent with the rest of the AI pipeline).

### Task 2: Housemate + profile enrichment in compute_compatibility()

`backend/app/ai/router.py` `compute_compatibility()` now performs 4 DB queries in addition to the listing check:

1. `housemates` table: fetch all housemates for the listing (limit 10)
2. `profiles` table: fetch `lifestyle_preferences` for housemates that have a `user_id`
3. `profiles` table: fetch `age`, `occupation`, `gender`, `lifestyle_preferences` for the current user

Housemate data is formatted into a `CURRENT HOUSEMATES` section in the LLM system prompt. The current user's stored preferences are merged with `body.lifestyle_data` — body fields override stored ones (`merged_user_prefs = {**stored_user_prefs, **body.lifestyle_data}`).

The API response now includes `housemate_notes: list[str]` alongside `compatibility_score` and `reasons`. Empty list returned if LLM omits the field.

### Task 2: 4 New Tests

- `test_fraud_llm_market_context_injected` — verifies chunk text appears in captured system prompt
- `test_fraud_llm_no_market_context_fallback` — verifies valid score returned when RAG returns []
- `test_compatibility_with_housemates` — verifies housemate_notes field in response with Ahmed example
- `test_compatibility_user_profile_merges_with_body` — verifies body.lifestyle_data overrides stored prefs in prompt

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fraud test ollama singleton contamination**
- **Found during:** Full test suite run (Task 2 verification)
- **Issue:** `fraud_module.ollama.health = AsyncMock(return_value=True)` directly mutates the shared `OllamaClient` singleton. After the AI tests run, `embed_listing` (called as a background task in `test_create_listing_success`) picks up the contaminated `health=True`, fetches a MagicMock listing, and fails with `TypeError: sequence item 0: expected str instance, MagicMock found`.
- **Fix:** Replaced direct attribute assignment with `patch.object(fraud_module.ollama, "health", ...)` and `patch.object(fraud_module.ollama, "generate", ...)` context managers. These restore the original values after each test.
- **Files modified:** `backend/tests/test_ai.py`
- **Commit:** 19d1ff6

**2. [Rule 1 - Bug] Compatibility tests wrong mock setup approach**
- **Found during:** Task 2 first test run — both compatibility tests returned 400
- **Issue:** With `MagicMock()`, all `mock_admin.table(...).select(...).eq(...).single().execute` calls resolve to the SAME mock object regardless of arguments. Setting `execute.return_value.data = listing_data` then `execute.return_value.data = user_profile_data` leaves only user profile data active for all calls. The listing query returned user profile data → `category` was not `"shared_housing"` → 400 error.
- **Fix:** Used `execute.side_effect = [_r(FAKE_PROFILE), _r(listing_data), _r(user_profile_data)]` to return different values for the three sequential `.single().execute()` calls (auth check, listing fetch, user profile fetch).
- **Files modified:** `backend/tests/test_ai.py`
- **Commit:** 19d1ff6

## Test Results

- Before: 90/90 tests passing
- After: 98/98 tests passing
- Net new: 8 tests (4 from 07-07 + 4 that were already added by 07-06 running in parallel)

## Self-Check: PASSED

| Item | Status |
|---|---|
| `backend/app/ai/fraud.py` | FOUND |
| `backend/app/ai/router.py` | FOUND |
| `backend/tests/test_ai.py` | FOUND |
| `07-07-SUMMARY.md` | FOUND |
| Commit `0678f00` (Task 1 fraud.py) | FOUND |
| Commit `19d1ff6` (Task 2 router + tests) | FOUND |
| All 98 tests passing | CONFIRMED |
