---
phase: 03-messaging-dashboard
plan: "01"
subsystem: backend-messaging
tags: [messages, dashboard, notifications, fastapi, pydantic]
dependency_graph:
  requires: [01-01, 02-01]
  provides: [messages-api, dashboard-api, notifications-api]
  affects: [frontend-messaging, frontend-dashboard]
tech_stack:
  added: []
  patterns: [message-request-gating, rpc-enrichment, analytics-from-cache]
key_files:
  created:
    - backend/app/messages/__init__.py
    - backend/app/messages/schemas.py
    - backend/app/messages/router.py
    - backend/app/dashboard/__init__.py
    - backend/app/dashboard/router.py
    - backend/app/notifications/__init__.py
    - backend/app/notifications/router.py
    - backend/tests/test_messages.py
    - backend/tests/test_dashboard.py
    - backend/tests/test_notifications.py
  modified: []
decisions:
  - "Conversation analytics (views/active/pending) computed from already-fetched listings list — avoids extra DB round-trip"
  - "get_user_conversations uses Supabase RPC — status/initiated_by fetched via single .in_() query on conversations table"
  - "Route ordering enforced: block+accept+reject before /{conversation_id} catch-all; /read-all before /{id}/read"
  - "Blocked users bidirectionally checked with .or_() filter on blocked_users table"
metrics:
  duration_minutes: 15
  completed_date: "2026-03-21"
  tasks_completed: 6
  files_created: 10
---

# Phase 3 Plan 1: Backend Messaging, Dashboard & Notifications Summary

**One-liner:** FastAPI messaging system with pending/accepted/rejected request gating, unified dashboard aggregation over 6 sections, and notifications CRUD with correct route ordering.

## What Was Built

### Module: `app/messages/`
- **schemas.py**: 6 Pydantic models — `CreateConversationRequest`, `SendMessageRequest`, `ConversationResponse`, `MessageResponse`, `BlockUserRequest`, `BlockedUserResponse`
- **router.py**: 9 routes with strict ordering:
  1. `POST /block` — bidirectional block check, rejects active conversations
  2. `DELETE /block/{id}` — unblock
  3. `GET /blocked` — list with profile enrichment
  4. `GET /conversations` — via RPC + single `.in_()` for status/initiated_by
  5. `POST /conversations` — creates with `status='pending'`, sends `message_request` notification
  6. `POST /conversations/{id}/accept` — recipient-only, notifies initiator
  7. `POST /conversations/{id}/reject` — recipient-only
  8. `GET /conversations/{id}` — get messages (catch-all)
  9. `POST /conversations/{id}` — send message (catch-all), recipient auto-accepts

### Module: `app/dashboard/`
- **router.py**: Single `GET /me` endpoint returning:
  - `profile` — from current_user dict
  - `analytics` — 4 items computed from listings data (no extra query)
  - `listings` — user's own listings
  - `recent_messages` — last 5 conversations with profile + last message
  - `liked_properties` — favorites joined to listings, limit 10
  - `upcoming_viewings` — pending/confirmed, `scheduled_at >= now`, limit 10

### Module: `app/notifications/`
- **router.py**: 3 endpoints, `/read-all` declared before `/{id}/read`

### Registered in `main.py`
All 3 routers registered at `/api/messages`, `/api/dashboard`, `/api/notifications`.

## Tests

| File | Count | Status |
|------|-------|--------|
| test_messages.py | 12 | All pass |
| test_dashboard.py | 2 | All pass |
| test_notifications.py | 3 | All pass |
| **Phase 3 total** | **17** | **All pass** |
| **Full suite** | **74** | **All pass** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing test] Added `test_dashboard_returns_structure`**
- **Found during:** Task 6 gap-fill verification
- **Issue:** `test_dashboard.py` had only 1 test (`test_dashboard_requires_auth`), plan required at least 2
- **Fix:** Added `test_dashboard_returns_structure` — mocks all 6 dashboard sections, verifies 200 response, all 6 keys present, analytics is list of 4 items with `label`+`value`
- **Files modified:** `backend/tests/test_dashboard.py`
- **Commit:** 4ce65fe

All other code (schemas, routers, main.py registrations) existed and matched plan requirements exactly.

## Self-Check: PASSED

Files verified to exist:
- backend/app/messages/__init__.py — FOUND
- backend/app/messages/schemas.py — FOUND
- backend/app/messages/router.py — FOUND
- backend/app/dashboard/__init__.py — FOUND
- backend/app/dashboard/router.py — FOUND
- backend/app/notifications/__init__.py — FOUND
- backend/app/notifications/router.py — FOUND
- backend/tests/test_messages.py — FOUND
- backend/tests/test_dashboard.py — FOUND
- backend/tests/test_notifications.py — FOUND

Commits verified:
- 76378ae: feat(03-01): messages schemas
- 842983f: feat(03-01): messages router
- bb33b7f: feat(03-01): dashboard router
- 5946fc3: feat(03-01): notifications router
- 4ce65fe: test(03-01): messaging/dashboard/notifications tests

74/74 backend tests pass.
