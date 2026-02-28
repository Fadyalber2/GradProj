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
  "Total Views":     { icon: "Eye",           iconBg: "bg-blue-500/10",  iconColor: "text-blue-400",  barColor: "bg-blue-500" },
  "Active Listings": { icon: "TrendingUp",    iconBg: "bg-primary/10",   iconColor: "text-primary",   barColor: "bg-primary" },
  "Messages":        { icon: "MessageSquare", iconBg: "bg-green-500/10", iconColor: "text-green-400", barColor: "bg-green-500" },
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
