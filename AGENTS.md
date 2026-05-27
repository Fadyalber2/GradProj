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

# [AXIOM-V2] recent context, 2026-05-27 1:48am GMT+3

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (17,330t read) | 412,076t work | 96% savings

### May 23, 2026
988 5:32p 🟣 Partner Universities Feature Implementation
989 " ✅ Feature Planning Documentation for Shared Housing and Payment Systems
990 5:33p 🔵 Uncommitted Booking and Shared Housing Implementation Work
991 5:35p ✅ CLAUDE.md Documentation File Removed from Repository
992 " ✅ CLAUDE.md Converted from Tracked to Local-Only Documentation
993 5:36p ✅ Partner Universities Feature and Recent Work Pushed to Remote Repository
### May 25, 2026
995 5:26p 🔵 Missing app.bookings module causing backend startup failure
996 5:27p 🔵 app.bookings module exists locally but missing from version control
997 " 🔵 Bookings directory confirmed untracked in git repository
998 5:28p 🔴 Added missing bookings module to version control
999 5:46p 🔵 Backend configured to use axiom-llm model via Ollama
### May 26, 2026
1000 5:45p 🔵 JWT Token Timing Issue After Account Creation
1001 5:46p 🔵 JWT Decode Missing Leeway Parameter
1002 " 🔴 Added 30-Second Leeway to JWT Validation
1003 5:47p ✅ Created Git Branch for JWT Leeway Fix
1004 " ✅ Committed JWT Leeway Fix to Version Control
1005 " ✅ Pushed JWT Fix and Created Pull Request #1
1006 5:48p ✅ Merged JWT Leeway Fix to Main Branch
1007 5:58p 🔵 Auth State Management Investigation
1008 5:59p 🔄 QueryClient Refactored to Singleton Pattern
1009 " 🔴 Fixed Stale User Data After Login
1010 6:00p 🔴 Extended Cache Clearing to Logout and Signup Flows
1011 " ✅ Committed and Pushed Auth Cache Clear Fix
S469 Fix state management bug causing stale user data after login, commit, PR, and merge to main (May 26, 6:02 PM)
S470 Fixed auth state management bug causing stale user data; merged to main; verified Ollama service status (May 26, 6:02 PM)
S471 Install graphify knowledge graph tool for Windows Claude Code environment (May 26, 6:04 PM)
1012 6:09p 🔵 Graphify Installation Prerequisites Verified
1013 6:18p 🟣 Installed Graphify Knowledge Graph Tool with Multi-Language Support
1014 " 🟣 Registered Graphify Skill with Claude Code on Windows
S472 Install graphify and configure API access for AXIOM-V2 knowledge graph generation (May 26, 6:19 PM)
1015 6:20p 🔵 No API Keys Configured in Environment Variables
S473 Complete graphify codebase analysis with community labeling and interactive visualization for AXIOM-V2 project (May 26, 6:20 PM)
1016 6:22p 🔵 AXIOM-V2 codebase analyzed with graphify tool
1017 6:23p 🔵 AXIOM-V2 project structure shows frontend-heavy architecture
1018 6:24p ⚖️ Graphify analysis scope narrowed to core application directories
1019 6:25p 🔵 Semantic cache cold start requires full extraction of 271 files
1020 6:28p ✅ AST extraction completed generating graph structure from codebase
1021 " ✅ Semantic knowledge graph extracted from AXIOM-V2 documentation and assets
1022 11:11p ✅ Labeled 157 Codebase Communities with Semantic Names
1023 11:12p 🟣 Generated Interactive HTML Graph Visualization
1024 " 🔵 Measured 19.6x Token Reduction from Graph Representation
1025 11:13p 🟣 Implemented Cost Tracking and Cleanup Pipeline
S474 Add graphify documentation to CLAUDE.md to enforce token-efficient workflows and mandate graph updates (May 26, 11:13 PM)
1026 11:18p ✅ Added mandatory graphify update step to task completion checklist
1027 11:19p ✅ Added comprehensive graphify knowledge graph documentation section
S475 Assessment of signup page improvements needed for Egyptian real estate platform AXIOM (May 26, 11:20 PM)
1028 11:21p 🔵 Signup page architecture exploration for improvement assessment
S478 User activated caveman communication mode (May 26, 11:23 PM)
1029 11:27p 🔵 Phone Number and Country Code Usage Mapped Across Codebase
1030 " 🔵 Gender Field Currently Allows Three Values Including "Other"
1031 " 🔵 Country Code Defaults to Egypt +20 with Inconsistent Storage Pattern
1032 11:28p 🔵 WhatsApp Number and Birth Date Fields Missing from Database Schema
1033 " 🔵 Gender "Other" Option Found in Four Frontend Locations
1034 " ⚖️ Comprehensive Implementation Plan Created for Phone and Gender Fixes
S476 Fix phone number database inconsistencies and restrict gender to male/female only across AXIOM-V2 platform (May 26, 11:30 PM)
S477 Simplify phone/WhatsApp implementation based on Egypt market insight - merge into single field (May 26, 11:32 PM)
1035 11:32p 🟣 Phone Normalization Utility Created with E.164 Leading-Zero Strip
1036 11:34p ✅ GenderType Restricted to Binary Male/Female Values
1037 " ✅ UpdateProfileInput Gender Type Aligned to Binary Values
1038 11:35p ✅ Admin Dashboard Gender Dropdown Restricted to Binary Options

Access 412k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>