# Phase 6: Hardening + Launch - Research

**Researched:** 2026-03-21
**Domain:** Production hardening — security, CI/CD, deployment, testing
**Confidence:** HIGH (most areas verified against official docs and current sources)

---

## Summary

Phase 6 transforms AXIOM from a working development application into a production-ready platform. The work splits into five categories: (1) security hardening of the FastAPI backend and Next.js frontend, (2) CI/CD pipeline via GitHub Actions targeting Railway + Vercel, (3) E2E and security tests via Playwright + pytest, (4) frontend SEO polish, and (5) load testing to validate the p95 < 500ms SLO.

The existing codebase is well-positioned: `settings.redis_url` is already defined in `config.py` (initially empty string), `CORSMiddleware` is already mounted in `main.py` with `settings.frontend_url`, and the test suite uses `TestClient` with mocked Supabase — all of which directly constrain the implementation patterns.

**Primary recommendation:** Use `slowapi` + Upstash Redis for rate limiting (fail-open when Redis unavailable), `secweb` for FastAPI security headers, Next.js `headers()` in `next.config.ts` for frontend security headers, GitHub Actions separate workflow files per service, Railway with `railway.json` + `uvicorn` bound to `$PORT`, Vercel with zero-config for Next.js, and Playwright with `storageState` for auth.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-HARD-01 | Rate limiting on FastAPI endpoints | slowapi + Upstash Redis, fail-open pattern |
| REQ-HARD-02 | Redis AI response caching (prompt hash key + TTL) | upstash-redis direct, hashlib.sha256 pattern |
| REQ-HARD-03 | CORS lockdown — restrict to production origins | CORSMiddleware allow_origins from env var list |
| REQ-HARD-04 | Security headers on FastAPI responses | secweb middleware or custom BaseHTTPMiddleware |
| REQ-HARD-05 | Security headers on Next.js responses | next.config.ts headers() function |
| REQ-HARD-06 | GitHub Actions backend CI (ruff + mypy + pytest 80% + pip-audit) | Verified workflow pattern with pip cache |
| REQ-HARD-07 | GitHub Actions frontend CI (eslint + tsc + build + npm audit) | Verified workflow pattern with npm cache + .next/cache |
| REQ-HARD-08 | Railway deployment for FastAPI | railway.json startCommand, $PORT, healthcheckPath |
| REQ-HARD-09 | Vercel deployment for Next.js 16 | Zero-config, env vars, rewrites proxy |
| REQ-HARD-10 | Playwright E2E tests (5 specs) | playwright.config.ts, storageState auth, CI headless |
| REQ-HARD-11 | Backend security tests (IDOR + SQL injection) | Two-user fixture pattern, search param injection test |
| REQ-HARD-12 | SEO meta tags on key pages | generateMetadata() in page.tsx, metadataBase in layout.tsx |
| REQ-HARD-13 | Lighthouse performance gate | Manual audit + next/image, ISR revalidate checks |
| REQ-HARD-14 | Load testing — p95 < 500ms at 100 concurrent users | k6 with vus:100, thresholds.http_req_duration p95 |
</phase_requirements>

---

## Standard Stack

### Core Backend Additions
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| slowapi | >=0.1.9 | Rate limiting for Starlette/FastAPI | Most widely used, mirrors flask-limiter API, direct Redis support |
| upstash-redis | >=1.0.0 | Upstash Redis REST client | Already referenced in ROADMAP; Upstash has free tier, no TCP Redis needed |
| upstash-ratelimit | >=1.0.0 | Fixed/sliding window on Upstash | Pairs with upstash-redis, serverless-friendly |
| secweb | >=1.5.0 | Security headers middleware (Starlette) | Purpose-built, sets 10+ security headers in one line |
| pytest-cov | >=4.0 | Coverage reporting + threshold gate | `--cov-fail-under=80` flag enforces gate in CI |
| pip-audit | >=2.7 | CVE scan of requirements.txt | Official pypa tool, integrates with gh-action-pip-audit |

### Core Frontend Additions
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @playwright/test | >=1.44 | E2E browser testing | 5 spec files testing critical user flows |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| slowapi + upstash-redis | Custom Redis middleware | slowapi is maintained, 10x less code; custom gives more control |
| upstash-ratelimit | slowapi's RedisStorage | upstash-ratelimit has sliding window; slowapi RedisStorage is fixed window only |
| secweb | fastapi-middlewares or manual | secweb is actively maintained and purpose-built; manual is fine but verbose |
| k6 | locust | k6 is JavaScript-based (runs CLI), produces p95 metrics natively, better CI fit; locust is Python but requires running a web UI or headless mode |

