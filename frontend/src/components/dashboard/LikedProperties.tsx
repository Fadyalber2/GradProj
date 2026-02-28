"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { LikedProperty } from "@/types";

interface LikedPropertiesProps {
  properties: LikedProperty[];
}

export default function LikedProperties({ properties }: LikedPropertiesProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          Liked Properties
          <span className="bg-white/10 text-gray-400 text-sm px-2.5 py-0.5 rounded-full font-medium">
            {properties.length}
          </span>
        </h2>
        <div className="flex gap-2">
          <button className="w-10 h-10 rounded-full bg-card-dark border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors hover:bg-white/5">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button className="w-10 h-10 rounded-full bg-card-dark border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors hover:bg-white/5">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {properties.map((property) => (
          <div
            key={property.id}
            className="bg-card-dark rounded-2xl overflow-hidden border border-white/5 group hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-black/50"
          >
            <div className="relative h-64 overflow-hidden">
              <Image
                src={property.image}
                alt={property.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <button className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/40 hover:bg-white text-primary backdrop-blur-sm flex items-center justify-center transition-colors">
                <Heart className="h-5 w-5 fill-current" />
              </button>
              <div className="absolute bottom-3 left-3 flex gap-2">
                {property.specs.map((spec) => (
                  <span
                    key={spec}
                    className="bg-black/60 backdrop-blur-md text-white text-xs font-medium px-2 py-1 rounded"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-white font-bold text-xl truncate pr-2">
                    {property.title}
                  </h3>
                  <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {property.location}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-primary font-bold text-xl">
                    {property.price}
                  </span>
                  <span className="block text-gray-500 text-xs">
                    {property.priceSuffix}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-xs text-gray-500">{property.addedAgo}</span>
                <Link
                  href={`/property/${property.id}`}
                  className="text-sm font-medium text-white hover:text-primary transition-colors flex items-center gap-1"
                >
                  View Details <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
