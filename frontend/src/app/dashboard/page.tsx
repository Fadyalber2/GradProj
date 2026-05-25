"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardStats from "@/components/dashboard/DashboardStats";
import MyListings from "@/components/dashboard/MyListings";
import dynamic from "next/dynamic";
const AddListingModal = dynamic(() => import("@/components/dashboard/AddListingModal"), { ssr: false });
import LikedProperties from "@/components/dashboard/LikedProperties";
import MyViewings from "@/components/dashboard/MyViewings";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import ApplicationsReceivedTab from "@/components/dashboard/ApplicationsReceivedTab";
import BookingsReceivedTab from "@/components/dashboard/BookingsReceivedTab";
import MyApplicationsTab from "@/components/dashboard/MyApplicationsTab";
import MyBookingsTab from "@/components/dashboard/MyBookingsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardQueries } from "@/lib/queries";
import { getListingPriceSuffix } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { ApiAnalyticsStat, ApiDashboardListing } from "@/types/api";
import type {
  AnalyticsStat,
  DashboardListing,
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
    priceSuffix: getListingPriceSuffix(listing.category),
    views: `${listing.views_count}`,
  };
}

function mapAnalytics(stat: ApiAnalyticsStat): AnalyticsStat {
  const iconMap: Record<string, string> = {
    "Total Views": "Eye",
    "Active Listings": "TrendingUp",
    "Pending Approval": "Clock",
    "Saved Properties": "Heart",
  };
  const colorMap: Record<string, Pick<AnalyticsStat, "iconBg" | "iconColor" | "barColor">> = {
    "Total Views": {
      iconBg: "bg-sky-400/10",
      iconColor: "text-sky-300",
      barColor: "bg-sky-400",
    },
    "Active Listings": {
      iconBg: "bg-teal-400/10",
      iconColor: "text-teal-300",
      barColor: "bg-teal-400",
    },
    "Pending Approval": {
      iconBg: "bg-amber-400/10",
      iconColor: "text-amber-300",
      barColor: "bg-amber-400",
    },
    "Saved Properties": {
      iconBg: "bg-rose-400/10",
      iconColor: "text-rose-300",
      barColor: "bg-rose-400",
    },
  };

  return {
    label: stat.label,
    value: stat.value,
    icon: iconMap[stat.label] ?? "Activity",
    ...(colorMap[stat.label] ?? {
      iconBg: "bg-zinc-400/10",
      iconColor: "text-zinc-300",
      barColor: "bg-zinc-400",
    }),
    bars: [26, 44, 36, 58, 49, 72, 63],
    trendPercent: `${Math.abs(stat.trend_percent)}%`,
    trendUp: stat.trend_up,
  };
}

// ── Page ──

export default function DashboardPage() {
  const { user, isInitialized } = useAuthStore();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    ...dashboardQueries.me(),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/login?redirect=/dashboard");
    }
  }, [isInitialized, user, router]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="mb-8 h-72 rounded-[1.75rem] bg-white/10" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-28 rounded-2xl bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="rounded-3xl border border-red-400/20 bg-red-400/10 p-8">
          <h1 className="text-2xl font-semibold text-white">Dashboard data could not load</h1>
          <p className="mt-2 text-sm text-red-100">
            Please refresh the page or sign in again.
          </p>
        </div>
      </div>
    );
  }

  const analyticsStats: AnalyticsStat[] = data.analytics.map(mapAnalytics);

  const listings = (data?.listings ?? []).map(mapListing);
  const viewings: DashboardViewingBrief[] = (data?.upcoming_viewings ?? []).map((viewing) => ({
    id: viewing.id,
    listingTitle: viewing.listing_title,
    listingImage: viewing.listing_image ?? "",
    scheduledAt: viewing.scheduled_at,
    status: ["pending", "confirmed", "cancelled"].includes(viewing.status)
      ? (viewing.status as DashboardViewingBrief["status"])
      : "pending",
  }));

  return (
    <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-teal-200">User dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
            Account, listings, and requests
          </h1>
        </div>
      </div>

      <ProfileSettings
        profile={data.profile}
        listingsCount={data.listings_count}
        likedCount={data.liked_count}
        pendingApplications={data.pending_applications}
      />
      <DashboardStats stats={analyticsStats} />

      <Tabs defaultValue="listings" className="space-y-5">
        <TabsList className="h-auto flex-wrap justify-start rounded-2xl border border-white/10 bg-card-dark p-2">
          <TabsTrigger value="listings">My Listings</TabsTrigger>
          <TabsTrigger value="bookings-received">Bookings Received</TabsTrigger>
          <TabsTrigger value="my-bookings">My Bookings</TabsTrigger>
          <TabsTrigger value="applications-received">
            Applications Received
            {data?.pending_applications ? (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-white">
                {data.pending_applications}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="my-applications">My Applications</TabsTrigger>
          <TabsTrigger value="liked">Saved</TabsTrigger>
          <TabsTrigger value="viewings">Viewings</TabsTrigger>
        </TabsList>
        <TabsContent value="listings">
          <MyListings listings={listings} onAddNew={() => setModalOpen(true)} />
        </TabsContent>
        <TabsContent value="bookings-received">
          <BookingsReceivedTab />
        </TabsContent>
        <TabsContent value="my-bookings">
          <MyBookingsTab />
        </TabsContent>
        <TabsContent value="applications-received">
          <ApplicationsReceivedTab listings={data?.listings ?? []} />
        </TabsContent>
        <TabsContent value="my-applications">
          <MyApplicationsTab />
        </TabsContent>
        <TabsContent value="liked">
          <LikedProperties />
        </TabsContent>
        <TabsContent value="viewings">
          <MyViewings viewings={viewings} />
          {!viewings.length && (
            <div className="rounded-2xl border border-white/10 bg-card-dark p-10 text-center text-gray-400">
              No upcoming viewings.
            </div>
          )}
        </TabsContent>
      </Tabs>
      <AddListingModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