**Installation (backend additions):**
```bash
pip install slowapi upstash-redis upstash-ratelimit secweb pytest-cov pip-audit
```

**Installation (frontend additions):**
```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

---

## Architecture Patterns

### Pattern 1: Rate Limiting with slowapi + Upstash Redis (Fail-Open)

**What:** Use slowapi as the decorator API, but back it with Upstash Redis. If Redis is unavailable, the fail-open pattern allows requests through rather than blocking all traffic.

**When to use:** All public-facing endpoints. Auth endpoints get tighter limits (5/minute). AI endpoints get generous limits (20/minute) to avoid locking out legitimate users.

**Implementation approach:**
```python
# Source: slowapi PyPI + upstash-redis docs
import os
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.storage import RedisStorage

def _make_limiter() -> Limiter:
    redis_url = settings.redis_url
    if redis_url:
        try:
            storage = RedisStorage(redis_url)
            return Limiter(key_func=get_remote_address, storage=storage)
        except Exception:
            pass  # Fail-open: fall through to in-memory
    # Fail-open: memory storage (per-process, resets on restart)
    return Limiter(key_func=get_remote_address)

limiter = _make_limiter()

# In main.py:
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# On a route:
@router.post("/signup")
@limiter.limit("5/minute")
async def signup(request: Request, ...):
    ...
```

**Key insight on Upstash connection string:** Upstash Redis uses REST-based URLs of the form `redis://default:<token>@<host>.upstash.io:6379`. The `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars are for the `upstash-redis` HTTP client. For `slowapi`'s `RedisStorage`, use the standard `redis://` connection string (Upstash provides this too under "Connect > redis-py").

**Fail-open guarantee:** Wrap the `RedisStorage(...)` constructor in try/except. If it raises, fall back to `Limiter(key_func=get_remote_address)` (memory storage). This means a Redis outage degrades to per-process rate limiting, not a 500.

### Pattern 2: AI Response Caching

**What:** Hash the prompt + model name with SHA-256 to create a cache key. Store the response string in Redis with a TTL. Log cache hits/misses.

**When to use:** `/api/ai/chat` non-streaming responses, `/api/ai/recommendations`, `/api/ai/nl-search`. Do NOT cache streaming SSE responses.

```python
# Source: upstash-redis docs + hashlib standard library
import hashlib
import json
from upstash_redis import Redis

redis = Redis.from_env()  # requires UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

def cache_key(prefix: str, payload: dict) -> str:
    raw = json.dumps(payload, sort_keys=True)
    return f"{prefix}:{hashlib.sha256(raw.encode()).hexdigest()}"

async def get_cached(key: str) -> str | None:
    try:
        return await redis.get(key)
    except Exception:
        return None  # Fail-open on cache miss

async def set_cached(key: str, value: str, ttl: int = 3600) -> None:
    try:
        await redis.set(key, value, ex=ttl)
    except Exception:
        pass  # Non-fatal — cache unavailable

# Usage in AI router:
key = cache_key("ai:recommendations", {"user_id": user_id, "limit": 10})
cached = await get_cached(key)
if cached:
    logger.info("AI cache HIT: %s", key)
    return json.loads(cached)
# ... run actual AI call ...
await set_cached(key, json.dumps(result), ttl=3600)
```

**TTL recommendations:**
- Recommendations: 1 hour (3600s) — slow-changing
- NL search results: 30 minutes (1800s) — query-dependent
- Chat responses: Do not cache (streaming SSE, personalized)

**Note:** `upstash-redis` has both sync and async clients. Use `AsyncRedis` from `upstash_redis.asyncio` for async FastAPI routes.

### Pattern 3: Security Headers (FastAPI)

**What:** Use `secweb` middleware to set OWASP-recommended security headers on every response.

```python
# Source: secweb PyPI docs
from secweb import SecWeb

SecWeb(app=app, Option={
    "hsts": {"max-age": 63072000, "includeSubDomains": True, "preload": True},
    "csp": {"default-src": ["'self'"], "img-src": ["'self'", "data:", "https:"], "script-src": ["'self'"]},
    "xfo": {"x-frame-options": "DENY"},
    "xcto": True,  # X-Content-Type-Options: nosniff
    "referrer": {"Referrer-Policy": "strict-origin-when-cross-origin"},
    "permissions": {"geolocation": [], "camera": [], "microphone": []},
})
```

**Headers set:**
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; script-src 'self'`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), camera=(), microphone=()`

**Warning:** Aggressive CSP will break inline scripts. AXIOM backend is an API — no HTML served — so CSP mostly applies to the frontend. Set CSP on FastAPI to "default-src 'none'" since it only returns JSON.

