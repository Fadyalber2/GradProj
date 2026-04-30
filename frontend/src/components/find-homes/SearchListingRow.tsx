"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, BadgeCheck, AlertTriangle, Heart, Bed, Bath } from "lucide-react";
import type { Listing } from "@/types";
import { formatEGP } from "@/lib/utils";

interface SearchListingRowProps {
  listing: Listing;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  for_rent:       { label: "For Rent",  color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  for_sale:       { label: "For Sale",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  shared_housing: { label: "Shared",    color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
};

export default function SearchListingRow({ listing }: SearchListingRowProps) {
  const isForSale = listing.category === "for_sale";
  const cat = listing.category ? CATEGORY_CONFIG[listing.category] : null;

  return (
    <Link
      href={`/property/${listing.id}`}
      className="flex gap-0 bg-card-dark rounded-2xl overflow-hidden border border-white/5 group hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Image */}
      <div className="relative w-44 shrink-0 overflow-hidden bg-white/5">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
          sizes="176px"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10 pointer-events-none" />
        <div className="absolute top-3 left-3">
          {listing.verified ? (
            <span className="bg-black/60 backdrop-blur-sm text-green-400 text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1 border border-green-500/20">
              <BadgeCheck className="h-3 w-3" /> VERIFIED
            </span>
          ) : (
            <span className="bg-yellow-500/90 text-black text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> UNVERIFIED
            </span>
          )}
        </div>
        {listing.is_new && (
          <div className="absolute bottom-3 left-3">
            <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-md">
              NEW
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-between gap-4 py-4 px-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-white font-bold text-[15px] leading-snug truncate">
              {listing.title}
            </h3>
            {cat && (
              <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${cat.color}`}>
                {cat.label}
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs flex items-center gap-1 mb-2">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{listing.location}</span>
          </p>

          {/* Specs */}
          {(listing.bedrooms != null || listing.bathrooms != null || listing.property_type) && (
            <div className="flex items-center gap-3 text-gray-500 text-[11px]">
              {listing.bedrooms != null && (
                <span className="flex items-center gap-1">
                  <Bed className="h-3 w-3" />
                  {listing.bedrooms} Bd
                </span>
              )}
              {listing.bathrooms != null && (
                <span className="flex items-center gap-1">
                  <Bath className="h-3 w-3" />
                  {listing.bathrooms} Ba
                </span>
              )}
              {listing.property_type && (
                <span className="text-gray-500">{listing.property_type}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="text-right">
            <span className="text-primary font-bold text-lg tabular-nums">
              {formatEGP(listing.price)}
            </span>
            {!isForSale && (
              <span className="block text-gray-500 text-[10px]">/month</span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => e.preventDefault()}
            aria-label={listing.liked ? "Remove from favourites" : "Add to favourites"}
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-white text-white hover:text-red-500 flex items-center justify-center transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Heart
              className="h-3.5 w-3.5"
              fill={listing.liked ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>
    </Link>
  );
}
