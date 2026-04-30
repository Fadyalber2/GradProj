# AXIOM V2 — Backend Reference

The backend is a **FastAPI** application that talks to **Supabase** (PostgreSQL + Auth)
and a local **Ollama** instance for AI inference.

**Location:** `G:\AI\Newstart\backend\`  
**Runs on:** `http://localhost:8000`  
**Docs UI:** `http://localhost:8000/docs` (Swagger) / `/redoc`

---

## Stack at a Glance

| Layer          | Technology                                    |
| -------------- | --------------------------------------------- |
| Framework      | FastAPI (Python)                              |
| Database       | Supabase / PostgreSQL + pgvector              |
| Auth           | Supabase Auth (JWT, ES256 / HS256)            |
| AI inference   | Ollama (`axiom-llm`, `nomic-embed-text`)      |
| Notifications  | Supabase Realtime + in-DB notifications table |
| SMS OTP        | Twilio Verify                                 |
| Object storage | Supabase Storage (listing images)             |
| Config         | `.env` via Pydantic `Settings`                |

---

## Application Entry Point — `main.py`

```python
app = FastAPI(version="2.0.0")
app.add_middleware(CORSMiddleware, origins=[frontend_url, "localhost:3000"])

# Routers
/api/auth          ← authentication & profiles
/api/listings      ← property CRUD + search
/api/dashboard     ← unified user dashboard
/api/messages      ← messaging & blocking
/api/notifications ← in-app notifications
/api/agencies      ← agency pages
/api/viewings      ← viewing-request booking
/api/blog          ← blog articles
/api/admin         ← admin panel
/api/ai            ← all AI features
/api/uploads       ← image upload to Supabase Storage
/api/applications  ← shared-housing applications
/api/projects      ← real estate projects

GET /api/health → { "status": "ok", "version": "2.0.0" }
```

---

## Configuration — `config.py`

All values loaded from `.env`:

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
FRONTEND_URL
ENVIRONMENT              # development | production
OLLAMA_BASE_URL          # http://localhost:11434
OLLAMA_MODEL             # axiom-llm
OLLAMA_EMBED_MODEL       # nomic-embed-text
ADMIN_USERNAME
ADMIN_PASSWORD
REDIS_URL                # optional
SENTRY_DSN               # optional
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID
```

---

## Database Client — `database.py`

Two Supabase clients are created at startup:

| Client            | Key used         | Purpose                                            |
| ----------------- | ---------------- | -------------------------------------------------- |
| `supabase_client` | Anon key         | Auth operations (signup, login)                    |
| `supabase_admin`  | Service role key | All server-side DB reads/writes — **bypasses RLS** |

The service role client is used for every router operation so Row Level Security
policies are enforced at the application layer (auth checks in dependencies),
not the DB layer.

---

## Authentication — `auth/` and `dependencies.py`

### JWT validation

```
Authorization: Bearer <supabase-jwt>
```

1. Try ES256 decode using Supabase JWKS endpoint.
2. Fallback to HS256 using `JWT_SECRET` from config.
3. Load user profile from `profiles` table by `sub` claim.

### Dependency functions

| Function              | Returns           | Raises                       |
| --------------------- | ----------------- | ---------------------------- |
| `get_current_user()`  | `Profile`         | 401 if invalid/missing token |
| `get_optional_user()` | `Profile \| None` | Never raises                 |
| `get_admin_user()`    | `Profile`         | 403 if role ≠ admin          |

### Auth endpoints — `POST /api/auth/...`

| Endpoint                 | Purpose                                                                        |
| ------------------------ | ------------------------------------------------------------------------------ |
| `POST /signup`           | Create Supabase user (email_confirm=true); DB trigger auto-creates profile row |
| `POST /login`            | Validate credentials; returns Supabase session tokens                          |
| `GET /me`                | Return authenticated user's full profile                                       |
| `PUT /me`                | Update profile fields (name, phone, avatar, bio, lifestyle_preferences)        |
| `POST /send-phone-otp`   | Send 6-digit SMS via Twilio Verify                                             |
| `POST /verify-phone-otp` | Verify OTP code                                                                |

---

## Listings — `listings/router.py`

### Endpoints

| Method | Path                              | Auth             | Notes                                                                          |
| ------ | --------------------------------- | ---------------- | ------------------------------------------------------------------------------ |
| GET    | `/api/listings`                   | None             | Paginated (12/page); filters: category, city, price, bedrooms, sort_by         |
| GET    | `/api/listings/{id}`              | None             | Full detail + 6 similar listings + housemates; increments views_count          |
| POST   | `/api/listings`                   | Required         | Creates with status=pending; triggers fraud scoring + embeddings in background |
| PUT    | `/api/listings/{id}`              | Required (owner) | Updates; re-generates RAG chunk                                                |
| DELETE | `/api/listings/{id}`              | Required (owner) | Soft-delete (sets deleted_at); removes from knowledge_chunks                   |
| POST   | `/api/listings/{id}/favorite`     | Required         | Toggle favorite via RPC                                                        |
| POST   | `/api/listings/{id}/apply`        | Required         | Apply to shared housing; notifies owner                                        |
| GET    | `/api/listings/{id}/applications` | Required (owner) | List all applications for listing                                              |

### Background tasks on POST/PUT

```
embed_listing()        → updates listings.embedding (768-dim vector)
embed_listing_chunk()  → upserts knowledge_chunks row for RAG
_score_and_approve()   → fraud scoring; auto-approves if score < 0.4
```

### Listing status lifecycle

```
submit → pending → (admin approves) → active
                 → (admin rejects) → rejected
