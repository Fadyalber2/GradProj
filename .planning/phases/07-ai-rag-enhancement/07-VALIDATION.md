---
phase: 07
slug: ai-rag-enhancement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (already installed) |
| **Config file** | `backend/pytest.ini` or implicit |
| **Quick run command** | `cd "G:/AI/AXIOM-V2/backend" && python -m pytest tests/test_ai.py -x -v` |
| **Full suite command** | `cd "G:/AI/AXIOM-V2/backend" && python -m pytest tests/ -v` |
| **Frontend check** | `cd "G:/AI/AXIOM-V2/frontend" && npx tsc --noEmit` |
| **Estimated runtime** | ~30 seconds (backend) + ~15 seconds (tsc) |

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest tests/test_ai.py -x -v`
- **After every plan wave:** Run `python -m pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green + `npx tsc --noEmit` clean
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | REQ-RAG-03, REQ-RAG-04 | integration | `python -m pytest tests/test_ai.py -x -v` | ✅ | ⬜ pending |
| 07-02-01 | 02 | 1 | REQ-RAG-02 | integration | `python scripts/batch_embed.py --dry-run` | ❌ Wave 0 | ⬜ pending |
| 07-03-01 | 03 | 2 | REQ-RAG-04 | unit | `python -m pytest tests/test_rag.py -x -v` | ❌ Wave 0 | ⬜ pending |
| 07-04-01 | 04 | 2 | REQ-RAG-01, REQ-RAG-05 | unit | `python -m pytest tests/test_ai.py::test_rag_chat -x` | ❌ Wave 0 | ⬜ pending |
| 07-04-02 | 04 | 2 | REQ-RAG-07 | regression | `python -m pytest tests/test_ai.py -v` | ✅ | ⬜ pending |
| 07-05-01 | 05 | 3 | REQ-RAG-05, REQ-RAG-08 | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 07-06-01 | 06 | 3 | REQ-RAG-09 | unit | `python -m pytest tests/test_ai.py::test_description_rag_with_neighborhood_context -x` | ❌ Wave 0 | ⬜ pending |
| 07-06-02 | 06 | 3 | REQ-RAG-11 | unit | `python -m pytest tests/test_ai.py::test_recommendations_with_explain -x` | ❌ Wave 0 | ⬜ pending |
| 07-07-01 | 07 | 3 | REQ-RAG-10 | unit | `python -m pytest tests/test_ai.py::test_fraud_llm_market_context_injected -x` | ❌ Wave 0 | ⬜ pending |
| 07-07-02 | 07 | 3 | REQ-RAG-12 | unit | `python -m pytest tests/test_ai.py::test_compatibility_with_housemates -x` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_rag.py` — new test file for RAG-specific behaviors (knowledge_chunks CRUD, hybrid search, auto-update trigger)
- [ ] `backend/scripts/batch_embed.py` — batch embedding script (also tested via dry-run)
- [ ] `docs/schema/004_knowledge_chunks.sql` — migration file for knowledge_chunks table + hybrid_search_chunks RPC

*Existing `tests/test_ai.py` covers all current AI endpoints — new tests extend it with mocked retrieval for REQ-RAG-09 through REQ-RAG-12.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Qwen2.5 Arabic output has no Latin character leakage | REQ-RAG-03 | Requires running live Ollama + visual inspection of Arabic text | POST /api/ai/description with Egyptian city, inspect arabic field for latin chars |
| hybrid_search_chunks RPC returns results in <300ms p95 | REQ-RAG-04 | Latency test requires real Supabase + populated knowledge_chunks | Run EXPLAIN ANALYZE on hybrid_search_chunks in Supabase SQL Editor with 1000+ rows |
| Citation pills render in ChatDrawer and link to /property/[id] | REQ-RAG-05 | Frontend visual verification | Open localhost:3000, ask chat "apartments in Cairo", verify citation pills appear |
| Description copy references real neighborhood characteristics | REQ-RAG-09 | Requires live knowledge_chunks data + visual quality check | Generate description for Maadi listing, verify output mentions area-specific details |
| Compatibility response references housemate names | REQ-RAG-12 | Requires live housemates data + visual inspection | POST /api/ai/compatibility with listing that has housemates, check housemate_notes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
