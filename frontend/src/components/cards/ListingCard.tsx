"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Zap, BadgeCheck, AlertTriangle, Heart, Bed, Bath } from "lucide-react";
import { motion } from "framer-motion";
import type { Listing } from "@/types";
import { formatEGP } from "@/lib/utils";

interface ListingCardProps {
  listing: Listing;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  for_rent:       { label: "For Rent",  color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  for_sale:       { label: "For Sale",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  shared_housing: { label: "Shared",    color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
};

export default function ListingCard({ listing }: ListingCardProps) {
  const isShared = listing.category === "shared_housing";
  const isForSale = listing.category === "for_sale";
  const remaining = listing.filledSpots - listing.avatars.length;
  const cat = listing.category ? CATEGORY_CONFIG[listing.category] : null;

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="will-change-transform"
    >
      <Link
        href={`/property/${listing.id}`}
        className="bg-card-dark rounded-2xl overflow-hidden border border-white/5 group hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 shadow-lg block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {/* Image */}
        <div className="relative h-64 overflow-hidden bg-white/5">
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Gradient scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

          {/* Top-left badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
            {listing.verified ? (
              <span className="bg-black/60 backdrop-blur-sm text-green-400 text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1 border border-green-500/20">
                <BadgeCheck className="h-3 w-3" /> VERIFIED
              </span>
            ) : (
              <span className="bg-yellow-500/90 text-black font-bold text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> UNVERIFIED
              </span>
            )}
            {listing.is_new && (
              <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-md">
                NEW
              </span>
            )}
            {cat && (
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-md border backdrop-blur-sm ${cat.color}`}>
                {cat.label}
              </span>
            )}
          </div>

          {/* Match badge — only when AI returns a score */}
          {listing.matchPercent > 0 && (
            <div className="absolute top-3 right-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-primary/30">
              <Zap className="h-3 w-3" /> {listing.matchPercent}%
            </div>
          )}

          {/* Shared housing avatars */}
          {isShared && listing.avatars.length > 0 && (
            <div className="absolute bottom-3 left-3 flex -space-x-2">
              {listing.avatars.map((avatar, i) => (
                <Image
                  key={i}
                  src={avatar}
                  alt={`Housemate ${i + 1}`}
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-card-dark"
                />
              ))}
              {remaining > 0 && (
                <div className="w-8 h-8 rounded-full border-2 border-card-dark bg-gray-700 flex items-center justify-center text-xs text-white font-medium">
                  +{remaining}
                </div>
              )}
            </div>
          )}

          {/* Heart */}
          <button
            type="button"
            onClick={(e) => e.preventDefault()}
            aria-label={listing.liked ? "Remove from favourites" : "Add to favourites"}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-white text-white hover:text-red-500 backdrop-blur-sm flex items-center justify-center transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Heart
              className="h-3.5 w-3.5"
              fill={listing.liked ? "currentColor" : "none"}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex justify-between items-start gap-3 mb-2">
            <div className="min-w-0">
              <h3 className="text-white font-bold text-[15px] leading-snug line-clamp-2">{listing.title}</h3>
              <p className="text-gray-400 text-xs flex items-center gap-1 mt-1.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{listing.location}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-primary font-bold text-lg tabular-nums">
                {formatEGP(listing.price)}
              </span>
              {!isForSale && (
                <span className="block text-gray-500 text-[10px]">/month</span>
              )}
            </div>
          </div>

          {/* Specs — regular listings */}
          {!isShared && (listing.bedrooms != null || listing.bathrooms != null) && (
            <div className="flex items-center gap-4 text-gray-400 text-xs mt-3 pt-3 border-t border-white/5">
              {listing.bedrooms != null && (
                <span className="flex items-center gap-1.5">
                  <Bed className="h-3.5 w-3.5 text-gray-500" />
                  {listing.bedrooms} Bed{listing.bedrooms !== 1 ? "s" : ""}
                </span>
              )}
              {listing.bathrooms != null && (
                <span className="flex items-center gap-1.5">
                  <Bath className="h-3.5 w-3.5 text-gray-500" />
                  {listing.bathrooms} Bath{listing.bathrooms !== 1 ? "s" : ""}
                </span>
              )}
              {listing.property_type && (
                <span className="text-gray-500 text-[11px]">{listing.property_type}</span>
              )}
            </div>
          )}

          {/* Spots fill bar — shared housing only */}
          {isShared && listing.totalSpots > 1 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="w-full bg-gray-800 rounded-full h-1.5 flex gap-0.5 overflow-hidden">
                {Array.from({ length: listing.totalSpots }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full flex-1 transition-colors ${
                      i < listing.filledSpots ? "bg-primary" : "bg-gray-700"
                    }`}
                  />
                ))}
              </div>
              <div className="text-right text-[10px] text-gray-500 mt-1">
                {listing.filledSpots}/{listing.totalSpots} Filled
              </div>
            </div>
          )}

          {/* Tags (fallback when no specs) */}
          {listing.tags.length > 0 && !listing.bedrooms && !listing.bathrooms && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {listing.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-white/5 rounded-md text-[10px] text-gray-400 border border-white/5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
