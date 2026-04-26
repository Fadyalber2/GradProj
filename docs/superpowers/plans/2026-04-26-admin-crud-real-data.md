# Admin CRUD Overhaul + Real Supabase Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock-data fallbacks on public pages with direct Supabase queries, and overhaul the admin panel with a pending-approvals queue, rich-text blog editor, autocomplete ID pickers, form validation, and safer deletes.

**Architecture:** A new `supabase-queries.ts` file holds all direct Supabase async functions — server components await them, client components wrap them in `useQuery`. Admin improvements are self-contained components inside the existing admin dashboard file. No new pages are added.

**Tech Stack:** Next.js 16 App Router, Supabase JS v2, TanStack Query v5, Tiptap v2, TypeScript strict, Tailwind CSS, FastAPI (backend — one bug fix only)

---

## File Map

| Action | File |
|--------|------|
| Create | `frontend/src/lib/supabase-queries.ts` |
| Create | `frontend/src/components/admin/EntityPicker.tsx` |
| Create | `frontend/src/components/admin/RichTextEditor.tsx` |
| Modify | `frontend/src/app/find-homes/page.tsx` |
| Modify | `frontend/src/app/agencies/page.tsx` |
| Modify | `frontend/src/app/agencies/[slug]/page.tsx` |
| Modify | `frontend/src/app/property/[id]/page.tsx` |
| Modify | `frontend/src/app/project/[id]/page.tsx` |
| Modify | `frontend/src/app/blog/page.tsx` |
| Modify | `frontend/src/app/blog/[slug]/page.tsx` |
| Modify | `frontend/src/app/dashboard/page.tsx` |
| Modify | `frontend/src/app/admin/dashboard/page.tsx` |
| Modify | `frontend/src/components/admin/AdminSidebar.tsx` |
| Modify | `backend/app/admin/router.py` |

---

## Task 1 — Install Tiptap

**Files:**
- Modify: `frontend/package.json` (via npm install)

- [ ] **Step 1: Install packages**

```bash
cd frontend
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify install**

```bash
node -e "require('@tiptap/react'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
cd frontend
git add package.json package-lock.json
git commit -m "chore: install tiptap rich text editor packages"
```

---

## Task 2 — Create `supabase-queries.ts`

**Files:**
- Create: `frontend/src/lib/supabase-queries.ts`

This file contains all direct Supabase query functions. Both server components (async/await) and client components (TanStack Query) use these functions.

- [ ] **Step 1: Create the file**

```typescript
// frontend/src/lib/supabase-queries.ts
import { supabase } from "@/lib/supabase";
import type {
  ListingBrief,
  ListingDetailWithSimilar,
  AgencyBrief,
  ApiAgencyDetail,
  ProjectBrief,
  ApiProjectDetail,
  BlogPostBrief,
  BlogPostDetail,
  ApiDashboardListing,
} from "@/types/api";

// ── Listings ──────────────────────────────────────────────────────────────────

export interface ListingFilters {
  category?: string;
  property_type?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  search?: string;
  sort_by?: string;
  page?: number;
  per_page?: number;
}

