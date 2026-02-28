"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AgencyProject } from "@/types";
import ProjectCard from "./ProjectCard";

interface TopListingsProps {
  listings: AgencyProject[];
  totalListings: number;
  totalCities: number;
}

export default function TopListings({
  listings,
  totalListings,
  totalCities,
}: TopListingsProps) {
  return (
    <div className="space-y-8 pt-8 border-t border-white/5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Most Selling Real Estate Listings
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            High demand properties from this developer
          </p>
        </div>
        <Link
          href="/find-homes"
          className="text-primary hover:text-white text-sm font-medium flex items-center gap-1 transition-colors"
        >
          View all listings <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {listings.length === 0 ? (
        <p className="text-gray-500 text-sm">No listings available.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {listings.map((listing, i) => (
            <ProjectCard key={listing.id} project={listing} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
