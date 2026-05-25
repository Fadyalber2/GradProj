"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import BookingModal from "@/components/booking/BookingModal";
import { useAuthStore } from "@/stores/authStore";
import type { ListingDetailWithSimilar } from "@/types/api";

type Props = {
  listing: ListingDetailWithSimilar;
};

export default function BookNowButton({ listing }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isOwner = user?.id === listing.owner_id;
  const sold = listing.status === "sold";
  const label = listing.category === "for_sale" ? "Reserve Property" : "Book Property";

  if (isOwner) return null;

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
        disabled={sold}
        onClick={handleClick}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-400"
      >
        <CalendarCheck className="h-4 w-4" />
        {sold ? "Sold" : label}
      </button>
      {open && <BookingModal listing={listing} onClose={() => setOpen(false)} />}
    </>
  );
}
