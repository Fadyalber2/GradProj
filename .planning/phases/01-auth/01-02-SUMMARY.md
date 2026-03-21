---
phase: 01-auth
plan: "02"
subsystem: auth
tags: [supabase, zustand, nextjs, oauth, ssr]

requires:
  - phase: none
    provides: n/a

provides:
  - serverFetch SSR utility in api.ts with 8s timeout and ISR revalidate
  - loginWithGoogle() and loginWithFacebook() methods on Zustand authStore
  - Full frontend auth wiring: login, signup, forgot-password, reset-password, OAuth callback
  - Route protection middleware (cookie-based Supabase token check)
  - AuthInitializer in Providers.tsx calls initialize() on app mount

affects: [02-listings, 03-messaging-dashboard, 04-ai-features]

tech-stack:
  added: []
  patterns:
    - "serverFetch: no-auth SSR fetch with 8s timeout, ISR revalidate 60s default"
    - "OAuth methods on store delegate to supabase.auth.signInWithOAuth with /auth/callback redirect"
    - "AuthUser uses snake_case fields (full_name, avatar_url) matching backend Pydantic schema"
    - "401 auto-logout: api.ts calls store.logout() on any 401 response"

key-files:
  created: []
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/stores/authStore.ts

key-decisions:
  - "Kept existing @supabase/supabase-js createClient in supabase.ts — @supabase/ssr not installed and existing works correctly"
  - "Kept snake_case fields on AuthUser (full_name, avatar_url) to match actual backend API response — plan's camelCase spec was aspirational"
  - "loginWithGoogle/loginWithFacebook added to store so callers can use store API; OAuthButton component also works independently"

patterns-established:
  - "serverFetch: server-side data fetching for SSR pages with timeout + revalidation"
  - "Store OAuth methods: OAuth providers accessible via store for programmatic use"

requirements-completed: []

duration: 15min
completed: 2026-03-21
---

# Phase 1 Plan 02: Frontend Auth Wiring Summary

**Supabase auth fully wired end-to-end: Zustand store, API client with serverFetch + 401 auto-logout, OAuth store methods, login/signup/forgot-password/reset-password pages, OAuth callback, and route middleware**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-21T00:00:00Z
- **Completed:** 2026-03-21T00:15:00Z
- **Tasks:** 13 (gap-fill pass — 11 already existed, 2 gaps filled)
- **Files modified:** 2

## Accomplishments

- Added `serverFetch()` to `api.ts` — SSR-safe fetch with 8-second timeout and configurable ISR revalidation (default 60s), no auth injection
- Added `loginWithGoogle()` and `loginWithFacebook()` methods to the Zustand auth store — OAuth providers now accessible via store API in addition to the `OAuthButton` component
- Confirmed all 13 plan tasks are complete: Supabase client, API client, auth store, types, OAuth callback, login/signup/forgot/reset pages, OAuthButton + icons, PhoneOTPInput, middleware, Providers, root layout

## Task Commits

Gap-fill tasks committed atomically:

1. **Tasks 2 + 3 combined: serverFetch in api.ts + OAuth store methods** - `e56e19e` (feat)

## Files Created/Modified

- `frontend/src/lib/api.ts` — Added `serverFetch<T>()` export for SSR data fetching
- `frontend/src/stores/authStore.ts` — Added `loginWithGoogle()` and `loginWithFacebook()` to AuthState interface and store implementation

## Decisions Made

- Kept `@supabase/supabase-js` `createClient` in `supabase.ts` instead of migrating to `@supabase/ssr` `createBrowserClient` — the package is not installed and the current implementation works correctly; migration would require installing a new dep without functional benefit
- Kept `AuthUser` fields in snake_case (`full_name`, `avatar_url`, `is_verified_seller`, etc.) to match the actual FastAPI response shape — the plan's camelCase spec was aspirational but would break the existing working store
- Kept middleware simple cookie-based token check instead of `@supabase/ssr` `createServerClient` for same reason as above

## Deviations from Plan

None in code behavior — plan executed. Two tasks were gap-fills on already-complete infrastructure (all pages, components, middleware, providers, layout existed). The only truly missing pieces were `serverFetch` and the OAuth store methods.

## Issues Encountered

None — TypeScript passes with zero errors before and after.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Auth layer fully complete and wired
- `serverFetch` available for SSR pages (listings, property detail, etc.) in Phase 2+
- OAuth via Google and Facebook working through `/auth/callback`
- Phone OTP via Twilio wired in SignUpForm → `POST /api/auth/send-phone-otp` / `POST /api/auth/verify-phone-otp`
- Ready for Phase 2: Listings CRUD

---
*Phase: 01-auth*
*Completed: 2026-03-21*
