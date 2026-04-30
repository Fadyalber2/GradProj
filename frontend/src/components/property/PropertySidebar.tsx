"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShieldCheck, CalendarDays, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import type { PropertyDetail } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { formatEGP } from "@/lib/utils";
import MessageOwnerModal from "@/components/property/MessageOwnerModal";

interface PropertySidebarProps {
  property: PropertyDetail;
  onSchedule?: () => void;
}

function priceSuffix(category?: string): string {
  if (category === "for_sale") return "";
  return "/month";
}

export default function PropertySidebar({ property, onSchedule }: PropertySidebarProps) {
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

  const suffix = priceSuffix(property.category);

  return (
    <div className="lg:w-[30%]">
      <div className="sticky top-24 space-y-6">
        {/* Price card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="bg-card-dark rounded-2xl p-6 border border-white/10 shadow-2xl shadow-black/50"
        >
          {/* Price */}
          <div className="pb-5 mb-5 border-b border-white/5">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">
                {formatEGP(property.price)}
              </span>
              {suffix && (
                <span className="text-gray-400 text-sm font-medium">{suffix}</span>
              )}
            </div>
            {property.available && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="h-2 w-2 rounded-full bg-green-500 block" />
                <span className="text-sm font-medium text-green-400">Available Now</span>
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={() => requireAuth(() => onSchedule ? onSchedule() : setMsgOpen(true))}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <CalendarDays className="h-4 w-4" />
              Schedule Viewing
            </button>
            <button
              onClick={() => requireAuth(() => setMsgOpen(true))}
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 rounded-xl transition-all cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" />
              Send Message
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-4">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Secure transaction with Axiom Shield</span>
          </div>
        </motion.div>

        {/* Similar Properties */}
        {property.similarProperties.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="bg-card-dark rounded-2xl border border-white/10 overflow-hidden"
          >
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-bold text-sm">Similar Properties</h3>
            </div>
            <div className="divide-y divide-white/5">
              {property.similarProperties.map((sp) => (
                <Link
                  key={sp.id}
                  href={`/property/${sp.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group"
                >
                  {sp.image && (
                    <Image
                      src={sp.image}
                      alt={sp.title}
                      width={64}
                      height={64}
                      className="rounded-lg object-cover w-16 h-16 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {sp.title}
                    </h4>
                    <p className="text-gray-400 text-xs">{sp.location}</p>
                    <p className="text-white text-sm font-bold mt-1">
                      {formatEGP(sp.price)}
                      {property.category !== "for_sale" && "/mo"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="p-4 bg-white/5">
              <Link
                href="/find-homes"
                className="w-full block text-center text-xs text-primary font-bold hover:underline"
              >
                View All Listings
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      <MessageOwnerModal
        open={msgOpen}
        onClose={() => setMsgOpen(false)}
        ownerId={property.ownerId}
        propertyTitle={property.title}
      />
    </div>
  );
}
