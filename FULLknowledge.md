# AXIOM V2 — Complete Knowledge Guide

> From zero to expert in every layer of the system.
> Read with the repo open. Every code snippet cites a real file and line number.

---

## Suggested Reading Orders

| Goal                     | Chapters                                                                 |
| ------------------------ | ------------------------------------------------------------------------ |
| Full depth (recommended) | 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 |
| Viva in 2 days           | 0, 7, 11, 12, 16                                                         |
| Frontend specialist      | 0, 1, 2, 3, 4, 7, 12, 14                                                 |
| AI specialist            | 0, 5, 10, 11, 12, 13                                                     |
| Backend specialist       | 0, 5, 6, 7, 8, 9, 15                                                     |

---

# Chapter 0 — Orientation

## 0.0 Why this chapter exists

Before reading any code, you need a map. This chapter answers: what is AXIOM, what is each piece, and what is the path of a single user action from browser to database and back.

## 0.1 What AXIOM is

AXIOM is an AI-powered real estate platform for Egypt. Users can browse property listings (apartments, villas, studios, shared housing), search with natural language, chat with an AI assistant, message listing owners, and manage their own listings through a dashboard. Agencies can have profile pages with their projects. An admin panel lets an administrator approve, reject, and moderate listings.

The platform is a graduation project. The codebase is real production-quality code — not a toy.

## 0.2 System architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          User's Browser                                 │
│                   http://localhost:3000                                 │
│                                                                         │
│   Next.js 16 (App Router)                                               │
│   ┌──────────────┐  ┌──────────────┐  ┌────────────────┐                │
│   │  React pages │  │  Zustand     │  │  TanStack      │                │
│   │  (UI)        │  │  (auth state)│  │  Query (cache) │                │
│   └──────┬───────┘  └──────────────┘  └────────────────┘                │
│          │ fetch / SSE                                                  │
└──────────┼──────────────────────────────────────────────────────────────┘
           │  HTTP  (JSON + SSE)
           │  Authorization: Bearer <jwt>
           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                                       │
│                http://localhost:8000                                     │
│                                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐    │
│  │  /auth   │ │/listings │ │  /ai     │ │/messages │ │  /dashboard  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘    │
│                                  │                                       │
│                   ┌──────────────┼──────────────┐                        │
│                   ▼              ▼              ▼                        │
│              Supabase       Supabase         Ollama                      │
│              (Postgres)     (Auth)           (AI)                        │
└──────────────────────────────────────────────────────────────────────────┘
           │                                         │
           ▼                                         ▼
┌─────────────────────┐                  ┌───────────────────────┐
│  Supabase Cloud     │                  │ Ollama (local)        │
│  - PostgreSQL       │                  │ http://localhost:11434│
│  - pgvector         │                  │ model: axiom-llm      │
│  - Auth (JWTs)      │                  │ embed: nomic-embed-   │
│  - Storage (images) │                  │         text          │
│  - Realtime (WS)    │                  └───────────────────────┘
└─────────────────────┘
```

**Three processes you must run locally:**

| Process  | Command                                       | Port  |
| -------- | --------------------------------------------- | ----- |
| Frontend | `cd frontend && npm run dev`                  | 3000  |
| Backend  | `cd backend && uvicorn app.main:app --reload` | 8000  |
| Ollama   | `ollama serve` (or it auto-runs)              | 11434 |

## 0.3 Path of one request: "Show me apartments in Maadi"

1. User types in the AI chat drawer and presses Enter.
2. `ChatDrawer.tsx` builds `POST /api/ai/chat` with `{ message, conversation_history }` and a `Bearer` token in the header.
3. `middleware.ts` runs first (Next.js edge): checks for a Supabase cookie — if missing, redirects to `/login`. The chat page is public, so it passes through.
4. Next.js rewrites `/api/*` to `http://localhost:8000/api/*` (configured in `next.config.ts`).
5. FastAPI receives the request at the `ai_router` (registered at `/api/ai`).
6. The `chat` endpoint calls `get_optional_user` — this decodes the JWT and fetches the user profile from Supabase (or returns `None` if no token).
7. `_detect_property_search("Show me apartments in Maadi")` returns a score of 70 (≥40), so listing search runs.
8. `asyncio.gather` runs two tasks in parallel: (a) listing search via `match_listings` RPC (pgvector cosine similarity), and (b) RAG retrieval from `knowledge_chunks` (hybrid vector+keyword search).
9. The AI router assembles a system prompt containing the verified listing data and RAG context, then calls `ollama.chat_stream(messages)`.
10. Ollama streams tokens over HTTP. FastAPI wraps each token in `data: {"token": "..."}` and streams them as Server-Sent Events (SSE) to the browser.
11. `ChatDrawer.tsx` reads the SSE stream with a `ReadableStream` reader. Each `data:` line is parsed as JSON. Tokens are appended to the message. When `data: {"listing_refs": [...]}` arrives, listing cards are rendered.
12. The stream ends with `data: [DONE]`.

## 0.4 Repo structure

```
AXIOM-V2/
├── frontend/               ← Next.js 16 app
│   ├── src/
│   │   ├── app/            ← Pages (App Router)
│   │   ├── components/     ← React components
│   │   ├── lib/            ← api.ts, queries.ts, constants.ts
│   │   ├── stores/         ← Zustand auth store
│   │   ├── types/          ← TypeScript types
│   │   ├── hooks/          ← useNominatim
│   │   └── providers/      ← QueryClient + AuthInitializer
│   ├── middleware.ts        ← Route protection
│   └── next.config.ts
├── backend/
│   ├── app/
│   │   ├── main.py         ← FastAPI app, CORS, router registration
│   │   ├── config.py       ← Env vars (Pydantic Settings)
│   │   ├── database.py     ← Two Supabase clients
│   │   ├── dependencies.py ← JWT auth, get_current_user
│   │   ├── auth/           ← Signup, login, profile
│   │   ├── listings/       ← CRUD listings
│   │   ├── ai/             ← Ollama client, RAG, embeddings, fraud, endpoints
│   │   ├── messages/       ← Conversations, messages
│   │   ├── dashboard/      ← /api/dashboard/me aggregate
│   │   ├── agencies/       ← Agency profiles, projects
│   │   └── ...more modules
│   ├── tests/              ← pytest test suite
│   ├── scripts/            ← batch_embed.py (bulk RAG indexer)
│   └── requirements.txt
└── docs/
    ├── schema/             ← SQL migration files (run in Supabase)
    ├── API_REFERENCE.md    ← Endpoint shapes (what to send/receive)
    ├── BACKEND.md          ← Backend architecture reference
    ├── AI_FEATURES.md      ← AI feature specsabout:blank#blocked
    ├── SETUP.md            ← How to run everything
    └── ROADMAP.md          ← Current status
```

## 0.5 Three questions to answer

1. How many HTTP servers are running locally, on what ports, and what is each responsible for?
2. When a user sends a chat message, which file in the frontend handles it, which backend file receives it, and what happens before the response arrives?
3. What is Supabase and what is Ollama? What would break if each went down?

## 0.6 Things to try

- Start all three processes. Open `http://localhost:3000`. Open `http://localhost:8000/docs` (you will see an auto-generated API explorer).
- In the API explorer, expand `GET /api/health` and click "Try it out". You should see `{"status": "ok", "version": "2.0.0"}`.
- In the frontend, open DevTools → Network → filter by "Fetch/XHR". Send a chat message. Find the `/api/ai/chat` request and look at the Response tab — you should see the raw SSE stream.

---

# Chapter 1 — Web Fundamentals

## 1.0 Why this chapter exists

AXIOM is a web application. Everything the frontend and backend do is built on top of HTTP. If you do not understand HTTP methods, status codes, headers, and JSON, you will not understand why any piece of the code does what it does.

## 1.1 HTTP — the language of the web

Every time your browser talks to a server, it sends an **HTTP request** and receives an **HTTP response**. Both have the same shape:

```
[METHOD] [PATH] HTTP/1.1about:blank#blocked
Header-Name: value
Header-Name: value
                          ← blank line separates headers from body
{optional JSON body}
```

**Methods** describe _intent_:

| Method   | Intent                      | Body? | AXIOM examples              |
| -------- | --------------------------- | ----- | --------------------------- |
| `GET`    | Read a resource             | No    | `GET /api/listings`         |
| `POST`   | Create / trigger an action  | Yes   | `POST /api/auth/signup`     |
| `PUT`    | Replace a resource entirely | Yes   | `PUT /api/listings/{id}`    |
| `PATCH`  | Partially update a resource | Yes   | `PATCH /api/auth/profile`   |
| `DELETE` | Remove a resource           | No    | `DELETE /api/listings/{id}` |

**Status codes** are three-digit numbers in the response:

| Code                      | Meaning                    | When you see it              |
| ------------------------- | -------------------------- | ---------------------------- |
| 200 OK                    | Success with a body        | Most GET/PUT/PATCH responses |
| 201 Created               | Resource was created       | After POST /api/listings     |
| 204 No Content            | Success, no body           | After DELETE                 |
| 400 Bad Request           | Client sent invalid data   | Missing required field       |
| 401 Unauthorized          | No valid auth token        | Missing or expired JWT       |
| 403 Forbidden             | Valid token, wrong role    | User hitting admin endpoint  |
| 404 Not Found             | Resource does not exist    | `GET /api/listings/bad-id`   |
| 422 Unprocessable Entity  | Validation error (FastAPI) | Wrong type in request body   |
| 500 Internal Server Error | Backend crashed            | Unhandled Python exception   |

## 1.2 Headers

Headers are key-value pairs that carry metadata about the request or response. The two you will see constantly in AXIOM:

**`Authorization: Bearer <token>`** — the client's proof of identity. The `<token>` is a JWT (explained in Chapter 7). Every protected endpoint in FastAPI extracts this header and validates it.

**`Content-Type: application/json`** — tells the recipient that the body is JSON-encoded text. FastAPI uses this to decide how to parse the request body.

In the frontend API client (`frontend/src/lib/api.ts:40-44`):

```typescript
// frontend/src/lib/api.ts:38-44
const token = useAuthStore.getState().session?.access_token;
const headers: Record<string, string> = {
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...options.headers,
};
```

The token is pulled from Zustand (the client-side auth store) and injected into every request automatically.

## 1.3 JSON — the data format

JSON (JavaScript Object Notation) is how frontend and backend exchange data. It looks like a JavaScript object literal:

```json
{
  "id": "abc-123",
  "title": "3BR Apartment in Maadi",
  "price": 15000,
  "category": "for_rent",
  "images": ["https://..."],
  "verified": true
}
```

Rules: keys must be strings in double quotes; values can be strings, numbers, booleans, arrays, objects, or `null`; no trailing commas.

Python's `json.dumps()` / `json.loads()` and JavaScript's `JSON.stringify()` / `JSON.parse()` convert between the format and native data structures.

## 1.4 REST

REST (Representational State Transfer) is a style convention for HTTP APIs. The key ideas:

- URLs name **resources** (things), not actions: `/api/listings`, `/api/listings/123`
- HTTP methods express what you want to **do** with that resource
- Responses use standard status codes
- Each request is stateless — the server has no memory of previous requests

AXIOM follows REST. `GET /api/listings` → list of listings. `POST /api/listings` → create one. `GET /api/listings/{id}` → one listing. `DELETE /api/listings/{id}` → remove it.

## 1.5 CORS

CORS (Cross-Origin Resource Sharing) is a browser security policy. By default, a script at `http://localhost:3000` cannot call `http://localhost:8000` — they are different origins (different port = different origin). The browser blocks the request.

The backend must explicitly opt in. In FastAPI (`backend/app/main.py:24-30`):

```python
# backend/app/main.py:24-30
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

This tells the browser: "requests from `http://localhost:3000` are allowed, including credentials (the auth cookie) and any method/header." Without this, every frontend request would fail with a CORS error before the FastAPI endpoint even runs.

## 1.6 Pagination

When there are thousands of listings, sending all of them in one response is wasteful. AXIOM uses page-based pagination. A request might look like:

```
GET /api/listings?page=2&per_page=12
```

The response always includes:

```json
{ "listings": [...], "total": 847, "page": 2, "per_page": 12 }
```

The frontend calculates `totalPages = Math.ceil(total / per_page)` and renders page navigation. See `frontend/src/app/find-homes/page.tsx:103-108`.

## 1.7 ISO 8601 timestamps

All timestamps in AXIOM are in ISO 8601 format: `"2026-04-24T18:30:00Z"`. The `Z` means UTC timezone. PostgreSQL's `timestamptz` type stores and returns this format automatically.

## 1.8 Three questions to answer

1. What is the difference between a 401 and a 403 response? When would AXIOM return each?
2. Why does the frontend need to set `Content-Type: application/json` — what would break without it?
3. What would happen if you removed the `CORSMiddleware` from `main.py`?

## 1.9 Things to try

- Open `http://localhost:8000/docs`, find `GET /api/listings`, and try it out. Observe the response shape.
- In `frontend/src/lib/api.ts`, temporarily remove the `Authorization` header line, then open `/dashboard`. What status code does the backend return? What happens in the UI?

---

# Chapter 2 — TypeScript and React 19 Refresher

## 2.0 Why this chapter exists

The frontend is TypeScript with strict mode enabled. If you do not understand TypeScript's type system and React 19's new rules around components, you will get confusing type errors and not know what they mean.

## 2.1 TypeScript strict mode

`tsconfig.json` in the frontend has `"strict": true`. This enables several checks:

- **`noImplicitAny`**: every variable must have a known type — you cannot leave it as `any` without saying so explicitly.
- **`strictNullChecks`**: `null` and `undefined` are not assignable to other types unless you say so. If a function might return `null`, you must handle it before using the result.
- **`strictFunctionTypes`**: function parameter types must match exactly.

When you run `npx tsc --noEmit`, TypeScript checks every file and reports errors. Zero errors is required before finishing any task.

## 2.2 Interfaces vs types

Both define shapes for objects. In practice, for AXIOM's purposes they are interchangeable. The codebase uses `interface` for object shapes and `type` for unions and aliases.

```typescript
// Object shape — use interface
interface AuthUser {
  id: string;
  email: string;
  role: "user" | "admin"; // union type inline
  avatar_url: string | null; // nullable
}

// Union alias — use type
type UserRole = "user" | "admin";
type AssistantStatus = "idle" | "searching" | "generating";
```

The `frontend/src/types/index.ts` file defines all UI-layer types. `frontend/src/types/api.ts` defines types that mirror the backend JSON shapes (snake_case).

## 2.3 Generics — just enough

Generics let you write code that works with many types. In AXIOM the most common use is in the API client:

```typescript
// frontend/src/lib/api.ts:23-25
async function request<T>(method: string, path: string, ...): Promise<T> {
  ...
  return res.json(); // TypeScript trusts that the JSON will match T
}
```

`<T>` is a type parameter. When you call `api.get<PaginatedListings>("/api/listings")`, TypeScript knows the return value is a `PaginatedListings` — and will give you autocomplete and catch mismatches.

## 2.4 Hooks

React hooks are functions whose names start with `use`. They let function components manage state and side effects.

| Hook                    | Purpose                                                              | Example in AXIOM                           |
| ----------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `useState<T>(init)`     | Local state. Returns `[value, setter]`.                              | `const [input, setInput] = useState("")`   |
| `useEffect(fn, deps)`   | Run a side effect after render. Deps array controls when it re-runs. | Fetch data on mount; subscribe to Realtime |
| `useRef<T>(init)`       | Mutable value that doesn't trigger re-render.                        | `abortControllerRef` in ChatDrawer.tsx     |
| `useCallback(fn, deps)` | Memoize a function so it's stable across renders.                    | `sendMessage` in ChatDrawer.tsx            |
| `useMemo(fn, deps)`     | Memoize a computed value.                                            | Derived filter counts                      |
| `useRouter()`           | Next.js navigation. `router.push("/path")`, `router.replace(...)`    | Redirect after login                       |

## 2.5 "use client" — Server Components vs Client Components

This is the most important new concept in Next.js 16 (App Router). Every file in `src/app/` and `src/components/` is, by default, a **Server Component** — it runs on the server at request time and the user only receives the final HTML. Server Components can `await` anything; they cannot use `useState`, `useEffect`, or browser APIs.

If you need interactivity (hooks, events, browser APIs), you must add `"use client"` as the very first line of the file. This turns it into a **Client Component** — it runs in the browser.

```typescript
"use client";   // ← This line makes the whole file a Client Component

import { useState } from "react";
export function LoginForm() {
  const [email, setEmail] = useState("");
  ...
}
```

**The rule of thumb:**

- Pages that fetch and display data with no user interaction → Server Component (no `"use client"`)
- Pages/components with forms, animations, dropdowns, or any `useState`/`useEffect` → `"use client"`

In AXIOM:

- `app/property/[id]/page.tsx` — Server Component. Fetches the listing at request time. Sends pure HTML to the browser. Fast for SEO.
- `app/find-homes/page.tsx` — Client Component (`"use client"` on line 1). Has search inputs, filters, view-mode toggle — all interactive.
- `app/dashboard/page.tsx` — Client Component. Has a Zustand auth check and TanStack Query calls.

## 2.6 Three questions to answer

1. Why is `"use client"` needed on `ChatDrawer.tsx` but not on `app/property/[id]/page.tsx`?
2. What happens if you have `strictNullChecks` enabled and you write `result.data.id` when `result.data` could be `null`?
3. What is the difference between `useRef` and `useState`? When would you choose one over the other?

## 2.7 Things to try

- Find three files in `src/components/` that start with `"use client"`. Find three that do not. Try to understand why each made that choice.
- Add `const x: string = null;` anywhere in a `.ts` file and run `npx tsc --noEmit`. Read the error message. Then add `| null` to the type and see it pass.

---

# Chapter 3 — The Frontend, Part 1: Next.js App Router

## 3.0 Why this chapter exists

Next.js App Router uses the filesystem as the router. Every URL maps to a folder. Once you understand the conventions, you can navigate the codebase by thinking about URLs.

## 3.1 Folder = route

In `frontend/src/app/`, every folder whose name is not prefixed with `_` or `(` becomes a URL segment.

```
app/
├── page.tsx            → /
├── find-homes/
│   └── page.tsx        → /find-homes
├── property/
│   └── [id]/
│       └── page.tsx    → /property/abc-123   ([id] is the dynamic segment)
└── agencies/
    ├── page.tsx        → /agencies
    └── [slug]/
        └── page.tsx    → /agencies/emaar-misr
```

A `page.tsx` file defines what renders at that URL. A `layout.tsx` file wraps all pages inside that folder.

## 3.2 Dynamic segments

`[id]` and `[slug]` in folder names become parameters. In a Server Component page, `params` is a `Promise` in Next 16:

```typescript
// frontend/src/app/property/[id]/page.tsx:98-103
export default async function PropertyDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;   // await is required in Next 16
  const data = await serverFetch<ListingDetailWithSimilar>(`/api/listings/${id}`);
  if (!data) notFound();         // renders the closest not-found.tsx
  ...
}
```

## 3.3 Route groups

Folders in `(parentheses)` are **route groups** — they group related routes but do not appear in the URL. They exist only to share a layout.

```
app/
├── (marketing)/
│   ├── layout.tsx       ← Adds Navbar + Footer
│   └── page.tsx         → /   (not /(marketing)/)
├── (auth)/
│   ├── layout.tsx       ← Shows only a logo
│   ├── login/
│   │   └── page.tsx     → /login
│   └── signup/
│       └── page.tsx     → /signup
```

The `(marketing)` layout wraps the home page with `<Navbar>` and `<Footer>`. The `(auth)` layout shows a minimal header — no Navbar, no Footer.

## 3.4 Layouts, loading, error, not-found

Next.js has special file names:

| File            | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `layout.tsx`    | Persistent wrapper (doesn't re-render on navigation within its segment) |
| `loading.tsx`   | Shown while the `page.tsx` is suspended (while the async fetch runs)    |
| `error.tsx`     | Shown when the page throws an error. Must be `"use client"`.            |
| `not-found.tsx` | Shown when `notFound()` is called or no route matches                   |

Example: the `find-homes/loading.tsx` shows a skeleton grid while listings load. The `find-homes/error.tsx` shows a "Try Again" button if the fetch fails.

## 3.5 middleware.ts

`frontend/middleware.ts` runs on every request, _before_ any page renders. It reads cookies to determine if the user is logged in:

```typescript
// frontend/middleware.ts:7-38
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Find any cookie matching Supabase's naming convention
  const token = request.cookies
    .getAll()
    .find(
      ({ name }) =>
        name.startsWith("sb-") &&
        (name.endsWith("-auth-token") || name.endsWith("-access-token")),
    )?.value;

  const isAuthenticated = !!token;

  // Logged-in users don't need /login or /signup → send to dashboard
  if (isAuthenticated && authRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Not logged in but trying to reach /dashboard or /messages → go to login
  if (!isAuthenticated && protectedRoutes.some((r) => pathname.startsWith(r))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next(); // Allow the request through
}
```

**Important**: middleware only checks if the cookie _exists_. It does not validate the JWT signature — that happens on the backend. A user who tampers with their cookie will get through middleware but then receive a 401 from FastAPI.

## 3.6 How pages render: Server Components and ISR

Server Component pages like `property/[id]/page.tsx` call `serverFetch()` which uses the Next.js `fetch` extended with `{ next: { revalidate: 60 } }`. This means:

1. First request: Next.js fetches from FastAPI, renders HTML, caches the HTML.
2. Subsequent requests within 60 seconds: serve the cached HTML instantly.
3. After 60 seconds: re-fetch from FastAPI in the background, serve stale HTML while new one generates.

This is called **ISR (Incremental Static Regeneration)**. It makes pages fast while keeping data relatively fresh.

## 3.7 Full route listing

| URL                | File                       | Type   | Protected?     |
| ------------------ | -------------------------- | ------ | -------------- |
| `/`                | `(marketing)/page.tsx`     | Server | No             |
| `/find-homes`      | `find-homes/page.tsx`      | Client | No             |
| `/property/[id]`   | `property/[id]/page.tsx`   | Server | No             |
| `/project/[id]`    | `project/[id]/page.tsx`    | Server | No             |
| `/agencies`        | `agencies/page.tsx`        | Client | No             |
| `/agencies/[slug]` | `agencies/[slug]/page.tsx` | Server | No             |
| `/blog`            | `blog/page.tsx`            | Server | No             |
| `/blog/[slug]`     | `blog/[slug]/page.tsx`     | Server | No             |
| `/login`           | `(auth)/login/page.tsx`    | Client | No (auth-only) |
| `/signup`          | `(auth)/signup/page.tsx`   | Client | No (auth-only) |
| `/auth/callback`   | `auth/callback/page.tsx`   | Client | No             |
| `/dashboard`       | `dashboard/page.tsx`       | Client | Yes            |
| `/messages`        | `messages/page.tsx`        | Client | Yes            |
| `/admin`           | `admin/page.tsx`           | Client | Admin only     |

## 3.8 Three questions to answer

1. Why does `params` need to be `await`ed in Next.js 16? What would happen in an older Next.js version?
2. What is the difference between `layout.tsx` and a wrapper component? Why does Next.js provide the built-in?
3. Explain why middleware cannot rely on JWT validation for security — why does the real check happen on the backend?

## 3.9 Things to try

- Add a new page at `src/app/test/page.tsx` with just `export default function TestPage() { return <div>hello</div>; }`. Navigate to `http://localhost:3000/test`.
- Add a `loading.tsx` file in the same folder that returns a skeleton. Then add an artificial `await new Promise(r => setTimeout(r, 2000))` to the page and observe the loading state.
- Add `/test` to the `protectedRoutes` array in `middleware.ts` and observe the redirect without being logged in.

---

# Chapter 4 — The Frontend, Part 2: State, Data, and Styling

## 4.0 Why this chapter exists

Knowing the routes is not enough. You need to understand how data moves from the FastAPI backend into the React components, how auth state is kept in sync, and how the visual design is implemented.

## 4.1 TanStack Query (React Query)

TanStack Query is a server-state library. It manages fetching, caching, background refetching, and error/loading states for you so you don't have to write `useEffect(() => { fetch(...).then(setData) }, [])` yourself.

**The two core concepts:**

**`useQuery`** — for reading data.

```typescript
// From frontend/src/app/find-homes/page.tsx:103-108
const { data, isLoading, isError } = useQuery({
  ...listingsQueries.list({ sort_by: sortBy, page: currentPage, per_page: 12 }),
  enabled: !aiMode, // only run when not in AI search mode
});
const listings = (data?.listings ?? []).map(mapToListing);
```

**`useMutation`** — for creating, updating, or deleting.

```typescript
const favMutation = useMutation({
  ...favoriteMutation(id),
  onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: ["listings", id] }),
});
// Call it: favMutation.mutate()
```

**Query factories** in `frontend/src/lib/queries.ts` centralize the `queryKey` and `queryFn` so they stay in sync:

```typescript
// frontend/src/lib/queries.ts:60-73
export const listingsQueries = {
  list: (params?: ListingsParams) => ({
    queryKey: ["listings", params], // cache key — same params = same cache
    queryFn: () =>
      api.get<PaginatedListings>("/api/listings", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  }),
  detail: (id: string) => ({
    queryKey: ["listings", id],
    queryFn: () => api.get<ListingDetailWithSimilar>(`/api/listings/${id}`),
  }),
};
```

**Cache behaviour** is configured in `frontend/src/providers/Providers.tsx:18-28`:

- `staleTime: 5 * 60 * 1000` — data is considered fresh for 5 minutes. No network request during that window.
- `gcTime: 15 * 60 * 1000` — unused cache entries are garbage-collected after 15 minutes.
- `retry: 1` — on failure, retry once before marking as error.

## 4.2 Zustand — auth state

Zustand is a lightweight client-state store. Unlike TanStack Query (which manages server data), Zustand manages data that lives entirely in the browser: the current user's session and profile.

The auth store is in `frontend/src/stores/authStore.ts`. The key pattern is that you can read and write state both inside and outside of React components:

```typescript
// Inside a React component:
const { user, login, logout } = useAuthStore();

// Outside React (e.g. in api.ts):
const token = useAuthStore.getState().session?.access_token;
```

The second form (`getState()`) is how `api.ts` injects the auth token into every HTTP request without being inside a component.

**Auth store flow:**

1. `initialize()` is called once by `AuthInitializer` on app mount (see `src/providers/Providers.tsx`).
2. It calls `supabase.auth.getSession()` to check if there is an existing session in localStorage.
3. If yes, it fetches the user profile from `GET /api/auth/me` and stores both in Zustand.
4. It registers `supabase.auth.onAuthStateChange(...)` so future changes (login, logout, token refresh) are automatically reflected.

## 4.3 The API client

`frontend/src/lib/api.ts` exports a thin wrapper around `fetch`. Key points:

- **`api.get/post/put/patch/delete`** — use these from Client Components and mutations.
- **`serverFetch`** — use this in Server Component pages (no auth, uses Next.js ISR caching).
- On 401 responses with an active session, `api.ts` automatically calls `logout()` — the user is redirected to login.

```typescript
// frontend/src/lib/api.ts:53-60
if (!res.ok) {
  const errorBody = await res.json().catch(() => null);
  // Auto-logout on 401 — token expired or invalid
  if (res.status === 401 && useAuthStore.getState().session) {
    useAuthStore.getState().logout();
  }
  throw new ApiError(res.status, res.statusText, errorBody);
}
```

## 4.4 Two type layers: api.ts vs index.ts

The backend returns snake_case JSON. The frontend components expect camelCase with slightly different shapes. To bridge this, AXIOM has two type files and mapper functions:

- `frontend/src/types/api.ts` — mirror of backend JSON (snake_case). E.g. `ListingDetail`, `ApiProfileResponse`.
- `frontend/src/types/index.ts` — UI view-models (camelCase). E.g. `PropertyDetail`, `AuthUser`.

Every page that uses `serverFetch` runs a `mapXxx()` function to translate:

```typescript
// Pattern used in property/[id]/page.tsx
const data = await serverFetch<ListingDetailWithSimilar>(`/api/listings/${id}`);
const property = mapProperty(data); // ListingDetail → PropertyDetail
// Pass property (camelCase UI type) to components
```

This separation means: if the backend changes a field name, you only need to update the mapper, not every component.

## 4.5 Tailwind CSS v4

AXIOM uses Tailwind v4, which is **config-less** — there is no `tailwind.config.ts` file. Instead, design tokens are defined directly in CSS custom properties inside `frontend/src/app/globals.css`.

Core brand colours are:

```css
/* frontend/src/app/globals.css:50-55 */
--color-primary-hover: #e04f33;
--color-background-dark: #121212;
--color-card-dark: #1e1e1e;
--color-input-dark: #2a2a2a;
--color-surface: #161616;
```

The brand orange (`#FF5A3C`) is set as `--primary` in the `.dark` block. Dark mode is **forced** — `<html className="dark">` is hardcoded in `app/layout.tsx`. There is no light/dark toggle.

