# CLAUDE.md — AXIOM V2 Project Instructions

## What This Project Is

AXIOM is an AI-powered real estate platform for the Egyptian market.
This repository contains the **V2 frontend** — a Next.js 16 app that talks to a FastAPI backend.

---

## Project Structure

```
e:\GradProject\AXIOM-V2\
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
    ├── SETUP.md                ← How to run the project locally
    ├── ROADMAP.md              ← Current status and what's next
    ├── API_REFERENCE.md        ← Backend API contract (endpoints + shapes)
    ├── BACKEND.md              ← Backend architecture reference
    └── AI_FEATURES.md          ← AI feature specs
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

| Area           | Decision                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------- |
| User roles     | Single role: `"user" \| "admin"`. No seeker/broker split.                                     |
| Verified badge | `is_verified_seller: boolean` on any user profile. Admin-granted. Cosmetic only.              |
| Dashboard      | Unified `/dashboard` page → `GET /api/dashboard/me`                                           |
| Listings       | All types in one table. `category: "for_rent" \| "for_sale" \| "shared_housing"`              |
| Shared housing | Served at `/property/[id]` (category=shared_housing). `/shared-housing/[id]` redirects there. |
| Owner field    | `owner_id` everywhere. Never `broker_id`.                                                     |
| Listing status | submit → **pending** → admin approves → **active** (or **rejected**)                          |
| API base       | `http://localhost:8000` — set in `frontend/src/lib/api.ts`                                    |

---

## Key Files to Know

| File                                        | Purpose                                           |
| ------------------------------------------- | ------------------------------------------------- |
| `frontend/src/lib/api.ts`                   | HTTP client (`api.get`, `api.post`, etc.)         |
| `frontend/src/lib/queries.ts`               | TanStack Query query definitions                  |
| `frontend/src/lib/constants.ts`             | Nav items, mock data, static config               |
| `frontend/src/stores/authStore.ts`          | Zustand store — signup, login, logout, user state |
| `frontend/src/types/index.ts`               | UI-layer TypeScript types                         |
| `frontend/src/types/api.ts`                 | API response TypeScript types                     |
| `frontend/src/app/dashboard/page.tsx`       | Unified dashboard page                            |
| `frontend/src/app/property/[id]/page.tsx`   | Property detail (handles shared housing too)      |
| `frontend/src/components/dashboard/`        | Dashboard components incl. AddListingModal        |
| `frontend/src/components/layout/Navbar.tsx` | Top navigation                                    |
| `frontend/middleware.ts`                    | Auth route protection                             |

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

All pages are built. Auth is wired to Supabase. AI features are live (chatbot, NLP search, recommendations). Listings, dashboard, messages, and agency pages still use mock data pending API wiring.

| Page             | API endpoint needed               |
| ---------------- | --------------------------------- |
| `/dashboard`     | `GET /api/dashboard/me`           |
| `/find-homes`    | `GET /api/listings`               |
| `/property/[id]` | `GET /api/listings/{id}`          |
| `/messages`      | `GET /api/messages/conversations` |
| `/agencies`      | `GET /api/agencies`               |

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

## Backend (in this repo at `backend/`)

The backend lives at `backend/` (FastAPI, Python).

- Runs on port **8000** — `cd backend && uvicorn app.main:app --reload`
- Auth: Supabase JWT validated on every protected endpoint
- AI: Ollama at port **11434**, model `axiom-llm`
- DB: Supabase (PostgreSQL + pgvector)

See `docs/API_REFERENCE.md` for endpoint contracts.
See `FULLknowledge.md` for the complete learning guide (novice to expert).

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
