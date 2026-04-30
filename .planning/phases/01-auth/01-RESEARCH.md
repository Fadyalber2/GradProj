# Phase 1: Authentication - Research

**Researched:** 2026-03-21
**Domain:** Supabase Auth (ES256 JWT, OAuth, OTP), FastAPI auth middleware, Next.js route protection
**Confidence:** HIGH (all patterns directly observable in the existing codebase)

---

## Summary

Phase 1 establishes the complete authentication layer for AXIOM V2. The backend exposes a FastAPI auth module (`app/auth/`) that handles user creation via the Supabase Admin API (bypassing email confirmation), profile reads and updates against the `profiles` table, and phone OTP flows via Twilio Verify. A separate admin auth system in `app/admin/router.py` issues HS256-signed JWTs for the admin panel. The critical architectural decision is dual-algorithm JWT verification: Supabase signs user tokens with ES256 (ECDSA P-256), so `dependencies.py` fetches the JWKS public key at module load and tries ES256 first, falling back to HS256 for test tokens and legacy environments.

The frontend auth layer is a Zustand store (`authStore.ts`) that owns `user`, `session`, `isLoading`, and `isInitialized` state. It wraps Supabase JS `signInWithPassword` / `signInWithOAuth` directly for session management, and calls `GET /api/auth/me` to hydrate a typed `AuthUser` from the profiles table. The `api.ts` HTTP client auto-injects the Bearer token from the store on every request and auto-calls `logout()` on any 401 response. Route protection is handled in `middleware.ts` using a cookie-presence check for `sb-*-auth-token` — no async DB calls at the edge.

The signup flow uses `POST /api/auth/signup` (FastAPI) rather than Supabase JS `signUp` because only the Admin API can set `email_confirm: true` reliably, ensuring the DB trigger `on_auth_user_created` fires and the `profiles` row is immediately queryable. After account creation, `signInWithPassword` is called client-side to establish the session, then `GET /api/auth/me` is retried up to 3 times with 800ms delay to handle trigger propagation lag.