In component JSX, you use Tailwind utility classes: `className="bg-card-dark border border-primary/40 rounded-xl p-4"`.

## 4.6 shadcn/ui

shadcn/ui is not an installed package — it is a collection of component source files that live in `frontend/src/components/ui/`. You run `npx shadcn@latest add button` and it copies `button.tsx` into your repo. You own the code and can modify it.

This means you can change any UI primitive by editing the file in `components/ui/`. No need to override styles from an external package.

## 4.7 react-hook-form + Zod

Forms in AXIOM (login, signup, add listing) use `react-hook-form` for form state management and `zod` for validation schemas.

The pattern:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "At least 8 characters"),
});

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm({
  resolver: zodResolver(schema),
});
```

The `zodResolver` connects Zod's validation to react-hook-form. `errors.email?.message` gives you the validation message to show.

## 4.8 next/image

Never use a raw `<img>` tag in this codebase. Next.js's `<Image>` component from `next/image` automatically:

- Optimizes and compresses the image
- Serves the right size for the device (responsive)
- Prevents Cumulative Layout Shift (CLS) — a Core Web Vitals metric
- Only loads images as they scroll into view (lazy loading)

External image domains must be whitelisted in `next.config.ts` under `images.remotePatterns`. This is why `i.pravatar.cc`, `images.unsplash.com`, and Supabase storage domains are listed there.

## 4.9 Three questions to answer

1. If `staleTime` is 5 minutes and a new listing is posted, when will a user see it on the find-homes page?
2. Why does `api.ts` use `useAuthStore.getState()` instead of `useAuthStore()` (the hook)? What would break if you used the hook?
3. Why are there two separate type files (`types/api.ts` and `types/index.ts`)? What problem does the mapper pattern solve?

## 4.10 Things to try

- In `Providers.tsx`, change `staleTime` to `0`. Notice that the find-homes page now fetches on every render instead of using the cache.
- Add `console.log("fetching", queryKey)` inside a `queryFn`. Watch how often it fires as you navigate between pages.
- Look at `dashboard/page.tsx`. Find the `mapListing()` function. Change one of the field mappings and observe the TypeScript error it produces.

---

# Chapter 5 — Python Crash Course for JavaScript Developers

## 5.0 Why this chapter exists

The backend is Python. If you write JavaScript, Python will feel familiar — both are dynamically typed, have closures, first-class functions, and async support. The differences are mostly syntax.

## 5.1 Running Python and venv

A **virtual environment** (venv) isolates a project's dependencies from other Python projects on the machine. The equivalent in Node.js is `node_modules/`.

```bash
# Create venv (done once)
python -m venv venv

# Activate (must do this every terminal session)
source venv/bin/activate    # Mac/Linux
venv\Scripts\activate       # Windows

# Install dependencies from requirements.txt
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload
```

After activation, `python` and `pip` commands use the venv's copies, not the system's.

## 5.2 Python vs JavaScript — a side-by-side

| Concept  | JavaScript                        | Python                                  |
| -------- | --------------------------------- | --------------------------------------- |
| Variable | `const x = 5;`                    | `x = 5`                                 |
| String   | `"hello"` or `'hello'`            | `"hello"` or `'hello'`                  |
| f-string | `` `Hello ${name}` ``             | `f"Hello {name}"`                       |
| Array    | `[1, 2, 3]`                       | `[1, 2, 3]` (list)                      |
| Object   | `{ a: 1 }`                        | `{"a": 1}` (dict)                       |
| Function | `function foo(x) { return x+1; }` | `def foo(x): return x+1`                |
| Arrow fn | `(x) => x + 1`                    | `lambda x: x + 1`                       |
| `null`   | `null` / `undefined`              | `None`                                  |
| Boolean  | `true` / `false`                  | `True` / `False`                        |
| `if`     | `if (x > 0) { ... }`              | `if x > 0:` (indentation = braces)      |
| `for`    | `for (const x of arr) {}`         | `for x in arr:`                         |
| Class    | `class Foo { constructor() {} }`  | `class Foo: def __init__(self): ...`    |
| Import   | `import { x } from "./mod"`       | `from module import x`                  |
| Export   | `export const x = ...`            | (no export keyword — modules are files) |

**Indentation is syntax in Python.** Four spaces define a code block. Forgetting this is the most common Python beginner mistake.

## 5.3 Type hints

Python type hints look like TypeScript annotations but are optional and not enforced at runtime. FastAPI uses Pydantic to enforce them on request bodies. Everywhere else they are documentation.

```python
def greet(name: str, count: int = 1) -> str:
    return f"Hello {name}!" * count

# Optional fields
from typing import Optional
def foo(x: Optional[str] = None) -> None: ...

# Or the shorter Python 3.10+ syntax:
def bar(x: str | None = None) -> None: ...
```

## 5.4 async / await

Python's `async`/`await` is identical in concept to JavaScript's. A function declared `async def` returns a coroutine. You call it with `await`. You need an event loop (Uvicorn provides one for FastAPI).

```python
import httpx

async def fetch_data(url: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()
```

The `async with` construct is the async version of `with` (context manager — see below). `httpx.AsyncClient` is the async equivalent of JavaScript's `fetch`.

## 5.5 Async generators

An async generator is a function that `yield`s values one at a time while doing async work. In AXIOM, `ollama_client.py` uses this to stream tokens:

```python
# backend/app/ai/ollama_client.py:57-86
async def generate_stream(self, prompt: str, system: str = ""):
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload) as response:
            async for line in response.aiter_lines():
                if line.strip():
                    data = json.loads(line)
                    token = data.get("response", "")
                    if token:
                        yield token   # ← yields, doesn't return
                    if data.get("done"):
                        break
```

The caller uses `async for token in ollama.generate_stream(prompt):`. Each `yield` pauses the generator and sends a value to the caller.

## 5.6 Decorators

A decorator is a function that wraps another function. In Python, you apply one with `@`. FastAPI uses decorators to register route handlers:

```python
@router.get("/")          # ← decorator — registers this function as a GET handler
async def list_listings():
    ...

@router.post("/{id}/favorite")
async def toggle_favorite(id: str):
    ...
