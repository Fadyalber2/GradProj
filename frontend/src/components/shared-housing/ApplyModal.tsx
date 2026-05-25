"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import LifestylePrefsForm from "@/components/profile/LifestylePrefsForm";
import { createApplicationMutation } from "@/lib/queries";
import { useAuthStore } from "@/stores/authStore";
import type { ListingDetailWithSimilar, ListingLifestylePreferences } from "@/types/api";

type Props = {
  listing: ListingDetailWithSimilar;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ApplyModal({ listing, onClose, onSuccess }: Props) {
  const user = useAuthStore((state) => state.user);
  const [message, setMessage] = useState("");
  const [prefs, setPrefs] = useState<ListingLifestylePreferences>(
    (user?.lifestyle_preferences ?? {}) as ListingLifestylePreferences
  );
  const mutation = useMutation(createApplicationMutation);
  const emptyProfile = useMemo(() => Object.keys(prefs).length === 0, [prefs]);

  async function submit() {
    try {
      await mutation.mutateAsync({
        listing_id: listing.id,
        message,
        lifestyle_data: prefs,
      });
      onSuccess();
    } catch (error) {
      const status = error instanceof Error && "status" in error ? (error as { status?: number }).status : null;
      if (status === 409) onSuccess();
    }
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-card-dark shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-bold text-white">Apply to Live Here</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close application modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-black/30">
                <Image
                  src={listing.images[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600"}
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

            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-200">Introduce yourself</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                placeholder="Tell the owner and housemates a little about your routine, work or study schedule, and what makes you a good fit."
                className="w-full resize-none rounded-xl border border-white/10 bg-input-dark px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-primary"
              />
            </label>

            {emptyProfile && (
              <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Complete your profile for a better compatibility score. You can still apply now.
              </p>
            )}

            <LifestylePrefsForm value={prefs} onChange={setPrefs} compact />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-4">
            {mutation.isError && (
              <p className="mr-auto text-sm text-red-300">Could not send application. Please try again.</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-60"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
