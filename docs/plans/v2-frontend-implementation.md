# V2 Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Recreate the V1 frontend in `V2/frontend/` with all changes required by the V2 data model (single user role, unified listings, unified dashboard, no broker/seeker split).

**Architecture:** Copy V1/frontend verbatim to V2/frontend, then apply surgical changes task by task. The V2 changes are: single role, `owner_id` replaces `broker_id`, unified `/dashboard` page, `/property/[id]` handles shared housing, all type/query updates.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Zustand, TanStack React Query, Supabase Auth, Leaflet

---

## Key V2 Changes vs V1

| Area | V1 | V2 |
|------|----|----|
| User roles | `seeker \| broker` | `user \| admin` |
| Dashboard routes | `/dashboard/user` + `/dashboard/broker` | `/dashboard` (single) |
| Listing owner field | `broker_id` | `owner_id` |
| Shared housing | `/shared-housing/[id]` + separate API | `/property/[id]` (category=shared_housing) |
| Dashboard API | `/api/dashboard/user` + `/api/dashboard/broker` | `/api/dashboard/me` |
| Listing status flow | submit → active | submit → pending → admin reviews → active |
| Verified badge | broker flag | `is_verified_seller` on any user |

---

## Task 1: Bootstrap V2 Frontend Directory

**Files:**
- Create: `V2/frontend/` (copy of V1)

**Step 1: Copy V1 frontend to V2**

```bash
cp -r G:/AI/Newstart/V1/frontend G:/AI/Newstart/V2/frontend
```

**Step 2: Verify copy succeeded**

```bash
ls G:/AI/Newstart/V2/frontend/src/app
```
Expected: see `(auth)  (marketing)  about  admin  agencies  blog  dashboard  find-homes  messages  project  property  shared-housing`

**Step 3: Remove next build cache (clean start)**

```bash
rm -rf G:/AI/Newstart/V2/frontend/.next
```

**Step 4: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend
git commit -m "feat: bootstrap V2 frontend from V1"
```

---

## Task 2: Update middleware.ts

**Files:**
- Modify: `V2/frontend/middleware.ts`

**Step 1: Open and read the file**

File is at `V2/frontend/middleware.ts`. Current content redirects authenticated users to `/dashboard/user` (line 27).

**Step 2: Write the updated file**

Replace the entire file with:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/dashboard", "/messages"];
const authRoutes = ["/login", "/signup", "/forgot-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token =
    request.cookies
      .getAll()
      .find(
        ({ name }) =>
          name.startsWith("sb-") &&
          (name.endsWith("-auth-token") || name.endsWith("-access-token"))
      )?.value ??
    request.cookies.get("sb-access-token")?.value;

  const isAuthenticated = !!token;

  if (isAuthenticated && authRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isAuthenticated && protectedRoutes.some((r) => pathname.startsWith(r))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
```

**Step 3: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend/middleware.ts
git commit -m "feat(v2): redirect dashboard to unified /dashboard"
```

---

## Task 3: Rewrite src/types/index.ts

**Files:**
- Modify: `V2/frontend/src/types/index.ts`

**Step 1: Write the updated file**

Replace entire file:

```typescript
// ── Auth types (match backend auth/schemas.py) ──

export type UserRole = "user" | "admin";
export type GenderType = "male" | "female" | "other";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  country_code: string | null;
  gender: GenderType | null;
  avatar_url: string | null;
  bio: string | null;
  badges: string[];
  is_verified_seller: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  country_code?: string;
  gender?: GenderType;
}

// ── UI / mock-data types ──