```

The decorator `@router.get("/")` is equivalent to writing `list_listings = router.get("/")(list_listings)` after the function — it registers the function with the router and keeps the function callable.

## 5.7 Modules and packages

Every `.py` file is a module. A folder with `__init__.py` is a package. You import between them with:

```python
from app.config import settings           # file: app/config.py, name: settings
from app.database import supabase_admin   # file: app/database.py, name: supabase_admin
from app.ai.ollama_client import ollama   # file: app/ai/ollama_client.py
```

The `app/` folder has `__init__.py` (empty file, just marks it as a package). So does `app/ai/`, `app/auth/`, etc.

## 5.8 Context managers (with)

The `with` statement is Python's way of ensuring cleanup happens. The `async with` variant is for async resources:

```python
# Synchronous: file is automatically closed when the with block exits
with open("file.txt") as f:
    content = f.read()

# Async: HTTP client connection is closed when the block exits
async with httpx.AsyncClient() as client:
    r = await client.get(url)
```

In `ollama_client.py`, `async with httpx.AsyncClient(...)` creates an HTTP client for the duration of the request, then closes it automatically — even if an exception occurs.

## 5.9 Exception handling

```python
try:
    result = supabase_admin.table("listings").select("*").execute()
except Exception as e:
    raise HTTPException(status_code=500, detail=f"DB error: {e}")
```

FastAPI converts `HTTPException` into the appropriate HTTP response automatically. The `detail` becomes the JSON error body. This is equivalent to:

```javascript
// JavaScript equivalent
try {
  const result = await supabase.from("listings").select("*");
} catch (e) {
  return res.status(500).json({ detail: `DB error: ${e.message}` });
}
```

## 5.10 Three questions to answer

1. What is a virtual environment and why is it needed? What is the JavaScript equivalent?
2. What does `yield` do in Python? How does it differ from `return`?
3. Explain what `@router.post("/")` does to the function below it.

## 5.11 Things to try

- Open `backend/app/listings/router.py`. Find the `@router.get("")` decorator. Trace what happens when this endpoint is called: where does `current_user` come from?
- In the Python REPL (`python` in the venv), type `from app.config import settings` then `settings.ollama_model`. You should see `"axiom-llm"`.
- Write a tiny async generator in Python that yields 1, 2, 3. Call it with `async for n in gen(): print(n)` inside an `asyncio.run(main())`.

---

# Chapter 6 — The Backend, Part 1: FastAPI

## 6.0 Why this chapter exists

FastAPI is the Python web framework that powers the backend. It provides routing, request parsing, validation, dependency injection, and auto-generated documentation. This chapter walks through how the backend is structured and how a single endpoint works.

## 6.1 What FastAPI is

FastAPI is a modern Python web framework similar to Express.js (Node.js) or Flask (Python), but with three additions that matter for AXIOM:

1. **Automatic validation via Pydantic**: declare a request body as a `BaseModel` class and FastAPI validates, parses, and type-checks it automatically. Invalid requests return a 422 automatically.
2. **Dependency injection**: declare dependencies as function arguments with `Depends(...)`. FastAPI calls the dependency, injects the result, and handles errors.
3. **Auto-generated OpenAPI docs**: visit `http://localhost:8000/docs` and see every endpoint, its request/response schema, and a "Try it out" button. Generated from your code automatically.

## 6.2 ASGI and Uvicorn

FastAPI is an **ASGI** (Asynchronous Server Gateway Interface) application. ASGI is the standard interface for Python async web apps — it's the Python equivalent of Node.js's event loop model.

**Uvicorn** is the ASGI server that actually listens on a port and runs FastAPI:

```bash
uvicorn app.main:app --reload --port 8000
#        ^^^^^^^^^^^         ^^^^^^^^
#        module:variable     auto-restarts on file changes
#        (app/main.py, the `app` variable)
```

`uvicorn` → handles network I/O → passes each request to `app` (the FastAPI instance) → FastAPI routes to the right handler → handler returns a response.

## 6.3 The FastAPI app — main.py line by line

```python
# backend/app/main.py:1-51
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.auth.router import router as auth_router
# ... 12 more router imports ...

app = FastAPI(                              # (lines 18-22)
    title="AXIOM V2 API",
    version="2.0.0",
    description="AI-powered real estate platform API for Egypt",
)

app.add_middleware(                         # (lines 24-30)
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")                    # (lines 33-35)
async def health():
    return {"status": "ok", "version": "2.0.0"}

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])     # (line 38)
app.include_router(listings_router, prefix="/api/listings", tags=["listings"])
# ... 11 more include_router calls ...
```

Each `include_router` call mounts all routes from that module under the given prefix. So `@router.get("/{id}")` in `listings/router.py` becomes `GET /api/listings/{id}` in the final app.

## 6.4 APIRouter — how each module registers its routes

Every module has a `router = APIRouter()` at the top. Routes are registered with decorators on that router. The router is then imported into `main.py` and mounted.

```python
# Pattern used in every backend module
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from app.database import supabase_admin
from app.dependencies import get_current_user

router = APIRouter()

@router.get("")          # GET /api/listings (prefix comes from main.py)
async def list_listings(
    page: int = 1,             # Query parameter with default
    per_page: int = 12,        # Query parameter with default
    category: str | None = None,  # Optional query parameter
    current_user: dict = Depends(get_current_user),  # Auth dependency
):
    ...
```

## 6.5 Pydantic BaseModel — request validation

When you want FastAPI to parse and validate a JSON request body, you define a `BaseModel`:

```python
# backend/app/ai/router.py:30-37
class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)  # required, max 2000 chars
    conversation_history: list[dict] = []        # optional, defaults to empty list

# Use it in a handler:
@router.post("/chat")
async def chat(body: ChatRequest):
    print(body.message)  # FastAPI already parsed and validated it
```

If the client sends `{ "message": "" }` with an empty string when `max_length=2000` doesn't allow empty... it won't fail there (max_length allows empty). But if the client sends `{ "message": 12345 }` where a string is expected, FastAPI returns 422 automatically.

`body.model_dump(exclude_none=True)` converts the Pydantic model to a plain Python dict, excluding fields that are `None` — useful when building a DB insert.

## 6.6 Dependency injection with Depends

`Depends(get_current_user)` tells FastAPI: "before calling this handler, call `get_current_user` and pass its return value here."

```python
# backend/app/dependencies.py:59-92
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials          # extracts Bearer token from header
    payload = _decode_token(token)           # validates JWT signature
    user_id = payload.get("sub")             # gets user ID from token
    result = supabase_admin.table("profiles").select("*").eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="User profile not found")
    return result.data                       # returns the user's profile row
```

Any handler that declares `current_user: dict = Depends(get_current_user)` automatically:

- Requires a Bearer token in the `Authorization` header
- Validates the token's signature
- Fetches the user from the database
- Receives the user profile dict

If validation fails at any step, FastAPI returns a 401 before the handler runs.

`Depends` can chain: `get_admin_user` depends on `get_current_user`:

```python
# backend/app/dependencies.py:95-99
async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
```

## 6.7 BackgroundTasks — fire and forget

`BackgroundTasks` lets you run a function after the response has been sent. In AXIOM this is used to run fraud scoring and embedding generation after a listing is created, so the user gets their `{"id": ..., "status": "pending"}` response immediately:

```python
# backend/app/listings/router.py:341-371
@router.post("", status_code=201)
async def create_listing(
    body: CreateListingRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    result = supabase_admin.table("listings").insert(listing_data).execute()
    listing_id = result.data[0]["id"]

    # These run AFTER the response is sent — user doesn't wait for them
    background_tasks.add_task(_score_and_approve, listing_id, listing_data)
    background_tasks.add_task(embed_listing, listing_id)
    background_tasks.add_task(embed_listing_chunk, listing_id)

    return {"id": listing_id, "status": "pending"}
```

## 6.8 Auto-generated docs

Visit `http://localhost:8000/docs` while the backend is running. You see every endpoint grouped by tag. Expand any endpoint, click "Try it out", fill in the request body, and click "Execute". The docs show you the exact request it sends and the response it receives.

This is generated from your Pydantic models and function signatures — zero extra work.

## 6.9 Three questions to answer

1. What is the difference between a path parameter, a query parameter, and a request body in FastAPI? Give an AXIOM example of each.
2. Why does `_score_and_approve` run as a background task instead of inline in `create_listing`?
3. If you add a new field to `CreateListingRequest(BaseModel)` without a default value, what happens to existing clients that don't send that field?

## 6.10 Things to try

- Open `http://localhost:8000/docs` and call `POST /api/auth/signup` with a test email. Observe the Pydantic validation error when you omit a required field.
- In `listings/router.py`, add `print(current_user["email"])` inside `create_listing`. See it appear in the uvicorn terminal.
- Add a new endpoint `@router.get("/ping")` to any router. Verify it appears in `/docs`.

---

# Chapter 7 — Auth Deep-Dive

## 7.0 Why this chapter exists

Authentication is the spine of the app. Every protected action depends on it. Understanding the full flow — from signup to verified API call — is essential for the viva and for debugging.

## 7.1 What a JWT is

A JWT (JSON Web Token) is a compact, self-verifiable token. It has three parts separated by dots:

```
eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9    ← Header (base64url-encoded JSON)
.
eyJzdWIiOiJhYmMtMTIzIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MTc0NjAwMDAwMH0
                                          ← Payload (base64url-encoded JSON)
.
MEUCIQDabc...                             ← Signature
```

Decode the payload and you get:

```json
{
  "sub": "abc-123-uuid", // Subject — the user's Supabase UUID
  "aud": "authenticated", // Audience — must match what the backend expects
  "role": "authenticated", // Supabase role
  "iat": 1746000000, // Issued at (Unix timestamp)
  "exp": 1746003600 // Expires at (Unix timestamp, 1 hour later)
}
```

The signature is produced by Supabase using its private key. The backend verifies the signature using Supabase's public key. **No database lookup is needed to verify a JWT** — the math proves it was issued by Supabase. The AXIOM backend then does a DB lookup to get the user profile.

## 7.2 HS256 vs ES256

Two signing algorithms are in use:

| Algorithm | Key type                                            | Who verifies                                                        |
| --------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| **HS256** | Symmetric — same key signs and verifies             | Older Supabase projects (pre-JWT rotation). `jwt_secret` in `.env`. |
| **ES256** | Asymmetric — private key signs, public key verifies | Newer Supabase projects. Public key fetched from JWKS endpoint.     |

AXIOM's `dependencies.py` handles both:

```python
# backend/app/dependencies.py:38-56
def _decode_token(token: str) -> dict:
    if _es256_public_key is not None:   # try ES256 first
        try:
            return jwt.decode(token, _es256_public_key, algorithms=["ES256"], audience="authenticated")
        except jwt.InvalidAlgorithmError:
            pass  # fall through to HS256

    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], audience="authenticated")
```

The ES256 public key is loaded once at startup by `_load_jwks()` (lines 18-35), which fetches it from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`.

## 7.3 JWKS

JWKS (JSON Web Key Set) is a standard endpoint that publishes an auth server's public keys. When Supabase rotates its signing key, it publishes the new key at JWKS. The backend fetches it once at startup. This is why the key is cached in `_es256_public_key` — you don't want to make an HTTP request to Supabase on every API call.

## 7.4 Supabase Auth flow

**Email/password signup:**

1. Frontend calls `POST /api/auth/signup` with `{ email, password, full_name, phone, ... }`.
2. Backend calls `supabase_admin.auth.admin.create_user(...)` — creates the user with email confirmed immediately.
3. A Postgres trigger fires: `AFTER INSERT ON auth.users` → `CREATE FUNCTION handle_new_user()` — it inserts a row into `profiles` with the same UUID.
4. Frontend receives `{ message: "Account created" }` and immediately calls `supabase.auth.signInWithPassword({ email, password })`.
5. Supabase Auth returns `{ session: { access_token, refresh_token }, user: {...} }`.
6. `authStore.login()` stores this session in Zustand AND Supabase JS puts it in `localStorage` + a cookie.

**OAuth (Google/Facebook):**

1. Frontend calls `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: ".../auth/callback" } })`.
2. Browser is redirected to Google's login page.
3. After Google authenticates the user, they are redirected to `/auth/callback` with a hash in the URL.
4. `app/auth/callback/page.tsx` calls `supabase.auth.getSession()`, which extracts the tokens from the hash.
5. `authStore.refreshProfile()` is called to load the user profile.
6. The user is redirected to `/dashboard`.

## 7.5 Where the token lives

Supabase JS stores the session in two places simultaneously:

1. **`localStorage`** — key `sb-<project-ref>-auth-token`. Available to JavaScript.
2. **Cookie** — `sb-<project-ref>-auth-token`. Readable by the server (middleware.ts).

This dual storage enables:

- `middleware.ts` to check auth on the server without JavaScript (cookie)
- `api.ts` to inject the token into requests via Zustand (which reads from the session that came from localStorage)

## 7.6 The two Supabase clients

```python
# backend/app/database.py:1-8
supabase_client: Client = create_client(settings.supabase_url, settings.supabase_anon_key)
supabase_admin: Client  = create_client(settings.supabase_url, settings.supabase_service_role_key)
```

| Client            | Key              | Can do                                           | Used for                        |
| ----------------- | ---------------- | ------------------------------------------------ | ------------------------------- |
| `supabase_client` | Anon key         | Auth operations (sign_in, sign_up), respects RLS | Only `auth/router.py` sign_in   |
| `supabase_admin`  | Service role key | **Bypasses RLS**, full DB access                 | All server-side DB reads/writes |

**Why service role bypasses RLS:** Row Level Security (RLS) uses `auth.uid()` to check the caller's identity. The service role key is a server-to-server key that tells Postgres "this is an admin, skip RLS checks." This means **the FastAPI layer is the security boundary** — it is our code's responsibility to check `owner_id == current_user["id"]` before performing updates.

## 7.7 The full traced request

"User clicks Edit Listing → sends PUT /api/listings/{id}":

1. Browser calls `api.put("/api/listings/" + id, body)`.
2. `api.ts` reads `useAuthStore.getState().session?.access_token` → injects `Authorization: Bearer eyJ...`.
3. Request reaches FastAPI. `listings_router.update_listing` is matched.
4. FastAPI calls `get_current_user(credentials=Depends(security))`.
5. `security` (HTTPBearer) extracts the `Bearer` token.
6. `_decode_token(token)` validates the JWT signature. Gets `sub` = user UUID.
7. `supabase_admin.table("profiles").select("*").eq("id", user_id).single().execute()` — fetches user profile.
8. `current_user` = `{ id: "abc-123", email: "...", role: "user", ... }`.
9. Handler checks `listing["owner_id"] == current_user["id"]` — if not, 403.
10. If owner: `supabase_admin.table("listings").update(data).eq("id", listing_id).execute()`.
11. Response `{ "id": listing_id }` sent back.

## 7.8 Three questions to answer

1. Why does the backend use `supabase_admin` (service role) for all DB reads, even reads that should be public? What security assumption does this create?
2. If `_load_jwks()` fails at startup (Supabase is unreachable), which fallback is used? What env var does that fallback require?
3. Trace the full auth flow for a user who logs in with Google for the first time and then visits `/dashboard`.

## 7.9 Things to try

- Paste a JWT from your browser's localStorage (DevTools → Application → Local Storage → `sb-...`) into `https://jwt.io`. Decode it. Find `sub`, `aud`, `exp`. Convert the `exp` to a human date.
- Call `GET /api/auth/me` in the `/docs` page without setting an Authorization header. Observe the 403 (no credentials provided).
- In `dependencies.py:97`, change `"admin"` to `"user"`. Now `get_admin_user` allows all users. Observe that admin endpoints become accessible. Change it back.

---

# Chapter 8 — PostgreSQL and Supabase Deep-Dive

## 8.0 Why this chapter exists

All of AXIOM's persistent data lives in PostgreSQL hosted by Supabase. Understanding the schema, Postgres features used (RLS, triggers, extensions, RPCs), and how they relate to the FastAPI code is essential for knowing why data looks the way it does and what could go wrong.

## 8.1 Relational fundamentals

A **relational database** stores data in tables (rows and columns). Tables are linked by **foreign keys** (FK) — a column in one table contains the `id` of a row in another table.

```sql
-- listings has a foreign key to profiles:
owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
```

`ON DELETE CASCADE` means: if the `profiles` row is deleted, all their `listings` are deleted too. `ON DELETE SET NULL` means: the FK column becomes `NULL` (e.g. if a neighborhood is removed, `listing.neighborhood_id` becomes `NULL` rather than deleting the listing).

A **JOIN** combines rows from two tables based on a matching key. In the supabase-py SDK this is done with `.select("*, neighborhoods(name)")` — the `(name)` part tells PostgREST to fetch the related `neighborhoods` row and embed its `name` field.

## 8.2 UUIDs vs integer IDs

AXIOM uses UUIDs (`gen_random_uuid()`) instead of auto-increment integers for all primary keys. Why:

- UUIDs can be generated client-side or in multiple DB nodes without collision
- They do not expose how many rows exist (security)
- Supabase Auth already uses UUIDs for user IDs — consistency

The format: `"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"` (eight-four-four-four-twelve hex digits).

## 8.3 Postgres extensions

```sql
-- docs/schema/001_v2_comprehensive_schema.sql:16-17
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vector;        -- pgvector (768-dim embeddings)
```

Extensions add new types, functions, and operators to Postgres. The `vector` extension adds the `vector(768)` column type and the `<=>` cosine distance operator.

## 8.4 Enum types

Instead of allowing any string in a column, Postgres enums constrain the valid values:

