"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import { applicationsQueries } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default function MyApplicationsTab() {
  const { data = [], isLoading } = useQuery(applicationsQueries.my());

  if (isLoading) return <Loading />;
  if (!data.length) {
    return <Empty icon={<FileText className="h-8 w-8" />} title="No applications yet" body="Apply to shared homes and track owner responses here." />;
  }

  return (
    <div className="space-y-3">
      {data.map((app) => (
        <Link
          key={app.id}
          href={`/property/${app.listing_id}`}
          className="flex items-center gap-4 rounded-2xl border border-white/10 bg-card-dark p-4 transition hover:border-primary/40"
        >
          <Thumb src={app.listing_image} alt={app.listing_title || "Listing"} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-white">{app.listing_title}</p>
            <p className="truncate text-sm text-gray-400">{app.listing_location}</p>
            <p className="mt-1 text-xs text-gray-500">Applied {formatDate(app.created_at)}</p>
          </div>
          <div className="text-right">
            <Status status={app.status} />
            {app.compatibility_score != null && (
              <p className="mt-2 text-xs font-semibold text-primary">{app.compatibility_score}% match</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function Loading() {
  return <div className="flex justify-center py-16 text-primary"><Loader2 className="h-7 w-7 animate-spin" /></div>;
}

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5">
      {src && <Image src={src} alt={alt} fill className="object-cover" />}
    </div>
  );
}

function Status({ status }: { status: "pending" | "approved" | "rejected" }) {
  const cls = {
    pending: "border-amber-400/20 bg-amber-500/10 text-amber-300",
    approved: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    rejected: "border-red-400/20 bg-red-500/10 text-red-300",
  }[status];
  return <span className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${cls}`}>{status}</span>;
}

function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card-dark p-10 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-gray-500">{icon}</div>
      <p className="font-bold text-white">{title}</p>
      <p className="mt-1 text-sm text-gray-400">{body}</p>
    </div>
  );
}
