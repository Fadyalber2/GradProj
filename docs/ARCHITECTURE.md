# AXIOM V2 — Architecture Quick Reference

> For the full spec see `docs/GREENFIELD.md`. This file is a cheat sheet.

---

## System Overview

```
Browser
  │
  ▼
Next.js 16 (frontend/)          port 3000
  │  REST API calls
  │  Supabase Realtime (WebSocket) — messages, notifications
  ▼
FastAPI backend                 port 8000  (G:\AI\Newstart\backend\)
  ├── Supabase (Postgres + pgvector + Auth + Storage + Realtime)
  ├── Ollama  (axiom-llm:latest + nomic-embed-text)  port 11434
  └── Upstash Redis  (rate limiting, AI response cache)
```

**Key rule:** Frontend never queries the database directly. All business logic lives in FastAPI.

---

## Database — 11 Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Extends `auth.users`. `role: user\|admin`, `is_verified_seller: bool` |
| `listings` | All property types. `category: for_rent\|for_sale\|shared_housing`. `owner_id` FK. Shared housing columns nullable. |
| `listing_applications` | Applications for shared housing rooms. Lifestyle jsonb + AI compatibility score. |
| `favorites` | User ↔ listing. Composite PK `(user_id, listing_id)`. |
| `conversations` | Two-party chat. `user_a_id` + `user_b_id` + optional `listing_id`. |
| `messages` | Individual messages. Trigger updates `conversations.last_message_at`. |
| `notifications` | Per-user. `is_read` boolean. Realtime-enabled. |
| `agencies` | Real estate agencies. `owner_id` FK. |
| `projects` | Multi-unit developments. Units are `listings` rows with `project_id` FK. |
| `blog_posts` | CMS content. Slug, published, SEO fields. |
| `viewings` | Viewing scheduling. Status enum: pending/confirmed/cancelled/completed. |

### Key Enums

```sql
user_role:       user | admin
listing_category: for_rent | for_sale | shared_housing
listing_status:  active | pending | rejected | sold | rented
viewing_status:  pending | confirmed | cancelled | completed
```

---

## Frontend Architecture

### Route Structure

```
app/
├── (auth)/               — login, signup, forgot-password  (no navbar)
├── (marketing)/          — homepage                        (marketing navbar)
├── about/
├── admin/                — admin panel (separate auth)
│   ├── login/
│   └── dashboard/
├── agencies/[slug]/
├── auth/callback/        — Supabase OAuth callback
├── blog/[slug]/
├── dashboard/            — unified user dashboard (protected)
├── find-homes/           — search page (full-screen, sidebar + results)
├── messages/             — real-time messaging (protected)
├── project/[id]/
├── property/[id]/        — all listing types (regular + shared housing)
└── shared-housing/[id]/  — redirects to /property/[id]
```

### State Management

| Layer | Tool | What it manages |
|-------|------|----------------|
| Auth / user session | Zustand (`authStore.ts`) | Current user, signup, login, logout |
| Server data | TanStack React Query | Listings, dashboard, agencies, blog |
| UI state | Local `useState` | Modals, filters, form state |

### Auth Flow

1. User signs up → POST `/api/auth/signup` (FastAPI creates profile row)
2. FastAPI returns 201/202 → Frontend calls Supabase JS `signInWithPassword`
3. Supabase issues JWT → stored in cookie by Supabase JS client
4. Middleware reads cookie → protects `/dashboard` and `/messages`
5. All API calls send `Authorization: Bearer <JWT>` header

### Component Organization

```
components/
├── layout/          — Navbar, Footer, FloatingAIButton, ChatbotConditional
├── sections/        — Homepage sections (HomeHero, Features, Testimonials…)
├── find-homes/      — FilterSidebar, SearchListingCard, SearchListingRow, Pagination
├── dashboard/       — DashboardProfile, DashboardStats, MyListings, AddListingModal,
│                      LikedProperties, RecentMessages, MyViewings
├── property/        — PropertyHero, PropertyInfo, PropertySidebar, MessageOwnerModal, PropertyMap
├── shared-housing/  — SharedHousingHero, SharedHousingStats, AboutHouse,
│                      HousematesSection, SharedAmenities, SharedHousingSidebar
├── auth/            — LoginForm, SignUpForm, ForgotPasswordForm, OAuthButton
├── messages/        — ChatArea, InboxSidebar
├── ai/              — ChatDrawer, ChatMessage
├── blog/            — BlogCard, BlogGrid, BlogHero, BlogSidebar
├── agencies/        — AgenciesHero, DeveloperCard, UniversityCard…
├── agency-details/  — AgencyHero, AgencySidebar, FeaturedProjects…
├── project-details/ — ProjectHero, ProjectInfo, ProjectSidebar, ResidencesGrid
├── about/           — AboutHero, MissionAndValues, TeamSection
├── blog-article/    — ArticleBody, ArticleHero, ArticleSidebar…
├── admin/           — AdminModal, AdminSidebar, AdminTable
├── cards/           — ListingCard
└── ui/              — shadcn/ui primitives (button, dialog, input…)
```

---

## API Contract Conventions

- Base URL: `http://localhost:8000`
- All responses: `Content-Type: application/json`
- Auth: `Authorization: Bearer <supabase-jwt>` on protected endpoints
- Errors: `{ "detail": "message" }` (FastAPI default)
- Pagination: `{ "listings": [...], "total": N, "page": N, "per_page": N }`
- Timestamps: ISO 8601 strings

### Listing Owner Rule

`owner_id` everywhere. `broker_id` does not exist in V2.

### Dashboard Endpoint

`GET /api/dashboard/me` returns:
```json
{
  "profile": { "full_name": "...", "avatar_url": "...", "is_verified_seller": false, ... },
  "analytics": [{ "label": "Total Views", "value": "1,234", "trend_percent": 12.5, "trend_up": true }],
  "listings": [{ "id": "...", "title": "...", "status": "active|pending|rejected|draft", ... }],
  "recent_messages": [...],
  "liked_properties": [...],
  "upcoming_viewings": [...]
}
```

---

## AI Architecture

| Module | What it does |
|--------|-------------|
| `chatbot.py` | RAG chatbot — embeds query, retrieves similar listings, streams response via SSE |
| `recommender.py` | Returns listings similar to user's favorites (pgvector cosine similarity) |
| `compatibility.py` | Scores roommate compatibility for shared housing applications |
| `search.py` | Parses natural language search query into structured filters |
| `description.py` | Generates bilingual (Arabic/English) listing description |
| `fraud.py` | Flags suspicious listings before they enter the pending queue |

**Model:** `axiom-llm:latest` on Ollama (port 11434) — base Llama 3.2 3B, system-prompted as AXIOM AI.
**Embed model:** `nomic-embed-text` on Ollama — 768-dimension embeddings stored in pgvector.

AI is always optional. Every AI endpoint returns `{ "ai_unavailable": true }` if Ollama is down — nothing else breaks.
