"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import DashboardProfile from "@/components/dashboard/DashboardProfile";
import DashboardStats from "@/components/dashboard/DashboardStats";
import MyListings from "@/components/dashboard/MyListings";
import dynamic from "next/dynamic";
const AddListingModal = dynamic(() => import("@/components/dashboard/AddListingModal"), { ssr: false });
import LikedProperties from "@/components/dashboard/LikedProperties";
import RecentMessages from "@/components/dashboard/RecentMessages";
import MyViewings from "@/components/dashboard/MyViewings";
import { getDashboardListings } from "@/lib/supabase-queries";
import { useAuthStore } from "@/stores/authStore";
import type { ApiDashboardListing } from "@/types/api";
import type {
  UserProfile,
  AnalyticsStat,
  DashboardListing,
  DashboardMessage,
  LikedProperty,
  DashboardViewingBrief,
} from "@/types";

// ── Mappers ──

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
    location: listing.full_address || listing.location,
    status: statusMap[listing.status] ?? "draft",
    price: `EGP ${listing.price.toLocaleString()}`,
    priceSuffix: listing.category === "for_rent" ? "/mo" : undefined,
    views: `${listing.views_count}`,
  };
}

// ── Page ──

export default function DashboardPage() {
  const { user, isInitialized } = useAuthStore();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: () => getDashboardListings(user?.id ?? ""),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login?redirect=/dashboard");
    }
  }, [isInitialized, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-center text-red-400 py-20">
        Failed to load dashboard. Please try again.
      </p>
    );
  }

  const profile: UserProfile = {
    name: user?.full_name || user?.email?.split("@")[0] || "User",
    avatar: user?.avatar_url || "",
    isVerifiedSeller: user?.is_verified_seller ?? false,
    subtitle: "AXIOM Member",
    info: [
      { label: "Email", value: user?.email ?? "" },
      { label: "Phone", value: "Not set" },
      { label: "Country", value: "+20" },
    ],
  };

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

  const listings = (data?.listings ?? []).map(mapListing);
  const messages: DashboardMessage[] = [];
  const likedProperties: LikedProperty[] = [];
  const viewings: DashboardViewingBrief[] = [];

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      </div>

      <DashboardProfile user={profile} />
      <DashboardStats stats={analyticsStats} />

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
