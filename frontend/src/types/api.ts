// API response types — mirror the backend Pydantic schemas exactly

// ── Auth / Profile ──

export interface ApiProfileResponse {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  bio: string | null;
  role: string;
  is_verified_seller: boolean;
  gender: string | null;
  country_code: string | null;
  badges: string[];
  birth_date: string | null;
  age: number | null;
  occupation: string | null;
  lifestyle_preferences: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

// ── Shared types ──

export interface ListingLifestylePreferences {
  gender_preference?: "male" | "female" | null;
  smoking_allowed?: boolean | null;
  pets_allowed?: boolean | null;
  guests_policy?: "flexible" | "rarely" | "never" | null;
  noise_level?: "quiet" | "moderate" | "lively" | null;
  cleanliness?: "very_clean" | "average" | "relaxed" | null;
  sleep_schedule?: "early_bird" | "night_owl" | "flexible" | null;
  occupation_type?: "student" | "professional" | "any" | null;
}

export interface PaymentPlan {
  type: "cash";
  down_payment_pct?: number | null;
  monthly_installment?: number | null;
  years?: number | null;
}

export interface NeighborhoodBrief {
  id: string;
  name: string;
  name_ar: string | null;
  city: string;
  slug: string;
}

// ── Listings ──

export interface HousemateResponse {
  id: string;
  listing_id: string | null;
  user_id: string | null;
  name: string;
  age: number | null;
  occupation: string | null;
  avatar_url: string | null;
  tags: string[];
  lifestyle_preferences?: ListingLifestylePreferences | null;
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
  floor_number: number | null;
  neighborhood_id: string | null;
  compound_name: string | null;
  room_type?: "ensuite" | "private" | "shared" | null;
  lifestyle_preferences?: ListingLifestylePreferences | null;
  total_spots?: number | null;
  filled_spots?: number | null;
  utilities_included?: boolean | null;
  available_date?: string | null;
  views_count: number;
  is_new: boolean;
  created_at: string | null;
}

export interface ListingDetail extends ListingBrief {
  owner_id: string;
  agency_id: string | null;
  description: string | null;
  full_address: string | null;
  amenities: string[];
  updated_at: string | null;
  // Location
  neighborhood_id: string | null;
  total_floors: number | null;
  // Rental fields (for_rent + shared_housing)
  lease_type: "monthly" | "yearly" | null;
  min_stay_months: number | null;
  // Sale fields (for_sale)
  payment_plan: PaymentPlan | null;
  delivery_date: string | null;
  title_deed_status: "ready" | "off_plan" | "pending" | null;
  // Shared housing fields — present when category === "shared_housing"
  room_type: "ensuite" | "private" | "shared" | null;
  lifestyle_preferences: ListingLifestylePreferences | null;
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
  contact_phone: string | null;
  contact_name: string | null;
}

export interface ListingDetailWithSimilar extends ListingDetail {
  similar_listings: ListingBrief[];
}

/** Alias for plan compatibility — identical to ListingBrief */
export type ApiListingBrief = ListingBrief;

/** Alias for plan compatibility — identical to ListingDetailWithSimilar */
export type ApiListingDetail = ListingDetailWithSimilar;

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
  description?: string | null;
  logo_url: string | null;
  banner_url?: string | null;
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
  founded_year: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
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

export interface LikedPropertyBrief {
  id: string;
  listing_id: string;
  title: string;
  location: string;
  price: number;
  price_period: string | null;
  category: "for_rent" | "for_sale" | "shared_housing" | null;
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
  full_address?: string | null;
  category?: string | null;
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
  profile: ApiProfileResponse;
  listings: ApiDashboardListing[];
  listings_count: number;
  active_count: number;
  pending_count: number;
  analytics: ApiAnalyticsStat[];
  liked_properties: LikedPropertyBrief[];
  liked_count: number;
  upcoming_viewings: ApiViewingBrief[];
  pending_applications: number;
}

// â”€â”€ Applications â”€â”€

export interface ApplicationBrief {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_image: string | null;
  applicant_id: string;
  applicant_name: string | null;
  applicant_avatar: string | null;
  status: "pending" | "approved" | "rejected";
  message: string;
  lifestyle_data: ListingLifestylePreferences | null;
  compatibility_score: number | null;
  created_at: string;
}

export interface MyApplicationBrief {
  id: string;
  listing_id: string;
  listing_title: string | null;
  listing_image: string | null;
  listing_location: string;
  status: "pending" | "approved" | "rejected";
  compatibility_score: number | null;
  created_at: string;
}

// â”€â”€ Bookings â”€â”€

export interface BookingDisbursement {
  id: string;
  booking_id: string;
  month_number: number;
  amount: number;
  scheduled_date: string;
  status: "scheduled" | "released";
  owner_requested_at: string | null;
  released_at: string | null;
  created_at: string;
}

export interface BookingBrief {
  id: string;
  listing_id: string;
  listing_title: string | null;
  listing_image: string | null;
  listing_location: string | null;
  renter_id: string;
  owner_id: string;
  booking_type: "rent" | "sale";
  listing_category?: "for_rent" | "for_sale" | "shared_housing" | null;
  start_date: string | null;
  end_date: string | null;
  duration_months: number | null;
  monthly_price: number | null;
  total_price: number;
  platform_cut_pct: number;
  platform_cut_amount: number;
  owner_amount: number;
  status:
    | "pending_confirmation"
    | "active"
    | "completed"
    | "cancelled";
  renter_confirmed_at: string | null;
  tenant_vacated_at: string | null;
  vacated_by: string | null;
  disbursements: BookingDisbursement[];
  renter_name?: string | null;
  renter_avatar?: string | null;
  created_at: string;
}

export interface CreateBookingResponse {
  booking_id: string;
  total_price: number;
  platform_cut_amount: number;
  owner_amount: number;
  booking_type: "rent" | "sale";
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

// ── Universities ──

export interface ApiUniversity {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  logo_url: string | null;
  banner_url: string | null;
  verified: boolean;
  listings_count: number;
  city: string | null;
  type: "public" | "private" | null;
  student_count: number | null;
  accreditation: string | null;
  founded_year: number | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  trust_score: number;
  created_at: string | null;
  listings?: ListingBrief[];
}

export interface PaginatedUniversities {
  universities: ApiUniversity[];
  total: number;
  page: number;
  per_page: number;
}

// ── Notifications ──

export interface ApiNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

