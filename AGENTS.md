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

# [AXIOM-V2] recent context, 2026-05-28 8:13pm GMT+3

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (21,139t read) | 595,686t work | 96% savings

### May 26, 2026
1023 11:12p 🟣 Generated Interactive HTML Graph Visualization
1025 11:13p 🟣 Implemented Cost Tracking and Cleanup Pipeline
1026 11:18p ✅ Added mandatory graphify update step to task completion checklist
1027 11:19p ✅ Added comprehensive graphify knowledge graph documentation section
1028 11:21p 🔵 Signup page architecture exploration for improvement assessment
1029 11:27p 🔵 Phone Number and Country Code Usage Mapped Across Codebase
1030 " 🔵 Gender Field Currently Allows Three Values Including "Other"
1031 " 🔵 Country Code Defaults to Egypt +20 with Inconsistent Storage Pattern
1032 11:28p 🔵 WhatsApp Number and Birth Date Fields Missing from Database Schema
1033 " 🔵 Gender "Other" Option Found in Four Frontend Locations
1034 " ⚖️ Comprehensive Implementation Plan Created for Phone and Gender Fixes
1035 11:32p 🟣 Phone Normalization Utility Created with E.164 Leading-Zero Strip
1036 11:34p ✅ GenderType Restricted to Binary Male/Female Values
1037 " ✅ UpdateProfileInput Gender Type Aligned to Binary Values
1038 11:35p ✅ Admin Dashboard Gender Dropdown Restricted to Binary Options
### May 27, 2026
1039 8:14a 🔵 Git history reveals 6 unpushed commits completing signup and gender refactor
1040 " 🔵 Unstaged changes show comprehensive auth and dashboard rewrite totaling 1,435 insertions across 22 files
1041 " ✅ Staged comprehensive auth refactor including 22 modified files and 3 new additions
1042 8:15a 🟣 Committed and pushed comprehensive auth UI overhaul with 2,672 insertions across 25 files
### May 28, 2026
1043 7:36p 🔵 Payment and Booking System Implementation Plan Exists
1044 7:40p 🔵 Design Skills Contain Excessive Meta-Instructions for End Users
1045 7:41p 🔵 Design Agent Skills Expose Internal AI Prompting Strategy to Users
1046 7:42p 🔵 Backend Bookings Module Implemented
1047 " 🔵 Payment System Plan File Missing from Expected Location
1048 " 🔵 Booking Payment Display Shows Incorrect Owner Amount for Rent Transactions
1050 " 🟣 Booking System API Fully Implemented
1051 " 🟣 Automated Lease Expiry and Warning System Implemented
1049 " 🔴 Booking Modal Removes Misleading Owner Payment Display
1053 7:43p 🔵 Frontend Booking Dashboard Components Exist, Detail Page Missing
1052 " 🔄 Booking Detail Page Implements Role-Based Financial Visibility
1054 " ✅ Booking Financial Display Refactor Passes TypeScript Validation
1055 " 🔵 Booking Payment Refactor Verified Live on Local Server
1056 " 🔵 ROADMAP.md Table Cell Contains Line Breaks Breaking Patch Match
1057 7:44p ✅ ROADMAP.md Updated with Renter-Safe Booking UI Note
1058 " ✅ Cross-Session Memory Updated with Booking UI Cleanup Work
S483 Booking UI Enhancement - Custom Form Controls and Payment Display Cleanup (May 28, 7:46 PM)
1059 7:47p ✅ BookingModal Fully Cleaned - Platform Fee Row Removed from Renter View
1060 7:48p ✅ BookingModal Native Inputs Replaced with Custom Calendar and Duration Pickers
1061 7:50p 🔴 Ripgrep Regex Parse Error with Escaped Quotes
1062 " ✅ MEMORY.md Updated with Custom Date and Duration Picker Work
S484 Booking Modal Calendar UX Refinement - Inline Expansion Pattern (May 28, 7:51 PM)
1063 7:52p ✅ Calendar Component Refactored from Popover to Inline Expansion
1064 " ✅ MEMORY.md Updated with Inline Calendar Refinement Note
S485 Property Sidebar CTA Integration - Consolidate Action Buttons into Sidebar Cards (May 28, 7:53 PM)
1067 7:55p ✅ BookNowButton and ApplyButton Enhanced with Customizable Spacing and Polished Transitions
1068 7:56p ✅ Sidebar Components Refactored for Action Button Composition
1069 " ✅ Property Detail Page Refactored - Action Buttons Integrated into Sidebars
1070 " ✅ Sidebar Component Composition Simplified - Direct Button Imports Instead of ReactNode Props
1071 7:57p ✅ Property Detail Page Simplified - Sidebar API Updated to Match Direct Import Pattern
1072 " ✅ MEMORY.md Updated with Sidebar CTA Integration Work
S486 Stripe Integration Status Investigation - Check for Active Sandbox Configuration (May 28, 7:58 PM)
S487 Design automated Stripe payout system to transfer funds from platform to property owners after booking payments (May 28, 8:00 PM)
1074 8:03p ⚖️ Automated Stripe Payout Design for Rental Platform
S488 Design automated Stripe payout system with detailed payment flow architecture for rental platform (May 28, 8:05 PM)
S489 Design database schema and backend architecture for automated Stripe payout system (May 28, 8:07 PM)
S490 Design frontend components for Stripe payment integration with booking modal and payment flow UI (May 28, 8:08 PM)
S491 Design error handling and security architecture for Stripe payment and payout system (May 28, 8:09 PM)
1075 8:10p ⚖️ Automated Stripe Payout Design Approved
1076 8:11p ✅ Stripe Auto-Payout Design Document Created
S492 Create and commit comprehensive Stripe booking and auto-payout design specification document (May 28, 8:11 PM)
**Investigated**: Design document structure including payment flow diagrams, database migrations, backend architecture, frontend components, error handling patterns, and API endpoint specifications

**Learned**: Frontend needs polling mechanism to get booking_id after payment since webhook creates booking row asynchronously. Polling endpoint GET /api/bookings/by-intent/{intent_id} allows frontend to poll up to 10 times at 1-second intervals until webhook completes booking creation. This resolves race condition between stripe.confirmCardPayment() completion and webhook firing.

**Completed**: Comprehensive design specification created at docs/superpowers/specs/2026-05-28-stripe-booking-payout-design.md documenting complete Stripe Connect architecture with payment flow, database schema, backend components, frontend components, error handling, and security patterns. Document refined to add GET /api/bookings/by-intent/{intent_id} polling endpoint and explicit polling logic (max 10×, 1s intervals) in Step 3 success flow. Design spec committed to git repository with 236 line addition.

**Next Steps**: Awaiting user review of design specification before proceeding to implementation plan


Access 596k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>