### Pattern 4: Security Headers (Next.js)

**What:** Use `headers()` in `next.config.ts` to add security headers to all page responses.

```typescript
// Source: Next.js official docs - next.config.js Options: headers
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Next.js needs unsafe-eval in dev
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
            "frame-ancestors 'none'",
          ].join("; "),
        },
      ],
    },
  ];
},
```

**CSP notes for AXIOM frontend:**
- `connect-src` must allow Supabase REST + Realtime WebSocket (`wss://*.supabase.co`)
- `img-src https:` is needed for Google avatars, Supabase storage images
- `unsafe-inline` in `script-src` is required by Next.js App Router (inline hydration scripts)

### Pattern 5: CORS Lockdown

**What:** Change the current wide-open CORS to read origins from an env var list. In `main.py`, `allow_origins` currently reads `[settings.frontend_url, "http://localhost:3000"]`.

**Production pattern:**
```python
# In config.py — add:
allowed_origins: str = "http://localhost:3000"  # comma-separated in production env

# In main.py — replace current CORSMiddleware call:
origins = [o.strip() for o in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

**Railway env var:** `ALLOWED_ORIGINS=https://axiom-v2.vercel.app,https://www.axiom.eg`

### Pattern 6: GitHub Actions CI

**Two separate workflow files** — one per service, triggered by path changes.

**Backend CI (`.github/workflows/backend-ci.yml`):**
```yaml
name: Backend CI
on:
  push:
    paths: ["backend/**", ".github/workflows/backend-ci.yml"]
  pull_request:
    paths: ["backend/**"]

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
          cache-dependency-path: backend/requirements.txt
      - run: pip install -r requirements.txt pytest pytest-cov ruff mypy pip-audit
      - run: ruff check .
      - run: mypy app/ --ignore-missing-imports
      - run: pytest tests/ -v --cov=app --cov-fail-under=80
      - run: pip-audit -r requirements.txt
```

**Frontend CI (`.github/workflows/frontend-ci.yml`):**
```yaml
name: Frontend CI
on:
  push:
    paths: ["frontend/**", ".github/workflows/frontend-ci.yml"]
  pull_request:
    paths: ["frontend/**"]

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json
      - uses: actions/cache@v4
        with:
          path: ${{ github.workspace }}/frontend/.next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('frontend/package-lock.json') }}-${{ hashFiles('frontend/**/*.ts', 'frontend/**/*.tsx') }}
          restore-keys: ${{ runner.os }}-nextjs-${{ hashFiles('frontend/package-lock.json') }}-
      - run: npm ci
      - run: npx eslint .
      - run: npx tsc --noEmit
      - run: npm run build
      - run: npm audit --audit-level=high
```

**Note on pip cache:** `actions/setup-python@v5` with `cache: "pip"` handles pip caching natively. The `cache-dependency-path` must point to the requirements file relative to the repo root.

**Note on mypy:** `requirements.txt` currently doesn't include type stubs. `mypy app/ --ignore-missing-imports` avoids false failures for untyped libraries (supabase, httpx already have types).

**Note on npm audit:** `--audit-level=high` fails CI only for high/critical CVEs, ignoring moderate. This is the right production threshold — moderate CVEs in transitive deps are often unavoidable.

### Pattern 7: Railway Deployment

**What:** Railway auto-detects Python and uses nixpacks or a Procfile. Use `railway.json` for explicit control.

**`railway.json` in repo root (or `backend/railway.json`):**
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Alternative Procfile (simpler, same effect):**
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Key PORT note:** Railway injects `$PORT` as an environment variable. Uvicorn must bind to `$PORT` (not hardcoded 8000). Use shell form in Procfile (not exec form) so `$PORT` expands.

**Required Railway env vars:**
```
SUPABASE_URL=https://pgaqqseqwtgsuihbswnv.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
FRONTEND_URL=https://axiom-v2.vercel.app
ALLOWED_ORIGINS=https://axiom-v2.vercel.app
REDIS_URL=redis://default:<token>@<host>.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://<host>.upstash.io
UPSTASH_REDIS_REST_TOKEN=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
ENVIRONMENT=production
SENTRY_DSN=...  (optional)
```

**Health check:** `/api/health` already exists in `main.py` returning `{"status": "ok", "version": "2.0.0"}`. Railway's `healthcheckPath` will GET this on every deploy before routing traffic.

**Ollama note:** Ollama runs locally (port 11434) — it is NOT deployed on Railway. AI features that call Ollama will gracefully degrade when `OLLAMA_BASE_URL` points to a local-only host. Set `OLLAMA_BASE_URL=http://localhost:11434` and document that AI features require Ollama to be co-located or replaced with a cloud LLM in production.

