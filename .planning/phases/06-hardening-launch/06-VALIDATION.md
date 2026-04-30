---
phase: 6
slug: hardening-launch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x + pytest-cov (backend), Playwright (E2E), k6 (load) |
| **Config file** | `backend/pytest.ini` or default discovery |
| **Quick run command** | `cd backend && python -m pytest tests/test_security.py -v` |
| **Full suite command** | `cd backend && python -m pytest tests/ -v --cov=app --cov-fail-under=80` |
| **E2E run command** | `cd frontend && npx playwright test --reporter=list` |
| **Load test command** | `k6 run load-tests/smoke.js` |
| **Estimated runtime** | ~5s (quick), ~90s (full suite), ~120s (E2E), ~90s (load test) |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/test_security.py -v`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -v --cov=app --cov-fail-under=80`
- **Phase gate:** Full suite green + E2E green + k6 thresholds pass before `/gsd:verify-work`
- **Max feedback latency:** 5 seconds (quick), 90 seconds (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | Security backend | 1 | REQ-HARD-01 | unit | `pytest tests/test_security.py::test_rate_limit_exceeded -x` | ❌ Wave 0 | ⬜ pending |
| 06-01-02 | Security backend | 1 | REQ-HARD-02 | unit | `pytest tests/test_security.py::test_ai_cache_hit -x` | ❌ Wave 0 | ⬜ pending |
| 06-01-03 | Security backend | 1 | REQ-HARD-03 | unit | `pytest tests/test_security.py::test_cors_rejected -x` | ❌ Wave 0 | ⬜ pending |
| 06-01-04 | Security backend | 1 | REQ-HARD-04 | unit | `pytest tests/test_security.py::test_security_headers -x` | ❌ Wave 0 | ⬜ pending |
| 06-02-01 | CI/CD | 2 | REQ-HARD-05/06 | ci | Push PR → check GitHub Actions green | ❌ Wave 0 | ⬜ pending |
| 06-02-02 | Deploy | 2 | REQ-HARD-07/08 | manual | Railway health + Vercel URL live | N/A | ⬜ pending |
| 06-03-01 | Security tests | 3 | REQ-HARD-09 | unit | `pytest tests/test_security.py -v` (all 4) | ❌ Wave 0 | ⬜ pending |
| 06-03-02 | E2E tests | 3 | REQ-HARD-10 | e2e | `cd frontend && npx playwright test --reporter=list` | ❌ Wave 0 | ⬜ pending |
| 06-04-01 | Frontend polish | 4 | REQ-HARD-11 | manual | Lighthouse audit ≥70 perf, ≥90 a11y | N/A | ⬜ pending |
| 06-04-02 | SEO | 4 | REQ-HARD-11 | automated | `npx tsc --noEmit` | N/A | ⬜ pending |
| 06-05-01 | Load test | 5 | REQ-HARD-13 | load | `k6 run load-tests/smoke.js` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_security.py` — IDOR, SQL injection, rate limit, CORS, security headers stubs
- [ ] `frontend/playwright.config.ts` — Playwright config with webServer, storageState
- [ ] `frontend/e2e/auth.setup.ts` — Supabase login → storageState save
- [ ] `frontend/e2e/auth.spec.ts` — sign up, log in, log out
- [ ] `frontend/e2e/search.spec.ts` — filter listings, click property, verify detail
- [ ] `frontend/e2e/messaging.spec.ts` — user A messages user B, B replies
- [ ] `frontend/e2e/listing-submission.spec.ts` — submit listing → pending → admin approves
- [ ] `frontend/e2e/admin.spec.ts` — admin logs in, approves pending listing
- [ ] `frontend/playwright/.auth/.gitkeep`
- [ ] `load-tests/smoke.js` — k6 script (100 VUs, p95 < 500ms threshold)
- [ ] `.github/workflows/backend-ci.yml`
- [ ] `.github/workflows/frontend-ci.yml`
- [ ] `backend/railway.json`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Railway deploy live | REQ-HARD-07 | External service deploy | Check Railway dashboard + `GET /api/health` returns all green |
| Vercel deploy live | REQ-HARD-08 | External service deploy | Open production Vercel URL, verify home page loads |
| SEO meta tags in HTML | REQ-HARD-11 | Server-rendered output | `curl -s https://axiom-v2.vercel.app \| grep og:title` |
| Lighthouse scores | REQ-HARD-12 | Browser performance | `npx lighthouse <url> --output json` — perf ≥70, a11y ≥90 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s (quick suite)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