export async function getListings(filters?: ListingFilters) {
  const page = filters?.page ?? 1;
  const perPage = filters?.per_page ?? 12;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("listings")
    .select(
      "id, title, location, price, currency, price_period, category, property_type, images, verified, status, bedrooms, bathrooms, size_sqm, floor_number, neighborhood, compound_name, views_count, is_new, created_at",
      { count: "exact" }
    )
    .is("deleted_at", null)
    .eq("status", "active");

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.property_type) query = query.eq("property_type", filters.property_type);
  if (filters?.min_price) query = query.gte("price", filters.min_price);
  if (filters?.max_price) query = query.lte("price", filters.max_price);
  if (filters?.bedrooms) query = query.eq("bedrooms", filters.bedrooms);
  if (filters?.search)
    query = query.or(`title.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);

  const sortMap: Record<string, { col: string; asc: boolean }> = {
    newest:       { col: "created_at", asc: false },
    price_asc:    { col: "price",      asc: true  },
    price_desc:   { col: "price",      asc: false },
    most_viewed:  { col: "views_count",asc: false },
  };
  const sort = sortMap[filters?.sort_by ?? "newest"] ?? sortMap.newest;
  query = query.order(sort.col, { ascending: sort.asc });

  const { data, error, count } = await query.range(from, to);
  const listings = (data ?? []) as ListingBrief[];
  return { listings, total: count ?? 0, page, per_page: perPage, error };
}

export async function getListing(id: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("*, profiles!listings_owner_id_fkey(full_name, avatar_url, phone)")
    .eq("id", id)
    .single();

  if (error || !data) return { data: null, error };

  // Attach empty similar_listings (Supabase doesn't compute these — keep shape compatible)
  const listing = { ...data, similar_listings: [] } as unknown as ListingDetailWithSimilar;
  return { data: listing, error: null };
}

// ── Agencies ──────────────────────────────────────────────────────────────────

export async function getAgencies(search?: string) {
  let query = supabase
    .from("agencies")
    .select("id, slug, name, subtitle, logo_url, is_verified", { count: "exact" })
    .order("name", { ascending: true });

  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  const agencies: AgencyBrief[] = (data ?? []).map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    subtitle: a.subtitle ?? null,
    logo_url: a.logo_url ?? null,
    verified: a.is_verified ?? false,
    active_projects: 0,
    listings_count: 0,
  }));
  return { agencies, error };
}

export async function getAgency(slug: string) {
  const { data: agency, error } = await supabase
    .from("agencies")
    .select("id, slug, name, subtitle, description, logo_url, banner_url, is_verified, created_at, phone, email, address, website")
    .eq("slug", slug)
    .single();

  if (error || !agency) return { agency: null, projects: [], listings: [], error };

  const [projectsRes, listingsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, agency_id, title, subtitle, image_url, completion_pct, starting_price, status")
      .eq("agency_id", agency.id)
      .limit(6),
    supabase
      .from("listings")
      .select("id, title, location, price, price_period, images, bedrooms, size_sqm, status")
      .eq("agency_id", agency.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(6),
  ]);

  const apiAgency: ApiAgencyDetail = {
    id: agency.id,
    slug: agency.slug,
    name: agency.name,
    subtitle: agency.subtitle ?? null,
    description: agency.description ?? null,
    logo_url: agency.logo_url ?? null,
    banner_url: agency.banner_url ?? null,
    verified: agency.is_verified ?? false,
    active_projects: projectsRes.data?.length ?? 0,
    listings_count: listingsRes.data?.length ?? 0,
    trust_score: 95,
    followers_count: 0,
    created_at: agency.created_at ?? null,
  };

  const projects: ProjectBrief[] = (projectsRes.data ?? []).map((p) => ({
    id: p.id,
    agency_id: p.agency_id,
    title: p.title,
    subtitle: p.subtitle ?? null,
    image_url: p.image_url ?? null,
    completion_pct: p.completion_pct ?? 0,
    starting_price: p.starting_price ? Number(p.starting_price) : null,
    status: p.status ?? "planned",
  }));

  return { agency: apiAgency, projects, listings: listingsRes.data ?? [], error: null };
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProject(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*, agencies!projects_agency_id_fkey(name, slug, logo_url, is_verified)")
    .eq("id", id)
    .single();

  if (error || !data) return { data: null, error };

  const agency = (data as Record<string, unknown>).agencies as Record<string, unknown> | null ?? {};
  const project: ApiProjectDetail = {
    id: data.id as string,
    agency_id: data.agency_id as string,
    title: (data as Record<string, unknown>).title as string,
    subtitle: ((data as Record<string, unknown>).description as string | null ?? "").slice(0, 100) || null,
    image_url: (data as Record<string, unknown>).image_url as string | null ?? null,
    completion_pct: (data as Record<string, unknown>).completion_pct as number ?? 0,
    starting_price: (data as Record<string, unknown>).starting_price != null
      ? Number((data as Record<string, unknown>).starting_price)
      : null,
    status: (data as Record<string, unknown>).status as string ?? "planned",
    key_features: ((data as Record<string, unknown>).key_features as string[] | null) ?? [],
    description: (data as Record<string, unknown>).description as string | null ?? null,
    units_total: (data as Record<string, unknown>).units_total as number | null ?? null,
    created_at: (data as Record<string, unknown>).created_at as string | null ?? null,
    agency_name: (agency.name as string | null) ?? null,
    agency_slug: (agency.slug as string | null) ?? null,
    agency_logo: (agency.logo_url as string | null) ?? null,
    agency_verified: Boolean(agency.is_verified),
  };
  return { data: project, error: null };
}

// ── Blog ──────────────────────────────────────────────────────────────────────

export interface BlogFilters {
  category?: string;
  page?: number;
  per_page?: number;
}

export async function getBlogPosts(filters?: BlogFilters) {
  const page = filters?.page ?? 1;
  const perPage = filters?.per_page ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("blog_posts")
    .select(
      "id, slug, title, subtitle, cover_image, category, tags, created_at, is_published",
      { count: "exact" }
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);

  const { data, error, count } = await query.range(from, to);
  const posts: BlogPostBrief[] = (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle ?? null,
    image_url: p.cover_image ?? null,
    category: p.category ?? null,
    author_name: null,
    author_avatar: null,
    read_time: null,
    published_at: p.created_at ?? null,
  }));
  return { posts, total: count ?? 0, page, per_page: perPage, error };
}

export async function getBlogPost(slug: string) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, profiles!blog_posts_author_id_fkey(full_name, avatar_url)")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !data) return { data: null, error };

  const author = (data as Record<string, unknown>).profiles as Record<string, unknown> | null ?? {};
  const post: BlogPostDetail = {
    id: data.id as string,
    slug: data.slug as string,
    title: data.title as string,
    subtitle: (data as Record<string, unknown>).subtitle as string | null ?? null,
    image_url: (data as Record<string, unknown>).cover_image as string | null ?? null,
    category: (data as Record<string, unknown>).category as string | null ?? null,
    author_name: (author.full_name as string | null) ?? null,
    author_avatar: (author.avatar_url as string | null) ?? null,
    author_role: null,
    read_time: null,
    published_at: (data as Record<string, unknown>).created_at as string | null ?? null,
    lead: null,
    content: ((data as Record<string, unknown>).content as unknown[]) ?? [],
    tags: ((data as Record<string, unknown>).tags as string[]) ?? [],
    created_at: (data as Record<string, unknown>).created_at as string | null ?? null,
  };
  return { data: post, error: null };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getDashboardListings(userId: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("id, title, location, full_address, category, price, images, status, views_count, created_at")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .neq("status", "rejected")
    .order("created_at", { ascending: false });

  const listings: ApiDashboardListing[] = (data ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    location: l.location,
    full_address: l.full_address ?? null,
    category: l.category ?? null,
    price: l.price,
    status: l.status,
    views_count: l.views_count ?? 0,
    images: l.images ?? [],
    created_at: l.created_at ?? null,
  }));

  const active = listings.filter((l) => l.status === "active").length;
  const pending = listings.filter((l) => l.status === "pending").length;

  return { listings, active, pending, error };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors from `supabase-queries.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/supabase-queries.ts
git commit -m "feat: add supabase-queries.ts with direct Supabase query functions"
```

---

## Task 3 — Wire find-homes to Supabase direct

**Files:**
- Modify: `frontend/src/app/find-homes/page.tsx`

- [ ] **Step 1: Replace the query import and hook at the top of FindHomesPage**

Find this block in `find-homes/page.tsx` (around line 11-14):
```typescript
import { listingsQueries } from "@/lib/queries";
import { api } from "@/lib/api";
import type { Listing } from "@/types";
import type { ListingBrief } from "@/types/api";
```
Replace with:
```typescript
import { getListings } from "@/lib/supabase-queries";
import { api } from "@/lib/api";
import type { Listing } from "@/types";
import type { ListingBrief } from "@/types/api";
```

- [ ] **Step 2: Replace the useQuery call (around line 116-119)**

Find:
```typescript
  const { data, isLoading, isError } = useQuery({
    ...listingsQueries.list({ sort_by: sortBy, page: currentPage, per_page: 12 }),
    enabled: !aiMode,
  });
```
Replace with:
```typescript
  const { data, isLoading, isError } = useQuery({
    queryKey: ["listings", { sort_by: sortBy, page: currentPage }],
    queryFn: () => getListings({ sort_by: sortBy, page: currentPage, per_page: 12 }),
    enabled: !aiMode,
  });
```

- [ ] **Step 3: Update the listings + totalPages derivation (around line 121-122)**

Find:
```typescript
  const listings = (data?.listings ?? []).map(mapToListing);
  const totalPages = data ? Math.ceil(data.total / data.per_page) : 1;
```
This line stays the same — `getListings` returns the same shape (`{ listings, total, per_page }`).

- [ ] **Step 4: Run the dev server and test**

```bash
cd frontend
npm run dev
```
Open `http://localhost:3000/find-homes`. Confirm listings load from Supabase (or show empty state if DB is empty). No console errors about mock data.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/find-homes/page.tsx
git commit -m "feat(find-homes): switch listings query to Supabase direct"
```

---

## Task 4 — Wire agencies list — remove MOCK_AGENCIES fallback

**Files:**
- Modify: `frontend/src/app/agencies/page.tsx`

- [ ] **Step 1: Replace the file contents**

```typescript
// frontend/src/app/agencies/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import AgenciesHero from "@/components/agencies/AgenciesHero";
import DevelopersSection from "@/components/agencies/DevelopersSection";
import UniversitiesSection from "@/components/agencies/UniversitiesSection";
import { getAgencies } from "@/lib/supabase-queries";

export default function AgenciesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => getAgencies(),
  });

  return (
    <>
      <AgenciesHero />
      <DevelopersSection agencies={data?.agencies ?? []} isLoading={isLoading} />
      <UniversitiesSection />
    </>
  );
}
```

- [ ] **Step 2: Verify no MOCK_AGENCIES import remains**

```bash
grep -n "MOCK_AGENCIES" frontend/src/app/agencies/page.tsx
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/agencies/page.tsx
git commit -m "feat(agencies): remove MOCK_AGENCIES fallback, use Supabase direct"
```

---

## Task 5 — Wire agencies/[slug] — remove MOCK_AGENCY_DETAILS fallback

**Files:**
- Modify: `frontend/src/app/agencies/[slug]/page.tsx`

- [ ] **Step 1: Replace the top of the file (imports + mappers)**

Replace from line 1 to the `generateMetadata` function (everything up to `export async function generateMetadata`):

```typescript
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AgencyHero from "@/components/agency-details/AgencyHero";
import AgencySidebar from "@/components/agency-details/AgencySidebar";
import FeaturedProjects from "@/components/agency-details/FeaturedProjects";
import TopListings from "@/components/agency-details/TopListings";
import { getAgency } from "@/lib/supabase-queries";
import type { ProjectBrief } from "@/types/api";
import type { AgencyDetail, AgencyProject } from "@/types";