### Pattern 8: Vercel Deployment

**What:** Vercel has zero-config support for Next.js. No `vercel.json` required for basic deploys. Just connect the GitHub repo.

**`vercel.json` (only needed for build root config since this is a monorepo):**
```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "installCommand": "cd frontend && npm ci",
  "framework": "nextjs"
}
```

**Alternatively:** Set "Root Directory" to `frontend/` in Vercel project settings — then no `vercel.json` needed.

**Required Vercel env vars:**
```
NEXT_PUBLIC_API_URL=https://<railway-service>.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://pgaqqseqwtgsuihbswnv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Rewrites compatibility:** The `next.config.ts` already has `rewrites()` proxying `/api/:path*` to `NEXT_PUBLIC_API_URL`. This works on Vercel edge correctly — no change needed.

**Automatic CI:** Vercel automatically deploys every push to `main` and creates preview deployments for PRs. No GitHub Actions step needed for Vercel deploy.

### Pattern 9: Playwright E2E Tests

**Setup files:**
```
frontend/
├── playwright.config.ts
├── playwright/.auth/
│   ├── .gitkeep
│   └── user.json      ← generated at test time, gitignored
└── e2e/
    ├── auth.setup.ts  ← global setup: log in once, save storageState
    ├── home.spec.ts
    ├── auth.spec.ts
    ├── listings.spec.ts
    ├── dashboard.spec.ts
    └── messages.spec.ts
```

**`playwright.config.ts` pattern:**
```typescript
// Source: Playwright official auth docs
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run start",  // requires next build first in CI
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

**Auth setup pattern (Supabase JWT):**
```typescript
// e2e/auth.setup.ts
import { test as setup } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.fill('[name="email"]', process.env.E2E_USER_EMAIL!);
  await page.fill('[name="password"]', process.env.E2E_USER_PASSWORD!);
  await page.click('[type="submit"]');
  await page.waitForURL("/dashboard");
  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
```

**Note on Supabase auth:** Supabase stores the JWT in `localStorage` key `sb-<project>-auth-token`. `storageState` captures `localStorage` — so the saved state will include the JWT and tests will start pre-authenticated. The token expires in 1 hour; if test runs take longer, add a `refreshSession` call in setup.

**5 recommended spec files:**
1. `home.spec.ts` — Homepage loads, navigation works, find-homes page shows listings
2. `auth.spec.ts` — Signup form validation, login redirect to dashboard, logout
3. `listings.spec.ts` — Browse listings, property detail page loads, favorite toggle
4. `dashboard.spec.ts` — Dashboard loads with profile data, add listing modal opens
5. `messages.spec.ts` — Messages page loads, inbox sidebar visible

**CI GitHub Actions step:**
```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium
- name: Run E2E tests
  run: npx playwright test
  env:
    E2E_USER_EMAIL: ${{ secrets.E2E_USER_EMAIL }}
    E2E_USER_PASSWORD: ${{ secrets.E2E_USER_PASSWORD }}
```

### Pattern 10: Backend Security Tests

**IDOR test pattern** — uses `conftest.py` with two distinct fake users:

```python
# tests/test_security.py
FAKE_USER_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
FAKE_USER_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

FAKE_PROFILE_B = {**FAKE_PROFILE, "id": FAKE_USER_B_ID, "email": "b@example.com"}

def make_jwt_for(user_id: str) -> str:
    return make_supabase_jwt(user_id=user_id)

def test_idor_listing_delete_rejected(client, mock_supabase):
    """User B cannot delete User A's listing."""
    _mock_client, mock_admin = mock_supabase
    listing_id = "11111111-2222-3333-4444-555555555555"

    # Mock profile lookup: user B is authenticated
    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = FAKE_PROFILE_B

    # Mock listing lookup: listing belongs to user A
    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": listing_id,
        "owner_id": FAKE_USER_A_ID,  # Different from authenticated user
    }

    token = make_jwt_for(FAKE_USER_B_ID)
    resp = client.delete(
        f"/api/listings/{listing_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 403
```

**SQL injection test pattern:**
```python
def test_sql_injection_in_search(client):
    """SQL injection payloads in search query params must not cause 500."""
    payloads = [
        "'; DROP TABLE listings; --",
        "1 OR 1=1",
        "\" OR \"1\"=\"1",
        "<script>alert('xss')</script>",
    ]
    for payload in payloads:
        resp = client.get(f"/api/listings?q={payload}")
        assert resp.status_code in (200, 400, 422), f"Unexpected 500 for payload: {payload}"
```

