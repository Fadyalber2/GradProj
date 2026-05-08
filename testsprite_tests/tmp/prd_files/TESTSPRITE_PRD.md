# AXIOM V2 — Product Requirements Document (TestSprite)

## Overview

AXIOM is an AI-powered real estate platform for the Egyptian market. The frontend is a Next.js 16 app (App Router, TypeScript, Tailwind CSS, shadcn/ui) that communicates with a FastAPI backend. It supports property listings, AI-assisted search/chat, user dashboards, agency pages, and admin management.

---

## User Roles

- **User (default):** Can browse, search, create listings, favorite properties, schedule viewings, and contact agents via WhatsApp.
- **Admin:** Full CRUD over listings, users, agencies. Can approve/reject listings and grant verified-seller badges.

No broker or seeker roles exist. All users share a single `"user"` role.

---

## Core Pages & Features

### Authentication (`/login`, `/signup`, `/forgot-password`)
- Sign up with email, password, full name, phone, gender.
- Login with email + password via Supabase Auth.
- Forgot password triggers Supabase email reset.
- After login, redirect to `/dashboard`.

### Homepage (`/`)
- Hero section with NL search bar.
- Featured properties grid (mock data currently).
- Testimonials section.
- CTA to browse properties.

### Find Homes (`/find-homes`)
- Filter sidebar: category (for_rent / for_sale / shared_housing), city, price range, bedrooms.
- Listing cards with image, title, location, price, verified badge.
- Sort: newest, price ascending/descending, most viewed.
- Supports natural language search via AI.

### Property Detail (`/property/[id]`)
- Full listing detail: images, title, location, price, description, specs (beds, baths, sqm), amenities, map.
- WhatsApp CTA button (calls `/api/leads` to record click, returns `wa.me/` URL).
- Similar listings section.
- Shared housing listings show extra fields: total spots, filled spots, housemate profiles.

### Shared Housing (`/shared-housing/[id]`)
- Redirects to `/property/[id]` (same component handles both).

### Dashboard (`/dashboard`)
- Protected: requires login.
- Shows: user profile, analytics (total views, active listings), user's listings with status (active/pending/rejected), liked properties, upcoming viewings.
- "Add Listing" modal: form with property type, category, location (Nominatim map picker), price, beds, baths, sqm, furnishing, amenities (AI-validated), description, images.
- Listing status flow: submit → pending → admin approves → active.

### Agencies (`/agencies`)
- Grid of agency cards with logo, name, stats.

### Agency Detail (`/agencies/[slug]`)
- Agency profile: logo, name, description, stats.
- Developer cards listing agents/team.
- Project filter tabs.

### Project Detail (`/project/[id]`)
- Project overview, sortable residence cards, sales agent sidebar.

### Blog (`/blog`, `/blog/[slug]`)
- Blog listing and article detail, sourced from Supabase.

### About (`/about`)
- Static informational page.

### Admin Dashboard (`/admin/dashboard`)
- Protected: requires admin role.
- Entity picker (listings, users, agencies, blog posts).
- Rich text editor for blog posts.
- Pending approvals view: approve or reject listings with reason.
- 3-second countdown before delete confirmation.

---

## AI Features

### AI Chatbot
- Floating chat widget accessible from all pages.
- Sends messages to `POST /api/ai/chat`.
- Streams response via SSE (Server-Sent Events).
- Surfaces listing cards inline when properties match the query.
- Supports Arabic and English.

### Natural Language Search
- Search bar on homepage and find-homes page.
- Sends query to `POST /api/ai/search`.
- Returns structured filters + matching listings.

### Property Recommendations
- Shown on dashboard.
- `GET /api/ai/recommendations` — based on saved favorites.

### Roommate Compatibility
- On shared housing listings.
- `POST /api/ai/compatibility` — scores user fit.

### AI Description Generator
- In Add Listing modal.
- `POST /api/ai/description` — generates bilingual (EN/AR) description.

### Amenity Validation
- In Add Listing modal, validates each amenity input.
- `POST /api/ai/validate-amenity` — blocks offensive/off-topic content.

---

## WhatsApp Lead Capture

- Property detail pages show "Contact via WhatsApp" button.
- Click records a lead in the database (`POST /api/leads`).
- Returns a `wa.me/` URL for direct WhatsApp deep link.
- Deduplicated per user per listing.

---

## Key User Flows

### 1. Browse & Find a Property
1. Land on homepage.
2. Use search bar (text or NL) to filter properties.
3. Browse results on `/find-homes`.
4. Click listing → `/property/[id]`.
5. Click WhatsApp button → redirected to WhatsApp chat.

### 2. Create a Listing
1. Login → `/dashboard`.
2. Click "Add Listing".
3. Fill form: title, category, location (map picker), price, specs, amenities.
4. Submit → listing enters `pending` status.
5. Admin approves → status becomes `active`.

### 3. Admin Approve Listing
1. Login as admin → `/admin/dashboard`.
2. View pending listings.
3. Click Approve → listing goes active.
4. Or Reject → enter reason → listing marked rejected.

### 4. AI Chat
1. Open chat widget (bottom right).
2. Ask "Show me 2-bedroom apartments in Maadi under 8000 EGP".
3. Receive streamed text response + inline listing cards.

### 5. Save & View Favorites
1. Browse listings.
2. Click heart icon on any listing card.
3. View saved properties on Dashboard → Liked Properties tab.

---

## Technical Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **State:** TanStack React Query v5, Zustand
- **Auth:** Supabase Auth (JWT)
- **Backend API:** FastAPI at `http://localhost:8000`
- **Maps:** Leaflet / react-leaflet + Nominatim geocoding
- **Forms:** React Hook Form + Zod

---

## Error States & Edge Cases

- Backend offline: WhatsApp button shows connectivity error message.
- AI unavailable (Ollama down): Chat/search gracefully returns `ai_unavailable` notice.
- Unauthenticated user clicks WhatsApp CTA: redirected to login first.
- Listing in `pending` state: visible only to owner in dashboard, not on public listings.
- Listing `rejected`: owner sees rejection reason in dashboard.
- No listings found: empty state UI shown on find-homes page.
- Invalid amenity: AI validation blocks submission with error message.

---

## Success Criteria

- All pages load without console errors.
- Authentication flow completes: signup → login → dashboard access → logout.
- Listing creation flow works: fill form → submit → see pending status.
- WhatsApp CTA records lead and opens correct wa.me link.
- AI chat widget sends message and receives streamed response.
- Admin can approve/reject listings.
- Favorites toggle works and persists.
- Agency and project pages load with correct data.
- Blog pages render correctly.
- Shared housing redirects to property detail correctly.
