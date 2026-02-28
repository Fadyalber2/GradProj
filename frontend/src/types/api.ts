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

// ── Shared Housing (legacy — remove when Task 14 redirect is in place) ──

/** @deprecated Use ListingDetail with category==="shared_housing" instead */
export interface ApiSharedHousingDetail {
  id: string;
  listing_id: string;
  total_spots: number;
  filled_spots: number;
  availability: string;
  available_date: string | null;
  furnishing: string;
  utilities_included: boolean;
  bathroom_type: string;
  private_amenities: string[];
  shared_amenities: string[];
  title: string;
  location: string;
  full_address: string | null;
  price: number;
  currency: string;
  images: string[];
  description: string | null;
  verified: boolean;
  owner_id: string;
  housemates: HousemateResponse[];
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