**Note:** Since all DB calls go through Supabase client (parameterized queries), SQL injection should be impossible at the application layer. These tests verify we return structured errors (400/422) not 500s on malformed input.

**Admin auth bypass test:**
```python
def test_admin_endpoint_rejects_user_token(client, mock_supabase, auth_header):
    """Regular user JWT must not access admin endpoints."""
    _mock_client, mock_admin = mock_supabase
    mock_admin.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = FAKE_PROFILE  # role = "user"
    resp = client.get("/api/admin/stats", headers=auth_header)
    assert resp.status_code == 403
```

### Pattern 11: SEO with generateMetadata

**What:** Add static `metadata` export to high-value pages and dynamic `generateMetadata` to data-driven pages.

**Root layout (`app/layout.tsx`) — base metadata:**
```typescript
// Source: Next.js official generateMetadata docs (v16.2.1)
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "AXIOM — Real Estate Egypt",
    template: "%s | AXIOM",
  },
  description: "AI-powered real estate platform for Egypt. Find apartments, villas, and shared housing.",
  openGraph: {
    siteName: "AXIOM",
    type: "website",
    locale: "en_EG",
  },
};
```

**Property page (`app/property/[id]/page.tsx`) — dynamic metadata:**
```typescript
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await serverFetch<ListingApiResponse>(`/api/listings/${id}`);
  return {
    title: listing.title,
    description: listing.description?.slice(0, 160),
    openGraph: {
      title: listing.title,
      images: listing.images?.[0] ? [{ url: listing.images[0] }] : [],
      type: "website",
    },
  };
}
```

**Pages to add metadata:**
- `app/layout.tsx` — base template (HIGH priority)
- `app/page.tsx` — homepage (HIGH priority)
- `app/find-homes/page.tsx` — static metadata (HIGH priority)
- `app/property/[id]/page.tsx` — dynamic from listing data (HIGH priority)
- `app/blog/[slug]/page.tsx` — dynamic from blog post (MEDIUM priority)

**Key rule:** `generateMetadata` and `metadata` export are **Server Component only**. These pages are already server components — no "use client" — so this works without changes to component structure.

### Pattern 12: Load Testing with k6

**What:** k6 is a Go-based load testing tool with JavaScript scripts. Better CI fit than locust because it runs as a single binary with no UI server required.

**Install:** `brew install k6` (macOS) or `winget install k6` (Windows) or `docker run grafana/k6`

**`load-tests/smoke.js` — minimal smoke test:**
```javascript
// Source: k6 official docs + Grafana documentation
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 },   // ramp up to 20 users
    { duration: "1m", target: 100 },   // hold at 100 users
    { duration: "30s", target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],  // p95 < 500ms SLO
    http_req_failed: ["rate<0.01"],    // <1% error rate
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:8000";

export default function () {
  // Public endpoints (no auth needed)
  const r1 = http.get(`${BASE}/api/health`);
  check(r1, { "health ok": (r) => r.status === 200 });

  const r2 = http.get(`${BASE}/api/listings?limit=10`);
  check(r2, { "listings ok": (r) => r.status === 200 });

  sleep(1);
}
```

**Run:** `k6 run load-tests/smoke.js --env BASE_URL=https://<railway-url>`

**k6 vs locust decision:** k6 wins for this project:
- Single binary, no Python deps, no web server process
- Native p95 threshold assertions (`thresholds.http_req_duration`)
- JavaScript syntax familiar to this full-stack project
- Output integrates with Grafana Cloud (optional) or stdout
- Locust requires Python, headless mode is less ergonomic in CI

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting storage | Custom Redis INCR/EXPIRE logic | slowapi + upstash-redis | Edge cases in sliding window, distributed counter bugs |
| Security headers | Manual `response.headers["X-Frame-Options"] = ...` on every endpoint | secweb middleware | Misses headers, applied inconsistently |
| CVE scanning | Manual package version lookups | pip-audit / npm audit | Automated, maps to PYSEC/CVE/GHSA database |
| Coverage gate | Counting tests manually | `--cov-fail-under=80` | pytest-cov does this natively |
| E2E auth | Re-logging in for each test | Playwright storageState | Auth once per session, orders of magnitude faster |
| Load test metrics | Manual timing code | k6 `http_req_duration` thresholds | Automatic p50/p95/p99 with pass/fail gates |

**Key insight:** Security tooling exists precisely because these problems have subtle edge cases. Custom INCR-based rate limiters routinely have race conditions. Custom header middleware routinely misses edge cases (redirects, error responses). Use the libraries.

---

## Common Pitfalls

