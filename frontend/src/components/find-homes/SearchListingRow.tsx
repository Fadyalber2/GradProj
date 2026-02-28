"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, BadgeCheck, AlertTriangle, Heart } from "lucide-react";
import type { Listing } from "@/types";
import { formatEGP } from "@/lib/utils";

interface SearchListingRowProps {
  listing: Listing;
}

export default function SearchListingRow({ listing }: SearchListingRowProps) {
  return (
    <Link
      href={`/property/${listing.id}`}
      className="flex gap-4 bg-card-dark rounded-2xl overflow-hidden border border-white/5 group hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-black/50"
    >
      {/* Image */}
      <div className="relative w-44 shrink-0 overflow-hidden">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
          sizes="176px"
        />
        <div className="absolute top-3 left-3">
          {listing.verified ? (
            <span className="bg-black/60 backdrop-blur-sm text-green-400 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
              <BadgeCheck className="h-3 w-3" /> VERIFIED
            </span>
          ) : (
            <span className="bg-yellow-500/90 text-black text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> UNVERIFIED
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-between gap-4 py-4 pr-5">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-base leading-tight truncate">
            {listing.title}
          </h3>
          <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3 shrink-0" /> {listing.location}
          </p>

          {/* Tags */}
          {listing.tags.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {listing.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-gray-400 border border-white/5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="text-right">
            <span className="text-primary font-bold text-lg">
              {formatEGP(listing.price)}
            </span>
            <span className="block text-gray-500 text-[10px]">/month</span>
          </div>
          <button
            onClick={(e) => e.preventDefault()}
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-white text-white hover:text-red-500 flex items-center justify-center transition-colors"
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
