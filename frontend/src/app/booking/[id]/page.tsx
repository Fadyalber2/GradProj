"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  bookingsQueries,
  cancelBookingMutation,
  confirmBookingMutation,
  vacateBookingMutation,
} from "@/lib/queries";
import { formatEGP } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { BookingBrief } from "@/types/api";

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, isError } = useQuery(bookingsQueries.detail(params.id));
  const confirm = useMutation({
    ...confirmBookingMutation,
    onSuccess: (booking) => {
      queryClient.setQueryData(["bookings", booking.id], booking);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
  const vacate = useMutation({
    ...vacateBookingMutation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
  const cancel = useMutation({
    ...cancelBookingMutation,
    onSuccess: (booking) => {
      queryClient.setQueryData(["bookings", booking.id], booking);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-primary">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return <div className="py-24 text-center text-red-300">Booking could not be loaded.</div>;
  }

  const isRenter = user?.id === data.renter_id;
  const isOwner = user?.id === data.owner_id;
  const isRent = data.booking_type === "rent";

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/dashboard" className="text-sm font-semibold text-primary hover:text-primary-hover">
        Back to dashboard
      </Link>
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-card-dark">
        <div className="flex flex-col gap-5 p-5 md:flex-row">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/30 md:w-72">
            <Image
              src={data.listing_image || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900"}
              alt={data.listing_title || "Booking listing"}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-white">{data.listing_title}</h1>
                <p className="text-sm text-gray-400">{data.listing_location}</p>
              </div>
              <StatusBadge status={data.status} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {isRent && data.monthly_price ? (
                <Info label="Monthly rent" value={formatEGP(data.monthly_price)} />
              ) : (
                <Info label="Booking type" value={data.booking_type} />
              )}
              {isRent && data.duration_months ? (
                <Info label="Duration" value={`${data.duration_months} ${data.duration_months === 1 ? "month" : "months"}`} />
              ) : null}
              <Info
                label={isRent ? "Booking deposit" : "Reservation fee"}
                value={formatEGP(data.total_price)}
              />
              {isOwner && (
                <Info
                  label="Held by AXIOM"
                  value={formatEGP(data.total_price)}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-card-dark p-5">
        <h2 className="text-lg font-bold text-white">Actions</h2>
        {confirm.isError && (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
            {confirm.error instanceof Error ? confirm.error.message : "Confirmation failed"}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {data.status === "pending_confirmation" && isRenter && (
            <button
              type="button"
              onClick={() => confirm.mutate(data.id)}
              disabled={confirm.isPending || cancel.isPending}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition-[background-color,transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-hover active:scale-[0.99] disabled:opacity-60"
            >
              {isRent ? "Confirm Booking" : "Confirm Reservation"}
            </button>
          )}
          {data.status === "pending_confirmation" && (isRenter || isOwner) && (
            <button
              type="button"
              onClick={() => cancel.mutate(data.id)}
              disabled={confirm.isPending || cancel.isPending}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-gray-200 transition-[background-color,transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/5 active:scale-[0.99] disabled:opacity-60"
            >
              {cancel.isPending ? "Cancelling…" : "Cancel & Refund"}
            </button>
          )}
          {data.status === "active" && (isRenter || isOwner) && (
            <button
              type="button"
              onClick={() => vacate.mutate(data.id)}
              disabled={vacate.isPending}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-gray-200 hover:bg-white/5 disabled:opacity-60"
            >
              Mark as Vacated
            </button>
          )}
          {data.status === "completed" && (
            <p className="text-sm text-gray-400">This booking has been completed.</p>
          )}
          {data.status === "cancelled" && (
            <p className="text-sm text-gray-400">This booking was cancelled and the fee refunded.</p>
          )}
        </div>
      </section>

      {isOwner && (
        <section className="rounded-2xl border border-white/10 bg-card-dark p-5">
          <h2 className="text-lg font-bold text-white">Payout</h2>
          <p className="mt-3 text-sm text-gray-400">
            AXIOM holds the {isRent ? "booking deposit" : "reservation fee"} of {formatEGP(data.total_price)}. Owner
            payouts are settled outside the platform; automated payout is planned for a future release.
          </p>
        </section>
      )}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: BookingBrief["status"] }) {
  return <StatusPill label={status.replace("_", " ")} large />;
}

function StatusPill({ label, large = false }: { label: string; large?: boolean }) {
  return (
    <span className={`${large ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"} rounded-full border border-white/10 bg-white/5 font-bold capitalize text-gray-200`}>
      {label}
    </span>
  );
}
