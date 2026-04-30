# Phase 3: Messaging, Dashboard & Notifications - Research

**Researched:** 2026-03-21
**Domain:** PostgreSQL conversation threading, Supabase Realtime (Postgres CDC), FastAPI async routers, Next.js 16 client components with TanStack Query v5
**Confidence:** HIGH (patterns directly observable in codebase)

---

## Summary

Phase 3 builds the three interconnected data domains that make the platform feel alive: real-time messaging, a unified dashboard, and live notifications. The conversation model uses a direct `user_a_id`/`user_b_id` pair in a `conversations` table — no join table — with a `status` field (`pending | accepted | rejected`) and `initiated_by` to implement a message-request gating pattern. New conversations start as `pending`; the recipient must accept before full two-way messaging is enabled. This prevents spam while keeping the DB schema simple.

The dashboard is a single aggregation endpoint (`GET /api/dashboard/me`) that collects profile, analytics, listings, recent conversations, liked properties, and upcoming viewings into one JSON blob. This trades flexibility for simplicity: one network round-trip, no client-side join logic, no waterfalls. The tradeoff is a slightly large payload, but for a dashboard page that always needs all six sections this is clearly the right call.

Supabase Realtime (Postgres CDC via logical replication) is the live delivery mechanism for both messages and notifications. The frontend subscribes to the `messages` table filtered by `conversation_id` and the `notifications` table for the current session. No WebSocket server is needed — Supabase manages the multiplexed channel. The backend writes rows; Realtime pushes the INSERT event to all subscribed clients automatically.

**Primary recommendation:** Use Supabase Realtime via `supabase.channel().on('postgres_changes', ...)` for live delivery. Keep the backend thin (write rows, return data) — do not implement SSE or WebSocket infrastructure.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-MSG-01 | `POST /api/messages/conversations` — create conversation (pending) or return existing; checks blocked_users; sends message_request notification | `conversations` table with `user_a_id`/`user_b_id`/`status`/`initiated_by`; `blocked_users` table; Supabase insert pattern |
| REQ-MSG-02 | `GET /api/messages/conversations` — list with last message, unread count, other-user profile; skip rejected | `get_user_conversations` Supabase RPC enriched with per-conversation meta fetch |
| REQ-MSG-03 | `GET /api/messages/conversations/{id}` — return all messages ordered ASC; verify participation | Simple `.select("*").eq("conversation_id", id).order("created_at")` after `_verify_participation` |
| REQ-MSG-04 | `POST /api/messages/conversations/{id}` — send message; auto-accept if recipient replies; notify other user | Pending-status rules enforced before insert; `notifications` row created |
| REQ-MSG-05 | Message request management: `POST .../accept`, `POST .../reject`, `POST /block`, `DELETE /block/{id}`, `GET /blocked` | Status updates on `conversations`; `blocked_users` table; best-effort conversation rejection on block |
| REQ-MSG-06 | `GET /api/dashboard/me` — aggregates profile + analytics array + listings + recent_messages + liked_properties + upcoming_viewings | Single endpoint; analytics computed from listing data; `get_user_conversations` RPC for messages |
| REQ-MSG-07 | `GET /api/notifications`, `PUT /api/notifications/read-all`, `PUT /api/notifications/{id}/read` | Route ordering: `read-all` MUST be declared before `/{id}/read` to avoid FastAPI treating "read-all" as a notification ID |
| REQ-MSG-08 | Frontend Supabase Realtime subscription — live message delivery in ChatArea | `supabase.channel('conv:{id}').on('postgres_changes', {event:'INSERT', table:'messages', filter:'conversation_id=eq.{id}'})` |
| REQ-MSG-09 | NotificationBell — unread count badge + dropdown; Realtime invalidates query on INSERT | `supabase.channel('notifications-bell').on('postgres_changes', {event:'INSERT', table:'notifications'})` → `queryClient.invalidateQueries` |
| REQ-MSG-10 | Dashboard page — `DashboardProfile` + `DashboardStats` + `MyListings` + `LikedProperties` + `RecentMessages` + `MyViewings`; 6 mappers from API shapes to UI types | Query gated on `!!session`; all mappers colocated in `page.tsx` |
| REQ-MSG-11 | Message request flow — `RequestBar` (accept/reject), `ConversationMenu` (block/report); `isInitiator` flag drives conditional UI in `ChatArea` | `isInitiator = activeConvRaw?.initiated_by === user?.id`; pending+initiator shows amber waiting banner; pending+recipient shows RequestBar |
| REQ-MSG-12 | 29 backend tests pass — test_messages.py covers conversations, messages, block, request flow; plus dashboard and notifications tests | pytest with mock_supabase fixture using `side_effect` lists for sequential call mocking |

