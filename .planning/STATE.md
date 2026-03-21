# AXIOM V2 — GSD State

## Current Position

- **Active phase:** Phases 1–4 retroactive plans ready for execution (gap-fill pass)
- **Last completed:** Message Requests system (2026-03-09) — 63/63 tests pass
- **Next action:** `/gsd:execute-phase 1` → `2` → `3` → `4` (gap-fill), then `5.5` and `6`

## Project Health

| Check | Status |
|---|---|
| Backend tests | 63/63 ✅ |
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

## Key Decisions

- AuthUser uses snake_case fields (full_name, avatar_url) matching backend Pydantic schema — not camelCase
- supabase.ts stays on @supabase/supabase-js createClient (not @supabase/ssr) — @supabase/ssr not installed, existing works
- serverFetch uses Next.js `next.revalidate` for ISR (60s default), 8s timeout via AbortController
- OAuth providers (Google, Facebook) accessible both via OAuthButton component and authStore.loginWithGoogle/loginWithFacebook