export interface Listing {
  id: string;
  title: string;
  location: string;
  price: number;
  image: string;
  matchPercent: number;
  verified: boolean;
  filledSpots: number;
  totalSpots: number;
  tags: string[];
  avatars: string[];
  liked?: boolean;
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface Neighborhood {
  name: string;
  image: string;
  listingCount: number;
  href: string;
}

export interface Testimonial {
  id: string;
  name: string;
  subtitle: string;
  avatar: string;
  rating: number;
  quote: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface HowItWorksStep {
  number: string;
  title: string;
  description: string;
}

export interface Amenity {
  icon: string;
  label: string;
}

export interface SimilarProperty {
  id: string;
  title: string;
  location: string;
  price: number;
  image: string;
}

export interface Agency {
  name: string;
  subtitle: string;
  logo?: string;
  logoText?: string;
  logoFont?: string;
  description: string;
  activeProjects: string;
  listings: string;
}

export interface University {
  name: string;
  shortName: string;
  location: string;
  image: string;
  availability: "available" | "limited";
  details: { label: string; value: string }[];
  avgPrice: string;
}

export interface Residence {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  beds: string;
  baths: string;
  size: string;
  price: string;
}

export interface ProjectDocument {
  title: string;
  size: string;
  icon: string;
}

export interface ProjectDetail {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  developerName: string;
  developerVerified: boolean;
  description: string;
  completion: string;
  unitsTotal: string;
  startingPrice: string;
  status: string;
  keyFeatures: { icon: string; label: string }[];
  residences: Residence[];
  salesAgent: { name: string; role: string; avatar: string };
  residenceOptions: string[];
  documents: ProjectDocument[];
}

export interface Housemate {
  name: string;
  age: number;
  occupation: string;
  avatar: string;
  tags: string[];
}

export interface SharedAmenity {
  icon: string;
  label: string;
}

export interface SimilarRoom {
  id: string;
  title: string;
  housemates: string;
  price: number;
  image: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  date: string;
  author: string;
}

export interface PopularPost {
  id: string;
  title: string;
  image: string;
  category: string;
  timeAgo: string;
}

export interface AgencyProject {
  id: string;
  title: string;
  location: string;
  image: string;
  price: string;
  priceLabel: string;
  beds: string;
  area: string;
  status: string;
  statusColor: string;
  progressPercent: number;
  progressColor: string;
  progressLabel: string;
  completionLabel: string;
  cta: string;
  badge?: string;
  badgeColor?: string;
}

export interface Award {
  title: string;
  subtitle: string;
  gold: boolean;
}

export interface AgencyDetail {
  slug: string;
  name: string;
  logoText: string;
  badge: string;
  location: string;
  bannerImage: string;
  description: string;
  trustScore: string;
  projectsForSale: string;
  developmentHistory: string;
  awards: Award[];
  featuredProjects: AgencyProject[];
  topListings: AgencyProject[];
  totalListings: number;
  totalCities: number;
}

export interface AnalyticsStat {
  label: string;
  value: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  bars: number[];
  barColor: string;
  trendPercent: string;
  trendUp: boolean;
}

export interface DashboardMessage {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  preview: string;
  time: string;
  online?: boolean;
  unread?: boolean;
}

// Dashboard listing — represents a listing owned by the current user
export interface DashboardListing {
  id: string;
  name: string;
  listingId: string;
  image?: string;
  location: string;
  status: "active" | "pending" | "rejected" | "draft";
  price: string;
  priceSuffix?: string;
  views: string;
}

export interface UserProfile {
  name: string;
  avatar: string;
  isVerifiedSeller: boolean;
  subtitle: string;
  info: { label: string; value: string }[];
}

export interface LikedProperty {
  id: string;
  title: string;
  location: string;
  image: string;
  price: string;
  priceSuffix: string;
  specs: string[];
  addedAgo: string;
}

export interface DashboardViewingBrief {
  id: string;
  listingTitle: string;
  listingImage: string;
  scheduledAt: string;
  status: "pending" | "confirmed" | "cancelled";
}

export interface PropertyDetail {
  id: string;
  ownerId: string;
  title: string;
  location: string;
  fullAddress: string;
  price: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  isNew: boolean;
  available: boolean;
  images: string[];
  type: string;
  size: string;
  bedrooms: string;
  bathrooms: string;
  description: string[];
  amenities: Amenity[];
  similarProperties: SimilarProperty[];
  latitude?: number | null;
  longitude?: number | null;
  // Shared housing extras (null for regular listings)
  category?: "for_rent" | "for_sale" | "shared_housing";
  totalSpots?: number;
  filledSpots?: number;
  availability?: string;
  availableDate?: string;
  furnishing?: string;
  utilitiesIncluded?: boolean;
  bathroomType?: string;
  privateAmenities?: SharedAmenity[];
  sharedAmenities?: SharedAmenity[];
  housemates?: Housemate[];
}

export interface BlogArticle {
  slug: string;
  title: string;
  subtitle?: string;
  image: string;
  category: string;
  date: string;
  readTime: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  lead: string;
  content: ArticleBlock[];
  tags: string[];
}

export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "takeaways"; items: string[] }
  | { type: "blockquote"; text: string; attribution: string }
  | { type: "list"; items: string[] };

export interface RelatedArticle {
  slug: string;
  title: string;
  image: string;
  category: string;
  date: string;
  readTime: string;
}

export interface InboxContact {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  initialsBg?: string;
  initialsColor?: string;
  preview: string;
  time: string;
  online?: boolean;
  active?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "them" | "me";
  text: string;
  time: string;
  attachment?: {
    name: string;
    size: string;
  };
  showAvatar?: boolean;
}
```

**Step 2: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend/src/types/index.ts
git commit -m "feat(v2): update frontend types for single-role model"
```

---

## Task 4: Rewrite src/types/api.ts

**Files:**
- Modify: `V2/frontend/src/types/api.ts`

**Step 1: Write the updated file**

Replace entire file:

```typescript
// API response types — mirror the backend Pydantic schemas exactly

// ── Listings ──

export interface HousemateResponse {
  id: string;
  listing_id: string;
  user_id: string | null;
  name: string;
  age: number | null;
  occupation: string | null;
  avatar_url: string | null;
  tags: string[];
}

export interface ListingBrief {
  id: string;
  title: string;
  location: string;
  price: number;
  currency: string;
  price_period: string;
  property_type: string;
  category: "for_rent" | "for_sale" | "shared_housing";
  images: string[];
  verified: boolean;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  size_sqm: number | null;
  views_count: number;
  is_new: boolean;
  created_at: string | null;
}

export interface ListingDetail extends ListingBrief {
  owner_id: string;
  agency_id: string | null;
  description: string | null;
  full_address: string | null;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  updated_at: string | null;
  // Shared housing fields — present when category === "shared_housing"
  total_spots: number | null;
  filled_spots: number | null;
  availability: string | null;
  available_date: string | null;
  furnishing: string | null;
  utilities_included: boolean;
  bathroom_type: string | null;
  private_amenities: string[];
  shared_amenities: string[];
  housemates: HousemateResponse[];
}

export interface ListingDetailWithSimilar extends ListingDetail {
  similar_listings: ListingBrief[];
}

export interface PaginatedListings {
  listings: ListingBrief[];
  total: number;
  page: number;
  per_page: number;
}

// ── Agencies ──

export interface AgencyBrief {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  logo_url: string | null;
  verified: boolean;
  active_projects: number;
  listings_count: number;
}

export interface ApiAgencyDetail extends AgencyBrief {
  description: string | null;
  banner_url: string | null;
  trust_score: number;
  followers_count: number;
  created_at: string | null;
}

export interface PaginatedAgencies {
  agencies: AgencyBrief[];
  total: number;
  page: number;
  per_page: number;
}

// ── Projects ──

export interface ProjectBrief {
  id: string;
  agency_id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  completion_pct: number;
  starting_price: number | null;
  status: string;
}

export interface ApiProjectDetail extends ProjectBrief {
  description: string | null;
  units_total: number | null;
  key_features: string[];
  created_at: string | null;
  agency_name: string | null;
  agency_slug: string | null;
  agency_logo: string | null;
  agency_verified: boolean;
}

// ── Blog ──

export interface BlogPostBrief {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  category: string | null;
  author_name: string | null;
  author_avatar: string | null;
  read_time: string | null;
  published_at: string | null;
}

export interface BlogPostDetail extends BlogPostBrief {
  author_role: string | null;
  lead: string | null;
  content: unknown[];
  tags: string[];
  created_at: string | null;
}

export interface PaginatedBlogPosts {
  posts: BlogPostBrief[];
  total: number;
  page: number;
  per_page: number;
}

// ── Dashboard (unified) ──

export interface ApiDashboardMessage {
  conversation_id: string;
  other_user_name: string | null;
  other_user_avatar: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface LikedPropertyBrief {
  id: string;
  listing_id: string;
  title: string;
  location: string;
  price: number;
  images: string[];
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  created_at: string | null;
}

export interface ApiDashboardListing {
  id: string;
  title: string;
  location: string;
  price: number;
  status: string;
  views_count: number;
  images: string[];
  created_at: string | null;
}

export interface ApiAnalyticsStat {
  label: string;
  value: string;
  trend_percent: number;
  trend_up: boolean;
}

export interface ApiViewingBrief {
  id: string;
  listing_title: string;
  listing_image: string | null;
  scheduled_at: string;
  status: string;
}

export interface DashboardResponse {
  profile: Record<string, unknown>;
  listings: ApiDashboardListing[];
  listings_count: number;
  active_count: number;
  pending_count: number;
  analytics: ApiAnalyticsStat[];
  liked_properties: LikedPropertyBrief[];
  liked_count: number;
  recent_messages: ApiDashboardMessage[];
  unread_messages: number;
  upcoming_viewings: ApiViewingBrief[];
}

// ── Messages ──

export interface ConversationPreview {
  conversation_id: string;
  other_user_id: string;
  other_user_name: string | null;
  other_user_avatar: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface ConversationsListResponse {
  conversations: ConversationPreview[];
}

export interface ApiMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: string | null;
  created_at: string | null;
}

export interface MessagesListResponse {
  messages: ApiMessage[];
  total: number;
  page: number;
  per_page: number;
}
```

**Step 2: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend/src/types/api.ts
git commit -m "feat(v2): update API types — unified listings, single dashboard"
```

---

## Task 5: Update src/lib/queries.ts

**Files:**
- Modify: `V2/frontend/src/lib/queries.ts`

**Step 1: Write the updated file**

Replace entire file:

```typescript
import { api } from "@/lib/api";
import type {
  PaginatedListings,
  ListingDetailWithSimilar,
  PaginatedAgencies,
  ApiAgencyDetail,
  ProjectBrief,
  ApiProjectDetail,
  PaginatedBlogPosts,
  BlogPostDetail,
  BlogPostBrief,
  DashboardResponse,
  ConversationsListResponse,
  MessagesListResponse,
} from "@/types/api";

const SERVER_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function serverFetch<T>(
  path: string,
  params?: Record<string, string>
): Promise<T | null> {
  try {
    const url = new URL(`${SERVER_API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url.toString(), {
        next: { revalidate: 60 },
        signal: controller.signal,
      });
      if (!res.ok) return null;
      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}

// ── Listings ──

export interface ListingsParams {
  category?: "for_rent" | "for_sale" | "shared_housing";
  min_price?: number;
  max_price?: number;
  location?: string;
  bedrooms?: number;
  sort_by?: string;
  page?: number;
  per_page?: number;
}

export const listingsQueries = {
  list: (params?: ListingsParams) => ({
    queryKey: ["listings", params],
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

// ── Agencies ──

export const agenciesQueries = {
  list: (params?: { page?: number; per_page?: number; search?: string }) => ({
    queryKey: ["agencies", params],
    queryFn: () =>
      api.get<PaginatedAgencies>("/api/agencies", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  }),

  detail: (slug: string) => ({
    queryKey: ["agencies", slug],
    queryFn: () => api.get<ApiAgencyDetail>(`/api/agencies/${slug}`),
  }),

  projects: (slug: string) => ({
    queryKey: ["agencies", slug, "projects"],
    queryFn: () => api.get<ProjectBrief[]>(`/api/agencies/${slug}/projects`),
  }),
};

// ── Projects ──

export const projectsQueries = {
  detail: (id: string) => ({
    queryKey: ["projects", id],
    queryFn: () => api.get<ApiProjectDetail>(`/api/projects/${id}`),
  }),
};

// ── Blog ──

export const blogQueries = {
  list: (params?: { category?: string; page?: number; per_page?: number }) => ({
    queryKey: ["blog", params],
    queryFn: () =>
      api.get<PaginatedBlogPosts>("/api/blog", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  }),

  detail: (slug: string) => ({
    queryKey: ["blog", slug],
    queryFn: () => api.get<BlogPostDetail>(`/api/blog/${slug}`),
  }),

  related: (slug: string) => ({
    queryKey: ["blog", slug, "related"],
    queryFn: () => api.get<BlogPostBrief[]>(`/api/blog/${slug}/related`),
  }),
};

// ── Dashboard (unified) ──

export const dashboardQueries = {
  me: () => ({
    queryKey: ["dashboard", "me"],
    queryFn: () => api.get<DashboardResponse>("/api/dashboard/me"),
  }),
};

// ── Messages ──

export const messagesQueries = {
  conversations: () => ({
    queryKey: ["conversations"],
    queryFn: () =>
      api.get<ConversationsListResponse>("/api/messages/conversations"),
  }),

  messages: (conversationId: string) => ({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      api.get<MessagesListResponse>(
        `/api/messages/conversations/${conversationId}`
      ),
  }),
};
```

**Step 2: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend/src/lib/queries.ts
git commit -m "feat(v2): update queries — unified dashboard endpoint, remove broker/shared-housing"
```

---

## Task 6: Update src/stores/authStore.ts

**Files:**
- Modify: `V2/frontend/src/stores/authStore.ts`

**Step 1: Write the updated file**

Replace entire file:

```typescript
import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AuthUser, SignUpData } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchProfile(accessToken: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignUpData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      const user = await fetchProfile(session.access_token);
      set({ session, user, isInitialized: true });
    } else {
      set({ isInitialized: true });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session) {
          const user = await fetchProfile(session.access_token);
          set({ session, user });
        }
      } else if (event === "SIGNED_OUT") {
        set({ session: null, user: null });
      }
    });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      const user = await fetchProfile(data.session.access_token);
      set({ session: data.session, user });
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async ({ email, password, full_name, phone, country_code, gender }) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name, phone, country_code, gender }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { detail?: string }).detail || "Signup failed");
      }
      if (res.status === 202) {
        throw new Error((body as { message?: string }).message || "Check your email to confirm your account");
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      const user = await fetchProfile(data.session.access_token);
      set({ session: data.session, user });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  refreshProfile: async () => {
    const { session } = get();
    if (!session) return;
    const user = await fetchProfile(session.access_token);
    if (user) set({ user });
  },
}));
```

**Step 2: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend/src/stores/authStore.ts
git commit -m "feat(v2): remove role from signup, add is_verified_seller to auth"
```

