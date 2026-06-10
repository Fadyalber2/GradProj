"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import BookingModal from "@/components/booking/BookingModal";
import { useAuthStore } from "@/stores/authStore";
import type { ListingDetailWithSimilar } from "@/types/api";

type Props = {
  listing: ListingDetailWithSimilar;
  className?: string;
};

export default function BookNowButton({ listing, className }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isOwner = user?.id === listing.owner_id;
  const unavailable = listing.status !== "active";
  const label = "Book Property";
  const spacing = className ?? "mt-4";

  if (isOwner || listing.category === "for_sale") return null;

  function handleClick() {
    if (!user) {
      router.push(`/login?next=/property/${listing.id}`);
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        disabled={unavailable}
        onClick={handleClick}
        className={`${spacing} flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-[background-color,transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-400`}
      >
        <CalendarCheck className="h-4 w-4" />
        {unavailable ? "Unavailable" : label}
      </button>
      {open && <BookingModal listing={listing} onClose={() => setOpen(false)} />}
    </>
  );
}