```sql
-- docs/schema/001_v2_comprehensive_schema.sql:23-40
CREATE TYPE user_role        AS ENUM ('user', 'admin');
CREATE TYPE listing_category AS ENUM ('for_rent', 'for_sale', 'shared_housing');
CREATE TYPE listing_status   AS ENUM ('active', 'pending', 'rejected', 'sold', 'rented');
```

If you try to insert `"broker"` into a `user_role` column, Postgres rejects it with an error. This enforces the architecture rule: there is no broker role, only `user` and `admin`.

## 8.5 JSONB — when to use it

`jsonb` is a binary JSON column that supports indexing and querying of nested keys. AXIOM uses it for:

- `profiles.lifestyle_preferences` — a flexible JSON object for AI matching
- `listings.payment_plan` — off-plan payment structure
- `knowledge_chunks.metadata` — arbitrary metadata about each RAG chunk

When a field structure is not known upfront, or when it differs by row, `jsonb` avoids adding many nullable columns. Query syntax: `jsonb_col->>'key'` (text) or `jsonb_col->'key'` (json value).

## 8.6 Soft delete

Soft delete means marking a record as deleted rather than actually removing it from the database. AXIOM uses this for listings and conversations:

```sql
deleted_at timestamptz  -- NULL means not deleted; non-NULL means deleted at that time
```

All read queries filter with `.is_("deleted_at", "null")` in the Python SDK. This is equivalent to `WHERE deleted_at IS NULL`.

Why soft delete instead of hard delete?

- Audit trail — you can see who deleted what and when
- Recovery — mistakes can be undone
- Referential integrity — related records (messages, applications) don't orphan

## 8.7 Indexes

An **index** is a data structure that speeds up queries on specific columns. Without an index, Postgres scans every row (full table scan). With an index, it jumps directly to matching rows.

**B-tree index** (default): for equality and range comparisons. `idx_listings_status` allows fast `WHERE status = 'active'`.

**Partial index**: an index with a `WHERE` clause — only indexes rows matching the condition.

```sql
CREATE INDEX idx_listings_active ON listings (created_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;
```

This index is smaller (only active listings) and the queries that filter on `status = 'active' AND deleted_at IS NULL` can use it directly.

**GIN index**: for full-text search and array operators. `idx_chunks_fts` (migration 004) enables fast `@@` text search:

```sql
CREATE INDEX idx_chunks_fts ON knowledge_chunks
  USING gin(to_tsvector('english', chunk_text));
```

**HNSW index**: for vector similarity search. Hierarchical Navigable Small World — a graph-based approximate nearest neighbour structure. Parameters:

- `m = 16`: each node connects to 16 neighbours (higher = better recall, more memory)
- `ef_construction = 64`: how many candidates are considered when building each node (higher = better quality index, slower build)

```sql
-- docs/schema/004_knowledge_chunks.sql:33-34
CREATE INDEX idx_chunks_embedding ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```

## 8.8 Row Level Security (RLS)

RLS lets Postgres enforce access policies at the row level. When RLS is enabled on a table, every query is checked against the policies.

```sql
-- Anyone can read neighborhoods:
CREATE POLICY neighborhoods_public_read ON neighborhoods FOR SELECT USING (true);

-- Users can read their own profile OR anyone can read profiles (for display):
CREATE POLICY profiles_public_read ON profiles FOR SELECT USING (true);
-- But only the owning user can write their own profile:
CREATE POLICY profiles_self_write  ON profiles FOR ALL USING (id = auth.uid());
```

`auth.uid()` returns the UUID of the currently authenticated Supabase user. When called via the anon key, this is the logged-in user. When called via the service role key, `auth.uid()` returns `NULL` — the service role is a server role, not a user. That is why `supabase_admin` bypasses RLS.

**The security model in AXIOM:** The FastAPI layer does the authorization checks (is this user the owner? are they an admin?). Postgres RLS is an additional safety net but is not the primary security boundary for server-side calls.

## 8.9 Triggers — auto-creating profiles

When Supabase creates a new user in `auth.users`, a trigger fires:

```sql
-- docs/schema/001_v2_comprehensive_schema.sql:98-116
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

`SECURITY DEFINER` means the function runs with the permissions of the _definer_ (the DB owner), not the caller. This lets the trigger write to `profiles` even though the caller (Supabase Auth) only has limited permissions.

`SET search_path = public` prevents a security attack where a malicious user creates a function in another schema with the same name.

## 8.10 RPC functions (stored procedures)

An **RPC** (Remote Procedure Call) in the Supabase context means calling a Postgres function via the SDK. These are defined as `CREATE OR REPLACE FUNCTION` in SQL.

AXIOM's key RPCs:

| Function                                                 | What it does                                              |
| -------------------------------------------------------- | --------------------------------------------------------- |
| `match_listings(query_embedding, ...)`                   | pgvector cosine similarity search on `listings.embedding` |
| `hybrid_search_chunks(query_text, query_embedding, ...)` | Hybrid BM25 + vector search on `knowledge_chunks`         |
| `toggle_favorite(p_user_id, p_listing_id)`               | Upserts/deletes from `favorites` atomically               |
| `get_user_conversations(p_user_id)`                      | Returns conversations with last message + unread count    |

Called from Python:

```python
result = supabase_admin.rpc("hybrid_search_chunks", {
    "query_text": query,
    "query_embedding": embedding,
    "match_count": 5,
}).execute()
```

## 8.11 Supabase Realtime

Supabase Realtime is a WebSocket server that listens to Postgres's WAL (Write-Ahead Log) and broadcasts changes to subscribed clients. Tables must be added to a Realtime publication:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

The frontend subscribes in `messages/page.tsx` (see Chapter 14).

## 8.12 Full schema overview

| Table                  | Key columns                                                                  | Notes                               |
| ---------------------- | ---------------------------------------------------------------------------- | ----------------------------------- |
| `neighborhoods`        | id, name, name_ar, city, slug                                                | Pre-seeded ~70 Egyptian areas       |
| `profiles`             | id (= auth.users.id), email, role, is_verified_seller, lifestyle_preferences | Single user type                    |
| `agencies`             | id, owner_id, name, slug, verified                                           | Real estate developer profiles      |
| `projects`             | id, agency_id, title, completion_pct, status                                 | New development compounds           |
| `listings`             | id, owner_id, category, property_type, price, city, embedding (vector)       | All listing types                   |
| `housemates`           | id, listing_id, profile_id                                                   | Current residents of shared housing |
| `listing_applications` | id, listing_id, applicant_id, status                                         | Applications for shared housing     |
| `favorites`            | user_id, listing_id                                                          | Many-to-many                        |
| `conversations`        | id, participant_a, participant_b, status, initiated_by                       | Message threads                     |
| `messages`             | id, conversation_id, sender_id, content                                      | Individual messages                 |
| `notifications`        | id, user_id, type, title, body, is_read                                      | In-app alerts                       |
| `blog_posts`           | id, title, slug, content, published_at                                       | Blog content                        |
| `viewings`             | id, listing_id, requester_id, scheduled_at, status                           | Viewing requests                    |
| `knowledge_chunks`     | id, source_type, source_id, chunk_text, embedding (vector)                   | RAG index                           |

## 8.13 Three questions to answer

1. Why does deleting a `profiles` row also delete all their `listings`? What SQL keyword enables this?
2. What is the difference between RLS and the service role key? Which one does AXIOM rely on as the primary security boundary?
3. What is `SECURITY DEFINER` in the trigger function, and what attack does `SET search_path = public` prevent?

## 8.14 Things to try

- Open the Supabase SQL editor. Run: `SELECT * FROM profiles LIMIT 5;`. Then run: `SELECT * FROM listings WHERE status = 'active' LIMIT 5;`
- Run `EXPLAIN SELECT * FROM knowledge_chunks WHERE embedding <=> '[0.1, ...]'::vector LIMIT 5;` and look for `Index Scan using idx_chunks_embedding` — this confirms the HNSW index is being used.
- Insert a row into `listings` with `category = 'broker'`. Observe the error.

---

# Chapter 9 — Supabase from the Backend

## 9.0 Why this chapter exists

The backend uses `supabase-py` (the Python Supabase SDK) for every database operation. Understanding the query builder pattern, insert/update/delete, RPC calls, and storage operations lets you add new features without guessing the syntax.

## 9.1 The query builder pattern

Every database call goes through a fluent chain ending in `.execute()`:

```python
# Read: all active listings in Cairo, newest first, page 2
result = (
    supabase_admin.table("listings")
    .select("*, neighborhoods(name)", count="exact")   # join + count
    .eq("status", "active")                            # WHERE status = 'active'
    .eq("city", "Cairo")                               # AND city = 'Cairo'
    .is_("deleted_at", "null")                         # AND deleted_at IS NULL
    .order("created_at", desc=True)                    # ORDER BY created_at DESC
    .range(12, 23)                                     # LIMIT 12 OFFSET 12 (page 2)
    .execute()
)
rows = result.data or []     # list of dicts, or empty list if nothing found
total = result.count         # total matching rows (because count="exact")
```

Key methods:

| Method                     | SQL equivalent                               |
| -------------------------- | -------------------------------------------- |
| `.eq("col", val)`          | `WHERE col = val`                            |
| `.neq("col", val)`         | `WHERE col != val`                           |
| `.gt("col", val)`          | `WHERE col > val`                            |
| `.gte("col", val)`         | `WHERE col >= val`                           |
| `.lt("col", val)`          | `WHERE col < val`                            |
| `.lte("col", val)`         | `WHERE col <= val`                           |
| `.is_("col", "null")`      | `WHERE col IS NULL`                          |
| `.ilike("col", "%val%")`   | `WHERE col ILIKE '%val%'` (case-insensitive) |
| `.in_("col", [a, b])`      | `WHERE col IN (a, b)`                        |
| `.contains("col", [val])`  | `WHERE col @> ARRAY[val]` (array contains)   |
| `.order("col", desc=True)` | `ORDER BY col DESC`                          |
| `.limit(n)`                | `LIMIT n`                                    |
| `.range(from, to)`         | `LIMIT (to-from+1) OFFSET from`              |
| `.single()`                | Expects exactly one row; raises if 0 or 2+   |

## 9.2 Insert

```python
# backend/app/listings/router.py:355-360
result = (
    supabase_admin.table("listings")
    .insert(listing_data)   # listing_data is a plain Python dict
    .execute()
)
listing_id = result.data[0]["id"]   # the inserted row comes back in result.data
```

`listing_data` is built from `body.model_dump(exclude_none=True)` — the Pydantic model converted to a dict, with `None` fields excluded (Postgres will use column defaults for them).

## 9.3 Update

```python
# Update a listing's status
supabase_admin.table("listings").update(
    {"status": "active", "fraud_score": 0.12}
).eq("id", listing_id).execute()
```

Always chain `.eq(...)` (or another filter) before `.execute()` when updating. Without a filter, you would update every row in the table.

## 9.4 Upsert

Used when you want to insert a row if it doesn't exist, or update it if it does:

```python
supabase_admin.table("knowledge_chunks").upsert(
    chunk_data,
    on_conflict="source_type,source_id"   # which columns define uniqueness
).execute()
```

## 9.5 RPC calls

```python
# backend/app/ai/rag.py:37-45
result = supabase_admin.rpc(
    "hybrid_search_chunks",
    {
        "query_text": query,
        "query_embedding": embedding,   # list[float], 768 elements
        "match_count": k,
        "filter_source": source_type,
    },
).execute()
rows = result.data or []
```

`.rpc("function_name", { param: value })` calls the Postgres function defined in your migration SQL. The return value matches whatever the function's `RETURNS TABLE (...)` defines.

## 9.6 Storage

Supabase Storage stores files (images, attachments). The backend generates signed upload URLs:

```python
# backend/app/uploads/router.py (simplified)
path = f"{user_id}/{uuid4()}.{ext}"
result = supabase_admin.storage.from_("listing-images").create_signed_upload_url(path)
public_url = supabase_admin.storage.from_("listing-images").get_public_url(path)
```

The frontend receives the signed URL, does a direct `PUT` to Supabase Storage (no FastAPI in the loop for the actual file), and then sends the `public_url` back as part of the listing data.

## 9.7 auth.admin API

```python
# backend/app/auth/router.py (simplified)
supabase_admin.auth.admin.create_user({
    "email": email,
    "password": password,
    "email_confirm": True,    # skip the confirmation email
    "user_metadata": { "full_name": full_name }
})
```

Using `email_confirm: True` means the user can log in immediately after signup. The FastAPI backend handles the confirmation step itself rather than sending an email.

## 9.8 Error handling conventions

Every DB call in AXIOM is wrapped in `try/except Exception`:

```python
try:
    result = supabase_admin.table("listings").select("*").eq("id", id).single().execute()
except Exception:
    raise HTTPException(status_code=404, detail="Listing not found")

if not result.data:
    raise HTTPException(status_code=404, detail="Listing not found")
```

Two cases to handle: the SDK raises (network error, timeout) or it succeeds but returns no data (row doesn't exist). Both result in a 404.

## 9.9 Three questions to answer

1. What is the difference between `.single()` and `.limit(1)`? What happens if you use `.single()` and the row doesn't exist?
2. If you call `.update({"status": "active"})` without chaining `.eq(...)`, what happens?
3. Why does the backend generate a signed upload URL for images instead of receiving the image file itself?

## 9.10 Things to try

- In `listings/router.py:create_listing`, add a `.select("id, title")` after `.insert(listing_data)` to control which fields come back.
- Add a new endpoint that calls the `toggle_favorite` RPC. Test it.
- Deliberately call `.single()` on a query that returns multiple rows (e.g. `.eq("status", "active")`) and observe the exception that the SDK raises.

---

# Chapter 10 — AI Part 1: LLM Fundamentals and Ollama

## 10.0 Why this chapter exists

AXIOM's AI features are built on top of a local LLM. If you don't understand what an LLM is, what tokens are, and how Ollama works, the AI code will seem like a black box.

## 10.1 What an LLM is

An **LLM (Large Language Model)** is a neural network trained to predict the next token given a sequence of tokens. That's all it does — one token at a time, repeatedly, until it decides to stop. The "intelligence" emerges from being trained on an enormous amount of human-written text.

**Tokens** are chunks of text — roughly 3-4 characters on average in English. "Hello world" is 2 tokens. "How are you?" is 4 tokens. `axiom-llm` has a context window of some maximum number of tokens (e.g. 4,096 or 8,192 depending on the model). If the conversation history + system prompt + current message exceed that limit, older content is dropped.

**Temperature** controls randomness. At temperature 0.0, the model always picks the most probable next token (deterministic). At temperature 1.0, it samples more randomly (creative). AXIOM uses the Ollama defaults.

## 10.2 Prompts

An LLM receives three types of input:

| Role        | Who writes it               | Purpose                                               |
| ----------- | --------------------------- | ----------------------------------------------------- |
| `system`    | The developer               | Instructions that set behaviour, persona, constraints |
| `user`      | The end user                | What the user typed                                   |
| `assistant` | The model's prior responses | Conversation history                                  |

The **system prompt** is the most powerful tool for controlling an LLM. In `ai/router.py`, the chat system prompt (lines 562-640) runs to ~78 lines of hard rules: GROUNDING (only cite listings from provided data), NO HALLUCINATION (if you don't know, say so), NO QUESTIONS BACK (the user is searching, not having a conversation), NO OFF-PLATFORM REFERRALS (never mention Aqarmap, Bayut, or OLX).

## 10.3 Hallucination and grounding

**Hallucination** is when an LLM invents facts that aren't true. For a real estate platform, a hallucinated listing ("3BR in Maadi for 5,000 EGP/month — contact at 010-XXXX") would be devastating.

AXIOM prevents hallucination through **grounding**: before the LLM generates a response, the backend fetches real verified listings from the database and injects them verbatim into the system prompt. The LLM is then instructed to only cite listings from that injected data.

The system prompt includes rules like:

```
GROUNDING: ONLY cite listings from the VERIFIED DATABASE RECORDS above.
NO HALLUCINATION: Never invent prices, phone numbers, or addresses.
FRESHNESS: The records in this turn override everything in prior turns.
```

## 10.4 What Ollama is

**Ollama** is a local LLM runtime — it runs open-source language models on your machine via a simple HTTP API, similar to how you would run a model via the OpenAI API, but without the internet dependency or cost.

Key commands:

```bash
ollama serve          # start the Ollama server (port 11434)
ollama list           # show installed models
ollama run llama3.2   # interactive chat with a model
ollama pull nomic-embed-text  # download the embedding model
```

AXIOM uses a custom Modelfile to create `axiom-llm`:

```
FROM llama3.2      # or whatever base model
SYSTEM "You are AXIOM, a real estate AI for Egypt..."
PARAMETER temperature 0.3
PARAMETER num_ctx 8192
```

The `ollama create axiom-llm -f Modelfile` command creates the model.

## 10.5 The Ollama client — ollama_client.py

The entire Ollama integration is in `backend/app/ai/ollama_client.py`. Five methods:

**`health()`** — always called first. Returns `True` if Ollama is reachable. If `False`, the calling code returns `AI_UNAVAILABLE` or fails-open (returns 0.0 for fraud score, approves amenity, etc.).

```python
# backend/app/ai/ollama_client.py:16-23
async def health(self) -> bool:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{self.base_url}/api/tags")
            return r.status_code == 200
    except Exception:
        return False
