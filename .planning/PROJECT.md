# AXIOM V2 — Project Overview

## Vision

AXIOM is an AI-powered real estate platform for the Egyptian market. It works like Aqarmap or Bayut but adds:
- **Native Arabic AI chatbot** — answers questions about properties in Arabic or English
- **AI fraud detection** — every new listing is scored before it goes live
- **Shared housing + roommate matching** — AI compares lifestyle questionnaires to score compatibility
- **Single user model** — the same account can list properties and search for them (no broker/seeker split)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, TanStack Query v5, Zustand |
| Backend | FastAPI (Python), Pydantic, asyncpg patterns |
| Database | Supabase (PostgreSQL + pgvector), 13 tables live |
| Auth | Supabase Auth (JWT ES256), Google + Facebook OAuth, Twilio OTP |
| AI | Ollama (local LLM, port 11434, model: axiom-llm:latest), pgvector embeddings |
| Realtime | Supabase Realtime (messages, notifications) |
| Storage | Supabase Storage (avatars, listing-images, attachments) |
| Payments | Paymob (cards/wallets), Fawry (cash outlets) — Phase 5.5 |

## Completed Milestones

| Phase | Description | Status |
|---|---|---|
| Phase 0 | Foundation — DB schema, backend V2, env config | ✅ Complete |
| Phase 1 | Auth wiring, admin login, 401 auto-logout | ✅ Complete (8/8 tests) |
| Phase 2 | Listings CRUD, search, fraud scoring, embeddings, favorites | ✅ Complete (20/20 tests) |
| Phase 3 | Messaging, dashboard, Realtime notifications | ✅ Complete (29/29 tests) |
| Phase 4 | AI features — chat SSE, recommendations, NL search, compatibility | ✅ Complete (38/38 tests) |
| Phase 5 | Agencies, blog, projects, admin panel, applications | ✅ Complete (56/56 tests) |
| Messaging UI Overhaul | Skeleton, mobile responsive, date grouping, animations, FAB | ✅ Complete |
| Message Requests | Accept/reject flow, block/report, pending state | ✅ Complete (63/63 tests) |

## Current State (2026-03-21)

- **63/63 backend tests pass**
- **Zero TypeScript errors**
- **Frontend fully wired to live backend**
- Supabase project: `pgaqqseqwtgsuihbswnv` (eu-west-1)
- Backend runs on port 8000, Frontend on port 3000, Ollama on port 11434

## Key Invariants — NEVER VIOLATE

- `UserRole = "user" | "admin"` — no broker, no seeker
- Use `owner_id` / `ownerId` — NEVER `broker_id`
- All listing types in one table via `category: "for_rent" | "for_sale" | "shared_housing"`
- `/property/[id]` handles ALL categories. `/shared-housing/[id]` redirects there.
- Auth: Supabase JWT (ES256) → FastAPI validates → profile in `profiles` table