</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | 0.115+ | Async HTTP router | Already in use; thin routers → service layer |
| supabase-py | 2.x | DB client (admin key) | `supabase_admin` bypasses RLS for server-side ops |
| Pydantic v2 | 2.x | Request/response schemas | FastAPI-native; `BaseModel` for all I/O |
| TanStack Query v5 | 5.x | Server state + mutations | Already in use; `useQuery`/`useMutation` for all API calls |
| Supabase JS | 2.x | Realtime subscriptions | `supabase.channel().on('postgres_changes', ...)` |
| Framer Motion | 11.x | Message animation, page transitions | Already in use for AnimatePresence on chat |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 3.x | `formatDistanceToNow` for relative timestamps | Every conversation preview + dashboard message timestamps |
| Zustand | 4.x | `useAuthStore` — `user`, `session` state | Gate queries on `!!session`; get `user.id` for Realtime filters |
| lucide-react | latest | Bell, MessageSquare, Check, X icons | All notification/message UI icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Realtime | Server-Sent Events (FastAPI) | SSE requires backend streaming infra; Realtime is zero-backend-cost |
| Single `GET /api/dashboard/me` | Separate endpoints per section | Multiple round-trips, client-side waterfalls — worse for initial page load |
| `initiated_by` + `status` on conversations | Separate `message_requests` table | Extra join complexity with no benefit at this scale |
| `side_effect` list in pytest mocks | pytest fixtures per test | `side_effect` allows sequential call simulation in single test |

**Installation:** No new packages — all already in requirements.txt and package.json.

---

## Architecture Patterns

### Recommended Project Structure
```
backend/app/
├── messages/
│   ├── __init__.py
│   ├── router.py        # All conversation + block endpoints
│   └── schemas.py       # Pydantic models
├── dashboard/
│   ├── __init__.py
│   └── router.py        # Single /me endpoint
└── notifications/
    ├── __init__.py
    └── router.py        # list + read-all + read-one

frontend/src/
├── app/
│   ├── messages/page.tsx     # "use client" — Realtime + mutations
│   └── dashboard/page.tsx    # "use client" — session-gated query
├── components/
│   ├── messages/
│   │   ├── ChatArea.tsx          # Message bubbles + date groups + input
│   │   ├── InboxSidebar.tsx      # Conversations list + search
│   │   ├── RequestBar.tsx        # Accept/reject banner
│   │   ├── ConversationMenu.tsx  # Block/report dropdown
│   │   ├── DateSeparator.tsx     # Day group header
│   │   ├── ScrollToBottom.tsx    # FAB via IntersectionObserver
│   │   ├── MessagesSkeleton.tsx  # Loading state
│   │   └── EmptyState.tsx        # variant: no-conversations | no-selection
│   └── layout/
│       └── NotificationBell.tsx  # Bell icon + dropdown + Realtime
└── lib/
    └── queries.ts   # messagesQueries, notificationsQueries, dashboardQueries
```

### Pattern 1: Message Request Gating
**What:** New conversations start with `status='pending'`. The initiator cannot send more messages until the recipient accepts. The recipient replying auto-accepts.
**When to use:** Any messaging feature where spam prevention matters.
**Example:**
```python
# Source: backend/app/messages/router.py
if status == "pending":
    if initiated_by == user_id:
        raise HTTPException(
            status_code=403,
            detail="Waiting for the other user to accept your message request",
        )
    else:
        # Receiver replying → auto-accept
        supabase_admin.table("conversations").update(
            {"status": "accepted"}
        ).eq("id", conversation_id).execute()
```

