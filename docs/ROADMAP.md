# AXIOM V2 — Roadmap & Current Status

Last updated: 2026-02-28

---

## Current State

| Layer | Status | Notes |
|-------|--------|-------|
| Frontend (Next.js) | ✅ Built | All pages exist, zero TypeScript errors, builds clean |
| Backend (FastAPI) | ✅ Built | All routers implemented, server starts successfully |
| Database schema | ✅ Designed | 11-table schema, enums, indexes, RLS policies defined |
| AI models | ✅ Registered | `axiom-llm:latest` + `nomic-embed-text` in Ollama |
| API wiring | ❌ Not done | Frontend uses mock data — no live backend calls yet |
| Authentication | ❌ Not wired | Auth store built, Supabase not configured |
| Deployment | ❌ Not done | No CI/CD, no production environment |

---

## Frontend Pages — Status

| Route | Built | API Wired | Notes |
|-------|-------|-----------|-------|
| `/` | ✅ | ❌ | Uses mock listings + testimonials |
| `/find-homes` | ✅ | ❌ | Full-screen layout, filter sidebar, AI search UI |
| `/property/[id]` | ✅ | ❌ | Handles regular + shared_housing category |
| `/shared-housing/[id]` | ✅ | — | Redirects to `/property/[id]` |
| `/dashboard` | ✅ | ❌ | Unified: profile, stats, listings, liked, viewings, messages |
| `/messages` | ✅ | ❌ | Real-time UI built, Supabase Realtime not connected |
| `/login` | ✅ | ❌ | Form built, auth store ready |
| `/signup` | ✅ | ❌ | No role selector (single role model) |
| `/forgot-password` | ✅ | ❌ | |
| `/agencies` | ✅ | ❌ | |
| `/agencies/[slug]` | ✅ | ❌ | |
| `/blog` | ✅ | ❌ | |
| `/blog/[slug]` | ✅ | ❌ | |
| `/project/[id]` | ✅ | ❌ | |
| `/about` | ✅ | — | Static content |
| `/admin/dashboard` | ✅ | ❌ | Separate admin auth |

---

## Next Steps (Priority Order)

### Step 1 — Connect Authentication
- Set up Supabase project (URL + anon key in `.env.local`)
- Test signup flow → verify profile row is created in DB
- Test login flow → verify JWT cookie is set
- Test middleware → `/dashboard` redirects to login when unauthenticated

### Step 2 — Wire Core API Calls
Priority order based on critical user flows:

1. `GET /api/listings` → Find Homes page (replace mock data)
2. `GET /api/listings/{id}` → Property detail page
3. `GET /api/dashboard/me` → Dashboard page
4. `POST /api/messages/conversations` → MessageOwnerModal send
5. `GET /api/messages/conversations` → Messages page inbox
6. `POST /api/listings` → AddListingModal (from dashboard)

### Step 3 — Real-time Features
- Connect Supabase Realtime to messages page (live updates)
- Connect Supabase Realtime to notifications

### Step 4 — AI Features
- Wire AI chatbot (floating button → ChatDrawer → SSE stream)
- Wire natural language search (`POST /api/ai/search`)
- Wire AI listing description generator (in AddListingModal)

### Step 5 — Testing & Quality
- Add unit tests for mapper functions in dashboard page
- Add E2E tests for auth flow and listing creation flow
- Set up ESLint CI check

### Step 6 — Deployment
- Frontend → Vercel
- Backend → Railway
- Ollama → GPU server (or swap for Claude API)
- CI/CD → GitHub Actions

---

## Architecture Decisions Already Locked

These are NOT up for reconsideration without a strong reason:

| Decision | Why it's locked |
|----------|----------------|
| Single `user` role (no broker) | All types, components, and API shapes depend on this |
| `owner_id` not `broker_id` | Consistent across DB, backend, and frontend types |
| Unified `/property/[id]` for all listing types | Shared housing redirects here; simpler routing |
| `/api/dashboard/me` single endpoint | Dashboard page mapper functions built around this shape |
| `listing_status`: pending before active | UI shows pending/rejected states in MyListings table |

---

## Rule: Update This File When Tasks Complete

When you finish a task tracked here, mark it with ✅ and update the "Last updated" date at the top.
