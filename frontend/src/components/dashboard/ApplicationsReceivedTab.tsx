"use client";

import Image from "next/image";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Inbox, Loader2 } from "lucide-react";
import { applicationsQueries, updateApplicationMutation } from "@/lib/queries";
import type { ApiDashboardListing, ApplicationBrief } from "@/types/api";

type Props = {
  listings: ApiDashboardListing[];
};

export default function ApplicationsReceivedTab({ listings }: Props) {
  const sharedListings = listings.filter((listing) => listing.category === "shared_housing");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    ...updateApplicationMutation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
  const results = useQueries({
    queries: sharedListings.map((listing) => applicationsQueries.receivedForListing(listing.id)),
  });
  const loading = results.some((result) => result.isLoading);
  const appsByListing = sharedListings.map((listing, index) => ({
    listing,
    applications: (results[index]?.data ?? []) as ApplicationBrief[],
  }));

  if (!sharedListings.length) {
    return <Empty title="No shared housing listings" body="Create a shared housing listing to receive roommate applications." />;
  }
  if (loading) return <div className="flex justify-center py-16 text-primary"><Loader2 className="h-7 w-7 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {appsByListing.map(({ listing, applications }) => (
        <section key={listing.id} className="overflow-hidden rounded-2xl border border-white/10 bg-card-dark">
          <div className="border-b border-white/10 px-5 py-4">
            <h3 className="font-bold text-white">{listing.title}</h3>
            <p className="text-sm text-gray-400">{applications.filter((app) => app.status === "pending").length} pending applications</p>
          </div>
          {!applications.length && (
            <div className="p-6 text-sm text-gray-400">No applications for this listing yet.</div>
          )}
          <div className="divide-y divide-white/10">
            {applications.map((app) => (
              <div key={app.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                <Avatar src={app.applicant_avatar} name={app.applicant_name} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{app.applicant_name || "Applicant"}</p>
                  <p className="line-clamp-2 text-sm text-gray-400">{app.message || "No message provided."}</p>
                </div>
                <Score value={app.compatibility_score} />
                {app.status === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => mutation.mutate({ id: app.id, status: "approved" })}
                      className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => mutation.mutate({ id: app.id, status: "rejected" })}
                      className="rounded-lg bg-red-500/15 px-3 py-2 text-xs font-bold text-red-300"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold capitalize text-gray-300">{app.status}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Avatar({ src, name }: { src: string | null; name: string | null }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10">
      {src ? <Image src={src} alt={name || "Applicant"} fill className="object-cover" /> : <Inbox className="m-3 h-6 w-6 text-gray-500" />}
    </div>
  );
}

function Score({ value }: { value: number | null }) {
  if (value == null) return <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-gray-400">Scoring</span>;
  const cls = value >= 80 ? "text-emerald-300 bg-emerald-500/10" : value >= 60 ? "text-sky-300 bg-sky-500/10" : "text-gray-300 bg-white/5";
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${cls}`}>{value}% match</span>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card-dark p-10 text-center">
      <Inbox className="mx-auto mb-3 h-8 w-8 text-gray-500" />
      <p className="font-bold text-white">{title}</p>
      <p className="mt-1 text-sm text-gray-400">{body}</p>
    </div>
  );
}
