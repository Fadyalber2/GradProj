"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins, Loader2 } from "lucide-react";
import { bookingsQueries, requestDisbursementMutation } from "@/lib/queries";
import { formatDate, formatEGP } from "@/lib/utils";

export default function BookingsReceivedTab() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery(bookingsQueries.received());
  const releaseDisbursement = useMutation({
    ...requestDisbursementMutation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  if (isLoading) return <div className="flex justify-center py-16 text-primary"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-card-dark p-10 text-center">
        <HandCoins className="mx-auto mb-3 h-8 w-8 text-gray-500" />
        <p className="font-bold text-white">No received bookings</p>
        <p className="mt-1 text-sm text-gray-400">Bookings on your rent and sale listings appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((booking) => (
        <section key={booking.id} className="rounded-2xl border border-white/10 bg-card-dark p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <Link href={`/booking/${booking.id}`} className="font-bold text-white hover:text-primary">
                {booking.listing_title || "Property booking"}
              </Link>
              <p className="text-sm text-gray-400">
                {booking.renter_name || "Renter"} · renter paid {formatEGP(booking.total_price)} · {booking.status.replace("_", " ")}
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold capitalize text-gray-200">
              {booking.booking_type}
            </span>
          </div>

          {booking.disbursements.length > 0 && (
            <div className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10">
              {booking.disbursements.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-300">
                    Owner wire month {item.month_number} · {formatDate(item.scheduled_date)} · {formatEGP(item.amount)}
                  </p>
                  {item.status === "scheduled" && booking.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => releaseDisbursement.mutate({ id: booking.id, month: item.month_number })}
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white"
                    >
                      Mark Released
                    </button>
                  ) : (
                    <span className="text-xs font-bold capitalize text-emerald-300">{item.status}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