### Pitfall 1: Rate Limiter Breaks Tests
**What goes wrong:** slowapi's `@limiter.limit("5/minute")` fires in unit tests, causing 429s after 5 calls to the same endpoint.
**Why it happens:** The in-memory storage persists across test calls within a test session.
**How to avoid:** In `conftest.py`, either (a) override `app.state.limiter` with a no-op limiter, or (b) use `pytest.mark.parametrize` with unique IPs, or (c) set `RATELIMIT_STORAGE_URI=memory://` with `RATELIMIT_ENABLED=false` for tests.
**Warning signs:** Tests passing individually but failing when run in sequence.

### Pitfall 2: CORS Lockdown Breaks API Proxy
**What goes wrong:** The Next.js `/api/*` rewrite proxy goes through the Next.js server, so the origin hitting the FastAPI backend is the Next.js server's IP, not the browser's origin. But in browser-direct calls (Supabase Realtime, direct fetch), the browser origin matters.
**Why it happens:** Vercel's edge functions forward the original `Origin` header, but server-side fetches (`serverFetch`) don't send Origin at all.
**How to avoid:** Keep `allow_credentials=True` and include the Vercel production URL in allowed origins. The `/api/health` endpoint can be tested directly to verify CORS response headers.

### Pitfall 3: Railway $PORT Not Expanding
**What goes wrong:** `CMD ["uvicorn", "app.main:app", "--port", "$PORT"]` in Dockerfile JSON array form — `$PORT` is treated as a literal string, not an env var.
**Why it happens:** Docker exec form (JSON array) does NOT run a shell, so env vars aren't expanded.
**How to avoid:** Use shell form in Procfile: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Or in Dockerfile use: `CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT` (string form, not array).

