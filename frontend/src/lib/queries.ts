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
  ApiProfileResponse,
  ApiNotification,
  ApplicationBrief,
  MyApplicationBrief,
  ListingBrief,
  ListingLifestylePreferences,
  BookingBrief,
  CreateBookingResponse,
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
  gender_preference?: "male" | "female";
  utilities_included?: boolean;
  room_type?: "private" | "ensuite" | "shared";
  has_spots?: boolean;
  available_before?: string;
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

export const favoritesQueries = {
  ids: () => ({
    queryKey: ["favorites", "ids"],
    queryFn: async () => {
      const res = await api.get<{ id: string }[]>("/api/listings/favorites");
      return new Set(res.map((l) => l.id));
    },
  }),
};

export const favoriteMutation = {
  mutationFn: (listingId: string) =>
    api.post<{ favorited: boolean; listing_id: string }>(
      `/api/listings/${listingId}/favorite`
    ),
};

// ── Listing CRUD mutations ──

export interface CreateListingInput {
  title: string;
  location: string;
  full_address?: string | null;
  city?: string;
  property_type: string;
  category: "for_rent" | "for_sale" | "shared_housing";
  price: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  size_sqm?: number | null;
  description?: string | null;
  amenities?: string[];
  images?: string[];
}

export const createListingMutation = {
  mutationFn: (data: CreateListingInput) =>
    api.post<ListingDetailWithSimilar>("/api/listings", data),
};

export const updateListingMutation = {
  mutationFn: ({ id, data }: { id: string; data: Partial<CreateListingInput> }) =>
    api.put<ListingDetailWithSimilar>(`/api/listings/${id}`, data),
};

export const deleteListingMutation = {
  mutationFn: (id: string) =>
    api.delete<{ detail: string }>(`/api/listings/${id}`),
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

export interface UpdateProfileInput {
  full_name?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  country_code?: string | null;
  gender?: "male" | "female" | "other" | null;
  birth_date?: string | null;
  occupation?: string | null;
}

export const updateProfileMutation = {
  mutationFn: (data: UpdateProfileInput) =>
    api.put<ApiProfileResponse>("/api/auth/me", data),
};

// â”€â”€ Applications â”€â”€

export const applicationsQueries = {
  my: () => ({
    queryKey: ["applications", "my"],
    queryFn: () => api.get<MyApplicationBrief[]>("/api/applications/my"),
  }),

  receivedForListing: (listingId: string) => ({
    queryKey: ["applications", "listing", listingId],
    queryFn: () =>
      api.get<ApplicationBrief[]>(`/api/listings/${listingId}/applications`),
  }),
};

export const createApplicationMutation = {
  mutationFn: (data: {
    listing_id: string;
    message: string;
    lifestyle_data: ListingLifestylePreferences;
  }) => api.post<ApplicationBrief>("/api/applications", data),
};

export const updateApplicationMutation = {
  mutationFn: ({
    id,
    status,
  }: {
    id: string;
    status: "approved" | "rejected";
  }) => api.put<ApplicationBrief>(`/api/applications/${id}`, { status }),
};

// â”€â”€ Bookings â”€â”€

export const bookingsQueries = {
  my: () => ({
    queryKey: ["bookings", "my"],
    queryFn: () => api.get<BookingBrief[]>("/api/bookings/my"),
  }),

  received: () => ({
    queryKey: ["bookings", "received"],
    queryFn: () => api.get<BookingBrief[]>("/api/bookings/received"),
  }),

  detail: (id: string) => ({
    queryKey: ["bookings", id],
    queryFn: () => api.get<BookingBrief>(`/api/bookings/${id}`),
  }),
};

export const createBookingMutation = {
  mutationFn: (data: {
    listing_id: string;
    booking_type: "rent" | "sale";
    start_date?: string | null;
    duration_months?: number | null;
  }) => api.post<CreateBookingResponse>("/api/bookings", data),
};

export const confirmBookingMutation = {
  mutationFn: (id: string) => api.post<BookingBrief>(`/api/bookings/${id}/confirm`),
};

export const vacateBookingMutation = {
  mutationFn: (id: string) => api.post<BookingBrief>(`/api/bookings/${id}/vacate`),
};

export const requestDisbursementMutation = {
  mutationFn: ({ id, month }: { id: string; month: number }) =>
    api.post(`/api/bookings/${id}/disbursements/${month}/request`),
};

// â”€â”€ Recommendations â”€â”€

export const recommendationsQueries = {
  list: (params?: { category?: "for_rent" | "for_sale" | "shared_housing" }) => ({
    queryKey: ["recommendations", params],
    queryFn: () =>
      api.get<ListingBrief[]>("/api/ai/recommendations", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  }),
};

// ── Notifications ──

export const notificationsQueries = {
  list: () => ({
    queryKey: ["notifications"],
    queryFn: () => api.get<ApiNotification[]>("/api/notifications"),
  }),
};

export const markNotificationReadMutation = {
  mutationFn: (notificationId: string) =>
    api.put<{ id: string; is_read: boolean }>(
      `/api/notifications/${notificationId}/read`
    ),
};

export const markAllNotificationsReadMutation = {
  mutationFn: () =>
    api.put<{ message: string }>("/api/notifications/read-all"),
};

// ── AI / RAG search ──

export interface RAGSearchResponse {
  query: string;
  parsed_filters: Record<string, unknown>;
  results: Array<{
    id: string;
    title: string;
    location: string;
    price: number;
    currency: string;
    price_period: string | null;
    category: string;
    property_type: string;
    images: string[];
    verified: boolean;
    is_new: boolean;
    status: string;
    bedrooms: number | null;
    bathrooms: number | null;
    size_sqm: number | null;
    neighborhood: string | null;
    views_count: number;
  }>;
  total: number;
  retrieval_method: "semantic" | "keyword";
}

export const ragSearchMutation = {
  mutationFn: (data: { query: string; limit?: number }) =>
    api.post<RAGSearchResponse>("/api/ai/search", data),
};