---

## Task 7: Update SignUp Form

**Files:**
- Modify: `V2/frontend/src/components/auth/SignUpForm.tsx`

**Step 1: Write the updated file**

Replace entire file. The only change is: remove the role selector grid (lines 124–157 in V1), remove `role` state, remove `UserRole` import, and change redirect to `/dashboard`:

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import OAuthButton from "@/components/auth/OAuthButton";
import { GoogleIcon, GitHubIcon } from "@/components/auth/OAuthIcons";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import type { GenderType } from "@/types";

const COUNTRY_CODES = ["+20", "+1", "+44", "+971"];

const GENDER_OPTIONS: { label: string; value: GenderType | "" }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Prefer not to say", value: "other" },
];

export default function SignUpForm() {
  const router = useRouter();
  const { signup, isLoading } = useAuthStore();

  const [countryCode, setCountryCode] = useState("+20");
  const [gender, setGender] = useState<GenderType | "">("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const fd = new FormData(e.currentTarget);
    const full_name = (fd.get("name") as string).trim();
    const email = (fd.get("email") as string).trim();
    const phone = (fd.get("phone") as string).trim();
    const password = fd.get("password") as string;
    const confirmPassword = fd.get("confirm-password") as string;

    if (!full_name || !email || !password) {
      setError("Name, email, and password are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (phone && !/^[\d\s\-().+]+$/.test(phone)) {
      setError("Phone number can only contain digits, spaces, and + - ( ) characters.");
      return;
    }

    try {
      await signup({
        email,
        password,
        full_name,
        phone: phone || undefined,
        country_code: countryCode,
        gender: gender || undefined,
      });
      toast.success("Account created! Welcome to AXIOM.");
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Signup failed.";
      if (msg.toLowerCase().includes("confirm") || msg.toLowerCase().includes("check your email")) {
        setInfo(msg);
        toast.success("Account created! Check your email to confirm.");
      } else {
        setError(msg);
        toast.error(msg);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg"
    >
      <div className="bg-card-dark rounded-2xl shadow-2xl shadow-black/50 border border-white/10 p-8 sm:p-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-primary mb-2 tracking-tight">
            AXIOM
          </h2>
          <h1 className="text-2xl font-bold text-white">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Join the vibe-based real estate platform.
          </p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="John Doe"
              className="block w-full px-4 py-3 rounded-lg border border-white/10 bg-background-dark text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
              className="block w-full px-4 py-3 rounded-lg border border-white/10 bg-background-dark text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <div className="flex rounded-lg shadow-sm">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="rounded-l-lg border border-r-0 border-white/10 bg-background-dark text-white focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm px-3 py-3 w-24"
              >
                {COUNTRY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="off"
                placeholder="(555) 123-4567"
                className="flex-1 min-w-0 block w-full px-4 py-3 rounded-r-lg border border-white/10 bg-background-dark text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Gender
            </label>
            <div className="flex space-x-4">
              {GENDER_OPTIONS.map((g) => (
                <label key={g.value} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value={g.value}
                    checked={gender === g.value}
                    onChange={() => setGender(g.value as GenderType)}
                    className="h-4 w-4 text-primary border-gray-600 focus:ring-primary bg-transparent"
                  />
                  <span className="ml-2 text-sm text-white">{g.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="signup-password" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                className="block w-full px-4 py-3 rounded-lg border border-white/10 bg-background-dark text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                className="block w-full px-4 py-3 rounded-lg border border-white/10 bg-background-dark text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Creating account…" : "Sign Up"}
            </button>
          </div>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 bg-card-dark text-gray-400">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <OAuthButton provider="google" label="Google" icon={<GoogleIcon />} />
          <OAuthButton provider="github" label="GitHub" icon={<GitHubIcon />} />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
```

**Step 2: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend/src/components/auth/SignUpForm.tsx
git commit -m "feat(v2): remove role selector from signup form"
```

---

## Task 8: Update Navbar.tsx

**Files:**
- Modify: `V2/frontend/src/components/layout/Navbar.tsx`

**Step 1: Find and replace the dashboard href line**

In `V2/frontend/src/components/layout/Navbar.tsx`, line 48–49 reads:

```typescript
  const dashboardHref =
    user?.role === "broker" ? "/dashboard/broker" : "/dashboard/user";
```

Replace with:

```typescript
  const dashboardHref = "/dashboard";
```

**Step 2: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend/src/components/layout/Navbar.tsx
git commit -m "feat(v2): navbar dashboard link to /dashboard"
```

---

## Task 9: Delete Obsolete Directories and Files

**Files:**
- Delete: `V2/frontend/src/app/dashboard/broker/`
- Delete: `V2/frontend/src/app/dashboard/user/`
- Delete: `V2/frontend/src/app/shared-housing/`
- Delete: `V2/frontend/src/components/broker-dashboard/`
- Delete: `V2/frontend/src/components/user-dashboard/`

**Step 1: Delete all at once**

```bash
rm -rf G:/AI/Newstart/V2/frontend/src/app/dashboard/broker
rm -rf G:/AI/Newstart/V2/frontend/src/app/dashboard/user
rm -rf G:/AI/Newstart/V2/frontend/src/app/shared-housing
rm -rf G:/AI/Newstart/V2/frontend/src/components/broker-dashboard
rm -rf G:/AI/Newstart/V2/frontend/src/components/user-dashboard
```

**Step 2: Verify**

```bash
ls G:/AI/Newstart/V2/frontend/src/app/dashboard
ls G:/AI/Newstart/V2/frontend/src/components
```
Expected: `dashboard/` directory has no `broker/` or `user/` subdirectory. No `broker-dashboard` or `user-dashboard` in components.

**Step 3: Commit**

```bash
cd G:/AI/Newstart
git add -A V2/frontend/src/app/dashboard
git add -A V2/frontend/src/app/shared-housing
git add -A V2/frontend/src/components/broker-dashboard
git add -A V2/frontend/src/components/user-dashboard
git commit -m "feat(v2): remove broker/user dashboard and shared-housing page dirs"
```

---

## Task 10: Create components/dashboard/ Directory

**Files:**
- Create: `V2/frontend/src/components/dashboard/DashboardProfile.tsx`
- Create: `V2/frontend/src/components/dashboard/DashboardStats.tsx`
- Create: `V2/frontend/src/components/dashboard/MyListings.tsx`
- Create: `V2/frontend/src/components/dashboard/AddListingModal.tsx`
- Create: `V2/frontend/src/components/dashboard/LikedProperties.tsx`
- Create: `V2/frontend/src/components/dashboard/RecentMessages.tsx`
- Create: `V2/frontend/src/components/dashboard/MyViewings.tsx`

**Step 1: Create DashboardProfile.tsx**

```typescript
// V2/frontend/src/components/dashboard/DashboardProfile.tsx
"use client";

import Image from "next/image";
import { BadgeCheck, User } from "lucide-react";
import type { UserProfile } from "@/types";

interface DashboardProfileProps {
  user: UserProfile;
}

export default function DashboardProfile({ user }: DashboardProfileProps) {
  return (
    <div className="bg-card-dark rounded-3xl border border-white/5 p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
      <div className="relative flex-shrink-0">
        {user.avatar ? (
          <Image
            src={user.avatar}
            alt={user.name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-full object-cover ring-2 ring-primary/30"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/30">
            <User className="h-8 w-8 text-primary" />
          </div>
        )}
        {user.isVerifiedSeller && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center ring-2 ring-black">
            <BadgeCheck className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-white">{user.name}</h2>
          {user.isVerifiedSeller && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
              Verified Seller
            </span>
          )}
        </div>
        <p className="text-gray-400 text-sm mt-0.5">{user.subtitle}</p>
        <div className="flex flex-wrap gap-4 mt-3">
          {user.info.map((item) => (
            <div key={item.label} className="text-xs text-gray-500">
              <span className="text-gray-400 font-medium">{item.label}: </span>
              {item.value}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create DashboardStats.tsx**

```typescript
// V2/frontend/src/components/dashboard/DashboardStats.tsx
"use client";

import { Eye, TrendingUp, MessageSquare } from "lucide-react";
import type { AnalyticsStat } from "@/types";

interface DashboardStatsProps {
  stats: AnalyticsStat[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  Eye,
  TrendingUp,
  MessageSquare,
};

export default function DashboardStats({ stats }: DashboardStatsProps) {
  if (!stats.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {stats.map((stat) => {
        const Icon = ICON_MAP[stat.icon] ?? Eye;
        return (
          <div
            key={stat.label}
            className="bg-card-dark rounded-2xl border border-white/5 p-5 flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl ${stat.iconBg}`}>
              <Icon className={`h-5 w-5 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className={`text-xs font-medium ${stat.trendUp ? "text-green-400" : "text-red-400"}`}>
                {stat.trendUp ? "+" : "-"}{stat.trendPercent}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 3: Create MyListings.tsx**

```typescript
// V2/frontend/src/components/dashboard/MyListings.tsx
"use client";

import Image from "next/image";
import { PlusCircle, Pencil, MoreVertical, ImageIcon } from "lucide-react";
import type { DashboardListing } from "@/types";

interface MyListingsProps {
  listings: DashboardListing[];
  onAddNew: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-green-500/10 text-green-400 border-green-500/10",
  pending:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/10",
  rejected: "bg-red-500/10 text-red-400 border-red-500/10",
  draft:    "bg-gray-500/10 text-gray-400 border-gray-500/10",
};

const STATUS_DOT: Record<string, string> = {
  active:   "bg-green-500",
  pending:  "bg-yellow-500",
  rejected: "bg-red-500",
  draft:    "bg-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  active:   "Active",
  pending:  "Pending Review",
  rejected: "Rejected",
  draft:    "Draft",
};

export default function MyListings({ listings, onAddNew }: MyListingsProps) {
  return (
    <section className="bg-card-dark rounded-3xl border border-white/5 overflow-hidden">
      <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">My Listings</h2>
          <p className="text-gray-400 text-sm">
            New listings require admin approval before going live.
          </p>
        </div>
        <button
          onClick={onAddNew}
          className="px-5 py-2.5 bg-primary hover:bg-primary-hover rounded-lg text-sm text-white font-bold shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
        >
          <PlusCircle className="h-5 w-5" /> Add New Listing
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-black/20 text-gray-400 text-xs uppercase tracking-wider">
              <th className="p-5 font-semibold">Property</th>
              <th className="p-5 font-semibold">Location</th>
              <th className="p-5 font-semibold">Status</th>
              <th className="p-5 font-semibold text-right">Price</th>
              <th className="p-5 font-semibold text-center">Views</th>
              <th className="p-5 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {listings.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No listings yet. Click "Add New Listing" to get started.
                </td>
              </tr>
            ) : (
              listings.map((listing) => (
                <tr key={listing.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      {listing.image ? (
                        <Image
                          src={listing.image}
                          alt={listing.name}
                          width={64}
                          height={48}
                          className="w-16 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-12 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                          <ImageIcon className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-white font-bold text-base">{listing.name}</p>
                        <p className="text-gray-500 text-xs">ID: {listing.listingId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-gray-400">{listing.location}</td>
                  <td className="p-5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[listing.status]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[listing.status]}`} />
                      {STATUS_LABEL[listing.status] ?? listing.status}
                    </span>
                  </td>
                  <td className="p-5 text-right text-white font-medium">
                    {listing.price}
                    {listing.priceSuffix && (
                      <span className="text-gray-500 text-xs font-normal">{listing.priceSuffix}</span>
                    )}
                  </td>
                  <td className="p-5 text-center text-gray-300">{listing.views}</td>
                  <td className="p-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

**Step 4: Create AddListingModal.tsx**

Copy from `V1/frontend/src/components/broker-dashboard/AddListingModal.tsx` verbatim to `V2/frontend/src/components/dashboard/AddListingModal.tsx`. The only change is the submit button label and a note to the user:

Find this line in the footer:
```typescript
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Listing"}
```

Replace with:
```typescript
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for Review"}
```

And add a note below the footer actions. After the `submitError` paragraph, before the Save as Draft button, add:
```typescript
            <p className="text-xs text-gray-500 self-center mr-auto">
              Listings are reviewed by an admin before going live.
            </p>
```

**Step 5: Create LikedProperties.tsx**

Copy from `V1/frontend/src/components/user-dashboard/LikedProperties.tsx` to `V2/frontend/src/components/dashboard/LikedProperties.tsx` verbatim (no changes needed — it uses generic `LikedProperty` type that is unchanged).

**Step 6: Create RecentMessages.tsx**

Copy from `V1/frontend/src/components/broker-dashboard/RecentMessages.tsx` to `V2/frontend/src/components/dashboard/RecentMessages.tsx` verbatim.

**Step 7: Create MyViewings.tsx**

```typescript
// V2/frontend/src/components/dashboard/MyViewings.tsx
"use client";

import { Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import type { DashboardViewingBrief } from "@/types";

interface MyViewingsProps {
  viewings: DashboardViewingBrief[];
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  confirmed: { icon: CheckCircle, color: "text-green-400", label: "Confirmed" },
  pending:   { icon: Clock,       color: "text-yellow-400", label: "Pending" },
  cancelled: { icon: XCircle,     color: "text-red-400",    label: "Cancelled" },
};

export default function MyViewings({ viewings }: MyViewingsProps) {
  if (!viewings.length) return null;

  return (
    <section className="bg-card-dark rounded-3xl border border-white/5 overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-white">Upcoming Viewings</h2>
      </div>
      <div className="divide-y divide-white/5">
        {viewings.map((v) => {
          const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.pending;
          const Icon = cfg.icon;
          const date = new Date(v.scheduledAt);
          return (
            <div key={v.id} className="p-5 flex items-center gap-4">
              {v.listingImage ? (
                <img
                  src={v.listingImage}
                  alt={v.listingTitle}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{v.listingTitle}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {date.toLocaleDateString("en-EG", { weekday: "short", month: "short", day: "numeric" })}{" "}
                  at {date.toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                <Icon className="h-4 w-4" />
                {cfg.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

**Step 8: Commit all dashboard components**

```bash
cd G:/AI/Newstart
git add V2/frontend/src/components/dashboard/
git commit -m "feat(v2): add unified dashboard components"
```

---

## Task 11: Create app/dashboard/page.tsx

**Files:**
- Create: `V2/frontend/src/app/dashboard/page.tsx`

**Step 1: Write the file**

```typescript
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import DashboardProfile from "@/components/dashboard/DashboardProfile";
import DashboardStats from "@/components/dashboard/DashboardStats";
import MyListings from "@/components/dashboard/MyListings";
import AddListingModal from "@/components/dashboard/AddListingModal";
import LikedProperties from "@/components/dashboard/LikedProperties";
import RecentMessages from "@/components/dashboard/RecentMessages";
import MyViewings from "@/components/dashboard/MyViewings";
import { dashboardQueries } from "@/lib/queries";
import { useAuthStore } from "@/stores/authStore";
import type {
  ApiDashboardListing,
  ApiAnalyticsStat,
  ApiDashboardMessage,
  LikedPropertyBrief,
  ApiViewingBrief,
} from "@/types/api";
import type {
  UserProfile,
  AnalyticsStat,
  DashboardListing,
  DashboardMessage,
  LikedProperty,
  DashboardViewingBrief,
} from "@/types";

// ── Mappers ──

function mapProfile(profile: Record<string, unknown>, email: string): UserProfile {
  return {
    name: (profile.full_name as string) || "User",
    avatar: (profile.avatar_url as string) || "",
    isVerifiedSeller: (profile.is_verified_seller as boolean) || false,
    subtitle: (profile.bio as string) || "AXIOM Member",
    info: [
      { label: "Email", value: email },
      { label: "Phone", value: (profile.phone as string) || "Not set" },
      { label: "Country", value: (profile.country_code as string) || "+20" },
    ],
  };
}

const ICON_MAP: Record<string, { icon: string; iconBg: string; iconColor: string; barColor: string }> = {
  "Total Views":     { icon: "Eye",         iconBg: "bg-blue-500/10",    iconColor: "text-blue-400",   barColor: "bg-blue-500" },
  "Active Listings": { icon: "TrendingUp",  iconBg: "bg-primary/10",     iconColor: "text-primary",    barColor: "bg-primary" },
  "Messages":        { icon: "MessageSquare", iconBg: "bg-green-500/10", iconColor: "text-green-400",  barColor: "bg-green-500" },
};

function mapAnalyticsStat(stat: ApiAnalyticsStat): AnalyticsStat {
  const cfg = ICON_MAP[stat.label] ?? ICON_MAP["Total Views"];
  return {
    label: stat.label,
    value: stat.value,
    icon: cfg.icon,
    iconBg: cfg.iconBg,
    iconColor: cfg.iconColor,
    bars: [30, 50, 40, 70, 60, 80, 65],
    barColor: cfg.barColor,
    trendPercent: `${Math.abs(stat.trend_percent)}%`,
    trendUp: stat.trend_up,
  };
}

function mapListing(listing: ApiDashboardListing): DashboardListing {
  const statusMap: Record<string, DashboardListing["status"]> = {
    active: "active",
    pending: "pending",
    rejected: "rejected",
    draft: "draft",
  };
  return {
    id: listing.id,
    name: listing.title,
    listingId: `LIST-${listing.id.slice(0, 6).toUpperCase()}`,
    image: listing.images[0] ?? undefined,
    location: listing.location,
    status: statusMap[listing.status] ?? "draft",
    price: `EGP ${listing.price.toLocaleString()}`,
    priceSuffix: "/mo",
    views: `${listing.views_count}`,
  };
}

function mapDashboardMessage(msg: ApiDashboardMessage): DashboardMessage {
  const initials = msg.other_user_name
    ? msg.other_user_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";
  return {
    id: msg.conversation_id,
    name: msg.other_user_name ?? "Unknown",
    avatar: msg.other_user_avatar ?? undefined,
    initials,
    preview: msg.last_message_text ?? "No messages yet",
    time: msg.last_message_at
      ? formatDistanceToNow(new Date(msg.last_message_at), { addSuffix: true })
      : "",
    unread: msg.unread_count > 0,
  };
}

function mapLikedProperty(lp: LikedPropertyBrief): LikedProperty {
  const specs = [
    lp.bedrooms != null ? `${lp.bedrooms} Beds` : null,
    lp.bathrooms != null ? `${lp.bathrooms} Baths` : null,
    lp.property_type ?? null,
  ].filter(Boolean) as string[];
  return {
    id: lp.listing_id,
    title: lp.title,
    location: lp.location,
    image: lp.images[0] ?? "",
    price: `EGP ${lp.price.toLocaleString()}`,
    priceSuffix: "/mo",
    specs,
    addedAgo: lp.created_at
      ? formatDistanceToNow(new Date(lp.created_at), { addSuffix: true })
      : "Recently",
  };
}

function mapViewing(v: ApiViewingBrief): DashboardViewingBrief {
  return {
    id: v.id,
    listingTitle: v.listing_title,
    listingImage: v.listing_image ?? "",
    scheduledAt: v.scheduled_at,
    status: (v.status as DashboardViewingBrief["status"]) ?? "pending",
  };
}

// ── Page ──

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading, isError } = useQuery(dashboardQueries.me());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-center text-red-400 py-20">
        Failed to load dashboard. Make sure the backend is running.
      </p>
    );
  }

  const profile = mapProfile(data.profile, user?.email ?? "");
  const stats = data.analytics.map(mapAnalyticsStat);
  const listings = data.listings.map(mapListing);
  const messages = data.recent_messages.map(mapDashboardMessage);
  const likedProperties = data.liked_properties.map(mapLikedProperty);
  const viewings = data.upcoming_viewings.map(mapViewing);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      </div>

      <DashboardProfile user={profile} />
      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        <div className="xl:col-span-2">
          <LikedProperties properties={likedProperties} />
        </div>
        <div className="xl:col-span-1">
          <RecentMessages messages={messages} />
        </div>
      </div>

      <div className="mb-8">
        <MyViewings viewings={viewings} />
      </div>

      <MyListings listings={listings} onAddNew={() => setModalOpen(true)} />
      <AddListingModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
```

**Step 2: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend/src/app/dashboard/page.tsx
git commit -m "feat(v2): unified dashboard page"
```

---

## Task 12: Rename MessageBrokerModal → MessageOwnerModal

**Files:**
- Rename: `V2/frontend/src/components/property/MessageBrokerModal.tsx` → `MessageOwnerModal.tsx`
- Modify: the renamed file (change "broker" → "owner" in labels)
- Modify: `V2/frontend/src/components/property/PropertySidebar.tsx` (update import + prop)

**Step 1: Copy the file with new name**

```bash
cp G:/AI/Newstart/V2/frontend/src/components/property/MessageBrokerModal.tsx \
   G:/AI/Newstart/V2/frontend/src/components/property/MessageOwnerModal.tsx
rm G:/AI/Newstart/V2/frontend/src/components/property/MessageBrokerModal.tsx
```

**Step 2: Edit MessageOwnerModal.tsx**

In the new file, make these replacements:

1. Interface name: `MessageBrokerModalProps` → `MessageOwnerModalProps`
2. Component name: `export default function MessageBrokerModal` → `export default function MessageOwnerModal`
3. Prop name: `brokerId: string` → `ownerId: string`
4. Title text: `Contact Broker` → `Contact Owner`
5. Success text: `The broker will reply in your Messages inbox.` → `The owner will reply in your Messages inbox.`
6. API call: `other_user_id: brokerId` → `other_user_id: ownerId`

The updated file in full:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, CheckCircle, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";

const QUICK_REPLIES = [
  "Hi, I'm interested in this property",
  "When is a good time to view this property?",
  "What's the best price you can offer?",
  "Is this property still available?",
  "Can you send me more details about this listing?",
];

interface MessageOwnerModalProps {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  propertyTitle: string;
}

export default function MessageOwnerModal({
  open,
  onClose,
  ownerId,
  propertyTitle,
}: MessageOwnerModalProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<string>("");
  const [custom, setCustom] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const messageText = custom.trim() || selected;

  async function handleSend() {
    if (!messageText) return;
    if (!user) {
      router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }

    setSending(true);
    setError("");
    try {
      const convo = await api.post<{ id: string }>("/api/messages/conversations", {
        other_user_id: ownerId,
      });
      await api.post(`/api/messages/conversations/${convo.id}`, {
        content: messageText,
      });
      setSent(true);
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    setSent(false);
    setSelected("");
    setCustom("");
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card-dark border border-white/10 rounded-2xl max-w-md w-full shadow-2xl shadow-black/60 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5">
          <DialogTitle className="flex items-center gap-2 text-white font-bold text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Contact Owner
          </DialogTitle>
          <p className="text-sm text-gray-400 mt-1 line-clamp-1">
            Re: {propertyTitle}
          </p>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Message Sent!</p>
              <p className="text-gray-400 text-sm mt-1">
                The owner will reply in your Messages inbox.
              </p>
            </div>
            <button
              onClick={() => { handleClose(); router.push("/messages"); }}
              className="flex items-center gap-2 text-primary text-sm font-semibold hover:underline mt-2"
            >
              View in Messages <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                Quick Replies
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => { setSelected(reply); setCustom(""); }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      selected === reply && !custom
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-white/5 border-white/10 text-gray-300 hover:border-primary/40 hover:text-white"
                    }`}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                Or write your message
              </p>
              <textarea
                value={custom}
                onChange={(e) => { setCustom(e.target.value); if (e.target.value) setSelected(""); }}
                placeholder="Type your message here..."
                rows={4}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-500 resize-none focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!messageText || sending}
                className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                {sending ? "Sending..." : <><Send className="h-4 w-4" /> Send Message</>}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: Update PropertySidebar.tsx**

In `V2/frontend/src/components/property/PropertySidebar.tsx`:

1. Change import: `import MessageBrokerModal from "@/components/property/MessageBrokerModal"` → `import MessageOwnerModal from "@/components/property/MessageOwnerModal"`
2. Change prop on modal at bottom: `brokerId={property.brokerId}` → `ownerId={property.ownerId}`
3. Change component tag: `<MessageBrokerModal` → `<MessageOwnerModal` and `/>` closing tag reference

**Step 4: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend/src/components/property/
git commit -m "feat(v2): rename MessageBrokerModal to MessageOwnerModal, update PropertySidebar"
```

---

## Task 13: Update app/property/[id]/page.tsx

**Files:**
- Modify: `V2/frontend/src/app/property/[id]/page.tsx`

**Step 1: Write the updated file**

The V2 property page must:
1. Use `owner_id` instead of `broker_id`
2. Map shared housing fields from the listing
3. When `category === 'shared_housing'`, render the shared housing layout

```typescript
import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import PropertyHero from "@/components/property/PropertyHero";
import PropertyInfo from "@/components/property/PropertyInfo";
import PropertySidebar from "@/components/property/PropertySidebar";
import SharedHousingHero from "@/components/shared-housing/SharedHousingHero";
import SharedHousingStats from "@/components/shared-housing/SharedHousingStats";
import AboutHouse from "@/components/shared-housing/AboutHouse";
import HousematesSection from "@/components/shared-housing/HousematesSection";
import SharedAmenities from "@/components/shared-housing/SharedAmenities";
import SharedHousingSidebar from "@/components/shared-housing/SharedHousingSidebar";
import { serverFetch } from "@/lib/queries";
import type { ListingDetailWithSimilar } from "@/types/api";
import type { PropertyDetail, SharedHousingDetail, Housemate, SharedAmenity } from "@/types";

function mapProperty(data: ListingDetailWithSimilar): PropertyDetail {
  const categoryMap: Record<string, PropertyDetail["type"]> = {
    for_rent: "For Rent",
    for_sale: "For Sale",
    shared_housing: "Shared Housing",
  };

  return {
    id: data.id,
    ownerId: data.owner_id,
    title: data.title,
    location: data.location,
    fullAddress: data.full_address ?? data.location,
    price: data.price,
    rating: 4.5,
    reviewCount: 0,
    verified: data.verified,
    isNew: data.is_new,
    available: data.status === "active",
    images: data.images.length
      ? data.images
      : ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200"],
    type: categoryMap[data.category] ?? "For Rent",
    size: data.size_sqm ? `${data.size_sqm} m²` : "N/A",
    bedrooms: data.bedrooms != null ? `${data.bedrooms} Beds` : "N/A",
    bathrooms: data.bathrooms != null ? `${data.bathrooms} Baths` : "N/A",
    description: data.description ? [data.description] : [],
    amenities: (data.amenities ?? []).map((a) => ({ icon: "CheckCircle", label: a })),
    similarProperties: (data.similar_listings ?? []).slice(0, 3).map((s) => ({
      id: s.id,
      title: s.title,
      location: s.location,
      price: s.price,
      image: s.images[0] ?? "",
    })),
    latitude: data.latitude,
    longitude: data.longitude,
    category: data.category,
    totalSpots: data.total_spots ?? undefined,
    filledSpots: data.filled_spots ?? undefined,
    availability: data.availability ?? undefined,
    availableDate: data.available_date ?? undefined,
    furnishing: data.furnishing ?? undefined,
    utilitiesIncluded: data.utilities_included,
    bathroomType: data.bathroom_type ?? undefined,
    privateAmenities: (data.private_amenities ?? []).map((a) => ({ icon: "CheckCircle", label: a })),
    sharedAmenities: (data.shared_amenities ?? []).map((a) => ({ icon: "CheckCircle", label: a })),
    housemates: (data.housemates ?? []).map((h) => ({
      name: h.name,
      age: h.age ?? 0,
      occupation: h.occupation ?? "Professional",
      avatar: h.avatar_url ?? "",
      tags: h.tags,
    })),
  };
}

function mapSharedHousing(property: PropertyDetail): SharedHousingDetail {
  const toAmenity = (a: SharedAmenity) => a;
  return {
    id: property.id,
    brokerId: property.ownerId,
    title: property.title,
    location: property.location,
    image: property.images[0] ?? "",
    images: property.images,
    verified: property.verified,
    price: property.price,
    utilitiesIncluded: property.utilitiesIncluded ?? false,
    availableDate: property.availableDate ?? "Available Now",
    availability: property.availability ?? "available",
    occupancy: `${property.filledSpots ?? 0}/${property.totalSpots ?? 0}`,
    bathroom: property.bathroomType ?? "Private",
    furnishing: property.furnishing ?? "Furnished",
    description: property.description,
    housemates: property.housemates ?? [],
    privateAmenities: (property.privateAmenities ?? []).map(toAmenity),
    sharedAmenities: (property.sharedAmenities ?? []).map(toAmenity),
    similarRooms: [],
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await serverFetch<ListingDetailWithSimilar>(`/api/listings/${id}`);
  if (!data) notFound();

  const property = mapProperty(data);

  // Shared housing layout
  if (property.category === "shared_housing") {
    const housing = mapSharedHousing(property);
    return (
      <div className="max-w-[1600px] mx-auto pb-20">
        <SharedHousingHero housing={housing} />
        <div className="px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="lg:w-[70%] space-y-12">
              <SharedHousingStats housing={housing} />
              <AboutHouse descriptions={housing.description} />
              <HousematesSection housemates={housing.housemates} />
              <SharedAmenities
                privateAmenities={housing.privateAmenities}
                sharedAmenities={housing.sharedAmenities}
              />
            </div>
            <div className="lg:w-[30%]">
              <SharedHousingSidebar housing={housing} />
            </div>
          </div>
        </div>
        <div className="fixed bottom-6 right-6 z-50 lg:hidden">
          <button className="bg-primary text-white w-14 h-14 rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 transition-transform">
            <Calendar className="h-6 w-6" />
          </button>
        </div>
      </div>
    );
  }

  // Regular property layout
  return (
    <>
      <main className="max-w-[1600px] mx-auto pb-20">
        <PropertyHero property={property} />
        <div className="px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex flex-col lg:flex-row gap-12">
            <PropertyInfo property={property} />
            <PropertySidebar property={property} />
          </div>
        </div>
      </main>
      <div className="fixed bottom-6 right-6 z-50 lg:hidden">
        <button className="bg-primary text-white w-14 h-14 rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 transition-transform">
          <Calendar className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}
```

**Step 2: Fix SharedHousingDetail import**

`SharedHousingDetail` in V1 types/index.ts has `brokerId: string`. In V2 we removed `SharedHousingDetail` from types/index.ts. We need to add it back (the shared housing layout components still need it). Add to `V2/frontend/src/types/index.ts` (after the `SimilarRoom` interface):

```typescript
export interface SharedHousingDetail {
  id: string;
  brokerId: string;
  title: string;
  location: string;
  image: string;
  images: string[];
  verified: boolean;
  price: number;
  utilitiesIncluded: boolean;
  availableDate: string;
  availability: string;
  occupancy: string;
  bathroom: string;
  furnishing: string;
  description: string[];
  housemates: Housemate[];
  privateAmenities: SharedAmenity[];
  sharedAmenities: SharedAmenity[];
  similarRooms: SimilarRoom[];
}
```

**Step 3: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend/src/app/property/
git add V2/frontend/src/types/index.ts
git commit -m "feat(v2): property page handles shared housing, uses owner_id"
```

---

## Task 14: Add Shared Housing Redirect

**Files:**
- Create: `V2/frontend/src/app/shared-housing/[id]/page.tsx`

Since we deleted the shared-housing page in Task 9, but the nav still links to `/shared-housing` (the list page, not detail), and direct links to `/shared-housing/[id]` may exist — add a server-side redirect:

```bash
mkdir -p G:/AI/Newstart/V2/frontend/src/app/shared-housing/\[id\]
```

```typescript
// V2/frontend/src/app/shared-housing/[id]/page.tsx
import { redirect } from "next/navigation";

export default async function SharedHousingRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/property/${id}`);
}
```

**Step 2: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend/src/app/shared-housing/
git commit -m "feat(v2): redirect /shared-housing/[id] to /property/[id]"
```

---

## Task 15: Update lib/constants.ts

**Files:**
- Modify: `V2/frontend/src/lib/constants.ts`

**Step 1: Remove imports of removed types**

In `V2/frontend/src/lib/constants.ts`, remove these from the import:
- `BrokerProfile`
- `AnalyticsStat`
- `DashboardMessage`
- `BrokerListing`
- `UserProfile`
- `LikedProperty`
- `UserTransaction`

(These types no longer exist in types/index.ts with those exact shapes.)

Also update `NAV_ITEMS` — the "Shared Housing" nav link should stay as `/find-homes?category=shared_housing` or keep as a filtered find-homes page. Change to:

```typescript
export const NAV_ITEMS: NavItem[] = [
  { label: "Find Homes", href: "/find-homes" },
  { label: "Shared Housing", href: "/find-homes?category=shared_housing" },
  { label: "Agencies", href: "/agencies" },
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
];
```

**Step 2: Remove all broker/seeker mock data objects** from the constants file. Keep: `NAV_ITEMS`, `FEATURES`, `LISTINGS`, `NEIGHBORHOODS`, `TESTIMONIALS`, footer links, `HOW_IT_WORKS`, `LISTING_AMENITIES`, `AREAS`, and any other data that has no broker/seeker reference.

Delete any variables that are typed with the now-removed types (`BrokerProfile`, `BrokerListing`, `UserTransaction`, `UserProfile`, `AnalyticsStat`, `DashboardMessage`).

**Step 3: Run TypeScript check**

```bash
cd G:/AI/Newstart/V2/frontend
npx tsc --noEmit 2>&1 | head -50
```

Fix any type errors that appear.

**Step 4: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend/src/lib/constants.ts
git commit -m "feat(v2): update constants — remove broker types, update shared housing nav"
```

---

## Task 16: Fix Remaining TypeScript Errors

**Files:**
- Various (run tsc to find them)

**Step 1: Run full TypeScript check**

```bash
cd G:/AI/Newstart/V2/frontend
npx tsc --noEmit 2>&1
```

**Step 2: Fix errors systematically**

Common errors to expect and fixes:

**Error: `property.brokerId` does not exist**
→ In any component still using `brokerId`, change to `ownerId`. Check:
- `components/shared-housing/SharedHousingSidebar.tsx` — uses `housing.brokerId` as the owner ID for messaging. Change to `housing.brokerId` (it's already mapped this way in the `mapSharedHousing` function — the SharedHousingDetail type still has `brokerId` for compatibility with the sidebar component).

**Error: `role === "broker"` comparison**
→ Remove any remaining role checks. In any component checking `user?.role === "broker"`, replace with `user?.is_verified_seller` where the check was for display purposes, or remove entirely.

**Error: `UserTransaction` not found**
→ The TransactionHistory component in user-dashboard was deleted. If any remaining page imports it, remove those imports.

**Error: `BrokerProfile` / `BrokerListing` not found in constants.ts**
→ Delete those mock data exports from constants.ts.

**Step 3: Re-run tsc until zero errors**

```bash
cd G:/AI/Newstart/V2/frontend
npx tsc --noEmit
```
Expected: no output (zero errors)

**Step 4: Commit**

```bash
cd G:/AI/Newstart
git add V2/frontend/src/
git commit -m "fix(v2): resolve TypeScript errors after role model migration"
```

---

## Task 17: Dev Server Smoke Test

**Step 1: Install dependencies**

```bash
cd G:/AI/Newstart/V2/frontend
npm install
```

**Step 2: Start dev server**

```bash
cd G:/AI/Newstart/V2/frontend
npm run dev
```

Expected: `ready started server on 0.0.0.0:3000`

**Step 3: Check these routes load without error**

| URL | Expected |
|-----|----------|
| `http://localhost:3000/` | Home page loads |
| `http://localhost:3000/signup` | Signup form without role selector |
| `http://localhost:3000/login` | Login form |
| `http://localhost:3000/find-homes` | Find homes page |
| `http://localhost:3000/find-homes?category=shared_housing` | Filtered to shared housing |
| `http://localhost:3000/dashboard` | Redirects to `/login` if not authenticated |
| `http://localhost:3000/messages` | Redirects to `/login` if not authenticated |
| `http://localhost:3000/agencies` | Agencies listing |
| `http://localhost:3000/blog` | Blog listing |

**Step 4: Commit final state**

```bash
cd G:/AI/Newstart
git add V2/frontend/
git commit -m "feat(v2): V2 frontend complete — single role, unified dashboard, /property/[id] for all listings"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `middleware.ts` | Redirect to `/dashboard` not `/dashboard/user` |
| `types/index.ts` | `UserRole`: seeker/broker → user/admin; `AuthUser`: add `is_verified_seller`; remove broker types; add dashboard types |
| `types/api.ts` | `ListingDetail`: `owner_id`, `category`, shared housing fields; unified `DashboardResponse`; remove broker/shared-housing types |
| `lib/queries.ts` | `dashboardQueries.me()` instead of broker/user; remove `sharedHousingQueries`; add `category` filter |
| `stores/authStore.ts` | Remove `role` from signup payload |
| `components/auth/SignUpForm.tsx` | Remove role selector; redirect to `/dashboard` |
| `components/layout/Navbar.tsx` | Dashboard href = `/dashboard` |
| `app/dashboard/broker/` | DELETED |
| `app/dashboard/user/` | DELETED |
| `app/shared-housing/[id]/` | DELETED then recreated as redirect to `/property/[id]` |
| `components/broker-dashboard/` | DELETED |
| `components/user-dashboard/` | DELETED |
| `components/dashboard/` | NEW — 7 components for unified dashboard |
| `app/dashboard/page.tsx` | NEW — unified dashboard page |
| `components/property/MessageOwnerModal.tsx` | RENAMED from MessageBrokerModal, "owner" labels |
| `components/property/PropertySidebar.tsx` | Use `MessageOwnerModal`, `property.ownerId` |
| `app/property/[id]/page.tsx` | Use `owner_id`; handle `category=shared_housing` inline |
| `lib/constants.ts` | Update nav, remove broker mock data |