### Pitfall 4: Playwright Tests Flaky on CI
**What goes wrong:** Tests that pass locally fail in CI due to race conditions, missing test data, or the Next.js build not being ready.
**Why it happens:** CI is slower; `webServer.reuseExistingServer: !process.env.CI` means CI always starts fresh. The `url` in `webServer` must respond before tests begin.
**How to avoid:** Set `retries: 2` for CI. Always run `next build` before `next start` in CI (don't use `next dev`). Use `waitForSelector` rather than time-based `sleep`.

### Pitfall 5: pytest-cov Coverage Below 80% Due to AI/Realtime Code
**What goes wrong:** `app/ai/embeddings.py` and `app/ai/fraud.py` call Ollama — mocked in tests but coverage still shows gaps in error branches.
**Why it happens:** Current tests mock Ollama at `app.ai.router.ollama`, not the service layer. Error paths in `try/except` blocks never execute.
**How to avoid:** Check current coverage with `pytest tests/ --cov=app --cov-report=term-missing` before setting the gate. If below 80%, add tests for error branches first. If 80% is unreachable short-term, set gate to 75% and document it.

### Pitfall 6: pip-audit Fails on Known Indirect CVEs
**What goes wrong:** `pip-audit` reports CVEs in transitive deps (e.g., a CVE in an old version of a dependency you can't easily upgrade).
**Why it happens:** Transitive dependency trees sometimes lock to vulnerable versions.
**How to avoid:** Use `pip-audit --ignore-vuln GHSA-xxxx-xxxx-xxxx` for known false-positives. Document each ignore in a comment. Alternatively use `pip-audit --fix` in dev to auto-upgrade eligible packages.

### Pitfall 7: generateMetadata with "use client" Conflict
**What goes wrong:** Trying to add `export const metadata` to a page that is (or becomes) a client component.
**Why it happens:** Next.js throws a build error if `metadata` export is in a file with `"use client"`.
**How to avoid:** Keep page files as server components. Move client interactivity to child components. AXIOM's pages are already structured this way (server pages, client components) — just verify before adding metadata exports.

---

## Code Examples

### Complete Rate Limiter Setup

```python
# backend/app/rate_limit.py  (new file)
# Source: slowapi PyPI docs + production pattern
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.storage import RedisStorage
from app.config import settings

logger = logging.getLogger(__name__)

def _make_storage():
    if settings.redis_url:
        try:
            return RedisStorage(settings.redis_url)
        except Exception as e:
            logger.warning("Redis unavailable for rate limiting, using memory: %s", e)
    return None  # slowapi defaults to memory

_storage = _make_storage()
limiter = Limiter(
    key_func=get_remote_address,
    storage=_storage if _storage else None,
)

# Expose handler for main.py
__all__ = ["limiter", "_rate_limit_exceeded_handler", "RateLimitExceeded"]
```

### Verifying Current Coverage Before Setting Gate

```bash
cd backend
pytest tests/ -v --cov=app --cov-report=term-missing 2>&1 | tail -20
```

### k6 Threshold Assertion (Pass/Fail)

```javascript
// k6 exits with non-zero code if any threshold fails
// This means: if p95 > 500ms OR error rate > 1%, the script fails
export const options = {
  thresholds: {
    "http_req_duration": ["p(95)<500"],
    "http_req_failed": ["rate<0.01"],
  },
};
```

### pip-audit in CI with Ignore

```yaml
- run: pip-audit -r requirements.txt --ignore-vuln GHSA-xxxx-xxxx-xxxx
  # GHSA-xxxx: CVE in indirect dep X, not reachable in our code path. Tracked in issue #123.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flask-Limiter | slowapi for FastAPI/Starlette | 2021+ | Async-native rate limiting |
| Custom security header dicts | secweb / nosecone middleware | 2022+ | Fewer missed headers |
| Locust for Python load tests | k6 as default | 2023+ | Single binary, native p95 thresholds |
| Selenium for E2E | Playwright | 2021+ | Faster, auto-wait, better async support |
| `themeColor` in metadata | `viewport` config (generateViewport) | Next.js 14 | Deprecated in metadata, moved to generateViewport |
| Dockerfile only for Railway | railway.json with nixpacks | 2024 | Zero-Dockerfile deploys with healthcheck config |

**Deprecated/outdated:**
- `metadata.themeColor`: Deprecated since Next.js 14 — use `generateViewport` instead
- `metadata.viewport`: Same deprecation
- `github.com/actions/cache@v3`: Use `@v4`
- `actions/setup-python@v4`: Use `@v5` (has native pip caching)
- `actions/setup-node@v3`: Use `@v4`

---

## Open Questions

1. **Ollama in production**
   - What we know: Ollama runs locally at port 11434. Railway doesn't offer GPU VMs on free tier. AI features will silently fail in production if `OLLAMA_BASE_URL` isn't reachable.
   - What's unclear: Is AXIOM intended to deploy AI features in production (Phase 6 scope), or just deploy the non-AI features?
   - Recommendation: Keep `OLLAMA_BASE_URL=http://localhost:11434` in Railway env vars. All AI endpoints already have `try/except` fallbacks. Document this in SETUP.md. This is acceptable for Phase 6.

2. **Playwright test account**
   - What we know: Playwright needs `E2E_USER_EMAIL` + `E2E_USER_PASSWORD` in CI secrets. This requires a real Supabase user in the production/staging DB.
   - What's unclear: Should E2E tests run against production or a separate staging environment?
   - Recommendation: Create a dedicated `e2e@axiom.eg` test account in Supabase. Store credentials in GitHub Secrets. E2E tests run against the Vercel preview URL.

3. **Current coverage baseline**
   - What we know: 63 tests pass. Coverage has not been measured yet.
   - What's unclear: Whether the codebase currently meets 80% — `fraud.py` and `embeddings.py` have complex try/except paths.
   - Recommendation: Run coverage measurement as the first task in the CI plan wave. Gate at whatever the baseline is, then improve toward 80%.

4. **secweb CSP compatibility with Supabase Realtime**
   - What we know: Supabase Realtime uses WebSockets to `wss://*.supabase.co`. FastAPI doesn't serve WebSocket pages — the backend CSP header doesn't affect frontend WebSocket connections.
   - What's unclear: N/A — this only matters for the Next.js CSP, not FastAPI's.
   - Recommendation: For FastAPI's secweb CSP: `"default-src": ["'none'"]` since it only serves JSON APIs.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 8.x + pytest-cov |
| Config file | `backend/pytest.ini` (create if missing) or inline `pyproject.toml` |
| Quick run command | `pytest tests/test_security.py -v` |
| Full suite command | `pytest tests/ -v --cov=app --cov-fail-under=80` |
| E2E run command | `npx playwright test` (from `frontend/`) |
| Load test command | `k6 run load-tests/smoke.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-HARD-01 | Rate limiter returns 429 after limit exceeded | unit | `pytest tests/test_security.py::test_rate_limit_exceeded -x` | ❌ Wave 0 |
| REQ-HARD-02 | AI cache returns cached response on second call | unit | `pytest tests/test_security.py::test_ai_cache_hit -x` | ❌ Wave 0 |
| REQ-HARD-03 | CORS rejects request from unlisted origin | unit | `pytest tests/test_security.py::test_cors_rejected -x` | ❌ Wave 0 |
| REQ-HARD-04 | Security headers present on all FastAPI responses | unit | `pytest tests/test_security.py::test_security_headers -x` | ❌ Wave 0 |
| REQ-HARD-06 | Backend CI passes ruff + mypy + pytest 80% + pip-audit | CI | `act -j test` (local) / GitHub Actions | ❌ Wave 0 |
| REQ-HARD-07 | Frontend CI passes eslint + tsc + build + npm audit | CI | `act -j build` (local) / GitHub Actions | ❌ Wave 0 |
| REQ-HARD-10 | E2E: 5 specs pass headlessly | e2e | `npx playwright test --reporter=list` | ❌ Wave 0 |
| REQ-HARD-11 | IDOR: User B cannot delete User A's listing | unit | `pytest tests/test_security.py::test_idor_listing_delete -x` | ❌ Wave 0 |
| REQ-HARD-11 | SQL injection in search returns 200/400/422, never 500 | unit | `pytest tests/test_security.py::test_sql_injection -x` | ❌ Wave 0 |
| REQ-HARD-14 | p95 < 500ms at 100 concurrent users | load | `k6 run load-tests/smoke.js` | ❌ Wave 0 |

**Manual-only (no automation):**
- REQ-HARD-05: Next.js security headers — verified with `curl -I https://axiom-v2.vercel.app`
- REQ-HARD-08: Railway deploy — verified by checking Railway dashboard + `/api/health` endpoint
- REQ-HARD-09: Vercel deploy — verified by opening production URL
- REQ-HARD-12: SEO — verified with `curl https://axiom-v2.vercel.app` and checking `<head>` output
- REQ-HARD-13: Lighthouse — run `npx lighthouse https://axiom-v2.vercel.app --output json`

### Sampling Rate
- **Per task commit:** `pytest tests/test_security.py -v` (quick, ~5s)
- **Per wave merge:** `pytest tests/ -v --cov=app --cov-fail-under=80`
- **Phase gate:** Full suite green + E2E green + k6 thresholds pass before close

### Wave 0 Gaps
- [ ] `backend/tests/test_security.py` — IDOR, SQL injection, rate limit, CORS, security headers tests
- [ ] `frontend/playwright.config.ts` — Playwright config with webServer, storageState
- [ ] `frontend/e2e/auth.setup.ts` — Supabase login → storageState save
- [ ] `frontend/e2e/` — 5 spec files (home, auth, listings, dashboard, messages)
- [ ] `frontend/playwright/.auth/.gitkeep` — gitkeep so directory is committed but json is ignored
- [ ] `load-tests/smoke.js` — k6 script with 100 VUs + p95 threshold
- [ ] `.github/workflows/backend-ci.yml`
- [ ] `.github/workflows/frontend-ci.yml`
- [ ] `backend/railway.json`

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs (generateMetadata) — `https://nextjs.org/docs/app/api-reference/functions/generate-metadata` — v16.2.1, verified 2026-03-21
- Next.js official docs (CI build caching) — `https://nextjs.org/docs/app/guides/ci-build-caching` — GitHub Actions cache config
- Playwright official docs (auth) — `https://playwright.dev/docs/auth` — storageState pattern
- Upstash rate limiting docs — `https://upstash.com/docs/redis/tutorials/python_rate_limiting` — Ratelimit + FixedWindow
- Railway FastAPI deploy guide — `https://docs.railway.com/guides/fastapi` — railway.json, startCommand, healthcheckPath
- slowapi PyPI / GitHub — `https://pypi.org/project/slowapi/` + `https://github.com/laurentS/slowapi` — RedisStorage pattern
- pip-audit GitHub — `https://github.com/pypa/pip-audit` — `--ignore-vuln` flag

### Secondary (MEDIUM confidence)
- secweb DEV article — `https://dev.to/tmotagam/introducing-secweb-security-headers-for-fastapi-and-starlette-framework-4ohl` — verified against secweb PyPI description
- k6 official docs — `https://grafana.com/docs/k6/latest/testing-guides/calculate-concurrent-users/` — VU configuration, thresholds
- GitHub Actions cache examples — `https://cicube.io/blog/github-actions-cache/` — pip + npm cache patterns

### Tertiary (LOW confidence)
- IDOR test patterns — synthesized from general FastAPI testing docs; no single authoritative source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified against PyPI, npm, and official docs
- Architecture: HIGH — deployment patterns verified against Railway + Vercel official docs; code patterns from official library docs
- Pitfalls: MEDIUM — Rate limiter/test interaction and $PORT expansion confirmed by multiple sources; coverage baseline is unknown
- Security tests: MEDIUM — IDOR pattern is standard; exact mock setup requires testing against actual conftest.py (which was read)

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (90 days — slowapi, Railway config, and Playwright auth APIs are stable)
