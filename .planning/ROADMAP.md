# Roadmap: AXIOM V2

## Overview

AXIOM is an AI-powered real estate platform for the Egyptian market. Phases 1–5 (and extras) are complete — auth, listings, messaging, AI features, agencies, and real-time notifications are all wired to a live FastAPI + Supabase backend (63/63 tests pass, zero TS errors). The remaining work adds the revenue layer (Phase 5.5) and hardens the platform for production launch (Phase 6).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (5.5): Inserted between Phase 5 and Phase 6

- [x] **Phase 1: Auth + User Model** - Auth wiring, admin login, 401 auto-logout
- [x] **Phase 2: Core Listings + Search** - Listings CRUD, fraud scoring, embeddings, favorites
- [x] **Phase 3: Messaging + Dashboard + Realtime** - Real-time messaging, dashboard, notifications
- [x] **Phase 4: AI Features** - Chat SSE, recommendations, NL search, compatibility
- [x] **Phase 5: Supporting Features** - Agencies, blog, projects, admin panel, applications
- [ ] **Phase 5.5: Payment Integration** - Deal commissions via Paymob + Fawry, agency subscription plans
- [ ] **Phase 6: Hardening + Launch** - Rate limiting, CI/CD, E2E tests, deploy to Vercel + Railway

## Phase Details

### Phase 1: Auth + User Model
**Goal**: Auth wiring, admin login, 401 auto-logout complete
**Depends on**: Nothing
**Requirements**: REQ-AUTH-01, REQ-AUTH-02, REQ-AUTH-03
**Success Criteria** (what must be TRUE):
  1. User can register and their profile appears in Supabase with role = "user"
  2. User can log in and navbar shows their name
  3. All 8 auth tests pass

Plans:
- [x] 01-01: Auth wiring complete

### Phase 2: Core Listings + Search
**Goal**: Real listings in the database with AI fraud detection as background job
**Depends on**: Phase 1
**Requirements**: REQ-LIST-01, REQ-LIST-02, REQ-LIST-03
**Success Criteria** (what must be TRUE):
  1. User can submit a listing from dashboard — appears as pending
  2. Fraud check runs in background — low-score listing auto-approves
  3. Find Homes page shows real listings from database
  4. 20/20 listing tests pass

Plans:
- [x] 02-01: Listings + search complete

### Phase 3: Messaging + Dashboard + Realtime
**Goal**: Real-time messaging between users, live dashboard data, instant notifications
**Depends on**: Phase 2
**Requirements**: REQ-MSG-01, REQ-DASH-01, REQ-NOTIF-01
**Success Criteria** (what must be TRUE):
  1. Users can send and receive messages in real-time
  2. Dashboard shows live data from GET /api/dashboard/me
  3. NotificationBell shows live unread count via Supabase Realtime
  4. 29/29 tests pass

Plans:
- [x] 03-01: Messaging + dashboard + realtime complete

### Phase 4: AI Features
**Goal**: All 6 AI modules live and connected to the frontend
**Depends on**: Phase 3
**Requirements**: REQ-AI-01, REQ-AI-02, REQ-AI-03, REQ-AI-04, REQ-AI-05, REQ-AI-06
**Success Criteria** (what must be TRUE):
  1. Chatbot streams responses in Arabic and English
  2. Recommendations use real pgvector similarity
  3. Natural language search works
  4. 38/38 tests pass

Plans:
- [x] 04-01: AI features complete

### Phase 5: Supporting Features
**Goal**: All remaining pages wired to live API — agencies, blog, projects, admin, applications
**Depends on**: Phase 4
**Requirements**: REQ-AGN-01, REQ-BLOG-01, REQ-ADMIN-01, REQ-APP-01
**Success Criteria** (what must be TRUE):
  1. Agency and project detail pages show real data
  2. Admin panel has full CRUD for all entities
  3. Shared housing applications work
  4. 56/56 tests pass

Plans:
- [x] 05-01: Supporting features complete

### Phase 5.5: Payment Integration (INSERTED)
**Goal**: Add the revenue layer — deal commissions and agency subscriptions payable via Paymob (card/wallet) and Fawry (cash outlets)
**Depends on**: Phase 5
**Requirements**: REQ-PAY-01, REQ-PAY-02, REQ-PAY-03, REQ-PAY-04, REQ-PAY-05, REQ-PAY-06, REQ-PAY-07, REQ-PAY-08, REQ-PAY-09, REQ-PAY-10
**Success Criteria** (what must be TRUE):
  1. POST /api/deals computes commission correctly — 2% for sale, 1.5% for rental
  2. Paymob test-mode flow completes: deal reported → payment initiated → webhook → commission_paid
  3. Fawry flow: reference code generated → callback → commission_paid; frontend polls every 30s
  4. HMAC verification rejects tampered Paymob webhooks with 400
  5. Duplicate webhooks (same merchant_ref already paid) return 200 without creating duplicates
  6. Agency subscription modal shows Starter/Pro/Enterprise plans with EGP pricing
  7. Dashboard shows payment history tab with real transactions
  8. All 9 payment tests pass — total backend tests >= 72
  9. Zero TypeScript errors
**Plans**: TBD

