# CLAUDE.md — AXIOM V2 Project Instructions

## What This Project Is

AXIOM is an AI-powered real estate platform for the Egyptian market.
This repository contains the **V2 frontend** — a Next.js 16 app that talks to a FastAPI backend.

---

## Project Structure

```
G:\AI\AXIOM-V2\
├── CLAUDE.md                   ← you are here
├── frontend/                   ← Next.js 16 app (the entire frontend)
│   ├── src/
│   │   ├── app/                ← App Router pages
│   │   ├── components/         ← React components
│   │   ├── lib/                ← API client, queries, constants, utils
│   │   ├── stores/             ← Zustand auth store
│   │   ├── types/              ← TypeScript types (index.ts = UI, api.ts = API)
│   │   └── providers/          ← React Query + Supabase providers
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
└── docs/
    ├── GREENFIELD.md           ← Full system architecture spec (read this first)
    ├── ARCHITECTURE.md         ← Quick-reference architecture cheat sheet
    ├── SETUP.md                ← How to run the project locally
    ├── ROADMAP.md              ← Current status and what's next
    ├── API_REFERENCE.md        ← Backend API contract (endpoints + shapes)
    └── plans/
        └── v2-frontend-implementation.md  ← Completed implementation plan
```

---

## Running the Frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:3000
npm run build     # production build check
npx tsc --noEmit  # TypeScript check
```

The backend runs separately at `http://localhost:8000` (FastAPI).

---

## Key Architectural Decisions (V2)

| Area | Decision |
|------|----------|
| User roles | Single role: `"user" \| "admin"`. No seeker/broker split. |
| Verified badge | `is_verified_seller: boolean` on any user profile. Admin-granted. Cosmetic only. |
| Dashboard | Unified `/dashboard` page → `GET /api/dashboard/me` |
| Listings | All types in one table. `category: "for_rent" \| "for_sale" \| "shared_housing"` |
| Shared housing | Served at `/property/[id]` (category=shared_housing). `/shared-housing/[id]` redirects there. |
| Owner field | `owner_id` everywhere. Never `broker_id`. |
| Listing status | submit → **pending** → admin approves → **active** (or **rejected**) |
| API base | `http://localhost:8000` — set in `frontend/src/lib/api.ts` |

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `frontend/src/lib/api.ts` | HTTP client (`api.get`, `api.post`, etc.) |
| `frontend/src/lib/queries.ts` | TanStack Query query definitions |
| `frontend/src/lib/constants.ts` | Nav items, mock data, static config |
| `frontend/src/stores/authStore.ts` | Zustand store — signup, login, logout, user state |
| `frontend/src/types/index.ts` | UI-layer TypeScript types |
| `frontend/src/types/api.ts` | API response TypeScript types |
| `frontend/src/app/dashboard/page.tsx` | Unified dashboard page |
| `frontend/src/app/property/[id]/page.tsx` | Property detail (handles shared housing too) |
| `frontend/src/components/dashboard/` | 7 dashboard components |
| `frontend/src/components/layout/Navbar.tsx` | Top navigation |
| `frontend/middleware.ts` | Auth route protection |

---

## Frontend Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Animation:** Framer Motion
- **Server state:** TanStack React Query v5
- **Client state:** Zustand
- **Auth:** Supabase Auth (JWT via Supabase JS client)
- **Maps:** Leaflet (react-leaflet)
- **Forms:** React Hook Form + Zod

---

## Current Frontend Status

All pages are built and use **mock data / API-ready structure**. The backend API is not yet wired to a live database. Pages that need live data:

| Page | API endpoint needed |
|------|-------------------|
| `/dashboard` | `GET /api/dashboard/me` |
| `/find-homes` | `GET /api/listings` |
| `/property/[id]` | `GET /api/listings/{id}` |
| `/messages` | `GET /api/messages/conversations` |
| `/agencies` | `GET /api/agencies` |
| `/blog` | `GET /api/blog` |

See `docs/API_REFERENCE.md` for full endpoint shapes.

---

## Rules for Claude

### Always do before finishing any task:
1. Run `npx tsc --noEmit` inside `frontend/` — must return zero errors
2. Update `docs/ROADMAP.md` if the task was tracked there
3. Update the MEMORY.md in the Claude auto-memory directory

### Code conventions:
- All new components go in `frontend/src/components/<feature>/ComponentName.tsx`
- All new pages go in `frontend/src/app/<route>/page.tsx`
- UI types → `frontend/src/types/index.ts`
- API types → `frontend/src/types/api.ts`
- Never use `broker_id`, `brokerId`, `"broker"` role, or `"seeker"` role anywhere
- Use `owner_id` / `ownerId` for listing owner references
- `UserRole` is `"user" | "admin"` — no other values
- Every new `"use client"` component that uses `React.ElementType` must import it: `import type { ElementType } from "react"`
- Use `<Image>` from `next/image`, never raw `<img>` tags

### File naming:
- Components: PascalCase (`MyComponent.tsx`)
- Pages/layouts: lowercase (`page.tsx`, `layout.tsx`)
- Utilities: camelCase (`myUtil.ts`)

---

## Backend (for reference — not in this repo)

The backend lives at `G:\AI\Newstart\backend\` (FastAPI, Python).

- Runs on port **8000**
- Auth: Supabase JWT validated on every protected endpoint
- AI: Ollama at port **11434**, model `axiom-llm:latest`
- DB: Supabase (PostgreSQL + pgvector)

See `docs/API_REFERENCE.md` for endpoint contracts.
See `docs/GREENFIELD.md` for full system architecture.
