"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
import { createBookingMutation } from "@/lib/queries";
import { calculatePlatformFee, formatEGP } from "@/lib/utils";
import type { CreateBookingResponse, ListingDetailWithSimilar } from "@/types/api";

type Props = {
  listing: ListingDetailWithSimilar;
  onClose: () => void;
};

export default function BookingModal({ listing, onClose }: Props) {
  const [startDate, setStartDate] = useState("");
  const [durationMonths, setDurationMonths] = useState(3);
  const [booking, setBooking] = useState<CreateBookingResponse | null>(null);
  const mutation = useMutation(createBookingMutation);
  const isRent = listing.category === "for_rent" || listing.category === "shared_housing";
  const rentSubtotal = isRent ? listing.price * durationMonths : 0;
  const fee = isRent ? calculatePlatformFee(rentSubtotal) : { platformFee: 0, ownerReceives: listing.price };
  const totalDue = isRent ? rentSubtotal + fee.platformFee : listing.price;

  async function createBooking() {
    const result = await mutation.mutateAsync({
      listing_id: listing.id,
      booking_type: isRent ? "rent" : "sale",
      start_date: isRent ? startDate : null,
      duration_months: isRent ? durationMonths : null,
    });
    setBooking(result);
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-card-dark shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-bold text-white">{isRent ? "Book Property" : "Reserve Property"}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close booking modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {!booking ? (
            <div className="space-y-5 p-5">
              <ListingSummary listing={listing} />
              {isRent && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-gray-300">Move-in date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-input-dark px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-gray-300">Duration</span>
                    <select
                      value={durationMonths}
                      onChange={(event) => setDurationMonths(Number(event.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-input-dark px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
                    >
                      {[1, 2, 3, 6, 12].map((months) => (
                        <option key={months} value={months}>
                          {months} {months === 1 ? "month" : "months"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <PriceBreakdown
                isRent={isRent}
                monthlyPrice={listing.price}
                rentSubtotal={rentSubtotal}
                total={totalDue}
                platformFee={fee.platformFee}
                ownerReceives={isRent ? rentSubtotal : listing.price}
              />
              {mutation.isError && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  Booking could not be created. Please try again.
                </p>
              )}
              <button
                type="button"
                onClick={createBooking}
                disabled={mutation.isPending || (isRent && !startDate)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isRent ? "Pay First Month & Book" : "Create Full-Purchase Booking"}
              </button>
            </div>
          ) : (
            <div className="space-y-5 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                <Check className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Booking created</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Visit the property in person, then confirm it from your booking page.
                </p>
              </div>
              <Link
                href={`/booking/${booking.booking_id}`}
                className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-hover"
              >
                View My Booking
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ListingSummary({ listing }: { listing: ListingDetailWithSimilar }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-black/30">
        <Image
          src={listing.images[0] || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600"}
          alt={listing.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{listing.title}</p>
        <p className="truncate text-sm text-gray-400">{listing.location}</p>
      </div>
    </div>
  );
}

function PriceBreakdown({
  isRent,
  monthlyPrice,
  rentSubtotal,
  total,
  platformFee,
  ownerReceives,
}: {
  isRent: boolean;
  monthlyPrice: number;
  rentSubtotal: number;
  total: number;
  platformFee: number;
  ownerReceives: number;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
      {isRent ? (
        <>
          <Row label="Rent for full period" value={formatEGP(rentSubtotal)} />
          <Row label="AXIOM fee paid upfront (5%)" value={formatEGP(platformFee)} />
          <Row label="First month rent" value={formatEGP(monthlyPrice)} />
          <Row label="Owner monthly wire after confirmation" value={formatEGP(monthlyPrice)} />
        </>
      ) : (
        <Row label="Full purchase price" value={formatEGP(total)} />
      )}
      <Row label="Total payment" value={formatEGP(total)} strong />
      <Row label="Owner receives over booking" value={formatEGP(ownerReceives)} strong />
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-400">{label}</span>
      <span className={strong ? "font-bold text-white" : "font-semibold text-gray-200"}>{value}</span>
    </div>
  );
}
