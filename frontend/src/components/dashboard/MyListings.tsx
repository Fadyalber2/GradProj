// V2/frontend/src/components/dashboard/MyListings.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { PlusCircle, Pencil, Trash2, ImageIcon, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteListingMutation } from "@/lib/queries";
import type { DashboardListing } from "@/types";

interface MyListingsProps {
  listings: DashboardListing[];
  onAddNew: () => void;
  onEdit?: (listingId: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-green-500/10 text-green-400 border-green-500/10",
  pending:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/10",
  rejected: "bg-red-500/10 text-red-400 border-red-500/10",
  draft:    "bg-gray-500/10 text-gray-400 border-gray-500/10",
};

const STATUS_DOT: Record<string, string> = {
  active:   "bg-green-500",
  pending:  "bg-yellow-500",
  rejected: "bg-red-500",
  draft:    "bg-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  active:   "Active",
  pending:  "Pending Review",
  rejected: "Rejected",
  draft:    "Draft",
};

export default function MyListings({ listings, onAddNew, onEdit }: MyListingsProps) {
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { mutate: deleteListing, isPending: isDeleting } = useMutation({
    ...deleteListingMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "me"] });
      setConfirmDeleteId(null);
    },
  });

  function handleDeleteClick(id: string) {
    setConfirmDeleteId(id);
  }

  function handleDeleteConfirm() {
    if (confirmDeleteId) deleteListing(confirmDeleteId);
  }

  return (
    <>
      <section className="bg-card-dark rounded-3xl border border-white/5 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">My Listings</h2>
            <p className="text-gray-400 text-sm">
              New listings require admin approval before going live.
            </p>
          </div>
          <button
            onClick={onAddNew}
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover rounded-lg text-sm text-white font-bold shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
          >
            <PlusCircle className="h-5 w-5" /> Add New Listing
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/20 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-5 font-semibold">Property</th>
                <th className="p-5 font-semibold">Location</th>
                <th className="p-5 font-semibold">Status</th>
                <th className="p-5 font-semibold text-right">Price</th>
                <th className="p-5 font-semibold text-center">Views</th>
                <th className="p-5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No listings yet. Click &quot;Add New Listing&quot; to get started.
                  </td>
                </tr>
              ) : (
                listings.map((listing) => (
                  <tr key={listing.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        {listing.image ? (
                          <Image
                            src={listing.image}
                            alt={listing.name}
                            width={64}
                            height={48}
                            className="w-16 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-12 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                            <ImageIcon className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-bold text-base">{listing.name}</p>
                          <p className="text-gray-500 text-xs">ID: {listing.listingId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-gray-400">{listing.location}</td>
                    <td className="p-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[listing.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[listing.status]}`} />
                        {STATUS_LABEL[listing.status] ?? listing.status}
                      </span>
                    </td>
                    <td className="p-5 text-right text-white font-medium">
                      {listing.price}
                      {listing.priceSuffix && (
                        <span className="text-gray-500 text-xs font-normal">{listing.priceSuffix}</span>
                      )}
                    </td>
                    <td className="p-5 text-center text-gray-300">{listing.views}</td>
                    <td className="p-5 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(listing.id)}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="Edit listing"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteClick(listing.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete listing"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Delete confirm dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Delete Listing?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This action cannot be undone. The listing will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
