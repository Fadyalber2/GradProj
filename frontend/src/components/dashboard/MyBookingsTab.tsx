"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Loader2 } from "lucide-react";
import { bookingsQueries } from "@/lib/queries";
import { formatDate, formatEGP } from "@/lib/utils";
import type { BookingBrief } from "@/types/api";

export default function MyBookingsTab() {
  const { data = [], isLoading } = useQuery(bookingsQueries.my());

  if (isLoading) return <Loading />;
  if (!data.length) {
    return <Empty title="No bookings yet" body="Create a booking from any property page and track it here." />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {data.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
}

function BookingCard({ booking }: { booking: BookingBrief }) {
  return (
    <Link
      href={`/booking/${booking.id}`}
      className="rounded-2xl border border-white/10 bg-card-dark p-5 transition hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-bold text-white">{booking.listing_title || "Property booking"}</p>
          <p className="truncate text-sm text-gray-400">{booking.listing_location}</p>
        </div>
        <Status status={booking.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Info label={booking.booking_type === "rent" ? "Paid" : "Price"} value={formatEGP(booking.total_price)} />
        <Info label="Type" value={booking.booking_type} />
        {booking.start_date && <Info label="Start" value={formatDate(booking.start_date)} />}
        {booking.end_date && <Info label="End" value={formatDate(booking.end_date)} />}
      </div>
    </Link>
  );
}

function Loading() {
  return <div className="flex justify-center py-16 text-primary"><Loader2 className="h-7 w-7 animate-spin" /></div>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card-dark p-10 text-center">
      <CalendarCheck className="mx-auto mb-3 h-8 w-8 text-gray-500" />
      <p className="font-bold text-white">{title}</p>
      <p className="mt-1 text-sm text-gray-400">{body}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-semibold capitalize text-white">{value}</p>
    </div>
  );
}

function Status({ status }: { status: BookingBrief["status"] }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold capitalize text-gray-200">{status.replace("_", " ")}</span>;
}
