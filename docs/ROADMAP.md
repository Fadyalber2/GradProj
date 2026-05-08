# AXIOM V2 — Roadmap & Current Status

Last updated: 2026-05-08

---

## Current State

| Layer                           | Status        | Notes                                                                     |
| ------------------------------- | ------------- | ------------------------------------------------------------------------- |
| Frontend (Next.js)              | ✅ Built      | All pages, zero TypeScript errors, builds clean                           |
| Backend (FastAPI)               | ✅ Built      | All routers implemented, server starts successfully                       |
| Database schema                 | ✅ Designed   | 11-table schema, enums, indexes, RLS policies defined                     |
| AI models                       | ✅ Registered | `axiom-llm:latest` + `nomic-embed-text` in Ollama                         |
| Authentication                  | ✅ Wired      | Supabase auth + JWT middleware protection                                 |
| AI Chatbot                      | ✅ Wired      | SSE streaming RAG chat, property intent detection, inline listing cards   |
| AI Search                       | ✅ Wired      | Natural language filter extraction + hybrid vector/structured search      |
| Dashboard AddListingModal       | ✅ Enhanced   | Map picker (Nominatim), property types, furnishing, AI amenity validation |
| Agency pages                    | ✅ Enhanced   | Premium dark mode, developer cards, stats bar                             |
| Agency detail                   | ✅ Enhanced   | Sidebar, project filter tabs, correct project/listing routing             |
| Project detail                  | ✅ Enhanced   | Sortable residence cards, sales agent sidebar                             |
| Public pages Supabase wiring    | ✅ Done       | find-homes, property, agencies, project, blog, dashboard — all direct Supabase queries, no mock data |
| Admin CRUD overhaul             | ✅ Done       | EntityPicker, RichTextEditor, PendingApprovalsView, required-field validation, 3-second delete countdown |
| WhatsApp lead capture           | ✅ Done       | Messaging system removed; WhatsApp CTAs + leads table + admin view live   |
| Responsive design (400–1200px)  | ✅ Done       | FilterSidebar Sheet drawer, admin Sheet hamburger, all page grids fixed   |
| Deployment                      | ❌ Not done   | No CI/CD, no production environment                                       |

---

## Frontend Pages

| Route                  | Built | API Wired | Notes                                        |
| ---------------------- | ----- | --------- | -------------------------------------------- |
| `/`                    | ✅    | ❌        | Mock listings + testimonials                 |
| `/find-homes`          | ✅    | ✅        | Direct Supabase query via `supabase-queries` |
| `/property/[id]`       | ✅    | ✅        | Direct Supabase — handles regular + shared_housing |
| `/shared-housing/[id]` | ✅    | —         | Redirects to `/property/[id]`                |
| `/dashboard`           | ✅    | ✅        | `getDashboardListings` via Supabase          |
| `/messages`            | —     | —         | Removed — replaced by WhatsApp lead capture  |
| `/login`               | ✅    | ✅        | Supabase auth wired                          |
| `/signup`              | ✅    | ✅        | Single role, Supabase wired                  |
| `/forgot-password`     | ✅    | ✅        | Supabase reset wired                         |
| `/agencies`            | ✅    | ✅        | Direct Supabase query, no mock fallback      |
| `/agencies/[slug]`     | ✅    | ✅        | Direct Supabase query, no mock fallback      |
| `/project/[id]`        | ✅    | ✅        | Direct Supabase query                        |
| `/blog`                | ✅    | ✅        | Direct Supabase query                        |
| `/blog/[slug]`         | ✅    | ✅        | Direct Supabase query                        |
| `/about`               | ✅    | —         | Static                                       |
| `/admin/dashboard`     | ✅    | ✅        | EntityPicker, RichTextEditor, PendingApprovalsView, delete countdown |

---

## AI Features

| Feature                 | Endpoint                        | Status                                         |
| ----------------------- | ------------------------------- | ---------------------------------------------- |
| RAG Chatbot             | `POST /api/ai/chat`             | ✅ Live — SSE streaming + inline listing cards |
| Natural Language Search | `POST /api/ai/search`           | ✅ Live — filter extraction + pgvector         |
| Recommendations         | `GET /api/ai/recommendations`   | ✅ Built                                       |
| Roommate Compatibility  | `POST /api/ai/compatibility`    | ✅ Built                                       |
| Description Generator   | `POST /api/ai/description`      | ✅ Built — bilingual AR/EN                     |
| Amenity Validation      | `POST /api/ai/validate-amenity` | ✅ Built — wired in AddListingModal            |
| Fraud Detection         | Internal                        | ✅ Built                                       |

---

## Next Steps

1. **Wire homepage listings** — replace mock listings on `/` with Supabase query
2. **Testing** — AI unit tests, auth E2E tests
3. **Deployment** — Vercel (frontend), Railway (backend), GitHub Actions (CI)

---

## Locked Architecture Decisions

| Decision                                       | Reason                                               |
| ---------------------------------------------- | ---------------------------------------------------- |
| Single `user` role (no broker)                 | All types, components, and API shapes depend on this |
| `owner_id` not `broker_id`                     | Consistent across DB, backend, and frontend          |
| Unified `/property/[id]` for all listing types | Shared housing redirects here                        |
| `/api/dashboard/me` single endpoint            | Dashboard mapper functions built around this shape   |
| `listing_status`: pending before active        | UI shows pending/rejected states                     |
| Local Ollama for AI                            | `axiom-llm:latest` — no external AI API calls        |