function mapProject(p: ProjectBrief): AgencyProject {
  const statusColor =
    p.status === "completed" ? "text-green-400" : "text-yellow-400";
  return {
    id: p.id,
    title: p.title,
    location: "Egypt",
    image: p.image_url ?? "",
    price: p.starting_price
      ? `EGP ${p.starting_price.toLocaleString()}`
      : "Contact for price",
    priceLabel: "Starting from",
    beds: "Various",
    area: "N/A",
    status: p.status,
    statusColor,
    progressPercent: p.completion_pct,
    progressColor: "bg-primary",
    progressLabel: `${p.completion_pct}% Complete`,
    completionLabel: `${p.completion_pct}%`,
    cta: "Learn More",
  };
}
```

- [ ] **Step 2: Replace `generateMetadata`**

```typescript
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { agency } = await getAgency(slug);
  if (!agency) return { title: "Agency — Axiom" };
  return {
    title: `${agency.name} — Axiom`,
    description: agency.description ?? `Explore properties from ${agency.name} on Axiom.`,
  };
}
```

- [ ] **Step 3: Replace `AgencyDetailPage`**

```typescript
export default async function AgencyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { agency, projects, listings } = await getAgency(slug);

  if (!agency) notFound();

  const detail: AgencyDetail = {
    slug: agency.slug,
    name: agency.name,
    logoText: agency.name.slice(0, 2).toUpperCase(),
    badge: agency.verified ? "Verified Developer" : "Developer",
    location: "Cairo, Egypt",
    bannerImage: agency.banner_url ?? "",
    description: agency.description ?? "",
    trustScore: `${agency.trust_score}`,
    projectsForSale: `${agency.active_projects}`,
    developmentHistory: agency.created_at
      ? `${new Date().getFullYear() - new Date(agency.created_at).getFullYear()} Years`
      : "N/A",
    awards: [],
    featuredProjects: projects.slice(0, 3).map(mapProject),
    topListings: listings.slice(0, 3).map((l) => {
      const listing = l as Record<string, unknown>;
      const images = (listing.images as string[] | null) ?? [];
      return {
        id: listing.id as string,
        title: listing.title as string,
        location: listing.location as string,
        image: images[0] ?? "",
        price: `EGP ${(listing.price as number).toLocaleString()}`,
        priceLabel: `/${listing.price_period as string ?? "mo"}`,
        beds: listing.bedrooms != null ? `${listing.bedrooms}` : "N/A",
        area: listing.size_sqm ? `${listing.size_sqm} m²` : "N/A",
        status: listing.status as string,
        statusColor: "text-green-400",
        progressPercent: 100,
        progressColor: "bg-primary",
        progressLabel: "Active",
        completionLabel: "Active",
        cta: "View Listing",
      };
    }),
    totalListings: listings.length,
    totalCities: 1,
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-20">
      <AgencyHero agency={detail} />
      <div className="px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-[30%]">
            <AgencySidebar agency={detail} />
          </div>
          <div className="lg:w-[70%] space-y-12">
            <FeaturedProjects projects={detail.featuredProjects} />
            <TopListings
              listings={detail.topListings}
              totalListings={detail.totalListings}
              totalCities={detail.totalCities}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify no MOCK_AGENCY_DETAILS import remains**

```bash
grep -n "MOCK_AGENCY" frontend/src/app/agencies/\\[slug\\]/page.tsx
```
Expected: no output.

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "agencies"
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "frontend/src/app/agencies/[slug]/page.tsx"
git commit -m "feat(agencies/slug): remove MOCK_AGENCY_DETAILS fallback, use Supabase direct"
```

---

## Task 6 — Wire property/[id] to Supabase direct

**Files:**
- Modify: `frontend/src/app/property/[id]/page.tsx`

- [ ] **Step 1: Replace the serverFetch import with getListing**

Find at the top of the file:
```typescript
import { serverFetch } from "@/lib/queries";
import type { ListingDetailWithSimilar } from "@/types/api";
```
Replace with:
```typescript
import { getListing } from "@/lib/supabase-queries";
import type { ListingDetailWithSimilar } from "@/types/api";
```

- [ ] **Step 2: Find the page's data-fetching call and replace it**

The page will have something like:
```typescript
const data = await serverFetch<ListingDetailWithSimilar>(`/api/listings/${id}`);
if (!data) notFound();
```

Replace with:
```typescript
const { data } = await getListing(id);
if (!data) notFound();
```

- [ ] **Step 3: Find and fix generateMetadata if it uses serverFetch**

If `generateMetadata` has `serverFetch<ListingDetailWithSimilar>(\`/api/listings/${id}\`)`, replace it with:
```typescript
  const { data } = await getListing(id).catch(() => ({ data: null }));
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "property"
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/property/[id]/page.tsx"
git commit -m "feat(property): switch to Supabase direct getListing"
```

---

## Task 7 — Wire project/[id] to Supabase direct

**Files:**
- Modify: `frontend/src/app/project/[id]/page.tsx`

- [ ] **Step 1: Replace serverFetch import**

Find:
```typescript
import { serverFetch } from "@/lib/queries";
import type { ApiProjectDetail } from "@/types/api";
```
Replace with:
```typescript
import { getProject } from "@/lib/supabase-queries";
import type { ApiProjectDetail } from "@/types/api";
```

- [ ] **Step 2: Replace the data-fetching call**

Find any call like:
```typescript
const data = await serverFetch<ApiProjectDetail>(`/api/projects/${id}`);
if (!data) notFound();
```
Replace with:
```typescript
const { data } = await getProject(id);
if (!data) notFound();
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "project"
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/project/[id]/page.tsx"
git commit -m "feat(project): switch to Supabase direct getProject"
```

---

## Task 8 — Wire blog list to Supabase direct

**Files:**
- Modify: `frontend/src/app/blog/page.tsx`

- [ ] **Step 1: Replace the file contents**

```typescript
// frontend/src/app/blog/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import BlogHero from "@/components/blog/BlogHero";
import BlogGrid from "@/components/blog/BlogGrid";
import BlogSidebar from "@/components/blog/BlogSidebar";
import { getBlogPosts } from "@/lib/supabase-queries";

export default function BlogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["blog"],
    queryFn: () => getBlogPosts({ per_page: 20 }),
  });

  return (
    <>
      <BlogHero />
      <section className="py-12 bg-background-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="lg:w-3/4">
              <BlogGrid posts={data?.posts ?? []} isLoading={isLoading} />
            </div>
            <div className="lg:w-1/4">
              <BlogSidebar />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/blog/page.tsx
git commit -m "feat(blog): switch to Supabase direct getBlogPosts"
```

---

## Task 9 — Wire blog/[slug] to Supabase direct

**Files:**
- Modify: `frontend/src/app/blog/[slug]/page.tsx`

- [ ] **Step 1: Replace serverFetch import**

Find:
```typescript
import { serverFetch } from "@/lib/queries";
import type { BlogPostDetail, BlogPostBrief } from "@/types/api";
```
Replace with:
```typescript
import { getBlogPost } from "@/lib/supabase-queries";
import type { BlogPostDetail } from "@/types/api";
```

- [ ] **Step 2: Replace the data-fetching calls**

Find:
```typescript
const post = await serverFetch<BlogPostDetail>(`/api/blog/${slug}`);
if (!post) notFound();
```
Replace with:
```typescript
const { data: post } = await getBlogPost(slug);
if (!post) notFound();
```

Remove any related/sidebar calls that use `serverFetch` — replace their data with empty arrays:
```typescript
const related: RelatedArticle[] = [];
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "blog"
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/blog/[slug]/page.tsx"
git commit -m "feat(blog/slug): switch to Supabase direct getBlogPost"
```

---

## Task 10 — Wire dashboard to Supabase direct

**Files:**
- Modify: `frontend/src/app/dashboard/page.tsx`

The dashboard currently calls `/api/dashboard/me` via the FastAPI backend. We switch to querying listings directly from Supabase using the logged-in user's ID from the auth store.

- [ ] **Step 1: Add the getDashboardListings import**

Find at the top of the file:
```typescript
import { dashboardQueries } from "@/lib/queries";
```
Replace with:
```typescript
import { getDashboardListings } from "@/lib/supabase-queries";
```

- [ ] **Step 2: Replace the useQuery call**

Find the section (around line 140+) that has:
```typescript
export default function DashboardPage() {
```
Inside the component, find:
```typescript
  const { data, isLoading } = useQuery({
    ...dashboardQueries.me(),
  });
```
Replace with:
```typescript
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: () => getDashboardListings(user?.id ?? ""),
    enabled: !!user?.id,
  });
```

- [ ] **Step 3: Update the data destructuring below the query**

The current code likely does `data?.listings`, `data?.analytics` etc. Since `getDashboardListings` returns `{ listings, active, pending }`, update these references:

Find any reference to `data?.profile` and replace it with the `user` from authStore (already imported as `useAuthStore`).

Find `data?.listings` — keep as is (same key name).

Find `data?.analytics` or `data?.analytics_stats` — replace with a static set:
```typescript
  const analyticsStats: AnalyticsStat[] = [
    {
      label: "Active Listings",
      value: String(data?.active ?? 0),
      icon: "TrendingUp",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      bars: [30, 50, 40, 70, 60, 80, 65],
      barColor: "bg-primary",
      trendPercent: "0%",
      trendUp: true,
    },
    {
      label: "Pending Review",
      value: String(data?.pending ?? 0),
      icon: "Clock",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      bars: [20, 30, 25, 40, 35, 50, 45],
      barColor: "bg-amber-500",
      trendPercent: "0%",
      trendUp: false,
    },
  ];
```

Find `data?.liked_properties` — replace with `[]`.
Find `data?.recent_messages` — replace with `[]`.
Find `data?.upcoming_viewings` — replace with `[]`.

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "dashboard"
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/dashboard/page.tsx
git commit -m "feat(dashboard): switch to Supabase direct getDashboardListings"
```

---

## Task 11 — Create EntityPicker component

**Files:**
- Create: `frontend/src/components/admin/EntityPicker.tsx`

- [ ] **Step 1: Create the component**

```typescript
// frontend/src/components/admin/EntityPicker.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { listItems } from "@/lib/admin/api";

interface EntityPickerProps {
  value: string;
  onChange: (id: string, label: string) => void;
  section: "users" | "agencies";
  placeholder?: string;
  displayValue?: string;
}

interface Option {
  id: string;
  label: string;
}

function getLabel(item: Record<string, unknown>, section: string): string {
  if (section === "users") {
    return `${item.full_name ?? item.email ?? item.id}`;
  }
  return `${item.name ?? item.id}`;
}

export default function EntityPicker({
  value,
  onChange,
  section,
  placeholder = "Search…",
  displayValue,
}: EntityPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(displayValue ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await listItems<Record<string, unknown>>(section, {
          search,
          per_page: 8,
        });
        setOptions(
          res.data.map((item) => ({
            id: String(item.id),
            label: getLabel(item, section),
          }))
        );
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [search, open, section]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function select(opt: Option) {
    onChange(opt.id, opt.label);
    setSelectedLabel(opt.label);
    setOpen(false);
    setSearch("");
  }

  function clear() {
    onChange("", "");
    setSelectedLabel("");
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm cursor-pointer hover:border-blue-400 transition focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
        onClick={() => setOpen((v) => !v)}
      >
        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span className={`flex-1 truncate ${selectedLabel ? "text-slate-800" : "text-slate-400"}`}>
          {selectedLabel || placeholder}
        </span>
        {selectedLabel ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </div>

      {value && (
        <p className="text-xs text-slate-400 mt-1 font-mono truncate">ID: {value}</p>
      )}

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${section}…`}
              className="w-full px-3 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-52 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">Searching…</div>
            ) : options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">No results</div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => select(opt)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition text-left"
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs text-slate-400 font-mono ml-2 flex-shrink-0">
                    {opt.id.slice(0, 8)}…
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "EntityPicker"
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/EntityPicker.tsx
git commit -m "feat(admin): add EntityPicker autocomplete component for ID fields"
```

---

## Task 12 — Create RichTextEditor component

**Files:**
- Create: `frontend/src/components/admin/RichTextEditor.tsx`

- [ ] **Step 1: Create the component**

```typescript
// frontend/src/components/admin/RichTextEditor.tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Minus } from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? "bg-blue-100 text-blue-700"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[160px] px-3 py-2.5 text-sm text-slate-800 focus:outline-none prose prose-sm max-w-none",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50 flex-wrap">
        <ToolbarButton
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ToolbarButton
          title="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <ToolbarButton
          title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        >
          <Quote className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "RichTextEditor"
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/RichTextEditor.tsx
git commit -m "feat(admin): add RichTextEditor component with Tiptap"
```

---

## Task 13 — Admin: wire EntityPicker + RichTextEditor into EntityForm

**Files:**
- Modify: `frontend/src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Add imports at the top of the file**

After the existing imports, add:
```typescript
import EntityPicker from "@/components/admin/EntityPicker";
import RichTextEditor from "@/components/admin/RichTextEditor";
```

- [ ] **Step 2: Add `type` option `"picker"` and `"richtext"` to FieldDef**

Find:
```typescript
type FieldDef = { key: string; label: string; type?: string; options?: string[] };
```
Replace with:
```typescript
type FieldDef = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  pickerSection?: "users" | "agencies";
  required?: boolean;
};
```

- [ ] **Step 3: Update `EntityForm` to render pickers and rich text**

Inside `EntityForm`, find the block that renders fields:
```typescript
      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            {field.label}
          </label>
          {field.type === "textarea" ? (
```

Replace the entire `{fields.map(...)}` block with:
```typescript
      {fields.map((field) => {
        const fieldError = errors[field.key];
        return (
          <div key={field.key}>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {field.type === "richtext" ? (
              <RichTextEditor
                value={String(form[field.key] ?? "")}
                onChange={(html) => set(field.key, html)}
              />
            ) : field.type === "picker" && field.pickerSection ? (
              <EntityPicker
                value={String(form[field.key] ?? "")}
                onChange={(id) => set(field.key, id)}
                section={field.pickerSection}
                placeholder={`Search ${field.pickerSection}…`}
                displayValue={String(form[`${field.key}_label`] ?? "")}
              />
            ) : field.type === "textarea" ? (
              <textarea
                value={String(form[field.key] ?? "")}
                onChange={(e) => set(field.key, e.target.value)}
                rows={3}
                className={`w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition placeholder:text-slate-400 ${fieldError ? "border-red-400" : "border-slate-200"}`}
              />
            ) : field.type === "select" ? (
              <select
                value={String(form[field.key] ?? "")}
                onChange={(e) => set(field.key, e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${fieldError ? "border-red-400" : "border-slate-200"}`}
              >
                <option value="">— Select —</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type ?? "text"}
                value={String(form[field.key] ?? "")}
                onChange={(e) => set(field.key, e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-slate-400 ${fieldError ? "border-red-400" : "border-slate-200"}`}
              />
            )}
            {fieldError && (
              <p className="text-xs text-red-500 mt-1">{fieldError}</p>
            )}
          </div>
        );
      })}
```

- [ ] **Step 4: Add `errors` state and validation to `EntityForm`**

Inside `EntityForm`, after `const [form, setForm] = useState(...)`:
```typescript
  const [errors, setErrors] = useState<Record<string, string>>({});
```

Replace `handleSubmit`:
```typescript
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Validate required fields
    const newErrors: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.required) {
        const v = form[f.key];
        if (v === undefined || v === null || String(v).trim() === "") {
          newErrors[f.key] = `${f.label} is required`;
        }
      }
      if (f.type === "number" && form[f.key] !== undefined && form[f.key] !== "") {
        if (isNaN(Number(form[f.key]))) {
          newErrors[f.key] = `${f.label} must be a number`;
        }
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v === "true") clean[k] = true;
      else if (v === "false") clean[k] = false;
      else clean[k] = v;
    }
    onSave(clean);
  }
```

- [ ] **Step 5: Update SECTIONS to use picker and richtext types**

In the `SECTIONS` config, find `listings.createFields` and change:
```typescript
      { key: "owner_id", label: "Owner ID" },
```
to:
```typescript
      { key: "owner_id", label: "Owner", type: "picker", pickerSection: "users", required: true },
```

Find `projects.createFields` and change:
```typescript
      { key: "agency_id", label: "Agency ID" },
```
to:
```typescript
      { key: "agency_id", label: "Agency", type: "picker", pickerSection: "agencies", required: true },
```

Find `blog.editFields` and change the content field:
```typescript
      { key: "content", label: "Content", type: "textarea" },
```
to:
```typescript
      { key: "content", label: "Content", type: "richtext" },
```

Find `blog.createFields` and change the same:
```typescript
      { key: "content", label: "Content", type: "textarea" },
```
to:
```typescript
      { key: "content", label: "Content", type: "richtext" },
```

Also in `blog.createFields`, change:
```typescript
      { key: "author_id", label: "Author ID" },
```
to:
```typescript
      { key: "author_id", label: "Author", type: "picker", pickerSection: "users" },
```

- [ ] **Step 6: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/admin/dashboard/page.tsx
git commit -m "feat(admin): wire EntityPicker and RichTextEditor into EntityForm, add required field validation"
```

---

## Task 14 — Admin: add delete countdown

**Files:**
- Modify: `frontend/src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Add countdown state to `SectionView`**

Inside `SectionView`, find:
```typescript
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
```
After it, add:
```typescript
  const [deleteCountdown, setDeleteCountdown] = useState(0);
```

- [ ] **Step 2: Add a useEffect that counts down when deleteTarget is set**

After the existing `useEffect(() => { load(); }, [load]);`:
```typescript
  useEffect(() => {
    if (!deleteTarget) { setDeleteCountdown(0); return; }
    setDeleteCountdown(3);
    const interval = setInterval(() => {
      setDeleteCountdown((n) => {
        if (n <= 1) { clearInterval(interval); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [deleteTarget]);
```

- [ ] **Step 3: Update the delete confirm button**

Find:
```typescript
          <button
            onClick={handleDelete}
            disabled={modalLoading}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition"
          >
            {modalLoading ? "Deleting…" : "Yes, Delete"}
          </button>
```
Replace with:
```typescript
          <button
            onClick={handleDelete}
            disabled={modalLoading || deleteCountdown > 0}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition"
          >
            {modalLoading
              ? "Deleting…"
              : deleteCountdown > 0
              ? `Wait (${deleteCountdown})`
              : "Yes, Delete"}
          </button>
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/admin/dashboard/page.tsx
git commit -m "feat(admin): add 3-second countdown to delete confirmation button"
```

---

## Task 15 — Admin: add PendingApprovalsView + update AdminSidebar

**Files:**
- Modify: `frontend/src/app/admin/dashboard/page.tsx`
- Modify: `frontend/src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Add PendingApprovalsView component to admin dashboard page**

Add this component directly above `FraudView` in the file (after the last `SectionView` closing brace, before `FraudView`):

```typescript
// ── Pending Approvals View ─────────────────────────────────────────────────────

function PendingApprovalsView() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listItems<Record<string, unknown>>("listings", {
        status: "pending",
        page,
        per_page: 15,
      });
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    setActioning(id);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/admin/listings/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}`,
        },
      });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) return;
    setActioning(id);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/admin/listings/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectTarget(null);
      setRejectReason("");
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setActioning(null);
    }
  }

  const columns: Column[] = [
    { key: "title", label: "Listing" },
    { key: "price", label: "Price", render: (v) => formatPrice(v) },
    { key: "location", label: "Location" },
    { key: "property_type", label: "Type", render: (v) => <Badge color="purple">{String(v ?? "")}</Badge> },
    { key: "created_at", label: "Submitted", render: (v) => formatDate(v) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900">Pending Approvals</h2>
          {!loading && total > 0 && (
            <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full">
              {total} pending
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map((col) => (
                  <th key={col.key} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">{col.label}</th>
                ))}
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded-full w-3/4" /></td>
                    ))}
                    <td className="px-4 py-3.5"><div className="h-7 bg-slate-100 rounded-lg w-36 ml-auto" /></td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium text-sm">No pending listings</p>
                        <p className="text-slate-400 text-xs mt-0.5">All caught up!</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={String(row.id)} className="hover:bg-slate-50 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3.5 text-slate-700">
                        {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                    <td className="px-4 py-3.5">
                      {rejectTarget === String(row.id) ? (
                        <div className="flex items-center gap-2 justify-end">
                          <input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason…"
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 w-36"
                          />
                          <button
                            onClick={() => handleReject(String(row.id))}
                            disabled={!rejectReason.trim() || actioning === String(row.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(String(row.id))}
                            disabled={actioning === String(row.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectTarget(String(row.id))}
                            disabled={actioning === String(row.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <span className="text-xs text-slate-500">{total} pending listings</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 transition">
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
              <span className="text-xs text-slate-600 font-medium">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 transition">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire PendingApprovalsView into renderSection**

Find:
```typescript
  function renderSection() {
    if (activeSection === "dashboard") return <DashboardOverview onNavigate={setActiveSection} />;
    if (activeSection === "fraud") return <FraudView />;
```
Add after the fraud line:
```typescript
    if (activeSection === "pending-approvals") return <PendingApprovalsView />;
```

- [ ] **Step 3: Update AdminSidebar — add pending-approvals, remove brokers**

Replace the `NAV_GROUPS` array in `AdminSidebar.tsx`:
```typescript
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "People",
    items: [
      { id: "users", label: "Users", icon: Users },
    ],
  },
  {
    label: "Properties",
    items: [
      { id: "listings", label: "Listings", icon: Home },
      { id: "pending-approvals", label: "Pending Approvals", icon: Clock, alert: true },
      { id: "projects", label: "Projects", icon: FolderOpen },
      { id: "shared-housing", label: "Shared Housing", icon: BedDouble },
    ],
  },
  {
    label: "Business",
    items: [
      { id: "agencies", label: "Agencies", icon: Building2 },
      { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Content",
    items: [
      { id: "blog", label: "Blog Posts", icon: FileText },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Moderation",
    items: [{ id: "fraud", label: "Fraud Queue", icon: AlertTriangle, alert: true }],
  },
];
```

- [ ] **Step 4: Add Clock import to AdminSidebar**

Find the Lucide imports in `AdminSidebar.tsx`:
```typescript
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FolderOpen,
  Home,
  FileText,
  ArrowLeftRight,
  Bell,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  BedDouble,
} from "lucide-react";
```
Replace with (add `Clock`, remove `Briefcase`):
```typescript
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderOpen,
  Home,
  FileText,
  ArrowLeftRight,
  Bell,
  AlertTriangle,
  Clock,
  LogOut,
  ShieldCheck,
  BedDouble,
} from "lucide-react";
```

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/admin/dashboard/page.tsx frontend/src/components/admin/AdminSidebar.tsx
git commit -m "feat(admin): add PendingApprovalsView with approve/reject flow, remove brokers nav, add pending-approvals to sidebar"
```

---

## Task 16 — Bug fixes: projects column key + backend search

**Files:**
- Modify: `frontend/src/app/admin/dashboard/page.tsx` (projects section config)
- Modify: `backend/app/admin/router.py`

- [ ] **Step 1: Fix projects section column key in SECTIONS**

In `admin/dashboard/page.tsx`, find the `projects` section config:
```typescript
    columns: [
      { key: "name", label: "Project Name" },
```
Replace with:
```typescript
    columns: [
      { key: "title", label: "Project Name" },
```

Also fix `editFields` and `createFields` if they reference `name`:
Find:
```typescript
      { key: "name", label: "Name" },
```
in the projects section and replace with:
```typescript
      { key: "title", label: "Title" },
```

- [ ] **Step 2: Fix backend projects search (already correct — verify)**

In `backend/app/admin/router.py` around line 563, verify:
```python
    if search:
        query = query.ilike("title", f"%{search}%")
```
This is correct since the `projects` table has a `title` column. No change needed here.

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/admin/dashboard/page.tsx
git commit -m "fix(admin): correct projects section column key from 'name' to 'title'"
```

---

## Task 17 — Final TypeScript check and cleanup

**Files:**
- No new files. Verify everything compiles.

- [ ] **Step 1: Full TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors. If errors appear, fix them before proceeding.

- [ ] **Step 2: Check for any remaining MOCK_ imports in page files**

```bash
grep -rn "MOCK_" frontend/src/app/ --include="*.tsx"
```
Expected: no output. If any appear, remove those imports and replace with `[]` or appropriate Supabase query.

- [ ] **Step 3: Verify admin route still works**

```bash
npm run build 2>&1 | tail -20
```
Expected: build succeeds with no type errors.

- [ ] **Step 4: Update ROADMAP.md**

In `docs/ROADMAP.md`, mark the following as complete:
- Admin CRUD overhaul
- Public pages wired to Supabase
- Mock data removed

- [ ] **Step 5: Final commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: update ROADMAP — admin CRUD overhaul and Supabase wiring complete"
```

---

## Self-Review Checklist

| Spec requirement | Task |
|-----------------|------|
| `supabase-queries.ts` with all query functions | Task 2 |
| Wire `/find-homes` to Supabase | Task 3 |
| Wire `/agencies` — remove MOCK_AGENCIES | Task 4 |
| Wire `/agencies/[slug]` — remove MOCK_AGENCY_DETAILS | Task 5 |
| Wire `/property/[id]` | Task 6 |
| Wire `/project/[id]` | Task 7 |
| Wire `/blog` | Task 8 |
| Wire `/blog/[slug]` | Task 9 |
| Wire `/dashboard` | Task 10 |
| EntityPicker autocomplete component | Task 11 |
| RichTextEditor with Tiptap | Task 12 |
| Wire pickers + editor into EntityForm + validation | Task 13 |
| Delete countdown (3s) | Task 14 |
| PendingApprovalsView + sidebar update | Task 15 |
| Remove brokers section | Task 15 Step 3 |
| Fix projects column key | Task 16 |
| TypeScript check passes | Task 17 |
