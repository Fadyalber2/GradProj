# AXIOM — Greenfield Build Specification

**Written from the perspective of a senior full-stack engineer starting this project with zero existing code.**
**Audience:** The developer building this, and any AI assistant helping build it.
**Purpose:** Every decision made in this document is intentional. No step is skipped "for later."

---

## Table of Contents

1. [Product Definition](#1-product-definition)
2. [User Personas & Core Flows](#2-user-personas--core-flows)
3. [Feature Inventory](#3-feature-inventory)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Technology Stack — Choices & Rationale](#5-technology-stack--choices--rationale)
6. [System Architecture](#6-system-architecture)
7. [Database Design](#7-database-design)
8. [Backend Architecture](#8-backend-architecture)
9. [API Contract Conventions](#9-api-contract-conventions)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [AI Architecture](#11-ai-architecture)
12. [Frontend Architecture](#12-frontend-architecture)
13. [Real-Time Layer](#13-real-time-layer)
14. [File Storage](#14-file-storage)
15. [Security](#15-security)
16. [Performance Strategy](#16-performance-strategy)
17. [Testing Strategy](#17-testing-strategy)
18. [Development Environment (Day 1)](#18-development-environment-day-1)
19. [CI/CD Pipeline](#19-cicd-pipeline)
20. [Deployment Architecture](#20-deployment-architecture)
21. [Monitoring & Observability](#21-monitoring--observability)
22. [Build Sequence](#22-build-sequence)
23. [Architecture Decision Records (ADRs)](#23-architecture-decision-records-adrs)

---

## 1. Product Definition

### What is AXIOM?

AXIOM is an AI-powered real estate platform for the Egyptian market. Any registered user can both search for properties and list their own — there is no seeker/broker split. A listing goes live only after passing an AI fraud check and admin review. A shared-housing feature serves the university/young-professional market with AI roommate compatibility scoring.

### The Problem it Solves

Egyptian real estate search is fragmented: listings are duplicated across WhatsApp groups, outdated portals, and informal networks. AXIOM centralizes listings, adds Arabic/English AI assistance, surfaces fraud automatically, and gives every user a clean dashboard to manage what they own and what they're looking for.

### What makes it different from Aqarmap or Bayut Egypt?

- Native Arabic AI chatbot trained on local market data
- Shared housing with AI roommate compatibility scoring
- AI-powered fraud detection on every listing before it goes live
- Single unified user — list and search from the same account

---

## 2. User Personas & Core Flows

### Personas

| Persona             | Description                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**            | Any registered person. Can search, favorite, message, request viewings, and submit listings. All users are equal — no role separation.       |
| **Verified Seller** | A User who has been granted a cosmetic `is_verified_seller` badge by an admin. Badge appears on their profile and listings. No extra powers. |
| **Admin**           | Platform operator. Separate auth system. Full CRUD, listing approval queue, fraud review, user management.                                   |

> There is no seeker/broker split. A user who lists a property and a user who searches for one are the same account type.

### Critical Flows (must work before launch)

1. User signs up → searches listings → favorites a property → messages the listing owner
2. User submits a listing → AI fraud check runs → listing enters pending queue → admin approves → listing goes live → owner notified
3. User uses AI chatbot → gets property recommendations → navigates to property page
4. User browses shared housing → gets compatibility score → applies for a room
5. Admin reviews pending listing queue → approves or rejects with reason → user notified

---

## 3. Feature Inventory

Priority tiers: **P0** = required for first working version, **P1** = required for launch, **P2** = post-launch.

### P0 — Core (nothing works without these)

- [ ] User registration + login (email + Google OAuth)
- [ ] Property listings CRUD (any authenticated user can create)
- [ ] Listing verification pipeline: AI fraud check → pending → admin approve/reject → live
- [ ] Property search with filters (type, price, location, area)
- [ ] Property detail page
- [ ] User ↔ listing owner messaging
- [ ] Admin panel (listing queue, user management, fraud review)

### P1 — Launch features

- [ ] Favorites (save listings)
- [ ] Viewing request scheduling
- [ ] User dashboard (my listings, my favorites, my viewings, edit profile)
- [ ] Shared housing listings + room applications with lifestyle matching
- [ ] AI compatibility scoring for shared housing
- [ ] AI chatbot (RAG over listings, SSE streaming)
- [ ] AI property recommendations
- [ ] Natural language search
- [ ] AI bilingual listing description generator
- [ ] Real-time notifications (new message, listing approved/rejected, viewing confirmed)
- [ ] Blog (SEO content)
- [ ] Agencies + developer projects

### P2 — Post-launch

- [ ] Fine-tuned LLM weights (LoRA on local data)
- [ ] Verified Seller badge request flow (user applies, admin grants)
- [ ] Agency follower system
- [ ] Mobile app (React Native, same API)
- [ ] Payment integration + transaction history

---

## 4. Non-Functional Requirements

These are not optional — they are requirements. Define them before writing code.

### Performance

| Metric                          | Target                     |
| ------------------------------- | -------------------------- |
| API response (cached)           | < 100ms p95                |
| API response (uncached DB)      | < 400ms p95                |
| AI endpoint (streaming start)   | < 2s first token           |
| Frontend LCP (Largest Paint)    | < 2.5s on 4G mobile        |
| Search results                  | < 500ms including pgvector |
| Listing page (static generated) | < 1s from CDN              |

### Security

- All auth tokens are JWTs, validated server-side on every request
- Admin endpoints use a separate auth system (HMAC-signed tokens)
- All user input is validated with Pydantic v2 before touching the database
- RLS (Row-Level Security) is enabled on all user-data tables in Supabase
- Secrets never in code — only in environment variables
- Rate limiting on auth and AI endpoints

### Availability

- Backend uptime target: 99.5% (no strict SLA for MVP)
- Ollama/AI is optional: if it's down, every non-AI endpoint still works
- Redis is optional: if it's down, rate limiting fails open (requests pass through)

### Scalability (design for, don't over-engineer)

- The database layer (Supabase) scales independently
- Backend is stateless — horizontal scaling with multiple instances behind a load balancer
- Images go directly to object storage, not through the backend
- AI is the only compute-heavy workload — it runs on a separate Ollama instance

---

## 5. Technology Stack — Choices & Rationale

Every choice below has a reason and an acknowledged tradeoff.

### Frontend: Next.js 15 (App Router)

**Why:** App Router gives us React Server Components for SEO-critical pages (listings, property detail), client components where interactivity is needed, and file-based routing with route groups for layout isolation. Vercel deploy is trivial.

**Tradeoff vs. alternatives:**

- Vite + React SPA: faster DX, worse SEO, can't use RSC.
- Remix: good SSR, but smaller ecosystem, fewer shadcn/ui integrations.
- Next.js pages router: mature but RSC is the future.

**UI library:** shadcn/ui + Tailwind CSS. Reason: fully controlled components (no black-box npm package), Tailwind keeps styles co-located, accessible by default.

**State:** Zustand for auth/global state (minimal API surface). TanStack React Query for server state (caching, background refetch, loading states). No Redux.

### Backend: Python + FastAPI

**Why:** FastAPI is async-native, has automatic OpenAPI docs, Pydantic v2 validation, and excellent DX. Python is the right language when AI/ML libraries (transformers, sentence-transformers) are in the same codebase ecosystem.

**Tradeoff vs. alternatives:**

- Node.js/Express: same team language as frontend, but Python wins for AI integration.
- Django: too opinionated, ORM layer is unnecessary when Supabase's REST/RPC is the data layer.
- Go/Gin: faster raw performance, but AI ecosystem is Python-first.

### Database: Supabase (PostgreSQL + pgvector)

**Why:** Supabase gives us: managed Postgres, Row-Level Security, Auth (JWT), Realtime (WebSocket channels), and Object Storage — all in one. pgvector enables semantic search without a separate vector DB. For a startup-speed build, this is the right call.

**Tradeoff vs. alternatives:**

- PlanetScale (MySQL): no pgvector, no RLS, no Realtime.
- Neon + separate auth: more control, more infrastructure to manage.
- Raw self-hosted Postgres: full control, but ops burden is high.

**Key decision:** The backend is the only service that writes to the database. The frontend never calls Supabase directly (except for Supabase Auth session management and Realtime subscriptions). This keeps business logic centralized.

### AI: Ollama (local) for development, cloud GPU for production

**Why:** Ollama lets us run Llama 3.2 3B locally without API costs during development. The architecture is designed so swapping Ollama for the Claude API (or any OpenAI-compatible endpoint) requires changing one environment variable and one adapter function.

**Model choice:** Llama 3.2 3B for the base. Small enough to run on a laptop CPU (2GB), good enough for structured tasks (NL search parsing, description generation). For quality-critical paths (chatbot), Claude API is preferred in production.

**Tradeoff:** Local Ollama is slow (2-8s latency). Acceptable for dev. Production should point to a GPU server or Claude API.

### Cache: Upstash Redis

**Why:** Serverless Redis — pay per request, zero infrastructure. Used for: rate limiting (sliding window), AI response caching, session data. If it's unavailable, all non-cached code paths still work.

### Storage: Supabase Storage

**Why:** Already in the Supabase ecosystem. Signed URLs mean files upload directly from the browser to storage — the backend never touches binary data.

### Deployment: Vercel (frontend) + Railway (backend)

**Why:**

- Vercel: zero-config Next.js deployment, edge CDN, automatic preview deployments per PR.
- Railway: simple container-based deployment for FastAPI, supports environment variables, persistent volumes for Ollama model files if needed.

**Tradeoff vs. AWS/GCP:** Much simpler DX. For a product that hasn't found product-market fit, spend engineering time on features, not Kubernetes.

### Monitoring: Sentry + structured logging

**Why:** Sentry captures exceptions with full context (request, user, stack trace) in both frontend and backend. Structured JSON logging to stdout means logs are queryable in Railway/Vercel dashboards.

---

## 6. System Architecture

```
Browser / Mobile
      │
      ├── Static assets, pages (SSR/SSG)
      ▼
┌──────────────────────────────────────┐
│   Next.js 15 on Vercel               │  Port 3000
│   App Router · RSC + Client          │
│   Zustand · TanStack Query           │
│   Supabase Auth (browser client)     │
└──────────────┬───────────────────────┘
               │
               │  REST API calls (JSON)
               │  Supabase Realtime (WebSocket) — messages, notifications
               │
      ┌────────▼────────────────────────┐
      │   FastAPI on Railway             │  Port 8000
      │   13 router modules              │
      │   Pydantic v2 validation         │
      │   Background tasks (embeddings,  │
      │   fraud detection)               │
      └────┬───────────────┬─────────────┘
           │               │
    ┌──────▼──────┐   ┌────▼────────────┐
    │  Supabase   │   │  Ollama          │  Port 11434
    │  Postgres   │   │  axiom-llm:latest│
    │  pgvector   │   │  nomic-embed-text│
    │  Auth       │   └─────────────────┘
    │  Storage    │
    │  Realtime   │   ┌─────────────────┐
    └─────────────┘   │  Upstash Redis   │
                      │  Rate limiting   │
                      │  AI response     │
                      │  cache           │
                      └─────────────────┘
```

### Key architectural rules

1. **Frontend → Backend only.** Frontend never queries the database directly (except Auth session refresh and Realtime subscriptions). All business logic lives in FastAPI.
2. **Backend → Supabase via service role for writes, anon key for reads.** RLS is still enforced on user-facing reads.
3. **AI is a sidecar.** Every AI call is wrapped in try/except. If Ollama is down, the endpoint returns a 503 with `"ai_unavailable": true`. Nothing else breaks.
4. **Storage bypass.** Files never go through the backend. Frontend gets a signed URL, uploads directly to Supabase Storage.
5. **Realtime bypass.** Messages and notifications use Supabase Realtime channels directly from the browser. The backend writes the data to Postgres; Supabase Realtime broadcasts changes to subscribed clients.

---

## 7. Database Design

### Principles

- **Schema is the contract.** Get the schema right before writing a single router. Changing the schema later is the most expensive refactor.
- **Use enums for known-finite states.** Property types, listing statuses, user roles — all enums, not free-text strings.
- **Soft deletes for user-generated content.** Never hard-delete listings, messages, or user profiles. Add a `deleted_at` timestamp column.
- **Counters as columns, not live aggregates.** `agency.listing_count` is a cached integer updated by a trigger. Never `SELECT COUNT(*) FROM listings WHERE agency_id = $1` in a hot path.
- **pgvector from day 1.** The `listings` table gets an `embedding vector(768)` column from the initial migration. Backfilling later is painful.
- **RLS on every user-data table.** If a row contains user data, it has a RLS policy.

### Migration Strategy

Use **Alembic** for all schema changes. Never run raw SQL manually against production. The initial schema is migration `0001_initial`. Every change after that is a new numbered migration.

```
backend/
├── alembic/
│   ├── env.py
│   ├── versions/
│   │   ├── 0001_initial_schema.py
│   │   ├── 0002_add_listing_embedding.py
│   │   └── ...
└── alembic.ini
```

Why Alembic and not just Supabase SQL Editor? Because:

- Changes are version-controlled in git
- Rollbacks are possible
- The same migration runs in dev, staging, and production
- Other developers can reproduce the exact database state

### Table Overview

11 tables. No seeker/broker split. No payment processing. No redundant join tables.

| Table                  | Core purpose                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`             | Extends Supabase `auth.users`. Single user type. `role` is `user` or `admin`. `is_verified_seller` badge flag.                                            |
| `listings`             | All property types in one table. `category` field distinguishes for_rent / for_sale / shared_housing. `owner_id` FK. Shared housing columns are nullable. |
| `listing_applications` | Applications to shared housing rooms. Stores lifestyle data (jsonb) + AI compatibility score.                                                             |
| `favorites`            | User ↔ listing many-to-many. Composite PK `(user_id, listing_id)`.                                                                                        |
| `conversations`        | Two-party chat container. `user_a_id` + `user_b_id` + optional `listing_id`. Unique constraint prevents duplicates.                                       |
| `messages`             | Individual messages. Trigger updates `conversations.last_message_at`.                                                                                     |
| `notifications`        | Per-user in-app notifications. `is_read` boolean. Realtime-enabled.                                                                                       |
| `agencies`             | Real estate agencies / developer companies. Owned by a user (`owner_id`).                                                                                 |
| `projects`             | Multi-unit developments owned by an agency. Units are `listings` rows with `project_id` FK.                                                               |
| `blog_posts`           | CMS content. Slug, published status, SEO fields.                                                                                                          |
| `viewings`             | Viewing scheduling between a user and a listing owner. Status enum.                                                                                       |

**Removed from previous design and why:**

| Removed table                 | Reason                                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `broker_profiles`             | No broker role — merged into `profiles` with `is_verified_seller` flag.                                                                        |
| `shared_housing`              | Merged into `listings` with `category = 'shared_housing'` + nullable shared columns.                                                           |
| `shared_housing_tenants`      | Lifestyle tags stored as `jsonb` on the listing; current tenants are approved applicants.                                                      |
| `shared_housing_applications` | Renamed `listing_applications` — same data, cleaner name.                                                                                      |
| `conversation_participants`   | Replaced with `user_a_id` + `user_b_id` columns — AXIOM only supports 2-party chats.                                                           |
| `transactions`                | Platform connects buyers and sellers but doesn't process payments. Listing `status` (sold/rented) + `closed_with_user_id` tracks deal closure. |
| `agency_followers`            | Post-launch feature. Adds a table for a P2 feature. Cut for V2.                                                                                |
| `newsletter_subscribers`      | Use a third-party service (Mailchimp/Brevo). Not worth a table.                                                                                |
| `ai_chat_sessions`            | Chat history stored in-memory (dict keyed by session_id). No persistence needed for MVP.                                                       |
| `ai_chat_messages`            | Same as above — in-memory session, not persisted to DB.                                                                                        |

### Enum Types

```sql
-- Single user role. 'admin' is granted manually, never set on signup.
CREATE TYPE user_role          AS ENUM ('user', 'admin');

-- listing_category determines what fields are relevant (shared_housing uses nullable room fields).
CREATE TYPE listing_category   AS ENUM ('for_rent', 'for_sale', 'shared_housing');

-- Physical property type — independent of category.
CREATE TYPE property_type      AS ENUM ('apartment', 'villa', 'studio', 'duplex', 'penthouse', 'commercial', 'room');

-- pending   = awaiting admin review (new listing or flagged by AI)
-- active    = approved, visible to all users
-- rejected  = rejected by admin (owner notified with reason)
-- sold/rented = deal closed (owner marks manually)
CREATE TYPE listing_status     AS ENUM ('active', 'pending', 'rejected', 'sold', 'rented');

CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE project_status     AS ENUM ('upcoming', 'in_progress', 'completed');
CREATE TYPE viewing_status     AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
```

### Indexing Strategy

Always index before you need it:

```sql
-- listings hot paths
CREATE INDEX idx_listings_category   ON listings (category, status);
CREATE INDEX idx_listings_location   ON listings (city);
CREATE INDEX idx_listings_price      ON listings (price);
CREATE INDEX idx_listings_owner      ON listings (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_project    ON listings (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_listings_pending    ON listings (status) WHERE status = 'pending';

-- pgvector semantic search
CREATE INDEX idx_listings_embedding ON listings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- messages and notifications for real-time
CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_notifications_user    ON notifications (user_id, is_read) WHERE is_read = false;

-- conversations: prevent duplicate threads between the same two users on the same listing
CREATE UNIQUE INDEX idx_conversations_unique
  ON conversations (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id), COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'));
```

### Key Database Functions

These run inside Postgres — they are atomic and fast:

| Function                          | What it does                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `handle_new_user()`               | Trigger on `auth.users` INSERT — auto-creates `profiles` row with `role = 'user'`    |
| `match_listings()`                | pgvector cosine similarity search with optional SQL filters (city, category, status) |
| `toggle_favorite()`               | Atomic upsert/delete on `favorites`, returns new boolean state                       |
| `increment_listing_views()`       | Atomic `UPDATE listings SET view_count = view_count + 1`                             |
| `get_user_conversations()`        | Returns conversation list with last message preview + unread count for a user        |
| `get_unread_notification_count()` | Total unread notifications for a user (for bell badge)                               |

### RLS Policies (examples)

```sql
-- Listings: anyone can read active listings; only the owner can write their own listing
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY listings_public_read ON listings
  FOR SELECT USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY listings_owner_all ON listings
  FOR ALL USING (owner_id = auth.uid());

-- Admin can see ALL listings including pending and rejected (enforced at FastAPI layer via service role key)

-- Messages: only the two participants in a conversation can read/write
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_participant ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE user_a_id = auth.uid() OR user_b_id = auth.uid()
    )
  );

-- Notifications: users can only see their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_owner ON notifications
  FOR ALL USING (user_id = auth.uid());

-- Profiles: anyone can read; only self can update
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_public_read ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_self_write  ON profiles FOR ALL  USING (id = auth.uid());
```

---

## 8. Backend Architecture

### Directory Structure

```
backend/
├── alembic/                    # Database migrations
│   └── versions/
├── app/
│   ├── main.py                 # FastAPI factory: CORS, middleware, router mounts
│   ├── config.py               # pydantic-settings: reads .env, exposes typed Settings
│   ├── dependencies.py         # Reusable FastAPI deps: get_current_user, require_listing_owner, get_redis
│   │
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── router.py           # HTTP handlers only — no logic
│   │   ├── service.py          # Business logic — Supabase calls, token generation
│   │   └── schemas.py          # Pydantic v2 request/response models
│   │
│   ├── listings/               # Same pattern for every module (includes shared_housing category)
│   ├── users/
│   ├── agencies/
│   ├── projects/
│   ├── messages/
│   ├── blog/
│   ├── viewings/
│   ├── notifications/
│   ├── dashboard/
│   ├── search/
│   ├── uploads/
│   ├── ai/
│   │   ├── router.py
│   │   ├── chatbot.py          # RAG chatbot
│   │   ├── recommender.py      # Property ranking
│   │   ├── compatibility.py    # Roommate scoring
│   │   ├── search.py           # NL → structured filters
│   │   ├── description.py      # Bilingual description gen
│   │   ├── fraud.py            # 4-step fraud pipeline
│   │   ├── embeddings.py       # Batch embedding generation
│   │   └── ollama_client.py    # HTTP wrapper for Ollama
│   │
│   └── admin/
│       ├── router.py
│       ├── service.py
│       └── schemas.py
│
├── tests/
│   ├── conftest.py             # Fixtures: test client, test DB, mock Ollama
│   ├── test_auth.py
│   ├── test_listings.py
│   ├── test_ai.py
│   └── test_admin.py
│
├── Dockerfile
├── requirements.txt
├── requirements-dev.txt        # pytest, httpx, faker, ruff, mypy
├── .env.example
└── alembic.ini
```

### Module Pattern (every module follows this)

```
<module>/
├── __init__.py
├── router.py      # APIRouter — HTTP verbs, path params, dependency injection only
├── service.py     # All logic: DB queries, business rules, external calls
└── schemas.py     # Pydantic v2: request bodies, response models, enums
```

**Rule:** Router functions are max 10 lines. They parse input, call a service function, return a response. Nothing else.

### Middleware Stack (in main.py, applied top to bottom)

```
Incoming request
      │
      ▼
  CORSMiddleware           Allow frontend origin. Restrict in production to exact domain.
      │
      ▼
  RateLimitAuthMiddleware  Redis sliding window: 10 req/min on /api/auth/*
      │
      ▼
  RateLimitAIMiddleware    Redis sliding window: 20 req/min on /api/ai/*
      │
      ▼
  RequestLogMiddleware     Structured JSON log: method, path, status, duration_ms, user_id
      │
      ▼
  Route handlers
```

**Fail-open rule:** Both rate limiters catch `RedisError` and let the request through. Redis down ≠ platform down.

### Background Tasks

When a listing is created or updated, two tasks run asynchronously after the response is sent:

```python
@router.post("/listings", status_code=201)
async def create_listing(data: ListingCreate, background_tasks: BackgroundTasks,
                         user: User = Depends(get_current_user)):
    listing = await listing_service.create(data, owner_id=user["id"])
    # Listing starts as 'pending' — never shown publicly until approved.
    background_tasks.add_task(generate_and_store_embedding, listing["id"])
    background_tasks.add_task(run_fraud_and_auto_approve, listing["id"])
    return listing
```

**Verification flow inside `run_fraud_and_auto_approve`:**

```python
async def run_fraud_and_auto_approve(listing_id: str):
    score = await fraud_service.score_listing(listing_id)
    if score < 0.4:
        # Low risk — auto-approve
        await listing_service.set_status(listing_id, "active")
        await notification_service.create(owner_id, "listing_approved", "Your listing is now live!")
    else:
        # Higher risk — stays pending, goes to admin review queue
        await notification_service.create(owner_id, "listing_under_review",
            "Your listing is under review. We'll notify you within 24 hours.")
```

The user gets a 201 immediately. They are notified by in-app notification when the status changes. The admin review queue in the admin panel shows all `status = 'pending'` listings sorted by `fraud_score DESC`.

### Dependency Injection (dependencies.py)

```python
async def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Validates Supabase JWT. Raises 401 if invalid or missing."""

async def get_current_user_optional(token: ... = Depends(security_optional)) -> User | None:
    """Same as above but returns None instead of raising — for public endpoints that behave
    differently when authenticated (e.g. show 'favorited' state)."""

async def require_listing_owner(listing_id: str, user: User = Depends(get_current_user)) -> User:
    """Fetches the listing and raises 403 if the current user is not the owner."""

async def require_admin(token: str = Depends(admin_scheme)) -> bool:
    """Validates HMAC admin token. Raises 401 if invalid or expired."""

async def get_redis() -> Redis | None:
    """Returns Redis client or None if unavailable. Never raises."""
```

---

## 9. API Contract Conventions

### URL Structure

```
/api/{module}/{resource}
/api/{module}/{resource}/{id}
/api/{module}/{resource}/{id}/{action}
```

Examples:

```
GET    /api/listings                    # list with filters
POST   /api/listings                    # create
GET    /api/listings/{id}               # get one
PUT    /api/listings/{id}               # full update (owner only)
PATCH  /api/listings/{id}               # partial update
DELETE /api/listings/{id}               # soft delete
POST   /api/listings/{id}/favorite      # action
POST   /api/listings/{id}/view          # action
```

### Versioning

No URL versioning (`/api/v1/`) for MVP. When breaking changes are needed post-launch, introduce `/api/v2/` and run both in parallel with a deprecation header. Don't pre-engineer versioning infrastructure for an app that hasn't launched.

### Standard Error Response

Every error follows the same structure:

```json
{
  "error": {
    "code": "LISTING_NOT_FOUND",
    "message": "Listing with id abc123 does not exist.",
    "details": null
  }
}
```

Error codes are `SCREAMING_SNAKE_CASE`, human-readable, and defined as constants. Never return raw database errors to the client.

### Standard Paginated Response

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 847,
    "total_pages": 43,
    "has_next": true,
    "has_prev": false
  }
}
```

All list endpoints accept `?page=1&page_size=20`. Default page size is 20, max is 100.

### HTTP Status Codes

| Situation                       | Status |
| ------------------------------- | ------ |
| Success (return data)           | 200    |
| Created successfully            | 201    |
| No content (delete, toggle)     | 204    |
| Bad request / validation error  | 422    |
| Unauthorized (no/invalid token) | 401    |
| Forbidden (wrong role)          | 403    |
| Not found                       | 404    |
| Rate limited                    | 429    |
| AI service unavailable          | 503    |
| Server error                    | 500    |

---

## 10. Authentication & Authorization

### User Authentication (Supabase JWT)

1. User submits credentials to `POST /api/auth/login`
2. Backend calls `supabase.auth.sign_in_with_password()` — Supabase validates and returns tokens
3. Backend returns `{ access_token, refresh_token, user }` to the frontend
4. Frontend stores tokens in Zustand (memory) + `httpOnly` cookie (persistence across tabs)
5. Every protected API call sends `Authorization: Bearer <access_token>`
6. `get_current_user` dependency calls `supabase.auth.get_user(token)` — validates against Supabase
7. Token refresh: frontend intercepts 401 responses, calls `POST /api/auth/refresh`, retries

**Why not store tokens in localStorage?** XSS attacks can read localStorage. HttpOnly cookies are invisible to JavaScript. We use a hybrid: Zustand for in-memory fast access during the session, HttpOnly cookie for persistence.

### Role Model

| Role    | Can do                                                                                                                |
| ------- | --------------------------------------------------------------------------------------------------------------------- |
| `user`  | Search listings, favorite, message listing owners, apply to shared housing, request viewings, **submit own listings** |
| `admin` | Separate auth system — full CRUD on all tables, listing approval queue, fraud review, grant verified seller badge     |

Role is stored in `profiles.role`. All new users are created with `role = 'user'` via the `handle_new_user` trigger. Admin is set manually.

There is no `require_broker` dependency. Any authenticated user can create a listing. The `require_listing_owner` dependency is used on PUT/DELETE listing endpoints — it verifies `owner_id = current_user.id`.

**Verified Seller badge** — stored as `profiles.is_verified_seller: boolean`. Displayed as a badge on the user's profile page and on their listing cards. Has no effect on permissions. Admin grants it via `PUT /admin/users/{id}/verify`.

### OAuth (Google)

1. Frontend calls `POST /api/auth/oauth/google` → receives a Supabase OAuth redirect URL
2. User is sent to Google's OAuth flow
3. After consent, Google redirects to `GET /api/auth/oauth/callback?code=...`
4. Backend exchanges the code via Supabase for an access + refresh token
5. Tokens are set as HttpOnly cookies; user is redirected to `/auth/callback` on the frontend
6. Frontend reads cookies, hydrates Zustand store

### Admin Authentication (HMAC-signed tokens)

The admin panel uses a completely independent auth system:

1. `POST /api/admin/auth/login` — username + hashed password from env vars (never stored in DB)
2. Backend generates: `payload = base64url({"sub": "admin", "exp": now + 86400})`
3. Signature: `HMAC-SHA256(payload, ADMIN_TOKEN_SECRET)`
4. Token: `payload.signature` (base64url encoded)
5. All `/api/admin/*` endpoints require `require_admin` dependency which verifies the HMAC

**Why not JWT?** No third-party library dependency for a simple admin token. HMAC verification is one Python standard-library call.

---

## 11. AI Architecture

### Principle: AI is optional everywhere

Every AI call is wrapped like this:

```python
try:
    result = await ollama_client.generate(prompt)
    return result
except Exception:
    logger.warning("Ollama unavailable — returning fallback")
    return fallback_value  # never raise 500 for AI failures
```

The platform works without AI. AI enhances but doesn't gate.

### Module Map

| Module             | Endpoint                            | What it does                                                            |
| ------------------ | ----------------------------------- | ----------------------------------------------------------------------- |
| `chatbot.py`       | `POST /api/ai/chat`                 | RAG chatbot: embed query → pgvector search → LLM with context           |
|                    | `POST /api/ai/chat/stream`          | Same, but SSE streaming to browser                                      |
| `recommender.py`   | `POST /api/ai/recommendations`      | Filter listings by prefs → LLM ranks + explains top 5                   |
| `compatibility.py` | `POST /api/ai/compatibility`        | Tag overlap scoring (0–100) + LLM narrative                             |
| `search.py`        | `POST /api/ai/search`               | NL query → structured filters → pgvector search                         |
| `description.py`   | `POST /api/ai/generate-description` | Listing data → bilingual (AR+EN) description                            |
| `fraud.py`         | `POST /api/ai/fraud/analyze`        | 4-step pipeline: price anomaly, owner reputation, image hash, LLM check |
| `embeddings.py`    | `POST /api/ai/embeddings/batch`     | Batch generate embeddings for a list of listing IDs                     |
| `ollama_client.py` | (internal)                          | HTTP wrapper: generate, embed, stream, health check                     |

### Ollama Client Design

```python
class OllamaClient:
    def __init__(self, base_url: str, model: str, embed_model: str):
        self.base_url = base_url
        self.model = model
        self.embed_model = embed_model
        self._session: aiohttp.ClientSession | None = None

    async def generate(self, prompt: str, system: str = "") -> str: ...
    async def embed(self, text: str) -> list[float]: ...
    async def generate_stream(self, prompt: str) -> AsyncGenerator[str, None]: ...
    async def health(self) -> bool: ...  # returns False instead of raising
```

**The model is injected from config** — changing `OLLAMA_MODEL=claude-api-adapter` is all you need to switch from local Ollama to a cloud API. This abstraction exists so production can use a better model without code changes.

### RAG Chatbot Flow

```
User message
      │
      ▼
1. Embed user message using nomic-embed-text
      │
      ▼
2. pgvector similarity search: SELECT top-5 listings by cosine distance
      │
      ▼
3. Build prompt:
   SYSTEM: You are AXIOM, an Egyptian real estate assistant. Answer in the language the user writes in.
   CONTEXT: [5 listing summaries from step 2]
   HISTORY: [last 10 turns from in-memory SESSION_STORE dict keyed by session_id]
   USER: [current message]
      │
      ▼
4. ollama_client.generate_stream() → SSE chunks to browser
      │
      ▼
5. On completion: append user turn + assistant turn to SESSION_STORE[session_id] (no DB write needed)
```

### Fraud Detection Pipeline

```
New listing submitted
      │
      ├── Step 1: Price anomaly
      │   Compare to median price for same city/type/area range.
      │   Score: how many standard deviations from median?
      │
      ├── Step 2: Owner reputation
      │   Count owner's previously flagged/rejected listings, account age, listing frequency.
      │   Score: 0.0 (clean) to 1.0 (suspicious history)
      │
      ├── Step 3: Image hash
      │   Perceptual hash of each image. Compare against known-flagged listing hashes.
      │   Score: 0.0 (unique) to 1.0 (exact duplicate of flagged listing)
      │
      └── Step 4: LLM consistency check
          Prompt: "Does this description match these specs? Flag contradictions."
          Score: 0.0 (consistent) to 1.0 (contradictions detected)
                │
                ▼
          weighted_average = step1 * 0.3 + step2 * 0.2 + step3 * 0.3 + step4 * 0.2
                │
          score < 0.4  → status = 'active'  (auto-approved, owner notified)
          score >= 0.4 → status = 'pending' (admin review queue, owner notified)
```

---

## 12. Frontend Architecture

### Directory Structure

```
frontend/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Route group — no shared layout
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── (marketing)/            # Public pages — shared marketing layout
│   │   │   └── page.tsx            # Home page
│   │   ├── about/page.tsx
│   │   ├── find-homes/page.tsx
│   │   ├── property/[id]/page.tsx
│   │   ├── shared-housing/[id]/page.tsx
│   │   ├── agencies/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── project/[id]/page.tsx
│   │   ├── blog/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── messages/page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Single unified dashboard for all users
│   │   ├── admin/
│   │   │   ├── login/page.tsx
│   │   │   └── dashboard/page.tsx
│   │   └── auth/callback/page.tsx  # OAuth redirect handler
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (never modify)
│   │   ├── layout/                 # Navbar, Footer, ChatbotConditional, FloatingAIButton
│   │   ├── sections/               # Home page sections (RSC where possible)
│   │   ├── ai/                     # ChatDrawer, ChatMessage
│   │   ├── auth/                   # LoginForm, SignUpForm, OAuthButton
│   │   ├── property/               # PropertyHero, PropertySidebar, PropertyMap, MessageOwnerModal
│   │   ├── find-homes/             # FilterSidebar, SearchListingCard, Pagination
│   │   ├── dashboard/               # Single user dashboard: my listings, my favorites, my viewings, profile
│   │   ├── messages/               # ChatArea, InboxSidebar
│   │   ├── agencies/               # Agency list components
│   │   ├── agency-details/         # Agency detail components
│   │   ├── shared-housing/         # Shared housing components
│   │   ├── blog/                   # Blog list components
│   │   ├── blog-article/           # Article components
│   │   ├── project-details/        # Project components
│   │   ├── about/                  # About page components
│   │   └── admin/                  # Admin panel components
│   │
│   ├── lib/
│   │   ├── api.ts                  # All backend API calls — typed, centralized
│   │   ├── queries.ts              # TanStack React Query hooks (useListings, useProperty, etc.)
│   │   ├── supabase.ts             # Supabase browser client (Auth + Realtime only)
│   │   ├── constants.ts            # NEXT_PUBLIC_API_URL, page sizes, map defaults
│   │   └── utils.ts                # cn(), formatPrice(), formatDate()
│   │
│   ├── stores/
│   │   └── authStore.ts            # Zustand: user, token, isLoading, login(), logout()
│   │
│   ├── providers/
│   │   └── Providers.tsx           # ReactQueryClientProvider, auth hydration on mount
│   │
│   └── types/
│       ├── api.ts                  # TypeScript types that mirror backend Pydantic schemas
│       └── index.ts                # Re-exports
│
├── middleware.ts                   # Route protection: /dashboard/*, /messages → require auth
├── next.config.ts                  # image domains, rewrites
├── package.json
└── tsconfig.json
```

### Component Decision Rule: Server vs. Client

| Use Server Component when…                      | Use Client Component when…                |
| ----------------------------------------------- | ----------------------------------------- |
| Fetching initial data for a page (SEO)          | User interaction (forms, modals, toggles) |
| Static or rarely-changing content (blog, about) | Real-time updates (chat, notifications)   |
| Content that must be indexed by search engines  | Browser APIs (localStorage, geolocation)  |
| No event handlers needed                        | State that changes on user input          |

Mark client components with `'use client'` at the top. Keep the client boundary as deep in the tree as possible — don't mark a whole page as client just because one button needs a click handler.

### Data Fetching Strategy

```
Page (Server Component)
  │
  ├── Fetch initial data server-side → pass as props to client components
  │   Example: property/[id]/page.tsx fetches listing data during SSR
  │
  └── Client Component (e.g., PropertySidebar)
        │
        └── useQuery() for data that changes with user interaction
            (favorites count, availability, real-time chat)
```

For the find-homes search page: initial render is server-side (for SEO of default results). Filter changes trigger client-side React Query fetches — no full page reload.

### State Management

```
Zustand authStore
  ├── user: User | null
  ├── token: string | null
  ├── isLoading: boolean
  ├── login(token, user): void
  └── logout(): void

React Query (queries.ts)
  ├── useListings(filters) → GET /api/listings
  ├── useListing(id) → GET /api/listings/{id}
  ├── useMyListings() → GET /api/listings/mine
  ├── useConversations() → GET /api/messages/conversations
  ├── useDashboardStats() → GET /api/dashboard/stats
  └── ... one hook per API call
```

React Query handles: caching, loading states, background refetch, error states. Zustand handles only auth state. Nothing else goes in global state — component-local state is fine.

### API Client Pattern (lib/api.ts)

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new ApiError(res.status, error.error);
  }
  return res.json();
}

export const api = {
  listings: {
    list: (params: ListingFilters) =>
      request<PaginatedResponse<Listing>>(`/api/listings?${qs(params)}`),
    get: (id: string) => request<Listing>(`/api/listings/${id}`),
    create: (data: CreateListing) =>
      request<Listing>("/api/listings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    // ...
  },
  // one namespace per backend module
};
```

All API calls go through this single file. No scattered `fetch()` calls in components.

---

## 13. Real-Time Layer

Real-time is handled by **Supabase Realtime** — the backend writes to Postgres, Supabase broadcasts changes via WebSocket to subscribed browser clients.

### Two real-time channels

**1. Messages channel** — subscribe when the user opens the messages page:

```typescript
supabase
  .channel(`messages:${conversationId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      queryClient.setQueryData(["messages", conversationId], (old) => [
        ...old,
        payload.new,
      ]);
    },
  )
  .subscribe();
```

**2. Notifications channel** — subscribe globally when user is logged in:

```typescript
supabase
  .channel(`notifications:${userId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      // increment bell badge, optionally show toast
    },
  )
  .subscribe();
```

The backend never touches WebSockets. It writes to Postgres. Supabase handles the rest.

---

## 14. File Storage

Three Supabase Storage buckets:

| Bucket           | Public? | Used for                           | Max file size |
| ---------------- | ------- | ---------------------------------- | ------------- |
| `avatars`        | Yes     | User profile pictures              | 5MB           |
| `listing-images` | Yes     | Property photos (up to 20/listing) | 10MB each     |
| `attachments`    | No      | Message file attachments           | 25MB          |

### Upload flow

The backend never receives binary data:

1. Frontend calls `POST /api/uploads/signed-url` with `{ bucket, filename, content_type }`
2. Backend generates a signed upload URL via Supabase Storage API (60-second expiry)
3. Frontend uploads directly to the signed URL (`PUT` to Supabase)
4. Frontend receives the public URL from Supabase's response
5. Frontend includes the public URL in the listing create/update payload

---

## 15. Security

### OWASP Top 10 — how we address each

| Threat                    | Mitigation                                                                        |
| ------------------------- | --------------------------------------------------------------------------------- |
| Injection (SQL)           | Pydantic validation + Supabase parameterized queries — no raw SQL with user input |
| Broken Authentication     | Supabase JWT validation on every request, token refresh, HttpOnly cookies         |
| Sensitive Data Exposure   | HTTPS only, secrets in env vars, no PII in logs                                   |
| XML External Entities     | N/A — no XML parsing                                                              |
| Broken Access Control     | RLS on all tables, role checks in FastAPI dependencies                            |
| Security Misconfiguration | CORS restricted to exact frontend domain in production                            |
| XSS                       | React escapes by default, no `dangerouslySetInnerHTML`, no eval                   |
| Insecure Deserialization  | Pydantic v2 strict mode — unknown fields rejected                                 |
| Known Vulnerabilities     | Dependabot + `pip-audit` + `npm audit` in CI                                      |
| Insufficient Logging      | Every request logged with status + duration, Sentry for errors                    |

### Secret Management

**Rule: no secrets in code, ever.**

```
.env.example     # committed — shows all required variable names, no values
.env             # local only — in .gitignore
.env.production  # never committed — set in Vercel/Railway dashboard
```

Required environment variables:

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Admin
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=      # bcrypt hash — never store plaintext
ADMIN_TOKEN_SECRET=       # 64-char random string, rotate periodically

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=axiom-llm
OLLAMA_EMBED_MODEL=nomic-embed-text

# Redis (optional)
REDIS_URL=

# Sentry
SENTRY_DSN=

# Frontend (NEXT_PUBLIC_ prefix = exposed to browser)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Rate Limiting

| Endpoint group | Limit              | Window   | On exceed |
| -------------- | ------------------ | -------- | --------- |
| `/api/auth/*`  | 10 requests        | 1 minute | 429       |
| `/api/ai/*`    | 20 requests        | 1 minute | 429       |
| All others     | No limit (for now) | —        | —         |

Rate limits are stored as sliding windows in Redis. Key: `rate:{ip}:{endpoint_group}`.

---

## 16. Performance Strategy

### Caching Layers (outermost to innermost)

```
Browser cache (Cache-Control headers)
      │  Static assets cached at CDN (Vercel edge)
      ▼
Vercel Edge Cache
      │  SSR pages cached at edge (ISR — revalidate every 60s for listings)
      ▼
React Query (client-side)
      │  staleTime: 30s for listings, 5min for static pages, 0 for user-specific data
      ▼
Upstash Redis (server-side)
      │  AI response cache: keyed by hash of prompt + listing IDs, TTL 10min
      │  Expensive DB aggregates: agency counts, trending listings (TTL 5min)
      ▼
Supabase connection pool (PgBouncer)
      │  Max 25 connections per backend instance
      ▼
PostgreSQL query cache
```

### ISR (Incremental Static Regeneration)

Pages that benefit from ISR:

- `/property/[id]` — revalidate every 60 seconds
- `/blog/[slug]` — revalidate every hour
- `/agencies/[slug]` — revalidate every 5 minutes

Pages that must be dynamic (no ISR):

- `/dashboard/*` — user-specific, always fresh
- `/messages` — real-time

### Image Optimization

- All property images stored in Supabase Storage
- Next.js `<Image>` component handles: lazy loading, WebP conversion, responsive sizes
- Blur placeholder from Supabase's image transformation API (`?width=20&blur=10`)
- Never display raw full-resolution images — always use transformation parameters

---

## 17. Testing Strategy

### The Test Pyramid

```
         ╱ E2E ╲               Few (5–10 critical user flows)
        ╱────────╲
       ╱Integration╲           Some (each API endpoint, auth flows)
      ╱──────────────╲
     ╱   Unit tests   ╲        Many (service functions, utilities, schemas)
    ╱──────────────────╲
```

### Backend Tests (pytest)

**Tools:** `pytest` + `pytest-asyncio` + `httpx.AsyncClient` + `pytest-mock`

**What to test:**

```
tests/
├── conftest.py
│   ├── Fixture: test FastAPI client (TestClient wrapping app)
│   ├── Fixture: mock Supabase client (returns predictable test data)
│   └── Fixture: mock Ollama client (returns canned responses)
│
├── test_auth.py
│   ├── test_signup_creates_user
│   ├── test_login_returns_token
│   ├── test_invalid_credentials_returns_401
│   └── test_protected_route_without_token_returns_401
│
├── test_listings.py
│   ├── test_create_listing_as_authenticated_user
│   ├── test_create_listing_unauthenticated_returns_401
│   ├── test_listing_starts_as_pending
│   ├── test_fraud_score_below_threshold_auto_approves
│   ├── test_fraud_score_above_threshold_stays_pending
│   ├── test_update_listing_by_owner
│   ├── test_update_listing_by_non_owner_returns_403
│   ├── test_get_listings_returns_only_active
│   ├── test_search_filters_by_city_and_category
│   └── test_soft_delete_removes_from_public_list
│
├── test_ai.py
│   ├── test_chatbot_returns_response_when_ollama_up
│   ├── test_chatbot_returns_503_when_ollama_down
│   ├── test_fraud_analysis_flags_suspicious_listing
│   └── test_search_parses_natural_language_to_filters
│
└── test_admin.py
    ├── test_admin_login_returns_token
    ├── test_admin_endpoint_rejects_user_token
    └── test_admin_can_flag_listing
```

**Coverage target:** 80% line coverage on `service.py` files. Routers are thin — 60% is acceptable.

### Frontend Tests (Playwright)

**E2E tests for critical flows only:**

```
e2e/
├── auth.spec.ts        # signup, login, logout, OAuth
├── search.spec.ts      # search + filter + paginate
├── property.spec.ts    # view property, favorite, message listing owner
├── listing.spec.ts     # submit listing, verify pending status, approval notification
└── dashboard.spec.ts   # view my listings, my favorites, my viewings, edit profile
```

**Unit tests for utilities:**

```
src/lib/utils.test.ts   # formatPrice, formatDate, cn()
src/lib/api.test.ts     # error handling, token injection
```

### AI Testing

AI modules are tested with mocked Ollama responses:

```python
# conftest.py
@pytest.fixture
def mock_ollama(mocker):
    mocker.patch('app.ai.ollama_client.OllamaClient.generate',
                 return_value="Mocked LLM response")
    mocker.patch('app.ai.ollama_client.OllamaClient.embed',
                 return_value=[0.1] * 768)
```

This means AI tests run in CI without a running Ollama instance.

---

## 18. Development Environment (Day 1)

### Prerequisites

- Docker Desktop
- Node.js 20+
- Python 3.11+
- Ollama (for local AI — optional)

### docker-compose.yml

```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - OLLAMA_BASE_URL=http://ollama:11434
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./backend:/app
    depends_on: [redis]
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  ollama:
    image: ollama/ollama
    ports: ["11434:11434"]
    volumes:
      - ollama_data:/root/.ollama

volumes:
  ollama_data:
```

### First-time setup

```bash
# 1. Clone and copy env
git clone <repo>
cp backend/.env.example backend/.env   # fill in Supabase credentials
cp frontend/.env.example frontend/.env.local

# 2. Run schema migration
cd backend
alembic upgrade head

# 3. Pull AI models
ollama pull nomic-embed-text
ollama create axiom-llm -f ai-training/Modelfile

# 4. Start everything
docker compose up
```

The app is running at `localhost:3000`. Backend API at `localhost:8000`. Swagger UI at `localhost:8000/docs`.

---

## 19. CI/CD Pipeline

### GitHub Actions Workflows

**`.github/workflows/backend-ci.yml`** — runs on every PR to `main`:

```yaml
steps:
  - Checkout
  - Setup Python 3.11
  - Install dependencies (pip install -r requirements-dev.txt)
  - Lint: ruff check .
  - Type check: mypy app/
  - Test: pytest --cov=app --cov-fail-under=80
  - Security scan: pip-audit
```

**`.github/workflows/frontend-ci.yml`** — runs on every PR to `main`:

```yaml
steps:
  - Checkout
  - Setup Node 20
  - Install: npm ci
  - Lint: npm run lint
  - Type check: npx tsc --noEmit
  - Test: npm run test
  - Build check: npm run build  (catches runtime errors at deploy time)
```

**`.github/workflows/deploy.yml`** — runs on push to `main`:

```yaml
steps:
  - Backend tests pass → Railway auto-deploys from main
  - Frontend build passes → Vercel auto-deploys from main
```

### Branch Strategy

```
main          — production. Protected. Requires PR + CI pass + 1 review.
staging       — staging environment. Auto-deploy on merge.
feature/*     — feature branches. Short-lived. PR → staging → main.
fix/*         — bug fixes. Same flow.
```

**Rule:** Never commit directly to `main`. Every change goes through a PR. CI must pass. No exceptions, even for "small fixes."

### Preview Deployments

Vercel creates a preview URL for every PR. Share the PR preview URL for design review before merging. This means stakeholders never need to run the code locally.

---

## 20. Deployment Architecture

### Frontend: Vercel

- Zero-config Next.js deployment
- Automatic preview deployments per PR
- Edge CDN — static assets served from the nearest edge node
- ISR handled natively
- Environment variables set in Vercel dashboard (never in `.env` in the repo)

### Backend: Railway

- Dockerfile-based deployment
- `Procfile`: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment variables set in Railway dashboard
- Health check endpoint: `GET /health` → `{ "status": "ok", "version": "1.0.0" }`
- Zero-downtime deploys via Railway's rolling restart

### AI (Ollama): Separate GPU instance

Options in order of cost:

1. **RunPod / Vast.ai** — rent GPU by the hour. Cheapest for low-traffic.
2. **Hetzner dedicated GPU server** — fixed cost, best for consistent traffic.
3. **Claude API** — most reliable, pay-per-token. Switch by changing `OLLAMA_BASE_URL` to a Claude-compatible adapter.

The backend connects to Ollama via `OLLAMA_BASE_URL`. In production this is a remote GPU server URL. In development it is `http://localhost:11434`.

### Cloudflare Tunnel (for exposing local backend during dev)

```bash
cloudflared tunnel --url http://localhost:8000
# gives you a public HTTPS URL — useful for testing webhooks and OAuth redirects
```

### Environment Promotion

```
local .env → Railway staging env vars → Railway production env vars
                    │                            │
                  auto-deploy from staging   manual promote from staging
```

---

## 21. Monitoring & Observability

### Error Tracking: Sentry

Initialize in both backend and frontend on day 1. Not after launch.

**Backend:**

```python
import sentry_sdk
sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)
```

**Frontend:**

```typescript
Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0.1 });
```

Every unhandled exception is captured with: stack trace, request URL, user ID (if logged in), environment.

### Structured Logging

Every request log is JSON:

```json
{
  "timestamp": "2026-01-15T10:23:45Z",
  "level": "INFO",
  "method": "GET",
  "path": "/api/listings",
  "status": 200,
  "duration_ms": 87,
  "user_id": "uuid-or-null",
  "request_id": "uuid"
}
```

AI endpoint logs additionally include: `model`, `prompt_tokens`, `completion_tokens`, `latency_ms`.

Never log: passwords, tokens, PII (names, emails, phone numbers).

### Health Check Endpoint

```python
@app.get("/health")
async def health():
    checks = {
        "supabase": await _check_supabase(),
        "ollama": await ollama_client.health(),
        "redis": await _check_redis(),
    }
    all_ok = all(checks.values())
    return JSONResponse(
        status_code=200 if all_ok else 503,
        content={"status": "ok" if all_ok else "degraded", "checks": checks}
    )
```

Railway uses this endpoint for liveness checks. If it returns 503 three times in a row, Railway restarts the container.

---

## 22. Build Sequence

A senior developer builds in this order because **each phase de-risks the next one**. The things most likely to surprise you (data model, auth, deployment) come first.

Each phase is broken down by layer: **Database → Backend → Frontend → AI → DevOps/Infra → Testing**. Tasks within a layer must be done in order; layers within a phase can overlap once their dependencies are met.

---

### Phase 0 — Foundation

**Goal:** A running skeleton — both servers start, CI passes, and the production URLs are live — before a single feature is built.

#### Database

1. Create Supabase project. Copy `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Enable the `pgvector` extension in the Supabase SQL Editor: `CREATE EXTENSION IF NOT EXISTS vector;`
3. Run `backend/migrations/schema.sql` in the Supabase SQL Editor — this creates all 20 tables in one shot.
4. Verify all tables appear in the Supabase Table Editor.
5. Create 3 Supabase Storage buckets: `avatars` (public), `listings` (public), `attachments` (private).
6. Apply the starter RLS policies from `schema.sql` — confirm `profiles` and `listings` tables have RLS enabled.

#### Backend

1. Create `backend/` directory. Initialize Python 3.11 virtual environment.
2. Create `backend/requirements.txt` with: `fastapi`, `uvicorn[standard]`, `supabase`, `python-dotenv`, `sentry-sdk[fastapi]`, `httpx`, `redis`, `pgvector`, `Pillow`, `imagehash`.
3. Create `backend/app/config.py` — load all env vars from `.env` using `pydantic-settings`. Required vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `ADMIN_TOKEN_SECRET`, `SENTRY_DSN`, `REDIS_URL`.
4. Create `backend/app/main.py` — FastAPI app with title "AXIOM API", CORS middleware (allow `http://localhost:3000` and production Vercel URL), Sentry integration (`sentry_sdk.init`), and a `/health` endpoint returning `{"status": "ok", "version": "1.0.0"}`.
5. Create `backend/app/dependencies.py` — stub file with `get_supabase_client()` function (returns a `supabase.Client` instance using service role key).
6. Create `backend/.env.example` with all required variable names (empty values).
7. Smoke test: `uvicorn app.main:app --port 8000` → `GET /health` returns 200.

#### Frontend

1. Run `npx create-next-app@latest frontend --typescript --tailwind --app --src-dir`. Select: App Router yes, no Turbopack for now.
2. Install shadcn/ui: `npx shadcn@latest init`. Choose neutral theme, CSS variables yes.
3. Install core dependencies: `npm install zustand @tanstack/react-query @tanstack/react-query-devtools react-hook-form zod @hookform/resolvers framer-motion @supabase/supabase-js`.
4. Install shadcn components needed across the app: `npx shadcn@latest add button input card dialog select checkbox textarea badge avatar separator skeleton tabs sheet dropdown-menu switch progress pagination table`.
5. Create `frontend/src/lib/supabase.ts` — Supabase browser client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
6. Create `frontend/src/lib/utils.ts` — `cn()` helper (already generated by shadcn).
7. Create `frontend/src/lib/constants.ts` — `API_BASE_URL` pointing to `NEXT_PUBLIC_API_URL`.
8. Create `frontend/src/providers/Providers.tsx` — wraps children in `QueryClientProvider` (TanStack Query) and any future context providers.
9. Update `frontend/src/app/layout.tsx` — add `Providers`, `Navbar`, `Footer`. Import `globals.css`.
10. Create `frontend/src/components/layout/Navbar.tsx` — static nav with AXIOM logo and links. No auth yet.
11. Create `frontend/src/components/layout/Footer.tsx` — static footer with links.
12. Create `frontend/src/app/(marketing)/page.tsx` — static "coming soon" placeholder. Just enough to confirm the app renders.
13. Create `frontend/.env.local` from `.env.example`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL=http://localhost:8000`.
14. Smoke test: `npm run dev` → `http://localhost:3000` renders the placeholder page.

#### DevOps / Infra

1. Initialize git repo: `git init`, create `.gitignore` (ignore `venv/`, `node_modules/`, `.env`, `*.pyc`, `.next/`).
2. Create `.gitattributes` for consistent line endings.
3. Create `docker-compose.yml` with services: `backend` (FastAPI on port 8000), `frontend` (Next.js on port 3000). Add `ollama` service (image `ollama/ollama`) and `redis` (image `redis:alpine`). All services share a `axiom-network` bridge network.
4. Create `.github/workflows/ci.yml` — runs on push to all branches. Jobs: `lint-backend` (`flake8 backend/app`) and `lint-frontend` (`npm run lint` in `frontend/`). No tests yet — lint must pass from day one.
5. Deploy backend skeleton to Railway: connect GitHub repo, set environment variables, verify `/health` returns 200 on the Railway URL.
6. Deploy frontend skeleton to Vercel: connect GitHub repo, set `NEXT_PUBLIC_API_URL` to the Railway URL, verify the placeholder page loads.

#### Testing

1. Create `backend/tests/__init__.py` and `backend/tests/test_health.py`. Use `httpx.AsyncClient` + `pytest-asyncio` to hit `GET /health`. Assert status 200 and `{"status": "ok"}`.
2. Add `pytest`, `pytest-asyncio`, `httpx` to `requirements.txt`.
3. Verify: `pytest backend/tests/test_health.py` passes locally.
4. Add test step to `.github/workflows/ci.yml`: `pytest backend/tests/`.

**Done when:**

- [ ] `GET http://localhost:8000/health` → 200
- [ ] `npm run dev` → placeholder page renders at `localhost:3000`
- [ ] GitHub Actions CI passes (lint + health test) on first push
- [ ] Railway backend URL returns 200 on `/health`
- [ ] Vercel frontend URL renders placeholder page

**Why this order:** Deployment surprises (env vars, CORS, network config) surface when there is zero code complexity. Discover them now, not at 5000 lines.

---

### Phase 1 — Auth + User Model

**Goal:** Any user can sign up, log in, and be identified by the backend. Route protection works on the frontend. The admin panel has its own independent auth.

#### Database

1. Confirm `profiles` table: `id` (FK → `auth.users`), `email`, `full_name`, `avatar_url`, `phone`, `bio`, `role` (default `'user'`), `is_verified_seller` (default `false`), `created_at`.
2. Create the auto-insert trigger:

   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS trigger AS $$
   BEGIN
     INSERT INTO public.profiles (id, email, full_name, avatar_url, role, is_verified_seller)
     VALUES (
       new.id,
       new.email,
       new.raw_user_meta_data->>'full_name',
       new.raw_user_meta_data->>'avatar_url',
       'user',
       false
     );
     RETURN new;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

3. Enable RLS on `profiles`: public read, self-only write.
4. Enable Google OAuth in Supabase dashboard. Set redirect URL to `http://localhost:3000/auth/callback`.

#### Backend

1. Create `backend/app/auth/schemas.py` — `SignUpRequest` (`email`, `password`, `full_name`), `LoginRequest` (`email`, `password`), `TokenResponse` (`access_token`, `refresh_token`, `user`), `AdminLoginRequest` (`username`, `password`), `AdminTokenResponse` (`token`).
2. Create `backend/app/auth/service.py` — `sign_up()`, `sign_in()`, `refresh_token()`, `sign_out()`, `verify_admin_credentials()`.
3. Update `backend/app/dependencies.py` — `get_current_user()` (raises 401 if no token), `get_current_user_optional()` (returns None if no token), `require_listing_owner(listing_id, user)` (raises 403 if `owner_id != user.id`), `require_admin(token)` (verifies HMAC).
4. Create `backend/app/auth/router.py` — endpoints:
   - `POST /auth/signup` → calls `auth_service.sign_up()`
   - `POST /auth/login` → calls `auth_service.sign_in()`
   - `POST /auth/refresh` → calls `auth_service.refresh_token()`
   - `POST /auth/logout` → calls `auth_service.sign_out()`
   - `GET /auth/me` → returns current user from `get_current_user` dependency
   - `POST /auth/admin/login` → calls `auth_service.verify_admin_credentials()`
5. Register `auth_router` in `backend/app/main.py` with prefix `/auth`.

#### Frontend

1. Create `frontend/src/stores/authStore.ts` — Zustand store with state: `user`, `session`, `isLoading`. Actions: `setUser()`, `setSession()`, `clearAuth()`, `initAuth()` (calls `supabase.auth.getSession()` on mount).
2. Create `frontend/src/components/auth/OAuthIcons.tsx` — SVG icons for Google and Facebook.
3. Create `frontend/src/components/auth/OAuthButton.tsx` — button that calls `supabase.auth.signInWithOAuth({ provider: 'google' })`.
4. Create `frontend/src/components/auth/LoginForm.tsx` — React Hook Form + Zod schema. On submit: `POST /auth/login` via fetch, store tokens in authStore, redirect to `/`.
5. Create `frontend/src/components/auth/SignUpForm.tsx` — React Hook Form + Zod schema (email, full_name, password, confirm_password). On submit: `POST /auth/signup`, redirect to login with success message.
6. Create `frontend/src/components/auth/ForgotPasswordForm.tsx` — email input. On submit: `supabase.auth.resetPasswordForEmail()`.
7. Create `frontend/src/app/(auth)/layout.tsx` — centered card layout for auth pages.
8. Create `frontend/src/app/(auth)/login/page.tsx` — renders `LoginForm` + `OAuthButton`.
9. Create `frontend/src/app/(auth)/signup/page.tsx` — renders `SignUpForm` + `OAuthButton`.
10. Create `frontend/src/app/(auth)/forgot-password/page.tsx` — renders `ForgotPasswordForm`.
11. Create `frontend/src/app/auth/callback/page.tsx` — handles OAuth redirect: calls `supabase.auth.exchangeCodeForSession()`, updates authStore, redirects to `/`.
12. Update `frontend/middleware.ts` — protect routes `/dashboard/*`, `/messages`, `/admin/*`. Redirect unauthenticated users to `/login`. Redirect non-admins away from `/admin/*`.
13. Update `frontend/src/components/layout/Navbar.tsx` — show login/signup links when logged out; show user avatar + logout button when logged in (read from authStore).
14. Create `frontend/src/app/admin/login/page.tsx` — form posting to `POST /auth/admin/login`, stores admin JWT in `localStorage`.

#### Testing

1. Create `backend/tests/test_auth.py`:
   - `test_signup_success` — POST `/auth/signup` with valid data, assert 200 and token in response.
   - `test_signup_duplicate_email` — POST with existing email, assert 400.
   - `test_login_success` — POST `/auth/login`, assert access_token present.
   - `test_login_wrong_password` — assert 401.
   - `test_me_authenticated` — GET `/auth/me` with valid Bearer token, assert user object.
   - `test_me_unauthenticated` — GET `/auth/me` with no token, assert 401.
   - `test_admin_login_success` — POST `/auth/admin/login` with correct creds, assert token.
   - `test_admin_login_wrong_creds` — assert 401.
2. Use a test Supabase project (or mock the Supabase client) to avoid polluting production data.

**Done when:**

- [ ] `POST /auth/signup` creates a user and returns tokens
- [ ] `POST /auth/login` returns access token for valid credentials
- [ ] `GET /auth/me` returns the current user when Bearer token is provided
- [ ] Frontend login form authenticates and redirects to home
- [ ] Google OAuth flow completes and lands on `/auth/callback`
- [ ] Visiting `/dashboard` while logged out redirects to `/login`
- [ ] Admin login returns HMAC token
- [ ] All 8 auth tests pass

**Why this order:** Every subsequent feature needs `get_current_user`. Build it first, test it thoroughly.

---

### Phase 2 — Core Listings + Search

**Goal:** Any authenticated user can submit a listing. Listings start as `pending`, get fraud-scored, and either auto-approve or go to admin review. Visitors can search and view active listings. Images upload to Supabase Storage.

#### Database

1. Confirm `listings` table schema: `id`, `owner_id` (FK profiles), `title`, `description`, `category` (enum: `for_rent`/`for_sale`/`shared_housing`), `property_type` (enum: `apartment`/`villa`/`studio`/etc.), `price`, `area_sqm`, `bedrooms`, `bathrooms`, `location_name`, `city`, `latitude`, `longitude`, `amenities` (text[]), `images` (text[]), `status` (enum: `pending`/`active`/`rejected`/`sold`/`rented`), `fraud_score` (float, default 0), `embedding` (vector(768)), `view_count` (int, default 0), `project_id` (FK projects, nullable), `house_rules` (text, nullable — shared housing), `available_rooms` (int, nullable — shared housing), `lifestyle_tags` (text[], nullable — shared housing), `closed_with_user_id` (FK profiles, nullable — set when sold/rented), `deleted_at` (timestamp, nullable), `created_at`, `updated_at`.
2. Confirm `favorites` table: `user_id`, `listing_id`, composite PK, RLS: own rows only.
3. Confirm `listing_applications` table: `id`, `listing_id` (FK listings — must be `category = 'shared_housing'`), `applicant_id` (FK profiles), `lifestyle_data` (jsonb), `compatibility_score` (int), `status` (enum: `pending`/`approved`/`rejected`), `message`, `created_at`.
4. Confirm all indexes from Section 7 are applied (category, city, price, owner, pending status, HNSW embedding).
5. Apply RLS: active listings public read, owner full access. Favorites: own rows only. Applications: applicant or listing owner can read.

#### Backend

1. Create `backend/app/listings/schemas.py` — Pydantic models:
   - `ListingCreate`: `title`, `description`, `category`, `property_type`, `price`, `area_sqm`, `bedrooms`, `bathrooms`, `location_name`, `city`, `latitude`, `longitude`, `amenities`, `images`. Optional shared housing fields: `house_rules`, `available_rooms`, `lifestyle_tags`.
   - `ListingUpdate`: all fields optional.
   - `ListingResponse`: all fields + `owner_profile` (nested, public fields only) + `is_favorited` (bool, based on current user).
   - `ListingListResponse`: `items: list[ListingResponse]`, `total`, `page`, `page_size`.
   - `FavoriteResponse`: `listing_id`, `user_id`, `created_at`.
2. Create `backend/app/listings/service.py` — functions:
   - `create_listing(data, owner_id)`: inserts into `listings` with `status='pending'`, returns created row.
   - `get_listing(listing_id, current_user_id=None)`: fetches listing + owner profile join. Returns 404 if not found or `status != 'active'` (unless owner/admin).
   - `update_listing(listing_id, data, user_id)`: verifies ownership, updates row.
   - `delete_listing(listing_id, user_id)`: verifies ownership, deletes row.
   - `list_listings(filters, page, page_size)`: builds filter query (type, city, min/max price, bedrooms, status), returns paginated results.
   - `increment_view_count(listing_id)`: increments `view_count`.
   - `add_favorite(user_id, listing_id)`: inserts into `favorites`.
   - `remove_favorite(user_id, listing_id)`: deletes from `favorites`.
   - `get_user_favorites(user_id)`: returns listings the user has favorited.
3. Create `backend/app/listings/router.py` — endpoints:
   - `GET /listings` — list with filters + pagination (public)
   - `POST /listings` — create (requires `get_current_user`)
   - `GET /listings/{id}` — detail (public, increments view count)
   - `PUT /listings/{id}` — update (owner only)
   - `DELETE /listings/{id}` — delete (owner only)
   - `GET /listings/mine` — listings submitted by the current user (all statuses)
   - `POST /listings/{id}/favorite` — add favorite (authenticated)
   - `DELETE /listings/{id}/favorite` — remove favorite (authenticated)
   - `GET /listings/favorites/me` — current user's favorites
4. Create `backend/app/uploads/router.py` — endpoint:
   - `POST /uploads/signed-url` — body: `{ bucket, file_path, content_type }`. Calls `supabase.storage.from_(bucket).create_signed_upload_url(file_path)`. Returns `{ signed_url, path }`.
   - `DELETE /uploads` — body: `{ bucket, path }`. Calls `supabase.storage.from_(bucket).remove([path])`.
5. Create `backend/app/search/schemas.py` — `SearchRequest`: `q` (text), `type`, `city`, `min_price`, `max_price`, `min_bedrooms`, `max_bedrooms`, `min_area`, `max_area`, `page`, `page_size`. `SearchResponse`: same as `ListingListResponse`.
6. Create `backend/app/search/service.py` — `keyword_search(params)`: builds a Supabase query applying all provided filters. Supports `ilike` on `title` and `description` for text search. Returns paginated listings.
7. Create `backend/app/search/router.py` — endpoint:
   - `GET /search` — query params match `SearchRequest`, returns `SearchResponse`.
8. Register `listings_router`, `uploads_router`, `search_router` in `main.py`.

#### Frontend

1. Create `frontend/src/lib/api.ts` — typed `apiFetch(path, options)` wrapper: injects `Authorization: Bearer <token>` from authStore when present, throws typed errors on non-2xx.
2. Create `frontend/src/lib/queries.ts` — TanStack Query hooks:
   - `useListings(filters)` — `GET /listings`
   - `useListing(id)` — `GET /listings/{id}`
   - `useSearchListings(params)` — `GET /search`
   - `useFavorites()` — `GET /listings/favorites/me`
   - `useAddFavorite()` / `useRemoveFavorite()` — mutations
   - `useCreateListing()` / `useUpdateListing()` / `useDeleteListing()` — mutations
3. Update `frontend/src/components/find-homes/FilterSidebar.tsx` — wire all filter controls (type, city, price range, bedrooms) to URL search params. Remove all hardcoded mock data.
4. Update `frontend/src/components/find-homes/SearchListingCard.tsx` and `SearchListingRow.tsx` — accept `ListingResponse` prop type, remove mock data imports.
5. Update `frontend/src/app/find-homes/page.tsx` — call `useSearchListings(params)` from URL search params. Show loading skeleton (`SearchListingCard` with `Skeleton`), empty state, and paginated results.
6. Update `frontend/src/app/property/[id]/page.tsx` — call `useListing(id)`. Pass real data to `PropertyHero`, `PropertyInfo`, `PropertySidebar`.
7. Update `frontend/src/components/property/PropertyHero.tsx` — accept `ListingResponse` prop, display real images with `ImageLightbox`.
8. Update `frontend/src/components/property/PropertyInfo.tsx` — display real amenities, description, area, bedrooms.
9. Update `frontend/src/components/property/PropertySidebar.tsx` — display real owner profile (avatar, name, verified badge if `is_verified_seller`), favorite button wired to `useAddFavorite`/`useRemoveFavorite`.
10. Update `frontend/src/components/property/PropertyMap.tsx` and `LeafletMap.tsx` — pass real `latitude`/`longitude` from listing.
11. Create `frontend/src/components/dashboard/AddListingModal.tsx` — form (all `ListingCreate` fields, shared housing fields shown conditionally when category = `shared_housing`). Image upload: `POST /uploads/signed-url` → PUT to signed URL → include path in payload. Submits via `useCreateListing()`. On success: show "Your listing is pending review" message.
12. Create `frontend/src/components/property/MessageOwnerModal.tsx` — modal with textarea. On submit: `POST /messages/conversations` (Phase 3, stub for now).
13. Update `frontend/src/components/find-homes/Pagination.tsx` — wire to `total` + `page_size` from API response.

#### Testing

1. Create `backend/tests/test_listings.py`:
   - `test_create_listing_as_authenticated_user` — POST `/listings`, assert 201 and `status = 'pending'`.
   - `test_create_listing_unauthenticated` — assert 401.
   - `test_get_listing` — GET `/listings/{id}`, assert 200.
   - `test_get_listing_not_found` — assert 404.
   - `test_list_listings_no_filters` — GET `/listings`, assert paginated response.
   - `test_list_listings_with_filters` — filter by city + type, assert filtered results.
   - `test_update_listing_owner` — PUT by owner, assert 200.
   - `test_update_listing_non_owner` — assert 403.
   - `test_delete_listing_owner` — DELETE by owner, assert 204.
   - `test_add_and_remove_favorite` — add + remove, assert counts.
2. Create `backend/tests/test_search.py`:
   - `test_keyword_search` — GET `/search?q=studio+maadi`, assert results contain matching listings.
   - `test_price_filter` — assert results respect `min_price`/`max_price`.
   - `test_pagination` — assert `page=2` returns different results than `page=1`.
3. Create `backend/tests/test_uploads.py`:
   - `test_get_signed_url` — POST `/uploads/signed-url`, assert URL returned.

**Done when:**

- [ ] Any authenticated user can submit a listing via the Add Listing modal
- [ ] New listing is created with `status = 'pending'` — not visible in public search
- [ ] After fraud check: low-score listing auto-approves and appears in search; high-score stays pending
- [ ] User receives an in-app notification when their listing status changes
- [ ] Find Homes page shows real listings from the database
- [ ] Filters (city, type, price, bedrooms) correctly narrow results
- [ ] Property detail page shows real data including map
- [ ] Favorites add/remove works and persists
- [ ] All listing and search tests pass

---

### Phase 3 — Users + Messaging + Realtime + Notifications

**Goal:** Users can edit their profiles, message any other user (typically a listing owner) in real time, and receive in-app notifications via Supabase Realtime.

#### Database

1. Confirm `conversations` table: `id`, `user_a_id` (FK profiles), `user_b_id` (FK profiles), `listing_id` (FK listings, nullable), `last_message_at` (timestamp), `created_at`. Unique index on `(LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id), COALESCE(listing_id, ...))` — prevents duplicate threads.
2. Confirm `messages` table: `id`, `conversation_id` (FK), `sender_id` (FK profiles), `content`, `is_read`, `created_at`.
3. Confirm `notifications` table: `id`, `user_id` (FK profiles), `type` (text), `title`, `body`, `is_read` (bool, default false), `metadata` (jsonb), `created_at`.
4. Enable Supabase Realtime on `messages` and `notifications` tables (Supabase dashboard → Database → Replication).
5. Apply all RLS policies from Section 7: conversations participants only, messages participants only, notifications owner only.

#### Backend

1. Create `backend/app/users/schemas.py` — `ProfileUpdate`: `full_name`, `phone`, `avatar_url` (all optional). `ProfileResponse`: all profile fields.
2. Create `backend/app/users/service.py` — functions: `get_profile(user_id)`, `update_profile(user_id, data)`, `upload_avatar(user_id, file)` (calls uploads service, updates `avatar_url`).
3. Create `backend/app/users/router.py` — endpoints:
   - `GET /users/me` — current user's full profile
   - `PUT /users/me` — update profile
   - `POST /users/me/avatar` — upload avatar (multipart form)
   - `GET /users/{id}` — public profile (read-only)
4. Create `backend/app/messages/schemas.py` — `ConversationCreate`: `recipient_id`, `listing_id` (optional), `initial_message`. `MessageCreate`: `content`. `MessageResponse`: `id`, `sender_id`, `content`, `is_read`, `created_at`. `ConversationResponse`: `id`, `listing`, `other_participant` (profile of the other user), `last_message`, `unread_count`.
5. Create `backend/app/messages/service.py` — functions:
   - `get_or_create_conversation(user_a_id, user_b_id, listing_id)`: uses the unique index to find existing conversation or creates new one.
   - `send_message(conversation_id, sender_id, content)`: inserts message, creates notification for recipient.
   - `get_conversations(user_id)`: returns all conversations with last message + unread count.
   - `get_messages(conversation_id, user_id, page, page_size)`: returns paginated messages, marks them as read.
   - `mark_conversation_read(conversation_id, user_id)`: bulk-marks messages as read.
6. Create `backend/app/messages/router.py` — endpoints:
   - `GET /messages/conversations` — list user's conversations
   - `POST /messages/conversations` — start a new conversation
   - `GET /messages/conversations/{id}` — get single conversation
   - `GET /messages/conversations/{id}/messages` — paginated message history
   - `POST /messages/conversations/{id}/messages` — send a message
   - `PUT /messages/conversations/{id}/read` — mark as read
7. Create `backend/app/notifications/schemas.py` — `NotificationResponse`: `id`, `type`, `title`, `body`, `is_read`, `metadata`, `created_at`. `NotificationCreate`: internal use only (called from other services).
8. Create `backend/app/notifications/service.py` — `create_notification(user_id, type, title, body, metadata)`, `get_notifications(user_id, unread_only)`, `mark_read(notification_id, user_id)`, `mark_all_read(user_id)`.
9. Create `backend/app/notifications/router.py` — endpoints:
   - `GET /notifications` — list (supports `?unread_only=true`)
   - `PUT /notifications/{id}/read` — mark single read
   - `PUT /notifications/read-all` — mark all read
10. Register `users_router`, `messages_router`, `notifications_router` in `main.py`.

#### Frontend

1. Update `frontend/src/app/messages/page.tsx` — replace all mock data with real API calls.
2. Update `frontend/src/components/messages/InboxSidebar.tsx` — call `useConversations()` query. Subscribe to Supabase Realtime channel `realtime:public:messages` filtered by current user's conversation IDs. Invalidate query on new message event to update last message + unread count.
3. Update `frontend/src/components/messages/ChatArea.tsx` — call `useMessages(conversationId)` query. Subscribe to Supabase Realtime on `messages` table filtered by `conversation_id`. Append new messages in real time without refetching. Send message via `useSendMessage()` mutation. Auto-scroll to bottom on new message.
4. Update `frontend/src/components/property/MessageOwnerModal.tsx` — wire submit to `POST /messages/conversations` with `recipient_id = listing.owner_id`. Redirect to `/messages` on success.
5. Update `frontend/src/app/dashboard/page.tsx` — single unified dashboard, replace all mock data.
6. Create `frontend/src/components/dashboard/UserProfileSection.tsx` — fetch real profile from `useProfile()`, wire edit form to `useUpdateProfile()`. Avatar upload: file input → `POST /uploads/signed-url` → PUT to signed URL → `PUT /users/me`.
7. Create `frontend/src/components/dashboard/LikedProperties.tsx` — call `useFavorites()`.
8. Create `frontend/src/components/dashboard/MyViewings.tsx` — upcoming viewings where user is requester or owner, with confirm/cancel buttons.
9. Update `frontend/src/components/layout/Navbar.tsx` — add notification bell. Fetch real notifications from `useNotifications()`. Subscribe to Supabase Realtime on `notifications` filtered by `user_id`. Show unread count badge. On click: dropdown shows recent notifications, mark as read.
10. Create `frontend/src/components/layout/NotificationDropdown.tsx` — renders real notification list with type icons and timestamps.
11. Add "Recent Messages" section to the user dashboard — call `useConversations()`, show 5 most recent.
12. Add `useConversations()`, `useMessages(id)`, `useSendMessage()`, `useNotifications()`, `useMarkNotificationRead()`, `useMarkAllRead()`, `useProfile()`, `useUpdateProfile()` hooks to `frontend/src/lib/queries.ts`.

#### Testing

1. Create `backend/tests/test_users.py`:
   - `test_get_my_profile` — GET `/users/me`, assert full profile returned.
   - `test_update_profile` — PUT `/users/me`, assert updated fields.
   - `test_get_public_profile` — GET `/users/{id}`, assert public fields only.
2. Create `backend/tests/test_messages.py`:
   - `test_create_conversation` — POST `/messages/conversations`, assert conversation created.
   - `test_send_message` — POST message to conversation, assert message in history.
   - `test_get_conversations` — assert conversations list includes new conversation.
   - `test_mark_read` — send message, mark read, assert `is_read=true`.
   - `test_notification_created_on_message` — send message, assert recipient has notification.
3. Create `backend/tests/test_notifications.py`:
   - `test_get_notifications` — assert notifications list.
   - `test_mark_notification_read`.
   - `test_mark_all_read`.

**Done when:**

- [ ] Any user can message a listing owner from the property page
- [ ] Messages page shows real conversations with live updates (no page refresh needed)
- [ ] Notification bell shows unread count, updates in real time
- [ ] User can edit their profile and upload an avatar
- [ ] All user, message, and notification tests pass

---

### Phase 4 — AI Features

**Goal:** All 6 AI modules are live and integrated into the frontend. Fraud detection runs automatically on every new listing. Chatbot streams responses.

#### Database

1. Confirm `listing_embeddings` table (or `embedding` column on `listings`): stores 768-dim vectors.
2. Confirm `chatbot_sessions` is handled in memory (the service stores history in a dict keyed by session ID). No DB table needed unless persistence is required.
3. Run the batch embedding job (below) to backfill embeddings for all existing listings.

#### Backend

1. Create `backend/app/ai/ollama_client.py` — HTTP wrapper around Ollama API:
   - `generate(prompt, model, system_prompt, temperature)` → returns text string.
   - `embed(text, model)` → returns `list[float]` (768-dim).
   - `stream(prompt, model, system_prompt)` → async generator yielding text chunks.
   - `health()` → returns `True` if Ollama is reachable, `False` otherwise. All methods catch `httpx.ConnectError` and raise `AIUnavailableError`.
2. Create `backend/app/ai/embeddings.py` — functions:
   - `embed_listing(listing_id)`: fetches listing, generates embedding via `ollama_client.embed()`, upserts into `listings.embedding`.
   - `batch_embed_all()`: fetches all listings with null embeddings, embeds in batches of 10 with 1s delay between batches.
   - `similarity_search(query_embedding, limit, filters)`: calls Supabase RPC `match_listings` (pgvector cosine similarity function — create this SQL function in schema).
3. Create `backend/app/ai/chatbot.py` — RAG chatbot:
   - `SESSION_STORE: dict[str, list]` — in-memory session history (max 10 turns per session).
   - `get_context(query)`: embeds query, calls `similarity_search()`, formats top-5 listing titles + summaries as context string.
   - `chat(session_id, message)`: builds RAG prompt (system prompt + context + history + user message), calls `ollama_client.stream()`, stores turn in session, returns async generator of chunks.
   - `stream_response(session_id, message)` → SSE response using FastAPI `StreamingResponse` with `text/event-stream` content type. Format: `data: <chunk>\n\n`. Sends `data: [DONE]\n\n` when stream ends.
4. Create `backend/app/ai/recommender.py` — preference-based ranking:
   - `recommend(user_id, preferences)`: `preferences` is `{ budget, location, property_type, bedrooms, lifestyle_vibes }`. Embeds a "preference description" string. Calls `similarity_search()` with pgvector. Re-ranks by price fit + bedroom match. Returns top-10 listings with a `reason` string each.
5. Create `backend/app/ai/search.py` — natural language query parser:
   - `parse_nl_query(query_text)`: sends query to LLM with a structured prompt asking it to extract `{ city, min_price, max_price, bedrooms, property_type, keywords }` as JSON. Falls back to empty filters if LLM output is not valid JSON.
   - `nl_search(query_text, page, page_size)`: calls `parse_nl_query()`, merges structured filters with keyword search, returns listings.
6. Create `backend/app/ai/description.py` — bilingual description generator:
   - `generate_description(listing_data)`: takes raw listing fields (type, price, area, location, amenities), returns `{ english: str, arabic: str }`. Uses two separate LLM calls (or one with bilingual prompt).
7. Create `backend/app/ai/fraud.py` — 4-step pipeline:
   - Step 1 `price_anomaly(listing)`: compare listing price to city/type average (from DB). Score increases if price is >40% below average.
   - Step 2 `owner_reputation(owner_id)`: fetch owner's previously rejected listing count, flagged listing rate, account age, listing submission frequency. Score increases for new accounts submitting many listings quickly.
   - Step 3 `image_hash_check(image_urls)`: download images, compute perceptual hash via `imagehash`. Compare against hashes of other listings in DB. Score increases for duplicate images across different owners.
   - Step 4 `llm_consistency_check(listing)`: prompt LLM to check if title, description, price, and location are internally consistent. Score increases if LLM flags inconsistency.
   - `score_listing(listing_id)`: runs all 4 steps, returns combined `fraud_score` (0.0–1.0). Listings ≥ 0.6 are auto-set to `status="pending"` for admin review.
   - Wire: call `score_listing` as a FastAPI `BackgroundTask` in `POST /listings`.
8. Create `backend/app/ai/compatibility.py` — roommate compatibility:
   - `score_compatibility(applicant_profile, existing_tenants)`: takes lifestyle attributes (`sleep_schedule`, `cleanliness`, `noise_tolerance`, `smoking`, `pets`). Applies weighted rules (e.g. `night_owl` vs `early_bird` = −15 points). Returns `{ score: int, justification: str }`.
9. Create `backend/app/ai/router.py` — endpoints:
   - `POST /ai/chat/stream` — body: `{ session_id, message }`. Returns SSE `StreamingResponse`.
   - `POST /ai/recommend` — body: `{ preferences }`. Returns `list[ListingResponse]` with `reason` field.
   - `POST /ai/search` — body: `{ query }`. Returns `SearchResponse`.
   - `POST /ai/generate-description` — body: listing fields. Returns `{ english, arabic }`.
   - `POST /ai/score-fraud/{listing_id}` — manual trigger (admin only). Returns `fraud_score`.
   - `POST /ai/compatibility` — body: `{ applicant, tenants }`. Returns `{ score, justification }`.
   - `GET /ai/health` — returns Ollama availability status.
10. Register `ai_router` in `main.py` with prefix `/ai`.

#### Frontend

1. Update `frontend/src/components/ai/ChatDrawer.tsx` — replace mock/static content:
   - On send: call `POST /ai/chat/stream` with `fetch` and `ReadableStream` / `EventSource`.
   - Parse SSE chunks: accumulate text, update message state on each chunk.
   - Show typing indicator while streaming. Disable input while response is streaming.
   - Generate `session_id` on drawer open (store in component state, not URL).
2. Update `frontend/src/components/ai/ChatMessage.tsx` — render markdown in assistant messages (use `react-markdown`).
3. Update `frontend/src/components/layout/FloatingAIButton.tsx` — wire to open `ChatDrawer`. Show online/offline indicator based on `GET /ai/health`.
4. Create `frontend/src/components/layout/ChatbotConditional.tsx` — renders `FloatingAIButton` + `ChatDrawer` only on non-admin, non-auth pages (check pathname).
5. Update `frontend/src/components/sections/RecommendationsSection.tsx` — fetch from `POST /ai/recommend`. Show skeleton while loading. Pass user preferences from authStore (or show generic recommendations for guests).
6. Create `frontend/src/components/sections/RecommendationsSectionClient.tsx` — client wrapper for `RecommendationsSection` (needed for `"use client"` boundary in server component layout).
7. Update `frontend/src/components/sections/VibeMatchesSection.tsx` — wire lifestyle vibe filters to `POST /ai/recommend` with `lifestyle_vibes` param.
8. Update `frontend/src/app/find-homes/page.tsx` — add NL search input above filters. On submit, call `POST /ai/search` and display results. Show "Powered by AI" badge on AI-search results.
9. Update `frontend/src/components/shared-housing/CompatibilityScore.tsx` — call `POST /ai/compatibility`. Show score percentage and justification text.
10. Update `frontend/src/components/dashboard/AddListingModal.tsx` — add "Generate Description" button. On click: call `POST /ai/generate-description` with current form values, populate English and Arabic description fields.
11. Add `useChatStream()`, `useRecommendations()`, `useNLSearch()`, `useGenerateDescription()`, `useCompatibility()` hooks to `frontend/src/lib/queries.ts`.

#### AI

1. Create `backend/scripts/batch_embed.py` — standalone script calling `embeddings.batch_embed_all()`. Run once after Phase 2 to backfill all existing listings. Run again after adding seed data in Phase 5.
2. Create the pgvector SQL function in Supabase:
   ```sql
   CREATE OR REPLACE FUNCTION match_listings(
     query_embedding vector(768),
     match_threshold float DEFAULT 0.7,
     match_count int DEFAULT 10,
     filter_city text DEFAULT NULL
   )
   RETURNS TABLE (id uuid, similarity float)
   LANGUAGE sql STABLE AS $$
     SELECT id, 1 - (embedding <=> query_embedding) AS similarity
     FROM listings
     WHERE (filter_city IS NULL OR city = filter_city)
       AND status = 'active'
       AND 1 - (embedding <=> query_embedding) > match_threshold
     ORDER BY similarity DESC
     LIMIT match_count;
   $$;
   ```

#### Testing

1. Create `backend/tests/test_ai.py` — all tests mock `ollama_client` to avoid needing a running Ollama:
   - `test_chatbot_returns_stream` — POST `/ai/chat/stream`, assert SSE response with correct content type.
   - `test_recommendations_returns_listings` — POST `/ai/recommend` with preferences, assert list of listings.
   - `test_nl_search_parses_query` — mock LLM output as `{"city": "Maadi", "max_price": 5000}`, assert search is called with those filters.
   - `test_description_generator_returns_bilingual` — mock LLM, assert both `english` and `arabic` keys.
   - `test_fraud_score_low_for_normal_listing` — create normal listing, assert `fraud_score < 0.4`.
   - `test_fraud_score_high_for_suspicious_listing` — duplicate images + below-market price, assert `fraud_score >= 0.6`.
   - `test_compatibility_score_night_owl_vs_early_bird` — assert score reduced by 15 points for conflicting schedules.
   - `test_ai_health_when_ollama_up` — mock Ollama responding, assert `{"status": "available"}`.
   - `test_ai_health_when_ollama_down` — mock Ollama not responding, assert `{"status": "unavailable"}` (not 500).

**Done when:**

- [ ] Chatbot responds in the floating drawer with streamed text
- [ ] Home page recommendations load real listings from the AI ranker
- [ ] NL search in Find Homes parses a free-text query into filters
- [ ] "Generate Description" button populates the Add Listing form
- [ ] Compatibility score appears on shared housing pages
- [ ] Fraud detection runs as a background task on listing creation
- [ ] All 9 AI tests pass with mocked Ollama

**Note:** Deploy fraud detection before any real listings go live. Never let unscored listings accumulate in production.

---

### Phase 5 — Supporting Features

**Goal:** All remaining pages are wired to the live API. Shared housing, agencies, projects, blog, viewings, and the full user dashboard and admin panel are functional.

#### Database

1. Shared housing: confirm nullable columns on `listings` table (`house_rules`, `available_rooms`, `lifestyle_tags`) and `listing_applications` table — both created in Phase 2 DB.
2. Confirm `agencies` table: `id`, `name`, `slug`, `description`, `logo_url`, `cover_url`, `website`, `phone`, `email`, `city`, `verified`, `owner_id` (FK profiles), `created_at`.
3. Confirm `projects` table: `id`, `agency_id` (FK), `name`, `slug`, `description`, `location_name`, `city`, `delivery_year`, `images` (text[]), `price_from`, `price_to`, `total_units`, `available_units`, `created_at`. Project units are `listings` rows with `project_id` FK — no separate residences table.
4. Confirm `blog_posts` table: `id`, `author_id` (FK profiles), `title`, `slug`, `content`, `excerpt`, `cover_image`, `category`, `tags` (text[]), `is_published` (bool), `published_at`, `reading_time_minutes`, `created_at`.
5. Confirm `viewings` table: `id`, `listing_id` (FK), `requester_id` (FK profiles), `owner_id` (FK profiles), `scheduled_at`, `status`, `notes`, `created_at`.
6. Run `backend/scripts/batch_embed.py` to embed any newly inserted seed listings.
7. Run `backend/scripts/batch_embed.py` again after any seed data is inserted.

#### Backend

1. Create `backend/app/shared_housing/schemas.py`, `service.py`, `router.py`:
   - No separate `shared_housing` module. Shared housing listings are served by the existing `listings` router using `?category=shared_housing` filter. Add to `listings` router: `POST /listings/{id}/apply` (authenticated user submits application with lifestyle data — only valid when `category = 'shared_housing'`), `GET /listings/{id}/applications` (listing owner sees applicants + compatibility scores), `PUT /listings/{id}/applications/{app_id}` (owner approves or rejects applicant).
2. Create `backend/app/agencies/schemas.py`, `service.py`, `router.py`:
   - Endpoints: `GET /agencies` (list), `GET /agencies/{slug}`, `POST /agencies/{id}/follow`, `DELETE /agencies/{id}/follow`, `GET /agencies/{id}/followers-count`.
3. Create `backend/app/projects/schemas.py`, `service.py`, `router.py`:
   - Endpoints: `GET /projects` (list), `GET /projects/{id}` (with residences), `POST /projects` (admin/agency only), `PUT /projects/{id}`, `DELETE /projects/{id}`.
4. Create `backend/app/blog/schemas.py`, `service.py`, `router.py`:
   - Endpoints: `GET /blog` (list, supports `?category=`, `?tag=`), `GET /blog/{slug}`, `POST /blog` (admin only), `PUT /blog/{slug}` (admin only), `DELETE /blog/{slug}` (admin only), `GET /blog/categories` (distinct category list).
5. Create `backend/app/viewings/schemas.py`, `service.py`, `router.py`:
   - Endpoints: `GET /viewings/mine` (all viewings where user is requester OR owner), `POST /viewings` (authenticated user requests — body: `listing_id`, `scheduled_at`, `notes`), `PUT /viewings/{id}` (listing owner confirms/cancels; requester can also cancel), `DELETE /viewings/{id}` (requester cancels before confirmation).
6. Create `backend/app/dashboard/schemas.py`, `service.py`, `router.py`:
   - `GET /dashboard/stats` → `{ my_active_listings, my_pending_listings, total_views_on_my_listings, unread_messages, upcoming_viewings }`. One endpoint for all users — each user sees stats about their own activity.
   - `GET /dashboard/my-listings` → user's own listings (all statuses) with view counts and application counts.
   - `GET /dashboard/activity` → recent activity feed: new messages, listing status changes, viewing confirmations.
7. Create `backend/app/admin/schemas.py`, `router.py`:
   - All endpoints require `require_admin`.
   - `GET /admin/users` — paginated user list with search.
   - `PUT /admin/users/{id}` — update `role`, `is_verified_seller`, or soft-ban (set `banned_at`).
   - `PUT /admin/users/{id}/verify` — grant verified seller badge (`is_verified_seller = true`).
   - `GET /admin/listings` — paginated, supports `?status=pending` to show the review queue.
   - `PUT /admin/listings/{id}/approve` — sets `status = 'active'`, notifies owner.
   - `PUT /admin/listings/{id}/reject` — body: `{ reason }`. Sets `status = 'rejected'`, notifies owner with reason.
   - `GET /admin/pending-queue` — listings with `status = 'pending'` sorted by `fraud_score DESC`.
   - `GET /admin/stats` — platform-wide counts: total users, active listings, pending listings, messages today.
8. Register all new routers in `main.py`.

#### Frontend

1. Update `frontend/src/app/shared-housing/[id]/page.tsx` — call `useSharedHousing(id)`, wire all sub-components.
2. Update `frontend/src/components/shared-housing/SharedHousingHero.tsx`, `AboutHouse.tsx`, `SharedAmenities.tsx`, `SharedHousingStats.tsx`, `HousematesSection.tsx` — accept real data props, remove mock imports.
3. Update `frontend/src/components/shared-housing/SharedHousingSidebar.tsx` — wire "Apply" button to `POST /shared-housing/{id}/apply` with lifestyle form modal.
4. Update `frontend/src/app/agencies/page.tsx` and `[slug]/page.tsx` — call `useAgencies()` / `useAgency(slug)`.
5. Update `frontend/src/components/agencies/DeveloperCard.tsx`, `DevelopersSection.tsx`, `UniversitiesSection.tsx`, `UniversityCard.tsx` — accept real data.
6. Update `frontend/src/components/agency-details/AgencyHero.tsx`, `AgencySidebar.tsx`, `FeaturedProjects.tsx`, `TopListings.tsx` — wire to real agency data.
7. Update `frontend/src/app/project/[id]/page.tsx` — call `useProject(id)`, wire `ProjectHero`, `ProjectInfo`, `ProjectSidebar`. Units are listings — use `useListings({ project_id: id })` to display them as listing cards instead of a separate residences grid.
8. Update `frontend/src/app/blog/page.tsx` and `[slug]/page.tsx` — call `useBlogs()` / `useBlogPost(slug)`.
9. Update all blog components (`BlogHero.tsx`, `BlogCard.tsx`, `BlogGrid.tsx`, `BlogSidebar.tsx`, `ArticleBody.tsx`, `ArticleHero.tsx`, `ArticleSidebar.tsx`, `RelatedArticles.tsx`, `NewsletterCTA.tsx`) — accept real data props.
10. Update `frontend/src/app/dashboard/page.tsx` — single unified dashboard. Sections: Profile (edit), My Listings (with status badges: active/pending/rejected), My Favorites, My Viewings, Recent Messages. Call `useDashboardStats()`, `useMyListings()`, `useFavorites()`, `useViewings()`, `useConversations()`.
11. Create `frontend/src/components/dashboard/MyListings.tsx` — table of user's own listings with status badge (green=active, yellow=pending, red=rejected), view count, edit/delete actions. Pending listings show fraud score and "Under Review" notice. Rejected listings show the rejection reason.
12. Create `frontend/src/components/dashboard/DashboardStats.tsx` — stat cards from `/dashboard/stats`.
13. Update `frontend/src/app/admin/dashboard/page.tsx` and `frontend/src/components/admin/AdminTable.tsx` — call admin API endpoints. Wire `AdminModal` for approve/reject actions.
14. Update `frontend/src/app/(marketing)/page.tsx` (home page) — wire `HomeHero`, `FeaturesSection`, `HowItWorksSection`, `TestimonialsSection`, `TrustedPartners`, `NeighborhoodGuides`, `CTASection`. Replace all mock data.
15. Update `frontend/src/app/about/page.tsx` — wire `AboutHero`, `MissionAndValues`, `TeamSection`.
16. Create `frontend/src/components/cards/ListingCard.tsx` — reusable listing card used on home page featured section. Wire to real data.
17. Add all remaining query hooks to `frontend/src/lib/queries.ts`.
18. Update `frontend/src/lib/admin/api.ts` — typed admin API wrapper that injects the admin JWT from `localStorage`.

#### Testing

1. Create `backend/tests/test_shared_housing.py` — create listing, submit application, assert compatibility score stored.
2. Create `backend/tests/test_agencies.py` — GET agencies list, GET single agency, follow/unfollow.
3. Create `backend/tests/test_projects.py` — GET project with residences.
4. Create `backend/tests/test_blog.py` — GET blog list, GET by slug, assert 404 for unknown slug.
5. Create `backend/tests/test_viewings.py` — user requests viewing, listing owner confirms, requester cancels.
6. Create `backend/tests/test_dashboard.py` — GET `/dashboard/stats`, assert all keys present and values are correct for the current user's data.
7. Create `backend/tests/test_admin.py` — approve listing, reject listing, get fraud queue (all using admin JWT).

**Done when:**

- [ ] All 16 frontend pages render real data (zero mock imports remain)
- [ ] Shared housing application flow works end to end
- [ ] User dashboard shows real stats, own listings with status badges, real messages and viewings
- [ ] Admin can approve and reject listings from the fraud queue
- [ ] Blog pages render real posts with correct slugs
- [ ] All 7 supporting-feature test files pass

---

### Phase 6 — Hardening

**Goal:** The platform is production-ready: secure, observable, tested end to end, and deployable in one command.

#### Database

1. Audit every RLS policy: for each table, manually test that an unauthenticated request and a request from the wrong user both return 0 rows or an error — not the protected data.
2. Confirm `pgvector` HNSW index is built (`SELECT * FROM pg_indexes WHERE tablename = 'listings'`).
3. Review all `SECURITY DEFINER` functions — confirm none expose data beyond their intended scope.

#### Backend

1. Implement Upstash Redis rate limiting middleware in `backend/app/main.py`:
   - `POST /ai/*` endpoints: 20 requests / minute per IP.
   - `POST /auth/signup` and `POST /auth/login`: 10 requests / minute per IP.
   - All other endpoints: 200 requests / minute per IP.
   - On exceeded limit: return 429 with `Retry-After` header.
2. Implement Redis caching in `backend/app/ai/chatbot.py` and `backend/app/ai/recommender.py`: cache responses keyed by `hash(prompt)` for 5 minutes.
3. Lock down CORS: replace wildcard origins with explicit list (`localhost:3000`, production Vercel URL).
4. Run `pip-audit` — fix or document all high and critical CVEs in `requirements.txt`.
5. Rotate `ADMIN_TOKEN_SECRET` in production environment variables. Ensure old tokens are invalidated.
6. Change default admin credentials (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) in production env.
7. Search codebase for `TODO`, `FIXME`, `HACK`, `XXX` comments: resolve all or convert to GitHub issues. Zero go to production.
8. Add `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security` response headers to all FastAPI responses via middleware.

#### Frontend

1. Verify Sentry is receiving browser errors: throw a test error in dev, confirm it appears in the Sentry dashboard.
2. Run `npm audit` — fix or document all high and critical CVEs in `package.json`.
3. Audit all `error.tsx` boundary files (`frontend/src/app/error.tsx`, `find-homes/error.tsx`, etc.) — confirm they render a useful message and don't expose stack traces.
4. Add `<meta>` SEO tags to all public pages (`og:title`, `og:description`, `og:image`, `twitter:card`). Priority: home, property detail, blog post, agency detail.
5. Verify `next.config.ts` has `images.domains` configured for Supabase Storage URLs.
6. Run Lighthouse audit on the home page and property detail page. Resolve any Performance < 70 or Accessibility < 90 findings.
7. Verify `middleware.ts` correctly protects all private routes. Test: paste a `/dashboard` URL while logged out — must redirect to `/login`.

#### DevOps / Infra

1. Update `docker-compose.yml` for production: add `restart: unless-stopped`, remove dev volume mounts, use production env files.
2. Set up GitHub Actions full pipeline in `.github/workflows/ci.yml`:
   - `lint-backend`: `flake8 backend/app`
   - `test-backend`: `pytest backend/tests/ --cov=app --cov-report=xml`
   - `lint-frontend`: `npm run lint` in `frontend/`
   - `build-frontend`: `npm run build` in `frontend/`
   - All jobs run in parallel on pull requests. `test-backend` and `build-frontend` are required checks before merge to `main`.
3. Set up Cloudflare Tunnel (for demo/portfolio): `cloudflared tunnel --url http://localhost:8000`. Record the public URL. Update `NEXT_PUBLIC_API_URL` on Vercel with the tunnel URL for the demo deployment.
4. Enable Vercel Preview Deployments — every PR to `main` gets a preview URL.
5. Configure Railway auto-deploy from `main` branch only (not feature branches).

#### Testing

1. Create `backend/tests/test_rate_limiting.py`:
   - `test_ai_rate_limit` — send 21 requests to `POST /ai/chat/stream` in rapid succession, assert 21st returns 429.
   - `test_auth_rate_limit` — same for login endpoint.
2. Create `backend/tests/test_security.py`:
   - `test_idor_listing_update` — user A attempts to update user B's listing, assert 403.
   - `test_idor_message_read` — user A attempts to read user B's private conversation, assert 403.
   - `test_sql_injection_search` — pass `'; DROP TABLE listings; --` as search query, assert 200 (not 500) and no data loss.
   - `test_admin_endpoint_requires_admin_jwt` — call admin endpoint without token, assert 401.
3. Write Playwright E2E tests in `frontend/e2e/`:
   - `e2e/auth.spec.ts` — sign up, log in, log out.
   - `e2e/search.spec.ts` — visit find-homes, apply filters, click a listing, verify detail page loads.
   - `e2e/messaging.spec.ts` — user A messages user B (listing owner) from the property page; user B replies.
   - `e2e/listing-submission.spec.ts` — user logs in, submits a listing, verifies status is pending in their dashboard, admin approves, listing appears in public search.
   - `e2e/admin.spec.ts` — admin logs in, approves a pending listing.
4. Load test the search endpoint with `locust` or `k6`: 100 concurrent users, ramp over 60 seconds. Target: p95 response time < 500ms. Document results in `Docs/MAIN/PERFORMANCE.md`.

**Done when:**

- [ ] Rate limiting returns 429 when limits are exceeded
- [ ] IDOR test: user cannot read or modify another user's private data
- [ ] SQL injection test: malicious query string does not cause 500 or data loss
- [ ] All 5 E2E tests pass against the production Vercel + Railway deployment
- [ ] Load test: p95 < 500ms at 100 concurrent users on `/search`
- [ ] GitHub Actions CI is green on `main` (lint + tests + build all pass)
- [ ] Vercel + Railway both auto-deploy on push to `main`
- [ ] Zero `TODO`/`FIXME` comments in production code

---

## 23. Architecture Decision Records (ADRs)

An ADR is a short document recording a significant technical decision: what was decided, why, and what alternatives were rejected. Write one every time you make a decision you might want to revisit.

Store them in `Docs/ADR/`.

### ADR-001: FastAPI over Node.js

**Decision:** Use FastAPI (Python) for the backend.
**Rationale:** The AI pipeline (Ollama, embeddings, fraud detection) lives in the Python ecosystem. Keeping the backend in Python means the AI code and the API code share the same language, dependencies, and runtime.
**Rejected:** Express.js (wrong ecosystem for AI), Django (too opinionated).

### ADR-002: Supabase over managed RDS + custom auth

**Decision:** Use Supabase for database, auth, storage, and realtime.
**Rationale:** A single managed platform replaces four separate services. For a startup-speed build, the DX gain outweighs the vendor lock-in risk.
**Rejected:** AWS RDS + Cognito + S3 + API Gateway (too much ops work for MVP).

### ADR-003: Ollama (local) for development, swappable for production

**Decision:** Develop against Ollama locally. Keep AI provider behind a single `OllamaClient` abstraction.
**Rationale:** Zero API cost during development. The abstraction means switching to Claude API requires one line change.
**Rejected:** Always using Claude API (expensive during development, dependent on internet).

### ADR-004: Alembic over plain SQL migrations

**Decision:** Use Alembic for all schema changes.
**Rationale:** Schema changes need to be reproducible and version-controlled. A pile of numbered SQL files with no tooling is how you end up with "was this applied to staging?" conversations.
**Rejected:** Supabase SQL Editor (no version control, no rollback, no CI integration).

### ADR-005: No URL versioning on API

**Decision:** No `/api/v1/` prefix for MVP.
**Rationale:** Premature versioning adds URL boilerplate without benefit before the API has external consumers. When breaking changes are needed, introduce `/api/v2/` at that time.
**Rejected:** `/api/v1/` from day 1 (YAGNI — over-engineering before launch).

---

_End of specification. This document is the source of truth for architecture decisions. Update it when decisions change. Don't let the code drift from it silently._
