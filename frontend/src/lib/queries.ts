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
