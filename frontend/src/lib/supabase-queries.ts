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
      "id, title, location, price, currency, price_period, category, property_type, images, verified, status, bedrooms, bathrooms, size_sqm, floor_number, compound_name, views_count, is_new, created_at",
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
    .select("*, profiles!listings_owner_id_fkey(full_name, avatar_url, phone), agencies!listings_agency_id_fkey(name, phone)")
    .eq("id", id)
    .single();

  if (error || !data) return { data: null, error };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  const profile = d.profiles as { full_name: string | null; phone: string | null } | null;
  const agency  = d.agencies  as { name: string | null; phone: string | null } | null;
  const listing = {
    ...data,
    similar_listings: [],
    contact_phone: profile?.phone ?? agency?.phone ?? null,
    contact_name:  profile?.full_name ?? agency?.name ?? null,
  } as unknown as ListingDetailWithSimilar;
  return { data: listing, error: null };
}

// ── Agencies ──────────────────────────────────────────────────────────────────

export async function getAgencies(search?: string) {
  let query = supabase
    .from("agencies")
    .select("id, slug, name, logo_url, banner_url, verified, description, projects(count), listings(count)")
    .order("name", { ascending: true });

  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agencies: AgencyBrief[] = ((data ?? []) as any[]).map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    subtitle: null,
    description: a.description ?? null,
    logo_url: a.logo_url ?? null,
    banner_url: a.banner_url ?? null,
    verified: a.verified ?? false,
    active_projects: (a.projects as { count: number }[] | null)?.[0]?.count ?? 0,
    listings_count: (a.listings as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
  return { agencies, error };
}

export async function getAgency(slug: string) {
  const { data: agency, error } = await supabase
    .from("agencies")
    .select("id, slug, name, description, logo_url, banner_url, verified, created_at, phone, email, city, website")
    .eq("slug", slug)
    .single();

  if (error || !agency) return { agency: null, projects: [], listings: [], error };

  const [projectsRes, listingsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, agency_id, title, image_url, completion_pct, starting_price, status")
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

  const subError = projectsRes.error ?? listingsRes.error ?? null;

  const apiAgency: ApiAgencyDetail = {
    id: agency.id,
    slug: agency.slug,
    name: agency.name,
    subtitle: null,
    description: agency.description ?? null,
    logo_url: agency.logo_url ?? null,
    banner_url: agency.banner_url ?? null,
    verified: agency.verified ?? false,
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
    subtitle: null,
    image_url: p.image_url ?? null,
    completion_pct: p.completion_pct ?? 0,
    starting_price: p.starting_price ? Number(p.starting_price) : null,
    status: p.status ?? "planned",
  }));

  return { agency: apiAgency, projects, listings: listingsRes.data ?? [], error: subError };
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProject(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*, agencies!projects_agency_id_fkey(name, slug, logo_url, verified)")
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
    agency_verified: Boolean(agency.verified),
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
      "id, slug, title, lead, image_url, category, tags, created_at, is_published",
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
    subtitle: p.lead ?? null,
    image_url: p.image_url ?? null,
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
    subtitle: (data as Record<string, unknown>).lead as string | null ?? null,
    image_url: (data as Record<string, unknown>).image_url as string | null ?? null,
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