Plans:
- [ ] 55-01: Database migration — payments, deals, agency_subscriptions tables + agencies ALTER
- [ ] 55-02: Backend — Paymob client, Fawry client, payments router (10 endpoints)
- [ ] 55-03: Frontend — DealReportModal, PaymentMethodSelector, PaymobCheckout, FawryCheckout, AgencySubscriptionCard, payments dashboard tab
- [ ] 55-04: Tests — test_payments.py (9 tests)

### Phase 6: Hardening + Launch
**Goal**: Make the platform production-ready — security hardening, CI/CD pipeline, E2E tests, deploy to Vercel + Railway
**Depends on**: Phase 5.5
**Requirements**: REQ-HARD-01, REQ-HARD-02, REQ-HARD-03, REQ-HARD-04, REQ-HARD-05, REQ-HARD-06, REQ-HARD-07, REQ-HARD-08, REQ-HARD-09, REQ-HARD-10, REQ-HARD-11, REQ-HARD-12, REQ-HARD-13, REQ-HARD-14
**Success Criteria** (what must be TRUE):
  1. All CI checks pass on a fresh PR against main
  2. Vercel production deployment is live
  3. Railway backend is live with health endpoint returning all services green
  4. 5 Playwright E2E specs pass headlessly in CI
  5. Load test p95 < 500ms at 100 concurrent users confirmed
  6. Zero high/critical CVEs from pip-audit and npm audit
**Plans**: 5 plans

Plans:
- [ ] 06-01-PLAN.md — Backend security hardening (rate limiting, Redis AI cache, CORS lockdown, security headers, pip-audit)
- [ ] 06-02-PLAN.md — CI/CD pipeline (GitHub Actions backend + frontend workflows, Railway config, DEPLOYMENT.md)
- [ ] 06-03-PLAN.md — Test suite (4 backend security tests, 5 Playwright E2E specs, k6 load test script)
- [ ] 06-04-PLAN.md — Frontend polish (generateMetadata on 4 pages, ISR revalidation, image domains, npm audit)
- [ ] 06-05-PLAN.md — Load testing + final verification (regression, coverage gate, PERFORMANCE.md)

### Phase 7: AI RAG Enhancement
**Goal**: Transform AXIOM's AI from a general LLM with system prompts into a grounded RAG system — chat answers real listing queries, NL search uses semantic similarity, and responses are always anchored in live database content
**Depends on**: Phase 6
**Requirements**: REQ-RAG-01, REQ-RAG-02, REQ-RAG-03, REQ-RAG-04, REQ-RAG-05, REQ-RAG-06, REQ-RAG-07, REQ-RAG-08, REQ-RAG-09, REQ-RAG-10, REQ-RAG-11, REQ-RAG-12
**Success Criteria** (what must be TRUE):
  1. Chat answers "What 3-bed apartments are available in New Cairo under 5M EGP?" with real listing IDs and prices from the database — zero hallucination
  2. Embedding pipeline covers all listings, neighborhoods, and blog posts (batch embed script runs clean)
  3. Model upgraded to Qwen2.5:7b — Arabic descriptions generate without Latin-character leakage
  4. Hybrid search (vector + keyword) returns results within 300ms at p95
  5. Chat responses include inline citations linking to real property IDs
  6. RAG knowledge base updates automatically on listing create/update/delete
  7. All AI tests still pass (82+ total backend tests, no regressions)
  8. Zero TypeScript errors after frontend RAG UI changes
  9. Description generator retrieves neighborhood context before writing copy
  10. Fraud scorer uses real market price chunks for LLM consistency check
  11. Recommendations support ?explain=true with 1-sentence match explanation per listing
  12. Compatibility scoring uses real housemates and stored user profile from DB
**Plans**: 7 plans

Plans:
- [x] 07-01-PLAN.md — Model upgrade + knowledge base schema (qwen2.5:14b, knowledge_chunks table, hybrid_search_chunks RPC)
- [ ] 07-02-PLAN.md — Embedding pipeline (embed_listing_chunk, delete_listing_chunk, batch_embed.py for listings + neighborhoods + blog)
- [ ] 07-03-PLAN.md — RAG retrieval layer (RAGRetriever class, Chunk/Citation/RAGResponse schemas, unit tests)
- [ ] 07-04-PLAN.md — RAG-powered chat + NL search (pre-stream retrieval, citations SSE event, semantic search fallback)
- [ ] 07-05-PLAN.md — Frontend RAG UI (Citation type, citation pills in ChatDrawer, database search indicator, ragSearchMutation)
- [ ] 07-06-PLAN.md — Description RAG + recommendations explain (neighborhood context injection, ?explain=true flag with batch LLM call)
- [ ] 07-07-PLAN.md — Fraud market context + compatibility housemates (price context in fraud scorer, real housemates + user profile in compatibility)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth + User Model | 1/1 | Complete | 2026-03-05 |
| 2. Core Listings + Search | 1/1 | Complete | 2026-03-05 |
| 3. Messaging + Dashboard + Realtime | 1/1 | Complete | 2026-03-08 |
| 4. AI Features | 1/1 | Complete | 2026-03-08 |
| 5. Supporting Features | 1/1 | Complete | 2026-03-08 |
| 5.5. Payment Integration | 0/4 | Not started | - |
| 6. Hardening + Launch | 0/5 | Not started | - |
| 7. AI RAG Enhancement | 3/7 | In Progress|  |
