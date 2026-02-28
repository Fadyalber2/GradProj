"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Star, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import type { PropertyDetail } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { formatEGP } from "@/lib/utils";
import MessageOwnerModal from "@/components/property/MessageOwnerModal";

interface PropertySidebarProps {
  property: PropertyDetail;
}

export default function PropertySidebar({ property }: PropertySidebarProps) {
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
          <div className="flex justify-between items-end mb-6 pb-6 border-b border-white/5">
            <div>
              <span className="text-3xl font-bold text-white">
                {formatEGP(property.price)}
              </span>
              <span className="text-gray-400 text-sm font-medium">/month</span>
            </div>
            <div className="flex items-center gap-1 text-primary text-sm font-medium">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>
                {property.rating} ({property.reviewCount})
              </span>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {property.available && (
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-green-500">
                  Available Now
                </span>
              </div>
            )}
            <button
              onClick={() => requireAuth(() => {})}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Schedule Viewing
            </button>
            <button
              onClick={() => requireAuth(() => setMsgOpen(true))}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 rounded-xl transition-all"
            >
              Send Message
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
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
              <h3 className="text-white font-bold text-sm">
                Similar Properties
              </h3>
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
                      className="rounded-lg object-cover w-16 h-16"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {sp.title}
                    </h4>
                    <p className="text-gray-400 text-xs">{sp.location}</p>
                    <p className="text-white text-sm font-bold mt-1">
                      {formatEGP(sp.price)}/mo
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