### Pattern 2: Supabase Realtime Subscription (Frontend)
**What:** Subscribe to Postgres CDC INSERT events on a specific table, filtered by a column value.
**When to use:** Any feature needing live updates without polling.
**Example:**
```typescript
// Source: frontend/src/app/messages/page.tsx
const channel = supabase
  .channel(`conv:${activeId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${activeId}`,
    },
    (payload) => {
      const newMsg = payload.new as ApiMessage;
      if (newMsg.sender_id === user?.id) return; // skip own messages
      setLiveMessages((prev) => [...prev, mapChatMessage(newMsg, user?.id ?? "")]);
    }
  )
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

### Pattern 3: Route Ordering in FastAPI (Critical)
**What:** Specific routes must be declared before parametric catch-all routes.
**When to use:** Any time a literal path segment could be matched by a parameter.
**Example:**
```python
# Source: backend/app/notifications/router.py
# IMPORTANT: This must be declared BEFORE /{notification_id}/read
@router.put("/read-all")
async def mark_all_notifications_read(...): ...

@router.put("/{notification_id}/read")
async def mark_notification_read(...): ...
```
Same applies to messages router: `/block`, `/blocked`, `/conversations/{id}/accept`, `/conversations/{id}/reject` must all be declared before the generic `GET /conversations/{id}`.

### Pattern 4: Dashboard Aggregation
**What:** Single endpoint collects all page data; analytics computed from already-fetched listings.
**When to use:** Dashboard pages where all sections are always visible.
**Example:**
```python
# Source: backend/app/dashboard/router.py
total_views = sum(l.get("views_count", 0) for l in user_listings)
active_count = sum(1 for l in user_listings if l.get("status") == "active")
pending_count = sum(1 for l in user_listings if l.get("status") == "pending")

analytics = [
    {"label": "Total Views", "value": f"{total_views:,}", "trend_percent": 0.0, "trend_up": True},
    {"label": "Active Listings", "value": str(active_count), ...},
    ...
]
```

### Pattern 5: Frontend Mapper Functions
**What:** Colocate API-to-UI type mappers in the page that uses them; keep types in `types/api.ts` (API shape) and `types/index.ts` (UI shape).
**When to use:** Every page that transforms API snake_case responses to camelCase UI types.
**Example:**
```typescript
// Source: frontend/src/app/dashboard/page.tsx
function mapProfile(profile: ApiProfileResponse, email: string): UserProfile {
  return {
    name: profile.full_name || "User",
    avatar: profile.avatar_url || "",
    isVerifiedSeller: profile.is_verified_seller || false,
    subtitle: profile.bio || "AXIOM Member",
    info: [
      { label: "Email", value: email },
      { label: "Phone", value: profile.phone || "Not set" },
    ],
  };
}
```

### Pattern 6: liveMessages State Pattern
**What:** Fetch historical messages into local state, then append Realtime INSERTs without re-fetching history.
**When to use:** Chat interfaces with live delivery.
**Example:**
```typescript
// Source: frontend/src/app/messages/page.tsx
// Sync fetched history
useEffect(() => {
  const msgs = (msgData ?? []).map((m) => mapChatMessage(m, user?.id ?? ""));
  setLiveMessages(msgs);
}, [msgData, activeId, user?.id]);

// Realtime appends without replacing
(payload) => {
  setLiveMessages((prev) => [...prev, mapChatMessage(newMsg, user?.id ?? "")]);
}
```

### Anti-Patterns to Avoid
- **Re-fetching full history on Realtime INSERT:** Causes flash and unnecessary load. Append to local state instead.
- **Declaring `read-all` after `/{id}/read`:** FastAPI will match "read-all" as a notification ID parameter.
- **Skipping block check on conversation create:** Must check `blocked_users` bidirectionally before creating a conversation.
- **Using `useEffect` for data fetching:** Use `useQuery` with `enabled` guard, not `useEffect + fetch`.
- **Allowing initiator to send while pending:** Must enforce the 403 gate or the request system is meaningless.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Live message delivery | WebSocket server | Supabase Realtime | Zero infra, Postgres CDC, auth handled |
| Relative timestamps | Custom date formatter | `date-fns formatDistanceToNow` | Edge cases (DST, locale, year boundary) |
| Conversation list with unread count | Manual SQL | `get_user_conversations` Supabase RPC | Aggregation logic in DB where it belongs |
| Message animations | CSS transitions | Framer Motion `AnimatePresence` + `motion.div` | Handles enter/exit correctly |
| IntersectionObserver for scroll FAB | Scroll event listeners | `IntersectionObserver` on sentinel div | No scroll event throttling needed |

**Key insight:** Supabase Realtime eliminates the need for any backend streaming infrastructure. The frontend subscribes directly to Postgres CDC events — the backend only needs to insert rows.

---

## Common Pitfalls

### Pitfall 1: Route Order in FastAPI
**What goes wrong:** `PUT /api/notifications/read-all` gets 422 "invalid UUID" because FastAPI matched it as `/{notification_id}/read` with `notification_id = "read-all"`.
**Why it happens:** FastAPI matches routes top-to-bottom; parametric routes catch everything.
**How to avoid:** Always declare literal routes before parametric ones in the same router.
**Warning signs:** 422 errors on routes with literal segments that look like they could be IDs.

### Pitfall 2: Initiator/Recipient Confusion
**What goes wrong:** Either user can accept their own request, or neither user can.
**Why it happens:** `initiated_by` check is inverted or missing.
**How to avoid:** Only the non-initiator can accept/reject. Check: `if conv.get("initiated_by") == user_id: raise 403`.
**Warning signs:** 403 on recipient's accept attempt, or 200 on initiator's accept attempt.

### Pitfall 3: Realtime Echoing Own Messages
**What goes wrong:** User sees their own sent message appear twice (once from `handleSend` optimistic append, once from Realtime).
**Why it happens:** Realtime fires for all INSERTs including the current user's.
**How to avoid:** Filter in the Realtime callback: `if (newMsg.sender_id === user?.id) return;`
**Warning signs:** Duplicate message bubbles after sending.

### Pitfall 4: Dashboard Query Before Session
**What goes wrong:** `GET /api/dashboard/me` called with no token → 401 loop.
**Why it happens:** Query runs before auth is initialized.
**How to avoid:** Gate with `enabled: !!session` not `enabled: !!user`. Session holds the JWT; user alone doesn't.
**Warning signs:** 401 errors on dashboard mount even when logged in.

### Pitfall 5: `get_user_conversations` RPC Meta Gap
**What goes wrong:** Conversations list shows no status or `initiated_by`, so request UI doesn't render.
**Why it happens:** The RPC only returns core fields; `status` and `initiated_by` must be fetched separately from the `conversations` table.
**How to avoid:** After calling the RPC, fetch meta for all conversation IDs in a single `.in_()` query, then merge.
**Warning signs:** All conversations appear as "accepted" regardless of actual status.

---

## Code Examples

### Schemas — messages/schemas.py
```python
# Source: backend/app/messages/schemas.py
class CreateConversationRequest(BaseModel):
    other_user_id: str
    listing_id: Optional[str] = None
    initial_message: Optional[str] = None

class ConversationResponse(BaseModel):
    id: str
    other_user_id: str
    other_user_name: Optional[str] = None
    other_user_avatar: Optional[str] = None
    listing_id: Optional[str] = None
    last_message_at: Optional[str] = None
    last_message_text: Optional[str] = None
    unread_count: int = 0
    status: str = "accepted"
    initiated_by: Optional[str] = None

class BlockUserRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None
```

### Conversation Participation Guard
```python
# Source: backend/app/messages/router.py
def _verify_participation(conv: dict, user_id: str) -> None:
    if conv["user_a_id"] != user_id and conv["user_b_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not a participant of this conversation")
```

### Frontend Conversation Status UI
```typescript
// Source: frontend/src/components/messages/ChatArea.tsx
{conversationStatus === "pending" && !isInitiator && onAccept && onReject ? (
  <RequestBar onAccept={onAccept} onReject={onReject} isLoading={isActionLoading} />
) : conversationStatus === "pending" && isInitiator ? (
  <div>...amber waiting banner...</div>
) : conversationStatus === "rejected" ? (
  <div>...red declined banner...</div>
) : (
  <div>...normal textarea input...</div>
)}
```

### NotificationBell Realtime
```typescript
// Source: frontend/src/components/layout/NotificationBell.tsx
useEffect(() => {
  if (!session) return;
  const channel = supabase
    .channel("notifications-bell")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" },
      () => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [session, queryClient]);
```

### InboxSidebar: Requests-First Sort
```typescript
// Source: frontend/src/components/messages/InboxSidebar.tsx
const sorted = useMemo(() => {
  const requests = contacts.filter((c) => c.status === "pending" && c.isIncomingRequest);
  const rest = contacts.filter((c) => !(c.status === "pending" && c.isIncomingRequest));
  return [...requests, ...rest];
}, [contacts]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for new messages | Supabase Realtime (Postgres CDC) | Supabase 2.0 | Zero-latency delivery, no polling overhead |
| `useEffect` + `fetch` for data | TanStack Query v5 `useQuery` | RQ v5 (2024) | Automatic caching, deduplication, stale-while-revalidate |
| WebSocket server | Supabase channel subscriptions | Supabase Realtime GA | No custom WS infra needed |
| Multiple dashboard endpoints | Single aggregation endpoint | AXIOM V2 design | One round-trip, no client-side waterfall |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (FastAPI TestClient) |
| Config file | `backend/tests/conftest.py` |
| Quick run command | `cd backend && python -m pytest tests/test_messages.py -v` |
| Full suite command | `cd backend && python -m pytest tests/ -v` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-MSG-01 | POST conversations — create new | unit | `pytest tests/test_messages.py::test_create_conversation_returns_id -x` | ✅ |
| REQ-MSG-01 | POST conversations — self error | unit | `pytest tests/test_messages.py::test_create_conversation_self_error -x` | ✅ |
| REQ-MSG-02 | GET conversations — list | unit | `pytest tests/test_messages.py::test_list_conversations_success -x` | ✅ |
| REQ-MSG-02 | GET conversations — requires auth | unit | `pytest tests/test_messages.py::test_list_conversations_requires_auth -x` | ✅ |
| REQ-MSG-03 | GET messages — not participant 403 | unit | `pytest tests/test_messages.py::test_get_messages_not_participant -x` | ✅ |
| REQ-MSG-04 | POST send — requires auth | unit | `pytest tests/test_messages.py::test_send_message_requires_auth -x` | ✅ |
| REQ-MSG-04 | POST send — blocked when pending initiator | unit | `pytest tests/test_messages.py::test_send_message_blocked_when_pending_initiator -x` | ✅ |
| REQ-MSG-05 | POST accept — success | unit | `pytest tests/test_messages.py::test_accept_conversation_success -x` | ✅ |
| REQ-MSG-05 | POST reject — success | unit | `pytest tests/test_messages.py::test_reject_conversation_success -x` | ✅ |
| REQ-MSG-05 | POST accept — initiator blocked | unit | `pytest tests/test_messages.py::test_initiator_cannot_accept_own_request -x` | ✅ |
| REQ-MSG-05 | POST block — success | unit | `pytest tests/test_messages.py::test_block_user_success -x` | ✅ |
| REQ-MSG-05 | POST block — self error | unit | `pytest tests/test_messages.py::test_block_self_returns_400 -x` | ✅ |
| REQ-MSG-06 | GET dashboard/me — structure | unit | `pytest tests/test_dashboard.py -x` | ✅ |
| REQ-MSG-07 | GET notifications — list | unit | `pytest tests/test_notifications.py -x` | ✅ |
| REQ-MSG-08 | Realtime subscription | manual | Open /messages, have other user send message | N/A |
| REQ-MSG-09 | NotificationBell Realtime badge | manual | Trigger notification insert, verify badge updates | N/A |
| REQ-MSG-10 | Dashboard all 6 sections | unit + smoke | `pytest tests/test_dashboard.py -x` + `npx tsc --noEmit` | ✅ |
| REQ-MSG-11 | Message request UI states | manual | Test pending/accepted/rejected conversation states | N/A |
| REQ-MSG-12 | 29 tests pass | unit | `pytest tests/ -v` (29 tests total through phase 3) | ✅ |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/test_messages.py -v`
- **Per wave merge:** `cd backend && python -m pytest tests/ -v`
- **Phase gate:** Full suite green + `cd frontend && npx tsc --noEmit` passes before close

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. `conftest.py` and mock fixtures already established in earlier phases.

---

## Open Questions

1. **`get_user_conversations` RPC definition**
   - What we know: The backend calls `supabase_admin.rpc("get_user_conversations", {"p_user_id": user_id})` and expects `conversation_id`, `other_user_id`, `listing_id`, `last_message_at`, `unread_count`.
   - What's unclear: The SQL definition of this RPC is not in the migration files reviewed. It must exist in the Supabase project.
   - Recommendation: Verify RPC exists in Supabase dashboard before testing. If missing, create it as part of Wave 0.

2. **Realtime table enablement**
   - What we know: Frontend subscribes to `messages` and `notifications` tables.
   - What's unclear: Whether Realtime was explicitly enabled for these tables in Supabase dashboard (no backend migration for this).
   - Recommendation: Verify in Supabase Realtime settings. Enable if not already on.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `backend/app/messages/router.py`, `schemas.py`, `dashboard/router.py`, `notifications/router.py`
- Direct codebase inspection — `frontend/src/app/messages/page.tsx`, `frontend/src/app/dashboard/page.tsx`
- Direct codebase inspection — `frontend/src/components/messages/ChatArea.tsx`, `InboxSidebar.tsx`, `RequestBar.tsx`
- Direct codebase inspection — `frontend/src/components/layout/NotificationBell.tsx`
- Direct codebase inspection — `backend/tests/test_messages.py`

### Secondary (MEDIUM confidence)
- Supabase Realtime docs (postgres_changes API) — pattern verified in NotificationBell.tsx and messages/page.tsx

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — directly observed in codebase
- Architecture: HIGH — patterns extracted from running code
- Pitfalls: HIGH — issues documented from actual implementation decisions (route order, echo guard, etc.)

**Research date:** 2026-03-21
**Valid until:** 2026-09-21 (stable patterns; Supabase Realtime API unlikely to change)
