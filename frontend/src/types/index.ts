// ── RAG citation types ──

export type CitationSourceType = "listing" | "neighborhood" | "blog";

export interface Citation {
  sourceType: CitationSourceType;
  sourceId: string;
  title: string;
  url: string;
}

// ── Auth types (match backend auth/schemas.py) ──

export type UserRole = "user" | "admin";
export type GenderType = "male" | "female" | "other";

export interface LifestylePreferences {
  gender_preference?: "male" | "female" | "mixed";
  smoking_allowed?: boolean;
  pets_allowed?: boolean;
  guests_policy?: "flexible" | "rarely" | "never";
  noise_level?: "quiet" | "moderate" | "lively";
  cleanliness?: "very_clean" | "average" | "relaxed";
  sleep_schedule?: "early_bird" | "night_owl" | "flexible";
  occupation_type?: "student" | "professional" | "any";
}

export interface PaymentPlan {
  type: "cash" | "installments";
  downPaymentPct?: number;
  monthlyInstallment?: number;
  years?: number;
}

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
  age?: number | null;
  occupation?: string | null;
  lifestyle_preferences?: LifestylePreferences | null;
}

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  country_code?: string;
  gender?: GenderType;
}

// ── Notification types ──

export type NotificationType =
  | "listing_approved"
  | "listing_rejected"
  | "viewing_confirmed"
  | "application_received"
  | "application_approved"
  | "application_rejected";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
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
  // Real listing fields from backend
  category?: "for_rent" | "for_sale" | "shared_housing";
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_type?: string | null;
  is_new?: boolean;
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

export interface SharedHousingDetail {
  id: string;
  ownerId: string;
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
  // Location
  neighborhood?: string | null;
  compoundName?: string | null;
  floorNumber?: number | null;
  totalFloors?: number | null;
  // Rental fields
  leaseType?: "monthly" | "yearly" | "daily" | null;
  minStayMonths?: number | null;
  // Sale fields
  paymentPlan?: PaymentPlan | null;
  deliveryDate?: string | null;
  titleDeedStatus?: "ready" | "off_plan" | "pending" | null;
  // Shared housing extras (null for regular listings)
  category?: "for_rent" | "for_sale" | "shared_housing";
  roomType?: "ensuite" | "private" | "shared" | null;
  lifestylePreferences?: LifestylePreferences | null;
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
  contactPhone?: string | null;
  contactName?: string | null;
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