```

**`generate(prompt, system="")`** — one-shot completion. Returns the full response as a string. Used for JSON extraction (filter parsing, fraud scoring, amenity validation).

**`embed(text)`** — returns a `list[float]` of 768 dimensions. Uses `nomic-embed-text`. Called to embed queries before vector search, and called to embed listings when they are created.

```python
# backend/app/ai/ollama_client.py:43-55
async def embed(self, text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"{self.base_url}/api/embed",
            json={"model": self.embed_model, "input": text},
        )
        r.raise_for_status()
        return r.json().get("embeddings", [[]])[0]
```

**`generate_stream(prompt, system="")`** — async generator, yields token strings one at a time. Used by `/api/ai/search` for a simple streaming response.

**`chat_stream(messages)`** — async generator using the chat API (role-separated messages). Used by `/api/ai/chat`.

```python
# backend/app/ai/ollama_client.py:88-115
async def chat_stream(self, messages: list[dict]):
    payload = {"model": self.model, "messages": messages, "stream": True}
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.strip():
                    data = json.loads(line)
                    token = (data.get("message") or {}).get("content", "")
                    if token:
                        yield token
                    if data.get("done"):
                        break
```

The module-level singleton `ollama = OllamaClient()` (line 118) is what all other modules import.

## 10.6 Fail-open design

When Ollama is down, AXIOM degrades gracefully rather than crashing:

| Feature            | When Ollama is down                                           |
| ------------------ | ------------------------------------------------------------- |
| Chat               | Returns `{"ai_unavailable": true}` JSON instead of SSE        |
| Amenity validation | Returns `{"ok": true}` (assumes it's fine)                    |
| Fraud scoring      | Returns `0.0` (listing auto-approved)                         |
| Embeddings         | Returns `[]` (listing stays without embedding, no RAG for it) |
| Recommendations    | Returns empty list or falls back to recent listings           |

This is called **fail-open**: the safer failure mode is to let things through rather than block everything.

## 10.7 Three questions to answer

1. What is the difference between `ollama.generate()` and `ollama.chat_stream()`? When would you choose each?
2. Why is `health()` always called before any LLM call? What would happen if you skipped it?
3. What is a "context window" and what happens to the conversation if it is exceeded?

## 10.8 Things to try

- Run `curl http://localhost:11434/api/generate -d '{"model": "axiom-llm", "prompt": "What is Maadi?", "stream": false}'` in your terminal. You should see a JSON response with a `response` field.
- In `ollama_client.py`, change the timeout in `health()` from `2.0` to `0.001`. Restart the backend. Every AI call should now fail-open.
- Run `curl http://localhost:11434/api/embed -d '{"model": "nomic-embed-text", "input": "apartment in Cairo"}'`. Look at the `embeddings` array — 768 floats.

---

# Chapter 11 — AI Part 2: Embeddings, pgvector, and RAG

## 11.0 Why this chapter exists

RAG (Retrieval-Augmented Generation) is the core AI technique powering AXIOM's chat and search. This chapter explains what embeddings are, how vector databases work, and how the retrieval pipeline is built.

## 11.1 What embeddings are

An **embedding** is a list of numbers (a vector) that represents the _meaning_ of a piece of text. Two texts that mean similar things will have vectors that are close to each other in high-dimensional space. Two texts that mean different things will have vectors that are far apart.

```
"apartment in Maadi for rent"  → [0.12, -0.04, 0.78, ..., 0.23]  (768 numbers)
"flat to let in al-Maadi"      → [0.11, -0.03, 0.79, ..., 0.24]  (768 numbers, very close)
"recipe for chocolate cake"    → [-0.55, 0.82, -0.12, ..., -0.61] (768 numbers, very far)
```

The model that generates embeddings in AXIOM is `nomic-embed-text`, which outputs 768-dimensional vectors.

**Why 768 dimensions?** Each dimension captures a different aspect of meaning — grammar, topic, sentiment, entity type, etc. 768 is a common size for transformer-based embedding models (BERT-based). More dimensions = more information but more storage and computation.

## 11.2 Cosine similarity

To compare two vectors, AXIOM uses **cosine similarity** — the cosine of the angle between the two vectors. When the angle is 0 (vectors point the same direction), cosine similarity is 1.0 (identical meaning). When the angle is 90°, similarity is 0.0 (unrelated). When 180°, it is -1.0 (opposite meaning).

In pgvector, the `<=>` operator computes **cosine distance** (1 - cosine similarity). Lower distance = more similar.

```sql
-- Find the 5 knowledge_chunks most similar to the query embedding
SELECT * FROM knowledge_chunks
ORDER BY embedding <=> '[0.12, -0.04, 0.78, ...]'::vector
LIMIT 5;
```

## 11.3 HNSW — the vector index

Without an index, a vector search scans every row and computes cosine distance to each one — O(n). For 10,000 listings, that is fine. For 1,000,000 listings, it takes seconds.

**HNSW (Hierarchical Navigable Small World)** is an approximate nearest-neighbour index that makes vector search nearly O(log n). It builds a graph where each node connects to its nearest neighbours. Search starts at the top layer (few nodes, widely spread) and navigates down to find the approximate nearest neighbours.

```sql
-- docs/schema/004_knowledge_chunks.sql:33-34
CREATE INDEX idx_chunks_embedding ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```

`vector_cosine_ops` — the index uses cosine distance. `m = 16` — each node connects to 16 neighbours. `ef_construction = 64` — 64 candidates considered during index build. Approximate: it may miss a few nearest neighbours for speed.

## 11.4 Full-text search and BM25

**Full-text search (FTS)** finds documents that contain specific words. PostgreSQL converts text to a `tsvector` (a sorted list of lexemes — stemmed root words) and a query to a `tsquery`.

```sql
to_tsvector('english', 'apartments in Maadi for rent')
-- → 'apart':1 'maadi':3 'rent':5   (stopwords 'in', 'for' removed; 'apartments' stemmed)

websearch_to_tsquery('english', 'apartment rent Maadi')
-- → 'apart' & 'rent' & 'maadi'

-- Does the chunk contain all query terms?
to_tsvector('english', chunk_text) @@ websearch_to_tsquery('english', query_text)
```

`ts_rank_cd` returns a relevance score. This behaves like **BM25** (Best Match 25) — a classical information retrieval ranking that rewards rare term occurrence and discounts very common terms.

## 11.5 Reciprocal Rank Fusion (RRF)

Pure vector search misses exact keyword matches. Pure full-text search misses semantic equivalence ("flat" vs "apartment"). **RRF** combines both by converting each search's results into a rank ordering and fusing them:

```
RRF score = 1/(k + rank_in_vector_results) + 1/(k + rank_in_text_results)
```

Where `k = 50` (from migration 004). The constant `k` prevents very high-ranked items from dominating. Items that rank well in both searches get a high combined score; items that appear in only one still get partial credit.

```sql
-- docs/schema/004_knowledge_chunks.sql:61-102
WITH
  full_text AS (
    SELECT id, row_number() OVER (ORDER BY ts_rank_cd(...) DESC) AS rank_ix
    FROM knowledge_chunks WHERE to_tsvector(...) @@ websearch_to_tsquery(...)
    LIMIT 60  -- (least(5,30)*2)
  ),
  semantic AS (
    SELECT id, row_number() OVER (ORDER BY embedding <=> query_embedding) AS rank_ix
    FROM knowledge_chunks WHERE embedding IS NOT NULL
    LIMIT 60
  )
SELECT kc.*, (
    COALESCE(1.0 / (50 + ft.rank_ix), 0.0) +  -- full-text contribution
    COALESCE(1.0 / (50 + sem.rank_ix), 0.0)    -- semantic contribution
  ) AS score
FROM full_text ft
FULL OUTER JOIN semantic sem ON ft.id = sem.id
JOIN knowledge_chunks kc ON COALESCE(ft.id, sem.id) = kc.id
ORDER BY score DESC LIMIT 5;
```

`FULL OUTER JOIN` includes rows that appear in only one of the two CTEs (they get a 0.0 contribution from the missing side). `COALESCE(..., 0.0)` handles `NULL` rank for items not in that search.

## 11.6 What RAG is

**RAG (Retrieval-Augmented Generation)** is a technique for giving an LLM access to up-to-date factual knowledge without retraining it. The steps:

1. **Retrieve**: given a user query, find the most relevant chunks of text from your knowledge base (using the hybrid search above).
2. **Augment**: inject those chunks into the LLM's system prompt as grounded context.
3. **Generate**: the LLM generates a response using the injected context rather than its training data.

Without RAG, the LLM can only answer from its training data — which is frozen at a point in time and knows nothing about your listings. With RAG, the LLM can say "Based on our current listings, I found a 3BR apartment in Maadi at 15,000 EGP/month" because the actual listing data was injected.

## 11.7 The knowledge_chunks table

```sql
-- docs/schema/004_knowledge_chunks.sql:8-17
CREATE TABLE knowledge_chunks (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text         NOT NULL CHECK (source_type IN ('listing', 'neighborhood', 'blog')),
  source_id   text         NOT NULL,   -- ⚠ text, not uuid (BACKEND.md incorrectly says uuid)
  chunk_text  text         NOT NULL,
  embedding   vector(768),
  metadata    jsonb        NOT NULL DEFAULT '{}',
  created_at  timestamptz  DEFAULT now(),
  updated_at  timestamptz  DEFAULT now()
);
```

Every listing, neighborhood, and blog post gets a row here (or multiple rows for large content). When the AI searches for context, it searches this table.

⚠ **Doc note:** `docs/BACKEND.md` says `source_id UUID`. The actual column is `text`. Trust the SQL migration, not BACKEND.md.

## 11.8 The embed-on-write pattern

When a listing is created, three background tasks fire:

```python
# backend/app/listings/router.py:367-369
background_tasks.add_task(_score_and_approve, listing_id, listing_data)
background_tasks.add_task(embed_listing, listing_id)         # for match_listings RPC
background_tasks.add_task(embed_listing_chunk, listing_id)   # for RAG hybrid search
```

`embed_listing` (`backend/app/ai/embeddings.py:20`): builds a feature string from the listing fields, calls `ollama.embed()`, stores the 768-dim vector in `listings.embedding`. This vector is used by `match_listings` for personalized recommendations.

`embed_listing_chunk` (`backend/app/ai/embeddings.py:66`): builds a richer text representation, generates an embedding, and upserts into `knowledge_chunks`. This is what RAG retrieves from.

When a listing is updated, `embed_listing_chunk` runs again to keep RAG fresh.

## 11.9 RAGRetriever

```python
# backend/app/ai/rag.py:19-61
class RAGRetriever:
    async def retrieve(self, query: str, source_type=None, k=5) -> list[Chunk]:
        embedding = await ollama.embed(query)     # embed the user's query
        if not embedding:
            return []
        result = supabase_admin.rpc("hybrid_search_chunks", {
            "query_text": query,
            "query_embedding": embedding,
            "match_count": k,
            "filter_source": source_type,
        }).execute()
        return [Chunk(...) for row in (result.data or [])]

    def build_context(self, chunks, max_chars=3000) -> str:
        # Returns "[1][listing:abc] 3BR apartment in Maadi...\n[2][neighborhood:xyz] Maadi is..."
        ...

    def format_citations(self, chunks) -> list[Citation]:
        # Returns [{source_type, source_id, title, url: "/property/abc"}]
        ...
```

`retrieve()` never raises — it catches all exceptions and returns `[]`. This fail-open design means RAG context will be empty if Ollama is down, but the LLM will still respond (with the fallback system prompt that does not claim to have live data).

## 11.10 Three questions to answer

1. What is the difference between `embed_listing` and `embed_listing_chunk`? Why are both needed?
2. Why does RAG use hybrid search (BM25 + vector) instead of pure vector search?
3. If the `knowledge_chunks` table is empty (no listings have been embedded yet), what happens when a user sends a chat message asking about listings?

## 11.11 Things to try

- Run `python backend/scripts/batch_embed.py` to bulk-embed all active listings into `knowledge_chunks`. Then query the table in the Supabase SQL editor.
- In `rag.py`, change `k=5` to `k=1` in the `retrieve()` call used by chat. Notice how the AI gets less context and gives less specific answers.
- Call `POST /api/ai/search` with `{ "query": "apartment in Maadi under 10000 EGP" }`. Look at the raw response to see the extracted filters.

---

# Chapter 12 — AI Part 3: Streaming Chat End-to-End

## 12.0 Why this chapter exists

The AI chat feature is the most technically complex part of AXIOM. It combines async Python, SSE streaming, LLM integration, RAG, and a streaming frontend reader. This chapter traces every line.

## 12.1 What Server-Sent Events are

**SSE (Server-Sent Events)** is an HTTP technique for pushing data from server to client in real time. Unlike WebSockets (bidirectional), SSE is one-way (server to client) over a regular HTTP connection.

The response has:

```
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no   ← tells nginx not to buffer the response
```

The body is a sequence of `data:` lines, each followed by a blank line:

```
data: {"token": "Hello"}\n\n
data: {"token": " world"}\n\n
data: {"listing_refs": [...]}\n\n
data: [DONE]\n\n
```

The browser reads this stream progressively. Each complete `data: ...\n\n` chunk is a separate event.

## 12.2 The /api/ai/chat endpoint — full pipeline

Located in `backend/app/ai/router.py:480-750` (approximately). The handler:

**Step 1 — auth (optional)**

```python
current_user = await get_optional_user(credentials)  # None if anonymous
```

**Step 2 — detect property search intent**

```python
is_property_query = _detect_property_search(body.message) >= 40
```

`_detect_property_search` (lines 124-185) adds points for city names, property words, price patterns, bedroom shorthand, and intent phrases. Subtracts 30 for question words like "how" or "explain". Threshold ≥40 triggers listing search.

**Step 3 — parallel retrieval** (if property search detected)

```python
search_task = _search_listings_for_chat(body.message, current_user, ...)
rag_task = rag_retriever.retrieve(body.message, k=5)
listings, rag_chunks = await asyncio.gather(search_task, rag_task)
```

`asyncio.gather` runs both tasks in parallel — the listing search and RAG retrieval happen simultaneously, saving time.

`_search_listings_for_chat` has a 3-second budget (`asyncio.wait_for(..., timeout=3.0)`). If personalized (user has favorites + embeddings), it calls the `match_listings` RPC. Otherwise it falls back to a structured DB query using filters extracted by `_extract_filters_from_query`.

**Step 4 — assemble system prompt**

If listings were found, the grounded system prompt (lines 562-640) is used. The verified listing data is injected verbatim:

```python
system_prompt = GROUNDED_SYSTEM_PROMPT.format(
    listings_context=format_listings_for_llm(listings),
    rag_context=rag_retriever.build_context(rag_chunks),
    user_name=current_user["full_name"] if current_user else "Guest",
)
```

If no listings found, the fallback system prompt (lines 642-656) is used — it tells the LLM to admit it couldn't find matching listings and suggest the user refine their search.

**Step 5 — build message array**

```python
messages = [
    {"role": "system", "content": system_prompt},
    *body.conversation_history,   # prior turns from the frontend
    {"role": "user", "content": body.message},
]
```

**Step 6 — stream response**

```python
async def event_generator():
    async for token in ollama.chat_stream(messages):
        yield f"data: {json.dumps({'token': token})}\n\n"

    # After the tokens, send metadata
    if listings:
        yield f"data: {json.dumps({'listing_refs': listings})}\n\n"
    if rag_chunks:
        yield f"data: {json.dumps({'citations': [c.dict() for c in citations]})}\n\n"
    yield "data: [DONE]\n\n"

return StreamingResponse(event_generator(), media_type="text/event-stream",
    headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"})
```

## 12.3 The frontend SSE reader — ChatDrawer.tsx

Located in `frontend/src/components/ai/ChatDrawer.tsx:133-335`. The `sendMessage()` function:

**Step 1 — build request**

```typescript
// ChatDrawer.tsx:176-187
const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify({ message: text, conversation_history }),
  signal: abortControllerRef.current.signal, // allows cancellation
});
```

**Step 2 — handle JSON fallback**

```typescript
// ChatDrawer.tsx:189-202
if (contentType.includes("application/json")) {
  const json = await res.json();
  const content = json.ai_unavailable
    ? "AI is currently unavailable. Please try again later."
    : json.response ?? "Sorry, I couldn't generate a response.";
  setMessages((prev) => [...prev, { ..., content }]);
  return;
}
```

**Step 3 — stream reading loop**

```typescript
// ChatDrawer.tsx:204-280 (abridged)
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let accumulated = "";
let buffer = "";

while (true) {
  const { done, value } = await reader.read(); // read a chunk of bytes
  if (done) break;
  buffer += decoder.decode(value, { stream: true }); // decode bytes to string
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? ""; // keep the last incomplete line in the buffer

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (payload === "[DONE]") continue;
    const parsed = JSON.parse(payload);

    if (parsed.token) {
      accumulated += parsed.token;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, content: accumulated } : m,
        ),
      );
    }
    if (parsed.listing_refs) {
      /* attach listing cards */
    }
    if (parsed.citations) {
      /* attach citations */
    }
  }
}
```

The `buffer` trick handles a subtle problem: a network chunk may split a `data:` line in the middle. By keeping the last incomplete line in `buffer` and prepending it to the next chunk, we ensure every `data:` line is always processed in full.

## 12.4 The property search detector

`_detect_property_search` (lines 124-185) returns an integer score:

| Signal                                           | Points |
| ------------------------------------------------ | ------ |
| Egyptian city name (Cairo, Maadi, Alex, etc.)    | +40    |
| Property word (apartment, villa, rent, sale)     | +30    |
| Intent phrase (show me, looking for, أريد)       | +25    |
| Price pattern (15k, 5000 EGP)                    | +25    |
| Bedroom shorthand (3bd, 2br, غرف)                | +20    |
| Amenity word (pool, gym, parking)                | +20    |
| Bathroom shorthand                               | +15    |
| Size pattern (200sqm)                            | +15    |
| Question word ("how", "explain") when score ≤ 40 | -30    |

