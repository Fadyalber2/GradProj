"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CalendarDays, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { formatEGP } from "@/lib/utils";
import MessageOwnerModal from "@/components/property/MessageOwnerModal";

interface MobilePropertyCTAProps {
  price: number;
  category?: string;
  ownerId: string;
  propertyTitle: string;
}

export default function MobilePropertyCTA({
  price,
  category,
  ownerId,
  propertyTitle,
}: MobilePropertyCTAProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [msgOpen, setMsgOpen] = useState(false);

  function requireAuth(action: () => void) {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    action();
  }

  const suffix = category === "for_sale" ? "" : "/mo";

  return (
    <>
      {/* Sticky bottom bar — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0f0f0f]/95 backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center gap-3">
        {/* Price */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-0.5">
            <span className="text-white font-bold text-lg leading-none">
              {formatEGP(price)}
            </span>
            {suffix && (
              <span className="text-gray-400 text-xs">{suffix}</span>
            )}
          </div>
        </div>

        {/* Message button */}
        <button
          onClick={() => requireAuth(() => setMsgOpen(true))}
          aria-label="Send message"
          className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        >
          <MessageSquare className="h-5 w-5" />
        </button>

        {/* Schedule viewing */}
        <button
          onClick={() => requireAuth(() => setMsgOpen(true))}
          className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-transform cursor-pointer"
        >
          <CalendarDays className="h-4 w-4" />
          Schedule
        </button>
      </div>

      <MessageOwnerModal
        open={msgOpen}
        onClose={() => setMsgOpen(false)}
        ownerId={ownerId}
        propertyTitle={propertyTitle}
      />
    </>
  );
}
