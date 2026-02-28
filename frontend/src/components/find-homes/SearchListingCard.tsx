"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Zap, BadgeCheck, AlertTriangle, Heart } from "lucide-react";
import { motion } from "framer-motion";
import type { Listing } from "@/types";
import { formatEGP } from "@/lib/utils";

interface SearchListingCardProps {
  listing: Listing;
}

export default function SearchListingCard({ listing }: SearchListingCardProps) {
  const remaining = listing.filledSpots - listing.avatars.length;
  const spotsLabel =
    listing.totalSpots === 1
      ? "Private Studio"
      : `${listing.filledSpots}/${listing.totalSpots} Spots filled`;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        href={`/property/${listing.id}`}
        className="bg-card-dark rounded-2xl overflow-hidden border border-white/5 group hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-black/50 block"
      >
        {/* Image */}
        <div className="relative h-56 overflow-hidden">
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />

          {/* Verified badge */}
          <div className="absolute top-4 left-4">
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

          {/* Match badge */}
          <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <Zap className="h-3 w-3" /> {listing.matchPercent}% Match
          </div>

          {/* Heart */}
          <button
            onClick={(e) => e.preventDefault()}
            className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-white text-white hover:text-red-500 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <Heart
              className="h-3.5 w-3.5"
              fill={listing.liked ? "currentColor" : "none"}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">
                {listing.title}
              </h3>
              <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" /> {listing.location}
              </p>
            </div>
            <div className="text-right">
              <span className="text-primary font-bold text-lg">
                {formatEGP(listing.price)}
              </span>
              <span className="block text-gray-500 text-[10px]">/month</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {listing.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-white/5 rounded text-[10px] text-gray-400 border border-white/5"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Bottom: avatars + spots */}
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex -space-x-2">
              {listing.avatars.map((avatar, i) => (
                <Image
                  key={i}
                  src={avatar}
                  alt="User"
                  width={28}
                  height={28}
                  className="rounded-full border-2 border-card-dark"
                />
              ))}
              {remaining > 0 && (
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white font-medium border-2 border-card-dark">
                  +{remaining}
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">
              {spotsLabel}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
