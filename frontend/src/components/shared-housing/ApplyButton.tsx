"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Home, Loader2 } from "lucide-react";
import ApplyModal from "@/components/shared-housing/ApplyModal";
import { useAuthStore } from "@/stores/authStore";
import type { ListingDetailWithSimilar } from "@/types/api";

type Props = {
  listing: ListingDetailWithSimilar;
  className?: string;
};

export default function ApplyButton({ listing, className }: Props) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const openSpots =
    listing.total_spots == null
      ? 1
      : Math.max(0, listing.total_spots - (listing.filled_spots ?? 0));
  const isOwner = user?.id === listing.owner_id;

  function handleClick() {
    if (!user) {
      router.push(`/login?redirect=/property/${listing.id}`);
      return;
    }
    setOpen(true);
  }

  if (!isInitialized || isOwner) return null;
  if (listing.category !== "shared_housing") return null;
  const spacing = className ?? "mt-4";

  if (sent) {
    return (
      <button
        type="button"
        disabled
        className={`${spacing} flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-bold text-emerald-300`}
      >
        <Check className="h-4 w-4" />
        Application Sent
      </button>
    );
  }

  const disabled = openSpots <= 0;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        title={disabled ? "No spots available" : undefined}
        className={`${spacing} flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-[background-color,transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-400`}
      >
        {!isInitialized ? <Loader2 className="h-4 w-4 animate-spin" /> : <Home className="h-4 w-4" />}
        {disabled ? "No spots available" : "Apply to Live Here"}
      </button>
      {open && (
        <ApplyModal
          listing={listing}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            setSent(true);
          }}
        />
      )}
    </>
  );
}
