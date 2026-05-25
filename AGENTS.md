# AGENTS.md — AXIOM V2 Project Instructions

## What This Project Is

AXIOM is an AI-powered real estate platform for the Egyptian market.
This repository contains the **V2 frontend** — a Next.js 16 app that talks to a FastAPI backend.

---

## Project Structure

```
e:\GradProject\AXIOM-V2\
├── AGENTS.md                   ← you are here
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

## Rules for Codex

### Always do before finishing any task:

1. Run `npx tsc --noEmit` inside `frontend/` — must return zero errors
2. Update `docs/ROADMAP.md` if the task was tracked there
3. Update the MEMORY.md in the Codex auto-memory directory

### Code conventions:

- For any frontend edits, use the installed UI/design skills from `emilkowalski/skill` and `Leonxlnx/taste-skill`; in practice, consult `emil-design-eng` plus the relevant taste/frontend skill before changing UI code.
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


<claude-mem-context>
# Memory Context

# [AXIOM-V2] recent context, 2026-05-23 1:38pm GMT+3

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (17,690t read) | 856,710t work | 98% savings

### May 18, 2026
928 11:59p ✅ Extended component AgencyDetail type with contact fields and logo URL
### May 19, 2026
929 12:00a 🟣 Agency page transformation layer now uses real data for location, history, contacts, and trust breakdown
930 12:02a 🟣 Added founded_year field support for agency creation
932 5:58a 🟣 Admin listing image upload UI with enhanced contrast and visual feedback
S441 Unified and elevated admin dashboard UI using high-end design principles (May 19, 5:59 AM)
S442 Locate Ollama model storage path for qwen model on Windows PC (May 19, 6:06 AM)
### May 20, 2026
933 6:42a 🔵 Ollama Model Storage Location Identified
934 6:43a 🔵 Ollama Installed Models Identified
S443 Add Partner Universities feature with same capabilities as agencies but separate and without projects section (May 20, 6:43 AM)
### May 22, 2026
S444 Implement Partner Universities feature mirroring agencies functionality but separate and excluding projects section (May 22, 7:04 PM)
935 7:07p 🔵 Existing agency architecture mapped across frontend and backend
936 7:08p 🔵 Current university implementation uses hardcoded constants instead of database
937 " 🔵 Agency backend implements subscription tiers, owner-based access control, and dual entity support
938 7:09p 🔵 Agency schema fields and admin UI configuration mapped
939 " 🔵 Listings table lacks university_id foreign key, admin sidebar has no universities entry
940 " 🔵 University TypeScript interface lacks database-required fields like id, slug, owner_id
S445 Add Partner Universities feature mirroring agencies structure but without projects section (May 22, 7:10 PM)
S446 Add Partner Universities feature mirroring agencies structure but without projects section (May 22, 7:13 PM)
S447 Add Partner Universities feature mirroring agencies structure but without projects section (May 22, 7:14 PM)
S448 Add Partner Universities feature mirroring agencies structure but without projects section (May 22, 7:14 PM)
S449 Add Partner Universities feature mirroring agencies structure but kept separate without projects section (May 22, 7:15 PM)
941 7:15p ⚖️ Design specification documented for Partner Universities feature
942 7:16p ✅ Partner Universities design specification written
943 " ✅ Partner Universities design spec committed to repository
944 7:17p 🔵 Current backend routing and admin sidebar structure examined
945 " 🔵 Entity picker, admin CRUD, and detail page patterns examined for universities implementation
946 7:18p ✅ Comprehensive Partner Universities implementation plan written
947 7:28p ✅ Partner Universities implementation plan committed to repository
S450 Implement Partner Universities feature mirroring agencies structure but separate without projects (May 22, 7:28 PM)
948 7:29p ⚖️ Subagent-driven development approach selected for Partner Universities implementation
949 7:30p ✅ Task queue populated for 11-task Partner Universities execution pipeline
950 7:31p ✅ Partner Universities implementation execution phase begun
951 7:32p 🟣 Universities database table created and schema migration applied
952 " 🔵 Universities table schema verified with all 17 columns present
953 " 🔵 Listings table university_id FK column verified present
954 " 🟣 Task 1 (DB Migration) completed and verified by subagent
955 " ✅ Task 1 (DB Migration) marked completed in task tracking system
956 " ✅ Task 2 (Backend universities module) marked in_progress
### May 23, 2026
957 12:04a 🟣 Universities module with public API endpoints
958 " 🔵 Universities router not registered in FastAPI app
959 12:05a 🔵 Code review identified N+1 query performance issue in universities router
960 12:06a 🔴 Registered universities router in FastAPI application
961 12:07a 🟣 Admin CRUD endpoints for universities management
962 12:10a 🔵 Python Import Test Failing Silently in Windows Environment
963 12:19a 🔵 Python Import Successful Using Venv Python Executable
964 " 🔵 Backend Server Starts Successfully on Port 8099
965 12:21a 🟣 Universities Router and Admin CRUD Endpoints Implemented
966 12:22a 🟣 Universities Backend Implementation Verified and Completed
967 12:26a 🟣 Added TypeScript types for Partner Universities
968 12:27a ✅ Added university type imports to supabase-queries
969 " 🟣 Implemented university database query functions
970 " 🔄 Updated UniversityCard component to use real API types
971 12:28a 🔄 Converted UniversitiesSection to use React Query and live data
972 " 🔵 University listings query depends on missing university_id column
973 12:30a 🟣 Added Universities navigation to admin sidebar
974 12:31a 🟣 Added universities support to EntityPicker component
975 " 🟣 Admin navigation and entity picker support for universities
976 " 🔵 Task 8 blocked by Claude API session limit
977 12:13p 🔵 Second attempt to implement Task 8 blocked by session limits
978 12:15p 🟣 Added university association to admin listing editor

Access 857k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>