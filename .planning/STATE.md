# AXIOM V2 — GSD State

## Current Position

- **Active phase:** Phase 2 complete ✅ (verified 11/11) → next: `/gsd:execute-phase 3`
- **Last completed:** Phase 2 Listings — 73/73 backend tests, 0 TS errors, verified (2026-03-21)
- **Next action:** `/gsd:execute-phase 3` (Messaging + Dashboard gap-fill), then `4`, `5.5`, `6`

## Project Health

| Check | Status |
|---|---|
| Backend tests | 73/73 ✅ (Phase 2 adds 10 listing tests) |
| TypeScript errors | 0 ✅ |
| Frontend wired to backend | Yes ✅ |
| DB schema live in Supabase | 13 tables ✅ |

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