Threshold: **≥40** triggers listing search. "Show me apartments in Maadi" → 40 (city) + 30 (apartment) + 25 (show me) = 95. "How does Maadi compare to Zamalek?" → 40 (cities) − 30 (how) = 10 (no search, general answer).

## 12.5 Per-token timeout

The chat endpoint uses `asyncio.wait_for` with a 30-second per-token timeout to prevent a stuck Ollama process from hanging the connection forever. If no token arrives for 30 seconds, the generator raises `asyncio.TimeoutError`, which FastAPI catches and closes the stream.

## 12.6 Three questions to answer

1. Why does the `buffer` variable in the SSE reader exist? What problem does it solve?
2. If `_detect_property_search` returns 35 for a message, does listing search run? What happens instead?
3. Why is `asyncio.gather` used to run listing search and RAG retrieval simultaneously? What would be slower?

## 12.7 Things to try

- Open DevTools → Network → find the `/api/ai/chat` request → click "Response". Watch the raw SSE stream appear line by line as you chat.
- In `_detect_property_search`, change the threshold from `40` to `0` (trigger search on every message). Notice the AI now always searches for listings even when you ask "what is a lease?"
- Add `print(f"Detection score: {_detect_property_search(body.message)}")` inside the chat endpoint and watch scores appear in the backend terminal.

---

# Chapter 13 — AI Part 4: The Other Five Features

## 13.0 Why this chapter exists

Beyond chat, AXIOM has five more AI features. Each follows a similar pattern: health check → retrieve context if needed → build prompt → call LLM → parse output. This chapter covers all five so you can modify or extend any of them.

## 13.1 Natural-Language Property Search — POST /api/ai/search

**File:** `backend/app/ai/router.py:399-480`

Unlike the chat endpoint (which is multi-turn and conversational), `/api/ai/search` is stateless: one query in, structured results out.

**Pipeline:**

1. Call `_extract_filters_from_query(query)` — uses `ollama.generate()` with a carefully engineered system prompt that enumerates all valid `category`, `property_type`, `city`, `amenities` values so the LLM normalises user input ("3bd flat alex" → `{ category: "for_rent", bedrooms: 3, property_type: "apartment", location: "Alexandria" }`).
2. Apply the extracted filters to a Supabase query.
3. Re-rank results using `_compute_match_score(candidate, filters)` — a 0–100 score based on how many spec filters the listing satisfies.
4. Return listings + the extracted filters (so the frontend can show filter chips).

The system prompt for filter extraction (lines 97-113) lists all valid enum values. This prevents the LLM from making up values that don't exist in the database.

## 13.2 Recommendations — GET /api/ai/recommendations

**File:** `backend/app/ai/router.py:754-870`

**Pipeline:**

1. Fetch the current user's first favourite listing.
2. Get that listing's `embedding` vector (768-dim, stored in `listings.embedding`).
3. Call the `match_listings` RPC with that embedding → returns the top-N listings with similar vectors.
4. Exclude listings the user has already favourited.
5. Optional: if `?explain=true`, call `ollama.generate()` for each result with a prompt asking for a one-sentence explanation of why this listing matches.

The key insight: "similar embeddings" = "similar meaning" = listings that resemble something you've liked. If you liked a 3BR villa in Maadi with a garden, your embedding vector is close to other large villas in green Cairo neighbourhoods.

## 13.3 Roommate Compatibility — POST /api/ai/compatibility

**File:** `backend/app/ai/router.py:871-1029`

For shared housing listings. Takes the current user's `lifestyle_preferences` (from `profiles.lifestyle_preferences`) and the listing's housemates' preferences (from `housemates` table + their `profiles.lifestyle_preferences`).

**Pipeline:**

1. Fetch listing + housemates' profiles.
2. Build a prompt: "User lifestyle: {json}. Housemates: {json}. Rate compatibility 0-100 and explain."
3. Call `ollama.generate()` with the compatibility scoring system prompt (lines 983-997).
4. Parse the JSON response `{ "score": 78, "explanation": "..." }`.

**Why this matters for AXIOM:** Shared housing is a distinct category. Placing a smoker with a non-smoking household is a bad match even if the price and location are right. The AI compatibility score helps users make better decisions.

## 13.4 Bilingual Description Generation — POST /api/ai/description

**File:** `backend/app/ai/router.py:1029-1107`

When an owner creates a listing, they can ask AXIOM to generate a professional description in both English and Arabic.

**Pipeline:**

1. Receive listing attributes (title, type, city, bedrooms, amenities, price, notes).
2. Retrieve neighborhood RAG context — `rag_retriever.retrieve(f"{city} neighborhood", source_type="neighborhood", k=2)` — so the description can mention real neighbourhood characteristics.
3. Build a system prompt that instructs the LLM to write professional, engaging real-estate descriptions in both languages (system prompt lines 1066-1087).
4. Parse JSON response `{ "english": "...", "arabic": "..." }`.

The neighborhood RAG context prevents the LLM from inventing facts about Maadi or Zamalek — it grounds the description in real neighbourhood data.

## 13.5 Amenity Validation — POST /api/ai/validate-amenity

**File:** `backend/app/ai/router.py:1107-1146`

When a user types a custom amenity (like "rooftop terrace" or something inappropriate), this endpoint checks whether it's acceptable.

**Pipeline:**

1. Check if Ollama is healthy. If not → fail-open: `{ "ok": true }`.
2. Call `ollama.generate()` with a moderation prompt: "Is this amenity appropriate for a real estate listing? Return JSON `{ \"appropriate\": bool, \"reason\": str }`."
3. Parse the JSON. If `appropriate: true` → `{ "ok": true }`. If `false` → `{ "ok": false, "reason": "..." }`.
4. On any parse error → fail-open: `{ "ok": true }`.

**Why fail-open?** An amenity like "balcony" failing validation due to an Ollama timeout would block the user from submitting their listing. The risk of a bad amenity getting through is lower than the cost of blocking legitimate listings.

## 13.6 Fraud Detection — background task

**File:** `backend/app/ai/fraud.py`

Called as a background task after listing creation via `_score_and_approve` (`listings/router.py:374`). Returns a `score` from 0.0 (safe) to 1.0 (fraudulent). If score < 0.4, the listing is auto-approved and the owner is notified.

**Three weighted components:**

**Price anomaly (weight 0.3)** — `_price_anomaly()` (fraud.py:33-73): fetches the average price for the same category + city. If the listing is 0.3x–3.0x the average, score = 0.0. If <0.1x or >10x, score = 1.0. A flat at 1,000 EGP/month when the Cairo average is 12,000 EGP/month is suspicious.

**Owner reputation (weight 0.2)** — `_owner_reputation()` (fraud.py:76-102): counts the owner's previously rejected listings. 0 rejections → 0.0. 1-2 rejections → 0.3. >5 rejections → 1.0.

**LLM consistency check (weight 0.5)** — `_llm_consistency()` (fraud.py:105-177): the most powerful component. Retrieves real market price context from `knowledge_chunks`, then asks Ollama: "Is this description consistent with these attributes? Look for unrealistic claims, mismatches, suspicious urgency, requests for off-platform payment. Return `{ fraud_score: 0-1, reason: '...' }`."

Final score: `0.3 * price + 0.2 * reputation + 0.5 * llm`. The LLM component dominates because it can catch creative fraud patterns that the rule-based components miss.

## 13.7 Three questions to answer

1. Why does `/api/ai/description` retrieve neighborhood RAG context before generating the description? What would it say about Maadi without that context?
2. The fraud score threshold is 0.4 for auto-approval. What happens to listings that score 0.4–1.0? Who reviews them?
3. Why is the LLM consistency check the most important fraud component (weight 0.5) compared to price anomaly (weight 0.3)?

## 13.8 Things to try

- Call `POST /api/ai/description` with a test listing body. Read the English and Arabic descriptions.
- In `fraud.py:29`, change the threshold from `0.4` to `0.0` — every listing immediately gets `status: active`. Observe the effect.
- Call `POST /api/ai/validate-amenity` with `{ "amenity": "drug use allowed" }`. Observe the response.

---

# Chapter 14 — Real-Time Messaging

## 14.0 Why this chapter exists

The messages page is the most technically layered Client Component in the app: it combines REST queries, optimistic mutations, and a Supabase Realtime WebSocket subscription — all at once. Understanding it means you understand the full spectrum of data patterns AXIOM uses.

## 14.1 What Supabase Realtime is

Supabase Realtime is a service that listens to PostgreSQL's **WAL (Write-Ahead Log)** — the internal log of every database change — and broadcasts those changes to connected WebSocket clients.

For it to work, two things must be true:

1. The table is added to the Realtime publication (done in `docs/schema/001_v2_comprehensive_schema.sql`):
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE messages;
   ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
   ```
2. The frontend opens a Supabase channel and subscribes to changes.

This is different from polling (asking "any new messages?" every 5 seconds). With Realtime, the server _pushes_ new messages to the client the moment they are inserted into Postgres — no polling needed.

## 14.2 Message-request gating — Migration 002

Plain messaging would allow any user to send a message to any other user. To prevent spam, AXIOM added a **message-request model** in `docs/schema/002_message_requests.sql`:

```sql
ALTER TABLE conversations ADD COLUMN status text
  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected'));