active → sold | rented (owner update)
```

### Data model highlights

**Core fields:**
`title`, `description`, `category` (for_rent|for_sale|shared_housing),
`property_type`, `price`, `currency`, `location`, `city`, `full_address`,
`compound_name`, `images[]`, `bedrooms`, `bathrooms`, `size_sqm`,
`floor_number`, `amenities[]`, `verified`, `views_count`,
`embedding` (vector 768), `status`, `owner_id`, `agency_id`, `project_id`

**Rental extras:**
`lease_type`, `min_stay_months`, `available_date`

**Sale extras:**
`payment_plan` (JSONB), `delivery_date`, `title_deed_status`

**Shared housing extras:**
`room_type`, `lifestyle_preferences` (JSONB), `total_spots`, `filled_spots`,
`availability`, `furnishing`, `utilities_included`, `bathroom_type`,
`private_amenities[]`, `shared_amenities[]`

---

## Dashboard — `dashboard/router.py`

### `GET /api/dashboard/me`

Single endpoint that returns everything the dashboard page needs:

```json
{
  "profile": { "full_name", "avatar_url", "is_verified_seller", "bio", "phone" },
  "analytics": {
    "total_views": 0,
    "active_listings": 0,
    "pending_approval": 0,
    "saved_properties": 0
  },
  "listings": [ ...user's own listings ],
  "recent_messages": [ ...last 5 conversations ],
  "liked_properties": [ ...favorites ],
  "upcoming_viewings": [ ...next 10 viewings ]
}
```

---

## Messaging — `messages/router.py`

### Conversation model

A conversation is between exactly two users (`user_a_id`, `user_b_id`).
Status values: `pending | accepted | rejected | blocked`.

### Endpoints

| Method | Path                               | Notes                                       |
| ------ | ---------------------------------- | ------------------------------------------- |
| GET    | `/api/messages/conversations`      | List all conversations                      |
| POST   | `/api/messages/conversations`      | Start or get existing conversation          |
| GET    | `/api/messages/conversations/{id}` | Fetch messages (paginated)                  |
| POST   | `/api/messages/conversations/{id}` | Send a message                              |
| POST   | `/api/messages/block`              | Block a user (rejects active conversations) |
| DELETE | `/api/messages/block/{user_id}`    | Unblock                                     |

Blocked users cannot initiate conversations or send messages to the blocker.

---

## Viewing Requests — `viewings/router.py`

| Method | Path                 | Notes                                              |
| ------ | -------------------- | -------------------------------------------------- |
| POST   | `/api/viewings`      | Request a viewing (status=pending)                 |
| PUT    | `/api/viewings/{id}` | Confirm or cancel (owner only; notifies requester) |

---

## Applications (Shared Housing) — `applications/router.py`

| Method | Path                     | Notes                             |
| ------ | ------------------------ | --------------------------------- |
| POST   | `/api/applications`      | Apply to a shared-housing listing |
| PUT    | `/api/applications/{id}` | Approve or reject (owner only)    |

---

## Admin Panel — `admin/router.py`

Admin auth uses a separate JWT (not Supabase) issued on `POST /api/admin/auth/login`
with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from config (24-hour expiry).

### Endpoints

| Category | Endpoint                                 | Notes                                       |
| -------- | ---------------------------------------- | ------------------------------------------- |
| Auth     | `POST /api/admin/auth/login`             | Returns admin JWT                           |
| Listings | `GET /api/admin/listings?status=pending` | Pending queue (paginated)                   |
| Listings | `PUT /api/admin/listings/{id}/approve`   | status → active, notify owner               |
| Listings | `PUT /api/admin/listings/{id}/reject`    | status → rejected with reason               |
| Users    | `GET /api/admin/users`                   | All users (paginated)                       |
| Users    | `PUT /api/admin/users/{id}/verify`       | Grant is_verified_seller badge              |
| Stats    | `GET /api/admin/stats`                   | Totals: users, listings by status, messages |

---

## Ollama Client — `ollama_client.py`

`OllamaClient` wraps all calls to the local Ollama server.

| Method                            | HTTP call          | Timeout | Returns               |
| --------------------------------- | ------------------ | ------- | --------------------- |
| `health()`                        | GET /api/tags      | 2 s     | bool                  |
| `generate(prompt, system)`        | POST /api/generate | 60 s    | str                   |
| `embed(text)`                     | POST /api/embed    | 15 s    | list[float] (768-dim) |
| `generate_stream(prompt, system)` | POST /api/generate | 120 s   | async token generator |
| `chat_stream(messages)`           | POST /api/chat     | 120 s   | async token generator |

All methods return empty/falsy values on exceptions — **no raises propagate to callers**.  
Per-token streaming timeout is 30 seconds to prevent hangs on stalled responses.

---

## Database Schema

### Core tables

| Table                  | Key columns                                                                                     | Notes                                |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| `neighborhoods`        | id, name, name_ar, city, slug                                                                   | Lookup table for location filters    |
| `profiles`             | id (= auth.users.id), email, full_name, role, is_verified_seller, lifestyle_preferences (JSONB) | Auto-created by DB trigger on signup |
| `agencies`             | id, owner_id, name, slug, verified                                                              | Agency pages                         |
| `projects`             | id, agency_id, title, description, image_url                                                    | Real estate development projects     |
| `listings`             | id, owner_id, category, status, embedding (vector 768), fraud_score, deleted_at                 | Full property data                   |
| `listings_images`      | id, listing_id, url                                                                             | S3/Storage URLs                      |
| `favorites`            | user_id, listing_id                                                                             | Toggled via RPC                      |
| `housemates`           | id, listing_id, user_id, name, age, occupation, tags, lifestyle_preferences                     | Shared-housing residents             |
| `conversations`        | id, user_a_id, user_b_id, status, initiated_by                                                  | Two-party messaging                  |
| `messages`             | id, conversation_id, sender_id, text, created_at                                                | Message content                      |
| `viewings`             | id, listing_id, requester_id, owner_id, scheduled_at, status, notes                             | Booking requests                     |
| `listing_applications` | id, listing_id, applicant_id, status, message, lifestyle_data, compatibility_score              | Shared housing applications          |
| `knowledge_chunks`     | id, source_type, source_id, chunk_text, embedding (vector 768), metadata (JSONB)                | RAG corpus                           |
| `blocked_users`        | blocker_id, blocked_id, reason                                                                  | Block list                           |
| `notifications`        | id, user_id, type, title, body, metadata (JSONB), read_at                                       | In-app notifications                 |

### Enums

```sql
listing_category: for_rent | for_sale | shared_housing
property_type:    apartment | villa | studio | duplex | penthouse | commercial
                  | room | chalet | townhouse | twin_house | land
                  | whole_building | office
listing_status:   active | pending | rejected | sold | rented
```

### Key RPC functions

| RPC                                                                 | Purpose                                 |
| ------------------------------------------------------------------- | --------------------------------------- |
| `match_listings(query_embedding, threshold, count, category, city)` | pgvector cosine similarity search       |
| `hybrid_search_chunks(query_text, query_embedding, ...)`            | BM25 + vector Reciprocal Rank Fusion    |
| `toggle_favorite(user_id, listing_id)`                              | INSERT or DELETE from favorites         |
| `increment_listing_views(listing_id)`                               | Atomic views_count increment            |
| `get_user_conversations(user_id)`                                   | Conversations with partner profile data |

### Indexes

| Table              | Index type        | Column     |
| ------------------ | ----------------- | ---------- |
| `knowledge_chunks` | HNSW (cosine)     | embedding  |
| `knowledge_chunks` | GIN (English FTS) | chunk_text |
| `listings`         | HNSW (cosine)     | embedding  |

---

## Request / Response Conventions

- All timestamps: ISO 8601 (`2026-04-24T10:30:00Z`)
- Pagination: `?page=1&limit=12` → response includes `total`, `page`, `limit`, `results`
- Errors: `{ "detail": "human-readable message" }` with appropriate HTTP status code
- Auth errors: 401 (missing/invalid token), 403 (insufficient role)
- Not found: 404 with `{ "detail": "Resource not found" }`
- Validation errors: 422 (FastAPI default Pydantic validation)

---

## Directory Structure

```
backend/
├── main.py                  ← FastAPI app, router registration
├── config.py                ← Settings loaded from .env
├── database.py              ← Supabase client instances
├── dependencies.py          ← JWT auth dependency functions
├── app/
│   ├── auth/
│   │   └── router.py
│   ├── listings/
│   │   └── router.py
│   ├── dashboard/
│   │   └── router.py
│   ├── messages/
│   │   └── router.py
│   ├── viewings/
│   │   └── router.py
│   ├── applications/
│   │   └── router.py
│   ├── admin/
│   │   └── router.py
│   ├── agencies/
│   │   └── router.py
│   ├── projects/
│   │   └── router.py
│   ├── notifications/
│   │   └── router.py
│   ├── blog/
│   │   └── router.py
│   ├── uploads/
│   │   └── router.py
│   └── ai/
│       ├── router.py        ← All AI endpoints
│       ├── ollama_client.py ← Ollama HTTP wrapper
│       ├── rag.py           ← RAGRetriever (hybrid search, citations)
│       ├── embeddings.py    ← Listing + chunk embedding generation
│       └── fraud.py         ← Fraud scoring pipeline
└── tests/
    └── conftest.py
```
