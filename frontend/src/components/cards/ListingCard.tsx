"use client";

import Image from "next/image";
import { MapPin, Zap, BadgeCheck, AlertTriangle, Heart } from "lucide-react";
import { motion } from "framer-motion";
import type { Listing } from "@/types";
import { formatEGP } from "@/lib/utils";

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const remainingAvatars =
    listing.filledSpots - listing.avatars.length;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="bg-card-dark rounded-2xl overflow-hidden border border-white/5 group hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-black/50"
    >
      {/* Image */}
      <div className="relative h-64 overflow-hidden">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Verified badge */}
        <div className="absolute top-4 left-4">
          {listing.verified ? (
            <span className="bg-black/60 backdrop-blur-sm text-gray-200 text-xs px-2 py-1 rounded flex items-center gap-1">
              <BadgeCheck className="h-3 w-3 text-green-400" /> VERIFIED
            </span>
          ) : (
            <span className="bg-yellow-500/90 text-black font-bold text-xs px-2 py-1 rounded flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> UNVERIFIED
            </span>
          )}
        </div>

        {/* Match percentage */}
        <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
          <Zap className="h-3 w-3" /> {listing.matchPercent}%
        </div>

        {/* Avatars */}
        <div className="absolute bottom-4 left-4 flex -space-x-2">
          {listing.avatars.map((avatar, i) => (
            <Image
              key={i}
              src={avatar}
              alt={`User ${i + 1}`}
              width={32}
              height={32}
              className="rounded-full border-2 border-card-dark"
            />
          ))}
          {remainingAvatars > 0 && (
            <div className="w-8 h-8 rounded-full border-2 border-card-dark bg-gray-700 flex items-center justify-center text-xs text-white font-medium">
              +{remainingAvatars}
            </div>
          )}
        </div>

        {/* Heart button */}
        <button className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-white text-white hover:text-red-500 backdrop-blur-sm flex items-center justify-center transition-colors">
          <Heart
            className="h-3.5 w-3.5"
            fill={listing.liked ? "currentColor" : "none"}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-white font-bold text-lg">{listing.title}</h3>
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

        {/* Fill bar */}
        <div className="mt-4 mb-2">
          <div className="w-full bg-gray-800 rounded-full h-1.5 flex gap-0.5 overflow-hidden">
            {Array.from({ length: listing.totalSpots }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full flex-1 ${
                  i < listing.filledSpots ? "bg-primary" : "bg-gray-700"
                }`}
              />
            ))}
          </div>
          <div className="text-right text-[10px] text-gray-500 mt-1">
            {listing.filledSpots}/{listing.totalSpots} Filled
          </div>
        </div>

        {/* Tags */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {listing.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-white/5 rounded text-[10px] text-gray-400 border border-white/5"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