ALTER TABLE conversations ADD COLUMN initiated_by uuid REFERENCES profiles(id);
```

When User A wants to message User B about a listing:

1. User A's first message creates a conversation with `status = 'pending'` and `initiated_by = A`.
2. User B sees the conversation in a "Requests" tab in the inbox sidebar.
3. User B can accept (status → `'accepted'`) or reject (status → `'rejected'`).
4. Only accepted conversations allow full messaging.

The blocked-users table (also in migration 002):

```sql
CREATE TABLE blocked_users (
  blocker_id uuid REFERENCES profiles(id),
  blocked_id uuid REFERENCES profiles(id),
  UNIQUE (blocker_id, blocked_id)
);
```

## 14.3 Per-user soft delete — Migration 003

A conversation should disappear from your inbox when you delete it — but the other participant should still see it. Migration 003 adds two timestamps:

```sql
ALTER TABLE conversations ADD COLUMN deleted_by_a_at timestamptz;
ALTER TABLE conversations ADD COLUMN deleted_by_b_at timestamptz;
```

When User A (who is `participant_a`) deletes the conversation, `deleted_by_a_at = now()`. User B can still see it. User A no longer sees it in their inbox (queries filter `deleted_by_a_at IS NULL`).

## 14.4 The messages page — frontend patterns

`frontend/src/app/messages/page.tsx` combines four data layers:

**Layer 1 — REST: conversation list**

```typescript
const { data: conversationsData } = useQuery(messagesQueries.conversations());
```

Fetches all conversations for the current user via `GET /api/messages/conversations`.

**Layer 2 — REST: active thread**

```typescript
const { data: messagesData } = useQuery({
  ...messagesQueries.messages(activeConversationId),
  enabled: !!activeConversationId,
});
```

Fetches messages for the selected conversation. Re-runs when `activeConversationId` changes.

**Layer 3 — Realtime: new messages from others**

```typescript
// frontend/src/app/messages/page.tsx (simplified)
useEffect(() => {
  if (!activeConversationId) return;
  const channel = supabase
    .channel(`conv:${activeConversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConversationId}`,
      },
      (payload) => {
        const newMsg = payload.new as ApiMessage;
        if (newMsg.sender_id !== user?.id) {
          setLiveMessages((prev) => [...prev, newMsg]);
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [activeConversationId, user?.id]);
```

When another user sends a message, Supabase broadcasts the new `messages` row. The frontend appends it to `liveMessages` without waiting for a React Query refetch.

**Layer 4 — Optimistic local state: own sent messages**

```typescript
// frontend/src/app/messages/page.tsx (simplified)
const handleSend = async () => {
  const text = inputValue.trim();
  if (!text) return;
  setInputValue("");
  // Optimistically add the message without waiting for the server
  setLiveMessages((prev) => [...prev, { id: "temp-" + Date.now(), sender_id: user.id, content: text, ... }]);
  await api.post(`/api/messages/conversations/${activeConversationId}`, { content: text });
};
```

Optimistic updates make the UI feel instant — the message appears immediately while the HTTP request is in flight.

## 14.5 Mutations with cache invalidation

Accept/reject/block actions use TanStack Query mutations that invalidate the conversations cache on success:

```typescript
const acceptMutation = useMutation({
  ...acceptConversationMutation(conversationId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  },
});
```

After `invalidateQueries`, React Query re-fetches `GET /api/messages/conversations` and the UI updates to show the accepted conversation in the main thread list.

## 14.6 Three questions to answer

1. Why does AXIOM use Supabase Realtime for incoming messages but optimistic local state for outgoing messages? Why not use Realtime for both?
2. What is the difference between `deleted_by_a_at` and a single `deleted_at` column? What problem does the two-column approach solve?
3. If `supabase.removeChannel(channel)` is not called in the `useEffect` cleanup, what happens?

## 14.7 Things to try

- Open two browser tabs (or two different browsers), log in with two different accounts, start a conversation. Watch messages arrive in real time without refreshing.
- In the Supabase SQL editor, insert a row directly into `messages` for an active conversation. Watch it appear in the frontend without any API call.
- Add `console.log("Realtime event:", payload)` inside the `postgres_changes` callback. Observe every incoming message logged.

---

# Chapter 15 — Operations and Quality

## 15.0 Why this chapter exists

Building working code is only half the job. You need to know how to run it safely, how to test it, and how to catch bugs before they reach users.

## 15.1 Environment variables and .env files

An `.env` file contains secret configuration values that must not be committed to git. The backend `.env` looks like:

```
SUPABASE_URL=https://pgaqqseqwtgsuihbswnv.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
JWT_SECRET=your-jwt-secret-from-supabase-dashboard
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=axiom-llm
FRONTEND_URL=http://localhost:3000
```

The frontend `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://pgaqqseqwtgsuihbswnv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Variables prefixed `NEXT_PUBLIC_` are exposed to the browser. Variables without that prefix are server-only. Never put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable — it bypasses RLS and is a security disaster if it reaches the browser.

The `.gitignore` excludes `.env` and `.env.local`. Anyone cloning the repo copies `.env.example` and fills in their own values.

The backend loads these via `pydantic_settings.BaseSettings` (`backend/app/config.py:1-25`):

```python
class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    jwt_secret: str
    ollama_model: str = "axiom-llm"
    # ... more with defaults
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()   # raises at startup if required vars are missing
```

If you forget to set `SUPABASE_URL`, the app fails immediately with a clear error — better than a mysterious 500 at runtime.

## 15.2 TypeScript checks — npx tsc --noEmit

Before finishing any task on the frontend, run:

```bash
cd frontend
npx tsc --noEmit
```

This runs the TypeScript compiler in type-check mode without emitting output files. It reports every type error across all files. The build will also fail if there are errors, but the compiler is faster and gives better error messages.

Common errors you'll see:

- `Type 'string | null' is not assignable to type 'string'` — you forgot to handle `null`
- `Property 'foo' does not exist on type 'Bar'` — wrong type or typo in property name
- `Argument of type 'number' is not assignable to parameter of type 'string'` — wrong type passed

Zero errors is the requirement before any commit.

## 15.3 FastAPI auto-docs at /docs

`http://localhost:8000/docs` is an interactive API explorer (Swagger UI) generated automatically from your FastAPI code. You can:

- See every endpoint with its HTTP method, path, and description
- See the exact request body schema (from your Pydantic `BaseModel`)
- See the possible response schemas
- Click "Try it out" → fill in values → "Execute" to make a real API call
- See the raw `curl` command it used

This is your primary tool for testing backend endpoints without writing frontend code first.

`http://localhost:8000/redoc` is an alternative docs format (ReDoc) that is better for reading long schemas.

## 15.4 The test suite

Backend tests use **pytest**. Run them:

```bash
cd backend
source venv/bin/activate   # or venv\Scripts\activate on Windows
pytest                     # all tests
pytest tests/test_ai.py    # specific file
pytest -v                  # verbose output
pytest -x                  # stop on first failure
```

**The key insight in `conftest.py`:** tests never hit the real Supabase or Ollama. `mock_supabase` patches every module that imports `supabase_admin` or `ollama` with `MagicMock`:

```python
# backend/tests/conftest.py:49-83
@pytest.fixture
def mock_supabase():
    mock_admin = MagicMock()
    mock_ollama = MagicMock()
    mock_ollama.health = AsyncMock(return_value=False)  # Ollama "down" by default
    mock_ollama.embed  = AsyncMock(return_value=[])
    mock_ollama.generate = AsyncMock(return_value="")

    with (
        patch("app.dependencies.supabase_admin", mock_admin),
        patch("app.listings.router.supabase_admin", mock_admin),
        patch("app.ai.router.ollama", mock_ollama),
        # ... 15 more patches
    ):
        yield mock_client, mock_admin
```

A `MagicMock` records every method call and returns `MagicMock` for any attribute access. You configure what it returns:

```python
# In a test:
mock_admin.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [FAKE_LISTING]
```

This reads as: "when someone chains `.table().select().eq().execute()`, return `.data = [FAKE_LISTING]`."

**Real JWT, mocked DB:** `make_supabase_jwt()` creates an actual valid JWT using the real `settings.jwt_secret`. The `get_current_user` dependency decodes it normally — only the final Supabase DB lookup is mocked to return `FAKE_PROFILE`. This means the auth path is tested end-to-end except for the network call.

**Example test pattern:**

```python
# backend/tests/test_listings.py (simplified)
def test_create_listing_requires_auth(client):
    response = client.post("/api/listings", json={...})
    assert response.status_code == 403   # no auth header

def test_create_listing_success(client, mock_supabase, auth_header):
    mock_client, mock_admin = mock_supabase
    # Configure mock: "profiles" lookup returns FAKE_PROFILE
    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = FAKE_PROFILE
    # Configure mock: "listings" insert returns a new row
    mock_admin.table.return_value.insert.return_value.execute.return_value.data = [{"id": "new-id"}]

    response = client.post("/api/listings", json={...}, headers=auth_header)
    assert response.status_code == 201
    assert response.json()["id"] == "new-id"
```

## 15.5 The batch_embed.py script

`backend/scripts/batch_embed.py` is a one-shot script that bulk-indexes all existing listings, neighborhoods, and blog posts into `knowledge_chunks`. Run it:

```bash
cd backend
source venv/bin/activate
python scripts/batch_embed.py
```

It uses `asyncio.Semaphore(10)` to limit concurrent Ollama calls to 10 at a time — prevents overwhelming Ollama. It skips listings already in `knowledge_chunks`. Progress is logged. Run it once after seeding the database, and again if you add a lot of listings without the RAG background task running.

## 15.6 The listing status lifecycle

```
Submit (POST /api/listings)
  │
  ▼
status: "pending"
  │
  ├─ Background: fraud score < 0.4 ──▶ status: "active" (auto-approved, owner notified)
  │
  └─ Background: fraud score ≥ 0.4 ──▶ stays "pending" (admin reviews manually)
                                             │
                                    ┌────────┴────────┐
                                    ▼                  ▼
                              status: "active"   status: "rejected"
                              (admin approves)   (owner notified with reason)
```

After approval, the owner can manually mark a listing as `sold` or `rented` via `PATCH /api/listings/{id}/status`.

## 15.7 Three questions to answer

1. Why must `SUPABASE_SERVICE_ROLE_KEY` never be in a `NEXT_PUBLIC_` environment variable?
2. What is the difference between `MagicMock` and `AsyncMock` in the test fixtures? When is each used?
3. If `batch_embed.py` is not run after adding 50 new listings via the API, those listings won't appear in RAG-based chat answers. Why? What background task would have handled it for each listing individually?

## 15.8 Things to try

- Run `pytest backend/tests/test_listings.py -v` and read every test case. Understand what each asserts.
- Add a new test: `test_health_endpoint` in a new file `tests/test_health.py`. Assert that `GET /api/health` returns 200 and `{"status": "ok"}`.
- Run the `batch_embed.py` script. Open the Supabase SQL editor, run `SELECT COUNT(*) FROM knowledge_chunks;`. You should see rows.

---

# Chapter 16 — The Viva Playbook

## 16.0 Why this chapter exists

Your graduation project viva will involve an examiner asking questions about every technical decision. This chapter gives you model answers for the 30 most likely questions, grouped by topic. Read and discuss each answer with your team.

---

## Architecture questions

**Q1: What does each part of the system do? Describe the three-tier architecture.**

AXIOM has three tiers: a Next.js 16 frontend (presentation layer) at port 3000, a FastAPI Python backend (business logic layer) at port 8000, and Supabase (data layer) hosting PostgreSQL, Auth, Storage, and Realtime. A fourth service, Ollama, runs locally at port 11434 and provides LLM inference and embeddings. The frontend talks only to the backend. The backend talks to Supabase and Ollama. Users never communicate directly with the database or AI model.

**Q2: Why FastAPI instead of Django or Flask?**

FastAPI gives us three things Django and Flask don't: first, native async/await support so the backend can handle many concurrent SSE streams without blocking; second, automatic request validation via Pydantic BaseModel so we don't write validation logic manually; third, automatic OpenAPI documentation at `/docs` which sped up testing during development. Django would have required more boilerplate; Flask would have required adding async and validation libraries separately.

**Q3: Why Next.js App Router and not a plain React SPA?**

App Router gives us Server Components — pages like the property detail page render on the server at request time and send pure HTML to the browser. This is critical for SEO (search engines index the content) and performance (no loading spinner on first paint). The AI chat and dashboard pages still use Client Components where interactivity is needed. The mixed SSR + client pattern is the best of both worlds.

**Q4: Why Supabase instead of a self-hosted PostgreSQL?**

Supabase provides four managed services in one: PostgreSQL (with pgvector), Auth (JWTs, OAuth, email confirmation), Storage (image hosting with signed URLs), and Realtime (WebSocket push from the WAL). Self-hosting all four would take weeks. Supabase's generous free tier is sufficient for a graduation project.

**Q5: Why local Ollama instead of the OpenAI API?**

Three reasons: cost (Ollama is free; OpenAI charges per token), privacy (listing data never leaves our infrastructure), and independence (no API key management, no rate limits, no network dependency for the AI features). The trade-off is that the model quality is lower than GPT-4, but for real estate search and description generation the results are acceptable.

---

## Authentication questions

**Q6: What is a JWT and why is it used instead of sessions?**

A JWT (JSON Web Token) is a self-verifiable token — the backend can verify its authenticity using a cryptographic signature without querying the database. This makes authentication stateless: the server doesn't need to store sessions. The token contains the user's UUID (`sub`), expiry time (`exp`), and audience (`aud: "authenticated"`). Supabase signs it with an ES256 private key; our backend verifies with the corresponding public key fetched from the JWKS endpoint.

**Q7: What is the difference between the Supabase anon key and the service role key?**

The anon key is the public key — it is safe to expose in the frontend. It is used for client-side Supabase operations (sign-in, OAuth). The service role key is a server-to-server key that bypasses Row Level Security. It is used in FastAPI for all database reads and writes, because our backend code is the security layer — we check ownership and permissions in Python, not in Postgres RLS policies. The service role key must never be exposed to the browser.

**Q8: Why does middleware.ts not validate the JWT?**

Next.js middleware runs on the Edge — a lightweight, limited runtime that doesn't have access to the full Node.js crypto APIs needed for JWT signature verification. More importantly, middleware is just a gate check: it verifies the cookie exists. The actual authorization (is this token valid? is this the correct user?) happens in FastAPI's `get_current_user` dependency, which has full access to `PyJWT` and the JWKS public key.

**Q9: What happens if a user's JWT expires while they are using the app?**

Supabase JS auto-refreshes tokens before they expire using the `refresh_token` stored in localStorage. If the refresh fails (e.g. the refresh token is also expired), the next API call returns 401. The `api.ts` client catches 401 responses and calls `useAuthStore.getState().logout()`, which calls `supabase.auth.signOut()` and redirects to the login page.

---

## Database questions

**Q10: Why are all listing types (for_rent, for_sale, shared_housing) in one table instead of separate tables?**

Single-table design avoids complex joins and simplifies queries. Since the AI search, recommendations, and the `find-homes` page all query listings regardless of type, a single table means one query instead of three `UNION ALL`s. The `category` column drives which optional fields are relevant for a given row. The trade-off is some nullable columns, which is acceptable.

**Q11: What is Row Level Security and how is it used in AXIOM?**

RLS is a Postgres feature that evaluates a policy expression for every row in a query. For example, `CREATE POLICY profiles_self_write ON profiles FOR ALL USING (id = auth.uid())` means a user can only write to their own profile row. AXIOM enables RLS on all tables. However, the FastAPI backend uses the service role key, which bypasses RLS. This means RLS is a safety net for the Supabase dashboard and direct SQL access, while FastAPI code is the true authorization layer.

**Q12: Explain soft delete. Why not just DELETE the row?**

Soft delete sets `deleted_at = now()` on a row instead of removing it. All read queries filter `WHERE deleted_at IS NULL`. Benefits: audit trail (you can see when something was deleted and recover it), referential integrity (related messages/applications don't become orphans), and analytics (you can query deleted listings). Hard delete would cascade-delete related data and lose history permanently.

**Q13: What is pgvector and what does the `<=>` operator do?**

pgvector is a PostgreSQL extension that adds a `vector(N)` column type and vector arithmetic operators. `<=>` computes cosine distance between two vectors (1 − cosine_similarity). Lower distance means more similar. AXIOM uses it to find listings whose embeddings are closest to a query embedding or a user's favourite listing's embedding.

---

## AI questions

**Q14: Walk me through what happens when a user types "show me 3BR apartments in Maadi under 20,000 EGP".**

1. Frontend sends `POST /api/ai/chat` with the message and conversation history.
2. Backend calls `_detect_property_search` — score: 40 (Maadi) + 30 (apartments) + 25 (show me) + 25 (20,000 EGP) = 120. Threshold 40 is exceeded.
3. `asyncio.gather` runs in parallel: (a) `_extract_filters_from_query` asks Ollama to parse `{ category: "for_rent", location: "Maadi", bedrooms: 3, max_price: 20000 }` from the message, then queries the DB with those filters; (b) `rag_retriever.retrieve` embeds the query and calls `hybrid_search_chunks` to find relevant knowledge chunks about Maadi.
4. Results are injected into the grounded system prompt with hard rules about not hallucinating.
5. `ollama.chat_stream` generates a response token by token.
6. FastAPI streams each token as `data: {"token": "..."}` SSE events.
7. `ChatDrawer.tsx` reads the stream and renders each token as it arrives.
8. After the last token, `data: {"listing_refs": [...]}` is sent — the frontend renders listing cards.

**Q15: What is RAG and why is hybrid search used instead of pure vector search?**

RAG (Retrieval-Augmented Generation) embeds a user query, retrieves semantically relevant text chunks from a knowledge base, injects them into the LLM's context, and lets the LLM generate a grounded response. We use hybrid search (BM25 full-text + cosine vector similarity combined with Reciprocal Rank Fusion) instead of pure vector search because: vector search excels at semantic similarity ("flat" matches "apartment") but can miss exact keyword matches ("Maadi" as a proper noun). BM25 excels at exact keyword matching but misses synonyms. RRF combines both: items ranked well by either method get a high combined score.

**Q16: How does AXIOM prevent the AI from hallucinating fake listings?**

Three mechanisms: first, the backend always fetches real listings from the database before generating a response — it does not ask the LLM to recall listings from training data. Second, the verified listing data is injected verbatim into the system prompt. Third, the system prompt contains explicit rules: "GROUNDING: ONLY cite listings from the VERIFIED DATABASE RECORDS above. NO HALLUCINATION: Never invent prices, phone numbers, or addresses." The LLM can only describe what is in the injected context.

**Q17: What is an embedding? Why does `nomic-embed-text` produce 768 numbers?**

An embedding is a fixed-length vector that encodes the semantic meaning of a text. `nomic-embed-text` is a transformer-based model that encodes text into a 768-dimensional space (each dimension captures a different aspect of meaning). Two texts that mean similar things will have vectors with a small cosine distance. 768 is the hidden size of the encoder's final layer — a design choice of the model architecture. Fewer dimensions lose information; more dimensions increase storage and computation cost with diminishing returns.

**Q18: What is the fraud detection system and what are its limitations?**

The fraud detector combines three signals: price anomaly (30%), owner reputation based on prior rejections (20%), and LLM consistency check (50%). A listing scoring below 0.4 is auto-approved. Limitations: (1) price anomaly relies on having enough comparable listings in the database — sparse markets give noisy averages; (2) owner reputation is easily gamed by creating a new account; (3) the LLM check is only as good as the model — sophisticated fraud (realistic description, plausible price, but fake contact details) may slip through. The system is a filter, not a guarantee.

**Q19: What is the role of the `knowledge_chunks` table?**

`knowledge_chunks` is the RAG index. Every listing, neighborhood, and blog post has one or more rows here, each containing a text representation and its embedding vector. When the AI needs context to answer a question, it embeds the query and retrieves the nearest chunks via `hybrid_search_chunks`. Without this table, the AI could only draw on its training data (which knows nothing about specific AXIOM listings).

**Q20: Why does the amenity validator fail-open when Ollama is unavailable?**

Fail-open means defaulting to "allow" when the validator is unavailable. The alternative (fail-closed: block amenity submission when Ollama is down) would prevent users from creating or editing listings during any Ollama outage. The risk of a bad amenity name getting through is low compared to the UX cost of blocking legitimate listings. The same philosophy applies to fraud scoring: when Ollama is down, fraud score defaults to 0.0 and the listing auto-approves.

---

## Frontend questions

**Q21: What is the difference between a Server Component and a Client Component in Next.js?**

Server Components run on the server at request time. They can `await` database calls or API fetches and send pure HTML to the browser. They cannot use `useState`, `useEffect`, or any browser API. Client Components (marked `"use client"`) run in the browser and can use hooks and events. AXIOM uses Server Components for content pages (property detail, agency profile, blog) for SEO and performance, and Client Components for interactive pages (find-homes, dashboard, messages, AI chat).

**Q22: Why is TanStack Query used instead of `useEffect` + `useState` for data fetching?**

Writing `useEffect(() => { fetch(...).then(setData) }, [deps])` manually has many pitfalls: race conditions (if deps change before the fetch completes), no caching (every navigation refetches), no loading/error states, no background refetching. TanStack Query solves all of these: it caches responses by `queryKey`, shares data between components, handles loading/error states, and only refetches when data is stale. The `staleTime` of 5 minutes means navigating back to a page instantly shows cached data.

**Q23: Why is Zustand used for auth state instead of TanStack Query?**

TanStack Query is for server state — data that lives on the server and is fetched over the network. The auth session (`access_token`, `refresh_token`, decoded user profile) lives in the browser's localStorage and is managed by the Supabase JS client. Zustand is the right tool for client-only state. A key advantage: `useAuthStore.getState()` works outside of React (in `api.ts`), which `useQuery` does not.

**Q24: Why does `middleware.ts` use cookie detection instead of JWT validation?**

See Q8 — the Edge runtime cannot run full crypto. But additionally: the Supabase JS client automatically syncs the session into a cookie. Checking the cookie is a reliable proxy for "user is logged in" at the middleware layer. The real validation (signature check, expiry, profile fetch) happens in FastAPI.

---

## Design decision questions

**Q25: Why is there a single user role instead of buyer/broker/admin roles?**

The original V1 had a `seeker/broker` role split which caused complexity everywhere: separate dashboards, different listing ownership rules, different API flows. V2 simplifies to `"user" | "admin"`. Any user can list, any user can search, any user can message. The `is_verified_seller` boolean flag (admin-granted) cosmetically distinguishes verified sellers without creating architectural role separation. This made the codebase significantly simpler and easier to maintain.

**Q26: Why does AXIOM use Tailwind CSS v4 (config-less) instead of v3?**

Tailwind v4 eliminates the `tailwind.config.ts` file — design tokens live in CSS custom properties in `globals.css`. This reduces configuration overhead and makes the design system easier to reason about: all tokens are CSS variables that you can inspect in DevTools. The trade-off is that v4 is newer and some third-party resources still target v3. For a custom project like AXIOM, the simplicity benefit outweighs the ecosystem maturity.

**Q27: Why are image uploads handled via signed URLs rather than multipart form data through FastAPI?**

Direct-to-storage uploads reduce backend load and latency. Instead of: browser → FastAPI → Supabase Storage (two network hops, large payloads through our backend), the flow is: browser requests signed URL from FastAPI (tiny request) → browser uploads directly to Supabase Storage (one hop, no backend in the loop). FastAPI only receives the final public URL, not the file itself. This is the standard pattern for cloud storage uploads.

**Q28: What is ISR (Incremental Static Regeneration) and where is it used in AXIOM?**

ISR is a Next.js feature: pages are rendered on the server and cached. The cache is invalidated after `revalidate` seconds. In AXIOM, Server Component pages use `serverFetch` with `{ next: { revalidate: 60 } }` — the property detail page is re-fetched from FastAPI at most once per minute. Between re-fetches, all users receive the cached HTML instantly. This makes the page fast while keeping it reasonably fresh. The find-homes and dashboard pages don't use ISR because they are Client Components that fetch data in the browser.

---

## System integration questions

**Q29: Trace a complete signup flow from clicking "Sign Up" to arriving at the dashboard.**

1. User fills `SignUpForm` and submits.
2. `authStore.signup()` calls `POST /api/auth/signup` (via FastAPI, not directly to Supabase, so the backend can set phone/country fields).
3. FastAPI calls `supabase_admin.auth.admin.create_user({ email_confirm: True })` — creates the Supabase Auth user and triggers the `handle_new_user()` Postgres trigger, which inserts a row into `profiles`.
4. FastAPI returns `{ message: "Account created" }`.
5. Frontend immediately calls `supabase.auth.signInWithPassword({ email, password })` — Supabase returns `{ session: { access_token, refresh_token }, user: {...} }`.
6. Supabase JS stores the session in localStorage and sets the auth cookie.
7. `authStore` calls `fetchProfile(session.access_token)` — `GET /api/auth/me` — to load the full profile from the FastAPI backend.
8. `set({ session, user })` — Zustand store updated.
9. `router.push("/dashboard")` — user lands on the dashboard.

**Q30: If the backend is restarted, what happens to active SSE chat connections?**

All active SSE connections are dropped when Uvicorn restarts — the TCP connection is closed and the browser receives a network error. The `ChatDrawer.tsx` `sendMessage` function catches errors and marks the assistant message with `isError: true`. The user sees an error state and can retry. Conversation history is preserved in `localStorage` (via `saveSession`), so the user's prior messages are not lost. The `AbortController` in the frontend also allows the user to cancel a stalled stream manually.

---

# Appendix A — Glossary

| Term         | Definition                                                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ASGI**     | Asynchronous Server Gateway Interface — Python's standard for async web apps (FastAPI + Uvicorn).                                                          |
| **BM25**     | Best Match 25 — a term-frequency/inverse-document-frequency ranking algorithm for full-text search.                                                        |
| **CORS**     | Cross-Origin Resource Sharing — browser policy that requires servers to explicitly allow cross-origin requests.                                            |
| **FK**       | Foreign Key — a column that references the primary key of another table.                                                                                   |
| **FTS**      | Full-Text Search — keyword-based search using `tsvector`/`tsquery` in Postgres.                                                                            |
| **HNSW**     | Hierarchical Navigable Small World — a graph-based approximate nearest-neighbour index for vector search.                                                  |
| **ISR**      | Incremental Static Regeneration — Next.js feature that caches server-rendered pages and revalidates them on a schedule.                                    |
| **JWT**      | JSON Web Token — a compact, self-verifiable token containing claims (sub, aud, exp) and a cryptographic signature.                                         |
| **JWKS**     | JSON Web Key Set — a standard endpoint that publishes an auth server's public keys for JWT verification.                                                   |
| **LLM**      | Large Language Model — a neural network trained to predict the next token given a sequence; "AI" in AXIOM.                                                 |
| **ORM**      | Object-Relational Mapper — a library that abstracts SQL into objects (e.g. SQLAlchemy). AXIOM does not use one — it uses the Supabase SDK's query builder. |
| **OTP**      | One-Time Password — a short-lived code sent via SMS for phone verification (Twilio Verify in AXIOM).                                                       |
| **pgvector** | A Postgres extension that adds `vector(N)` column type and similarity operators (`<=>`, `<->`, `<#>`).                                                     |
| **RAG**      | Retrieval-Augmented Generation — fetching relevant knowledge chunks and injecting them into an LLM's context before generation.                            |
| **RLS**      | Row Level Security — Postgres feature that evaluates a policy expression per row in every query.                                                           |
| **RPC**      | Remote Procedure Call — in Supabase context, calling a Postgres function via `.rpc("function_name", params)`.                                              |
| **RRF**      | Reciprocal Rank Fusion — a score combination formula: `1/(k + rank)` summed across multiple ranked lists.                                                  |
| **RSC**      | React Server Component — a component that runs on the server and sends HTML; cannot use hooks.                                                             |
| **SDK**      | Software Development Kit — a client library for an API (e.g. `supabase-py`, `@supabase/supabase-js`).                                                      |
| **SSE**      | Server-Sent Events — HTTP technique for server-to-client streaming using `text/event-stream` format.                                                       |
| **UUID**     | Universally Unique Identifier — a 128-bit random identifier in the format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.                                          |
| **WAL**      | Write-Ahead Log — PostgreSQL's internal log of every database change; Supabase Realtime listens to it.                                                     |
| **venv**     | Python virtual environment — an isolated directory containing a specific Python version and installed packages.                                            |

---

# Appendix B — Annotated Repo File Map

```
AXIOM-V2/
├── CLAUDE.md                   Instructions for Claude Code AI assistant
├── README.md                   Project overview and quick start
├── FULLknowledge.md            ← this file
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          Root layout: dark mode, Providers, floating AI button
│   │   │   ├── page.tsx            Home page (Server Component, lazy-loaded sections)
│   │   │   ├── (marketing)/        Route group: Navbar + Footer layout
│   │   │   ├── (auth)/             Route group: minimal auth layout
│   │   │   │   ├── login/          /login
│   │   │   │   ├── signup/         /signup
│   │   │   │   └── forgot-password/ /forgot-password
│   │   │   ├── auth/callback/      OAuth landing — extracts tokens from URL hash
│   │   │   ├── find-homes/         /find-homes — listing search + AI mode (Client)
│   │   │   ├── property/[id]/      /property/:id — SSR listing detail
│   │   │   ├── project/[id]/       /project/:id — SSR compound/project detail
│   │   │   ├── agencies/           /agencies — developer listing (Client)
│   │   │   │   └── [slug]/         /agencies/:slug — SSR agency profile
│   │   │   ├── blog/               /blog, /blog/:slug — SSR blog
│   │   │   ├── messages/           /messages — inbox (Client, Realtime)
│   │   │   ├── dashboard/          /dashboard — user hub (Client, protected)
│   │   │   └── admin/              /admin — admin panel
│   │   │
│   │   ├── components/
│   │   │   ├── ai/
│   │   │   │   ├── ChatDrawer.tsx      AI chat panel — SSE stream consumer
│   │   │   │   └── ChatMessage.tsx     Message renderer + listing cards
│   │   │   ├── dashboard/
│   │   │   │   ├── AddListingModal.tsx  Create/edit listing form
│   │   │   │   └── AddListingMiniMap.tsx Leaflet map for location pick
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx          Top navigation bar
│   │   │   │   ├── Footer.tsx          Page footer
│   │   │   │   └── FloatingAIButton.tsx Floating button that opens ChatDrawer
│   │   │   ├── messages/
│   │   │   │   └── ChatArea.tsx        Message thread view
│   │   │   ├── property/               Components for /property/:id page
│   │   │   ├── shared-housing/         Components for shared housing listings
│   │   │   ├── agency-details/         Components for /agencies/:slug page
│   │   │   ├── find-homes/             Filters, cards, rows for /find-homes
│   │   │   └── ui/                     shadcn/ui primitives (button, card, dialog...)
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts              HTTP client: api.get/post/..., serverFetch, ApiError
│   │   │   ├── queries.ts          TanStack Query factories (queryKey + queryFn)
│   │   │   ├── supabase.ts         Supabase JS singleton client
│   │   │   └── constants.ts        Nav items, mock data, static config
│   │   │
│   │   ├── stores/
│   │   │   └── authStore.ts        Zustand: user session, login, signup, logout
│   │   │
│   │   ├── types/
│   │   │   ├── index.ts            UI view-models (camelCase): AuthUser, Listing, PropertyDetail...
│   │   │   └── api.ts              Backend mirror types (snake_case): ListingDetail, ApiProfileResponse...
│   │   │
│   │   ├── hooks/
│   │   │   └── useNominatim.ts     Debounced address autocomplete via OpenStreetMap
│   │   │
│   │   └── providers/
│   │       └── Providers.tsx       QueryClient + AuthInitializer + Toaster
│   │
│   ├── middleware.ts                Cookie-based route guard (Edge runtime)
│   ├── next.config.ts              Image domains, API proxy rewrites, bundle optimizations
│   └── src/app/globals.css         Tailwind v4 CSS tokens, dark theme variables
│
├── backend/
│   ├── app/
│   │   ├── main.py                 FastAPI app init, CORS, router registration
│   │   ├── config.py               Pydantic Settings: env vars with defaults
│   │   ├── database.py             Two Supabase clients (anon + service_role)
│   │   ├── dependencies.py         get_current_user, get_admin_user, get_optional_user
│   │   │
│   │   ├── auth/
│   │   │   ├── router.py           POST /signup, /login, GET /me, PATCH /profile, OTP
│   │   │   └── schemas.py          SignUpRequest, LoginRequest, UpdateProfileRequest
│   │   │
│   │   ├── listings/
│   │   │   ├── router.py           Full CRUD + favorites + applications + similar
│   │   │   └── schemas.py          CreateListingRequest, ListingDetailResponse, etc.
│   │   │
│   │   ├── ai/
│   │   │   ├── ollama_client.py    OllamaClient: health, generate, embed, chat_stream
│   │   │   ├── rag.py              RAGRetriever: retrieve, build_context, format_citations
│   │   │   ├── embeddings.py       embed_listing, embed_listing_chunk, delete_listing_chunk
│   │   │   ├── fraud.py            score_listing: price_anomaly + reputation + llm_consistency
│   │   │   ├── router.py           /search, /chat, /recommendations, /compatibility, /description, /validate-amenity
│   │   │   └── schemas.py          Chunk, Citation, RAGResponse
│   │   │
│   │   ├── messages/
│   │   │   ├── router.py           Conversations CRUD + messages + accept/reject/block
│   │   │   └── schemas.py          CreateConversationRequest, MessageResponse
│   │   │
│   │   ├── dashboard/
│   │   │   └── router.py           GET /me — aggregate profile + listings + analytics
│   │   │
│   │   ├── agencies/               Agency profiles, projects, subscribe
│   │   ├── admin/                  Admin-only CRUD with separate JWT auth
│   │   ├── uploads/                Signed upload URL generation
│   │   ├── notifications/          In-app notification read/mark-read
│   │   ├── viewings/               Property viewing request CRUD
│   │   ├── blog/                   Blog post list and detail
│   │   ├── applications/           Shared-housing application flow
│   │   └── projects/               New-development project detail
│   │
│   ├── tests/
│   │   ├── conftest.py             Fixtures: mock_supabase, client, auth_header, make_supabase_jwt
│   │   ├── test_ai.py              Largest test file (~33KB): all AI endpoints
│   │   ├── test_listings.py        Listing CRUD tests
│   │   ├── test_auth.py            Auth flow tests
│   │   ├── test_messages.py        Messaging tests
│   │   └── test_validate_amenity.py  7 tests for amenity validation
│   │
│   ├── scripts/
│   │   └── batch_embed.py          Bulk RAG indexer: embed all listings, neighborhoods, blog posts
│   │
│   └── requirements.txt            fastapi, uvicorn, pydantic, supabase, PyJWT, httpx, twilio
│
└── docs/
    ├── schema/
    │   ├── 001_v2_comprehensive_schema.sql  Full DB schema: 13 tables, enums, trigger, RLS
    │   ├── 002_message_requests.sql         Message-request gating + blocked_users
    │   ├── 003_conversation_soft_delete.sql  Per-user conversation soft delete
    │   └── 004_knowledge_chunks.sql         RAG table + HNSW index + hybrid_search_chunks RPC
    ├── AI_FEATURES.md              AI feature specs (reference, not teaching)
    ├── API_REFERENCE.md            Endpoint shapes: what to send and receive
    ├── BACKEND.md                  Backend architecture reference
    ├── ROADMAP.md                  Current build status by feature
    └── SETUP.md                    Local environment setup guide
```

---

# Appendix C — Known Documentation Inconsistencies

These bugs exist in the docs as of April 2026. Trust the actual SQL/Python/TypeScript code over any doc that contradicts it.

| Doc                                   | Claim                                                                | Reality                                                                                        | Where to verify                                   |
| ------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `CLAUDE.md`, `SETUP.md`, `BACKEND.md` | Backend lives at `G:\AI\Newstart\backend\`                           | Backend is inside this repo at `backend/`                                                      | `ls backend/`                                     |
| `README.md`, `CLAUDE.md`              | Links to `docs/GREENFIELD.md` ("read this first")                    | `GREENFIELD.md` does not exist — it was deleted in the April 2026 cleanup                      | `ls docs/`                                        |
| `API_REFERENCE.md`                    | SSE events for `/api/ai/chat` use `{"type":"token","content":"..."}` | Actual events use `{"token":"..."}`, `{"listing_refs":[...]}`, `{"citations":[...]}`, `[DONE]` | `backend/app/ai/router.py`                        |
| `BACKEND.md`                          | `knowledge_chunks.source_id` is `UUID` type                          | It is `text` type                                                                              | `docs/schema/004_knowledge_chunks.sql:11`         |
| `BACKEND.md`                          | `notifications` table has `read_at` column                           | Actual column is `is_read boolean`                                                             | `docs/schema/001_v2_comprehensive_schema.sql`     |
| `BACKEND.md`                          | Lists `listings_images` as a separate table                          | Images are stored as `text[]` on the `listings` table, not a separate table                    | `docs/schema/001_v2_comprehensive_schema.sql:198` |
| `SETUP.md`                            | References `G:\AI\Newstart\backend\migrations\schema.sql`            | Schema files are at `docs/schema/001*.sql`, `002*.sql`, etc.                                   | `ls docs/schema/`                                 |

---

# Appendix D — Suggested Reading Orders

**Full depth (recommended for thorough preparation — 2–3 weeks):**
Chapters 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16. Read each chapter, then do the "Things to try" before moving on.

**Viva preparation fast-track (2 days):**
Chapter 0 (orientation), Chapter 7 (auth — always asked), Chapter 11 (RAG — the hardest AI concept), Chapter 12 (streaming chat — the most complex feature), Chapter 16 (all 30 Q&As). Read in order, focus on understanding the answers to Chapter 16.

**Frontend specialist:**
Chapter 0, 1, 2, 3, 4, 7 (auth section on frontend cookie/Zustand), 12 (ChatDrawer SSE reader), 14 (Realtime).

**Backend / AI specialist:**
Chapter 0, 5 (Python fundamentals), 6 (FastAPI), 7 (auth dependencies), 8 (Postgres schema), 9 (Supabase SDK), 10 (LLM + Ollama), 11 (embeddings + RAG), 12 (chat endpoint), 13 (all AI features), 15 (tests).

**"I need to add a new feature" reference:**

- New backend endpoint: re-read §6.4 (APIRouter), §6.5 (Pydantic), §6.6 (Depends), §9.1–9.3 (Supabase reads/writes)
- New frontend page: re-read §3.1–3.4 (App Router), §4.1 (TanStack Query), §4.3 (api.ts)
- New AI feature: re-read §10.5 (OllamaClient), §11.9 (RAGRetriever), §12.2 (event_generator pattern)

---

# Appendix E — System Sequence Diagrams

## E.1 User login flow

```
Browser          Frontend (Next.js)      Supabase Auth      FastAPI        Supabase DB
   |                     |                     |                |                |
   |--submit login form->|                     |                |                |
   |                     |--signInWithPassword->|                |                |
   |                     |                     |--validate---->|                |
   |                     |<--{session, user}---|                |                |
   |                     |                     |                |                |
   |                     |--GET /api/auth/me (Bearer token)---->|                |
   |                     |                     |                |--SELECT profiles|
   |                     |                     |                |<--{profile row}-|
   |                     |<--{AuthUser profile}----------------|                |
   |                     |                     |                |                |
   |                     | [store session+user in Zustand]      |                |
   |<--redirect /dashboard|                     |                |                |
```

## E.2 AI chat with listing search

```
Browser          ChatDrawer.tsx       FastAPI (/api/ai)    Ollama          Supabase DB
   |                   |                     |                |                |
   |--type message---->|                     |                |                |
   |                   |--POST /api/ai/chat->|                |                |
   |                   |                     |--health()----->|                |
   |                   |                     |<--true---------|                |
   |                   |                     |                |                |
   |                   |                     |[detect: score=95, run search]   |
   |                   |                     |                |                |
   |                   |                     |--asyncio.gather:                |
   |                   |                     |  ├ embed(query)------>|         |
   |                   |                     |  |<--[768 floats]-----|         |
   |                   |                     |  ├ hybrid_search_chunks RPC---->|
   |                   |                     |  |<--[RAG chunks]---------------|
   |                   |                     |  └ match_listings RPC---------->|
   |                   |                     |    <--[listing rows]------------|
   |                   |                     |                |                |
   |                   |                     |[build grounded system prompt]   |
   |                   |                     |--chat_stream(messages)-->|      |
   |                   |                     |<--token by token---------|      |
   |                   |<--data: {"token":"Hello"}                      |      |
   |<--render token----|                     |<--..more tokens----------|      |
   |                   |<--data: {"listing_refs":[...]}                 |      |
   |<--render cards----|                     |<--data: [DONE]-----------|      |
```

## E.3 New listing creation with background tasks

```
Browser          Frontend             FastAPI             Supabase DB         Ollama
   |                |                    |                     |                 |
   |--submit form-->|                    |                     |                 |
   |                |--POST /api/listings|                     |                 |
   |                |                    |--INSERT listings--->|                 |
   |                |                    |<--{id: "abc"}-------|                 |
   |                |<--{id:"abc", status:"pending"}           |                 |
   |<--show "pending"|                   |                     |                 |
   |                |                    |                     |                 |
   |                |        [background tasks start AFTER response sent]        |
   |                |                    |                     |                 |
   |                |                    |--embed(listing text)------->|         |
   |                |                    |<--[768 floats]-------------|         |
   |                |                    |--UPDATE listings embedding->|         |
   |                |                    |--INSERT knowledge_chunks--->|         |
   |                |                    |                     |                 |
   |                |                    |--score_listing()----------->|         |
   |                |                    |  (price anomaly + LLM check)|        |
   |                |                    |<--fraud_score: 0.15---------|         |
   |                |                    |--UPDATE listings status='active'->|   |
   |                |                    |--INSERT notification------->|         |
```

## E.4 Dashboard load

```
Browser          dashboard/page.tsx     FastAPI              Supabase DB
   |                     |                  |                     |
   |--navigate /dashboard|                  |                     |
   |                     |[check Zustand: user exists?]           |
   |                     |                  |                     |
   |                     |--GET /api/dashboard/me (Bearer)------->|
   |                     |                  |--SELECT profiles---->|
   |                     |                  |--SELECT listings---->|
   |                     |                  |--SELECT favorites--->|
   |                     |                  |--RPC conversations-->|
   |                     |                  |--SELECT viewings---->|
   |                     |<--DashboardResponse aggregated---------|
   |                     |[map API types → UI types]              |
   |<--render dashboard--|                  |                     |
```

---

_End of FULLknowledge.md_

_This document was generated from direct code inspection of the AXIOM V2 repository at commit `feat/chat-listing-search`, April 2026. Every code snippet cites a real file and line number. If a snippet does not match what you see in the file, the code has been updated since this document was written — trust the code._