**Primary recommendation:** Use `supabase_admin.auth.admin.create_user()` with `email_confirm: True` for signup; verify JWTs with ES256 from JWKS primary and HS256 fallback; protect routes via cookie check in middleware (not `getUser()` — that's for security-critical server actions only).

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-AUTH-01 | POST /api/auth/signup creates user via Supabase admin API with email_confirm:True, auto-updates profiles row | Admin API is the only path that reliably fires the `on_auth_user_created` trigger synchronously |
| REQ-AUTH-02 | POST /api/auth/login validates credentials via supabase_client.sign_in_with_password; returns 200 {"message":"ok"} | Frontend owns the session; backend only validates. Returns 401 on invalid credentials |
| REQ-AUTH-03 | GET /api/auth/me returns full ProfileResponse; PUT /api/auth/me updates profiles table for current user | Both depend on get_current_user dependency from dependencies.py |
| REQ-AUTH-04 | POST /api/auth/send-phone-otp sends SMS via Twilio Verify v2 to E.164 phone | Twilio Verify handles delivery, rate limiting, expiry — do not hand-roll OTP |
| REQ-AUTH-05 | POST /api/auth/verify-phone-otp checks code via Twilio Verify; returns {"verified":true} or 400 | Twilio check.status == "approved" is the source of truth |
| REQ-AUTH-06 | POST /api/admin/auth/login validates env var credentials via secrets.compare_digest; returns HS256 JWT (24h) | Admin JWT has {sub: username, role: "admin"} payload; get_admin() verifies Bearer or Basic Auth |
| REQ-AUTH-07 | Backend JWT verification: fetch JWKS at module load, try ES256 first, fall back to HS256 | Supabase uses ES256 by default in production; HS256 fallback needed for test tokens |
| REQ-AUTH-08 | Frontend authStore (Zustand): holds user+session, initialize() sets up onAuthStateChange listener, api.ts auto-logs-out on 401 | Store guards against duplicate listeners with authListenerUnsub pattern (React StrictMode safe) |
| REQ-AUTH-09 | middleware.ts protects /dashboard and /messages (redirect to /login); redirects authenticated users away from /login, /signup, /forgot-password | Cookie-presence check only — no async calls at the edge |
| REQ-AUTH-10 | 8 backend tests in tests/test_auth.py all pass | Tests cover: signup success, duplicate email, missing fields, login success, wrong password, GET /me authenticated, GET /me unauthenticated, PUT /me |

</phase_requirements>

---

## Standard Stack

### Core (Backend)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `supabase-py` | Already in project | Admin user creation, profiles CRUD via service role | Only official Python SDK; service role bypasses RLS |
| `python-jose` / `PyJWT` | Already in project | JWT decode (ES256 + HS256) | Used via `jwt` import throughout project |
| `httpx` | Already in project | Synchronous JWKS fetch at module load | Non-blocking capable; used for JWKS initialization |
| `twilio` | Already in project | OTP via Twilio Verify v2 | Handles delivery, expiry, rate limiting |
| `pydantic` | v2 (via FastAPI) | Request/response schema validation | FastAPI's native serialization layer |

### Supporting (Frontend)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/ssr` | Already in project | Cookie-based Supabase session in Next.js | createBrowserClient for client components |
| `zustand` | Already in project | Auth state store (user, session, isLoading) | Client-side auth state only |
| `framer-motion` | Already in project | Form entry animations (fadeUp variant) | All auth form components |
| `sonner` | Already in project | Toast notifications for auth feedback | Error and success states |
| `lucide-react` | Already in project | Form icons (Mail, Lock, Eye, etc.) | Icon inputs in auth forms |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `supabase_admin.auth.admin.create_user()` | `supabase_client.auth.signUp()` | Admin API allows `email_confirm:True` so the profiles trigger fires and user can log in immediately; client signUp requires email confirmation |
| JWKS ES256 primary + HS256 fallback | HS256 only | Supabase uses ES256 in production; HS256-only breaks production JWTs silently |
| Twilio Verify v2 | Custom TOTP/OTP generation | Verify handles delivery receipts, code expiry (10 min), rate limiting per phone; custom OTP requires all of this from scratch |
| Cookie-presence check in middleware | `createServerClient` + `getUser()` | Cookie check is synchronous and zero-latency at the edge; `getUser()` makes a network call and is reserved for security-critical server actions |
| Zustand authListenerUnsub guard | `useEffect` cleanup only | React StrictMode mounts twice; without the guard, two `onAuthStateChange` listeners register and double-fire events |

**Installation:**
```bash
# No new dependencies — all libraries already present in requirements.txt and package.json
```

---

## Architecture Patterns

### Recommended Project Structure

```
backend/app/
├── auth/
│   ├── __init__.py
│   ├── router.py        # signup, login, me, phone OTP endpoints
│   └── schemas.py       # Pydantic request/response models
├── admin/
│   └── router.py        # admin_login + get_admin() dependency (inline)
├── dependencies.py      # get_current_user, get_optional_user, get_admin_user
├── database.py          # supabase_client (anon) + supabase_admin (service role)
├── config.py            # Pydantic Settings — env var loading
└── main.py              # FastAPI app, routers, CORS

frontend/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── forgot-password/page.tsx
│   └── auth/callback/page.tsx
├── components/auth/
│   ├── LoginForm.tsx
│   ├── SignUpForm.tsx
│   ├── ForgotPasswordForm.tsx
│   ├── OAuthButton.tsx
│   ├── OAuthIcons.tsx
│   └── PhoneOTPInput.tsx
├── stores/authStore.ts
└── lib/
    ├── api.ts            # HTTP client with auto JWT injection + 401 logout
    └── supabase.ts       # Supabase JS browser client singleton
```

### Pattern 1: JWKS-Primary JWT Verification

**What:** Load the Supabase ES256 public key once at module init; every request tries ES256 first and only falls back to HS256 if the key wasn't loaded or the algorithm doesn't match.

**When to use:** Any endpoint that calls `Depends(get_current_user)`.

**Example:**
```python
# Source: backend/app/dependencies.py
_es256_public_key = None

def _load_jwks():
    global _es256_public_key
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    try:
        resp = httpx.get(jwks_url, headers={"apikey": settings.supabase_anon_key}, timeout=10)
        resp.raise_for_status()
        jwks = resp.json()
        for key_data in jwks.get("keys", []):
            if key_data.get("alg") == "ES256" and key_data.get("kty") == "EC":
                _es256_public_key = ECAlgorithm(ECAlgorithm.SHA256).from_jwk(key_data)
                return
    except Exception as e:
        logger.warning("Failed to fetch Supabase JWKS: %s — falling back to HS256", e)

_load_jwks()

def _decode_token(token: str) -> dict:
    if _es256_public_key is not None:
        try:
            return jwt.decode(token, _es256_public_key, algorithms=["ES256"], audience="authenticated")
        except jwt.InvalidAlgorithmError:
            pass
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], audience="authenticated")
```

### Pattern 2: Supabase Admin Signup with Profile Trigger

**What:** Use `supabase_admin.auth.admin.create_user()` with `email_confirm: True`, then patch the `profiles` table with extra fields (phone, country_code, gender) since the DB trigger only copies basic fields.

**When to use:** POST /api/auth/signup exclusively.

**Example:**
```python
# Source: backend/app/auth/router.py
auth_resp = supabase_admin.auth.admin.create_user({
    "email": body.email,
    "password": body.password,
    "user_metadata": {"full_name": body.full_name},
    "email_confirm": True,
})
user_id = auth_resp.user.id
if update_data:  # phone, country_code, gender
    supabase_admin.table("profiles").update(update_data).eq("id", user_id).execute()
```

### Pattern 3: Zustand Auth Store with StrictMode-Safe Listener

**What:** Guard `onAuthStateChange` registration with a module-level `authListenerUnsub` variable so React StrictMode's double-mount doesn't create duplicate listeners.

**When to use:** The `initialize()` method in authStore.ts.

**Example:**
```typescript
// Source: frontend/src/stores/authStore.ts
let authListenerUnsub: (() => void) | null = null;

initialize: async () => {
  if (authListenerUnsub) return; // already registered

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const user = await fetchProfile(session.access_token, 2, 600);
    // ... fallback to minimal user from session if profile fetch failed
    set({ session, user: resolvedUser, isInitialized: true });
  } else {
    set({ isInitialized: true });
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") { /* sync user */ }
    else if (event === "SIGNED_OUT") { set({ session: null, user: null }); }
  });
  authListenerUnsub = () => subscription.unsubscribe();
},
```

### Pattern 4: Profile Fetch with Retry

**What:** After signup or login, retry `GET /api/auth/me` up to N times with delay because the Supabase DB trigger that creates the `profiles` row may lag behind auth user creation.

**When to use:** Any time a new user's profile is first fetched (signup: 3 retries × 800ms; login/initialize: 2 retries × 600ms).

**Example:**
```typescript
// Source: frontend/src/stores/authStore.ts
async function fetchProfile(accessToken: string, retries = 0, delayMs = 600): Promise<AuthUser | null> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 401 && retries > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
      return fetchProfile(accessToken, retries - 1, delayMs);
    }
    return null;
  }
  return res.json();
}
```

### Pattern 5: Middleware Cookie-Presence Check

**What:** In Next.js middleware, check for the presence of `sb-*-auth-token` cookie (pattern match) rather than calling `getUser()` or `getSession()`. This is a fast, zero-latency edge check.

**When to use:** `frontend/middleware.ts` for route protection.

**Example:**
```typescript
// Source: frontend/middleware.ts
const token =
  request.cookies
    .getAll()
    .find(({ name }) =>
      name.startsWith("sb-") &&
      (name.endsWith("-auth-token") || name.endsWith("-access-token"))
    )?.value ??
  request.cookies.get("sb-access-token")?.value;

const isAuthenticated = !!token;
```

### Pattern 6: Admin JWT (HS256, Separate from User JWTs)

**What:** Admin sessions use a separate HS256 JWT signed with `JWT_SECRET`, payload `{sub: username, role: "admin", exp: now+24h}`. The `get_admin()` function accepts both `Bearer <token>` and `Basic <base64>` for curl compatibility.

**When to use:** All `POST /api/admin/*` endpoints.

**Example:**
```python
# Source: backend/app/admin/router.py
def _create_admin_token(username: str) -> str:
    payload = {"sub": username, "role": "admin", "iat": int(time.time()), "exp": int(time.time()) + 86400}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

@router.post("/auth/login", response_model=AdminLoginResponse)
async def admin_login(body: AdminLoginRequest):
    ok_user = secrets.compare_digest(body.username, settings.admin_username)
    ok_pass = secrets.compare_digest(body.password, settings.admin_password)
    if not (ok_user and ok_pass):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return AdminLoginResponse(token=_create_admin_token(body.username))
```

### Anti-Patterns to Avoid

- **Using `supabase_client.auth.signUp()` for server-side signup:** It does not set `email_confirm: True` — user must click an email link before the profile trigger fires and before `GET /api/auth/me` works.
- **Trusting `getSession()` for security checks:** Session cookies can be stale. Use `getUser()` for security-critical server actions; the middleware only needs the cookie presence.
- **Single-attempt profile fetch after signup:** The profiles DB trigger has propagation lag. Always retry with delay (3× on signup, 2× on login).
- **Registering `onAuthStateChange` in a `useEffect` without a guard:** React StrictMode double-invokes effects — the module-level `authListenerUnsub` guard prevents duplicate listeners.
- **Returning `None` from `update_me` when no fields provided:** Raise HTTP 400 ("No fields to update") — empty PATCH should be an error, not a silent no-op.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone OTP delivery | Custom SMS + code generation | Twilio Verify v2 | Verify handles code generation, expiry (10min), rate limiting, delivery receipts, international numbers |
| JWT signing/verification | Custom crypto | `python-jose` / `PyJWT` | ES256 ECDSA with JWKS key exchange has many edge cases (key rotation, algorithm confusion attacks) |
| Password reset flow | Custom token generation + email | `supabase.auth.resetPasswordForEmail()` | Supabase handles token generation, email delivery, link expiry |
| OAuth redirect flow | Custom OAuth 2.0 exchange | `supabase.auth.signInWithOAuth()` | Supabase manages PKCE, state, code exchange, token storage |
| Session cookie management | Custom cookie handling | `@supabase/ssr` + Next.js middleware | SSR package handles cookie serialization, refresh token rotation, server component access |

**Key insight:** Every auth sub-problem (password reset, OAuth, OTP, session refresh) already has a production-grade implementation in Supabase or Twilio. Custom implementations introduce attack surface without adding value.

---

## Common Pitfalls

### Pitfall 1: Profile Trigger Lag on Signup
**What goes wrong:** `GET /api/auth/me` returns 401 immediately after `admin.create_user()` because the `on_auth_user_created` Postgres trigger hasn't committed the profiles row yet.
**Why it happens:** The trigger runs asynchronously relative to the auth user creation HTTP response.
**How to avoid:** Retry `fetchProfile` up to 3 times with 800ms delay on signup; up to 2 times with 600ms delay on login/initialize. Fall back to a minimal `AuthUser` from session metadata if all retries fail.
**Warning signs:** Users see "profile not found" immediately after signup; refreshing fixes it.

### Pitfall 2: Duplicate Auth Listener in React StrictMode
**What goes wrong:** Two `onAuthStateChange` listeners register, causing double-fire of SIGNED_IN events and race conditions in the auth store.
**Why it happens:** React StrictMode mounts components twice in development. `useEffect` cleanup runs between the two mounts, but if the listener is stored only inside the store closure, the guard isn't checked correctly.
**How to avoid:** Use a module-level `authListenerUnsub` variable (outside the Zustand store) as a guard in `initialize()`. Check `if (authListenerUnsub) return` at the top.
**Warning signs:** Duplicate API calls to `/api/auth/me` on page load; `console.log` in the auth state change handler fires twice.

### Pitfall 3: HS256-Only JWT Verification
**What goes wrong:** Backend rejects all Supabase-issued JWTs in production with "Invalid token: Invalid algorithm".
**Why it happens:** Supabase projects created after ~2023 sign JWTs with ES256 (ECDSA P-256) by default, not HS256.
**How to avoid:** Fetch JWKS at module load; try ES256 first; only fall back to HS256. Never configure the backend for HS256-only.
**Warning signs:** All authenticated requests return 401 in production but work in tests (tests use HS256 `make_supabase_jwt()`).

### Pitfall 4: Admin Token Mixed with User Token Verification
**What goes wrong:** Admin Bearer token passed to a user endpoint (or vice versa) succeeds or fails in confusing ways.
**Why it happens:** Both are JWTs signed with `JWT_SECRET` via HS256, but the admin token has `aud: None` while user tokens have `aud: "authenticated"`.
**How to avoid:** User endpoints use `Depends(get_current_user)` which validates `aud="authenticated"`. Admin endpoints use `Depends(get_admin)` which calls `_verify_admin_token()` and checks `role == "admin"` in the payload.
**Warning signs:** Admin can accidentally access user endpoints or vice versa.

### Pitfall 5: E.164 Validation Missing on OTP Endpoints
**What goes wrong:** Twilio Verify throws an obscure error on non-E.164 numbers; the error message leaks Twilio internals.
**Why it happens:** Frontend sends partial phone numbers or numbers without country code.
**How to avoid:** Validate with `re.match(r"^\+[1-9]\d{7,14}$", body.phone)` in both `send-phone-otp` and `verify-phone-otp` before calling Twilio.
**Warning signs:** HTTP 400 with Twilio API error messages appearing in the frontend.

---

## Code Examples

### Pydantic Auth Schemas

```python
# Source: backend/app/auth/schemas.py
class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    country_code: Optional[str] = None
    gender: Optional[str] = None  # "male" | "female" | "other"

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    country_code: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    occupation: Optional[str] = None
    lifestyle_preferences: Optional[dict[str, Any]] = None

class ProfileResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    role: str
    is_verified_seller: bool
    gender: Optional[str] = None
    country_code: Optional[str] = None
    badges: list[str] = []
    age: Optional[int] = None
    occupation: Optional[str] = None
    lifestyle_preferences: Optional[dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class VerifyPhoneOTPRequest(BaseModel):
    phone: str
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
```

### API Client with 401 Auto-Logout

```typescript
// Source: frontend/src/lib/api.ts
const token = useAuthStore.getState().session?.access_token;
const headers: Record<string, string> = {
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...options.headers,
};
// ...
if (res.status === 401 && useAuthStore.getState().session) {
  useAuthStore.getState().logout();
}
throw new ApiError(res.status, res.statusText, errorBody);
```

### Test JWT Generation (conftest.py pattern)

```python
# Source: backend/tests/conftest.py
def make_supabase_jwt(user_id: str = FAKE_USER_ID, expired: bool = False) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now - 60,
        "exp": (now - 120) if expired else (now + 3600),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase HS256 JWTs | Supabase ES256 JWTs (JWKS) | ~2023 Supabase default change | Backend must fetch JWKS; HS256-only verification breaks in prod |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 (auth-helpers deprecated) | Different import paths; `createBrowserClient` replaces `createClientComponentClient` |
| `supabase.auth.getSession()` for security | `supabase.auth.getUser()` for security | Supabase docs update 2024 | `getSession()` trusts the local cookie; `getUser()` validates with the auth server |
| Email confirmation required on signup | `email_confirm: True` via admin API | Project decision | Users can log in immediately after signup |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (existing — `backend/tests/`) |
| Config file | none — pytest discovers `tests/` automatically |
| Quick run command | `cd backend && python -m pytest tests/test_auth.py -v` |
| Full suite command | `cd backend && python -m pytest tests/ -v` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-AUTH-01 | POST /api/auth/signup 201 on valid data | unit | `pytest tests/test_auth.py::test_signup_success -x` | Yes |
| REQ-AUTH-01 | POST /api/auth/signup 400 on duplicate email | unit | `pytest tests/test_auth.py::test_signup_duplicate_email -x` | Yes |
| REQ-AUTH-01 | POST /api/auth/signup 422 on missing fields | unit | `pytest tests/test_auth.py::test_signup_missing_fields -x` | Yes |
| REQ-AUTH-02 | POST /api/auth/login 200 on valid credentials | unit | `pytest tests/test_auth.py::test_login_success -x` | Yes |
| REQ-AUTH-02 | POST /api/auth/login 401 on wrong password | unit | `pytest tests/test_auth.py::test_login_wrong_password -x` | Yes |
| REQ-AUTH-03 | GET /api/auth/me 200 returns profile | unit | `pytest tests/test_auth.py::test_get_profile_authenticated -x` | Yes |
| REQ-AUTH-03 | GET /api/auth/me 401 without token | unit | `pytest tests/test_auth.py::test_get_profile_unauthenticated -x` | Yes |
| REQ-AUTH-03 | PUT /api/auth/me updates and returns profile | unit | `pytest tests/test_auth.py::test_update_profile -x` | Yes |
| REQ-AUTH-04 | POST /api/auth/send-phone-otp | manual-only | N/A — requires live Twilio | No test |
| REQ-AUTH-05 | POST /api/auth/verify-phone-otp | manual-only | N/A — requires live Twilio | No test |
| REQ-AUTH-06 | POST /api/admin/auth/login 200 returns token | unit | `pytest tests/test_admin.py -k admin_login -x` | Yes (test_admin.py) |
| REQ-AUTH-07 | JWKS ES256 + HS256 fallback | unit | `pytest tests/test_auth.py -x` (uses HS256 tokens) | Yes (conftest.py) |
| REQ-AUTH-09 | middleware route protection | manual-only | N/A — Next.js middleware not pytest-testable | No test |

### Sampling Rate

- **Per task commit:** `cd backend && python -m pytest tests/test_auth.py -v`
- **Per wave merge:** `cd backend && python -m pytest tests/ -v`
- **Phase gate:** Full suite green before marking phase complete

### Wave 0 Gaps

None — `tests/test_auth.py` and `tests/conftest.py` exist and cover all REQ-AUTH backend requirements. Twilio OTP and Next.js middleware are manual-only tests by nature.

---

## Sources

### Primary (HIGH confidence)

- `backend/app/auth/router.py` — actual signup, login, me, OTP endpoint implementations
- `backend/app/auth/schemas.py` — Pydantic schema definitions
- `backend/app/dependencies.py` — JWKS loading and JWT verification implementation
- `backend/app/admin/router.py` — admin_login, get_admin, _create_admin_token implementations
- `backend/tests/test_auth.py` — 8 test cases with exact mock patterns
- `backend/tests/conftest.py` — FAKE_PROFILE, make_supabase_jwt(), fixture patterns
- `frontend/src/stores/authStore.ts` — Zustand store with all auth actions
- `frontend/src/lib/api.ts` — API client with 401 auto-logout pattern
- `frontend/middleware.ts` — cookie-presence route protection
- `frontend/src/components/auth/LoginForm.tsx` — login form with OAuth buttons
- `frontend/src/components/auth/SignUpForm.tsx` — signup form with phone OTP inline
- `frontend/src/components/auth/OAuthButton.tsx` — supabase.auth.signInWithOAuth wrapper
- `frontend/src/components/auth/ForgotPasswordForm.tsx` — resetPasswordForEmail call
- `frontend/src/app/auth/callback/page.tsx` — OAuth callback with PKCE handling

### Secondary (MEDIUM confidence)

- Supabase docs — ES256 JWT algorithm change (verified by JWKS fetch in dependencies.py)
- Twilio Verify v2 API — verified by actual endpoint calls in router.py

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries verified in actual code
- Architecture patterns: HIGH — extracted directly from running implementation
- Pitfalls: HIGH — pitfalls are documented from code patterns that defend against them

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (stable auth patterns; Supabase SDK changes slowly)
