"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, MapPin, Expand } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PropertyDetail } from "@/types";
import ImageLightbox from "@/components/ui/ImageLightbox";

interface PropertyHeroProps {
  property: PropertyDetail;
}

export default function PropertyHero({ property }: PropertyHeroProps) {
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const prev = () =>
    setCurrent((c) => (c === 0 ? property.images.length - 1 : c - 1));
  const next = () =>
    setCurrent((c) => (c === property.images.length - 1 ? 0 : c + 1));

  return (
    <>
      <div className="relative w-full h-[65vh] overflow-hidden group">
        {/* Image carousel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full cursor-pointer"
            onClick={() => setLightboxOpen(true)}
          >
            <Image
              src={property.images[current]}
              alt={`${property.title} - Image ${current + 1}`}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(18,18,18,0.4)] to-[rgba(18,18,18,0.95)] pointer-events-none" />

        {/* Expand / view all button */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="View all photos"
        >
          <Expand className="h-4 w-4" />
        </button>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 z-10">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                {property.verified && (
                  <span className="bg-white/10 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold border border-white/20">
                    Verified
                  </span>
                )}
                {property.isNew && (
                  <span className="bg-primary/90 text-white text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold">
                    New Listing
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
                {property.title}
              </h1>
              <div className="flex items-center text-gray-300 gap-2 mt-1">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-lg">{property.fullAddress}</span>
              </div>
              {property.images.length > 1 && (
                <span className="text-xs text-white/50 mt-1">
                  {current + 1} / {property.images.length} photos · click image to view gallery
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Nav arrows */}
        {property.images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute top-1/2 left-6 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute top-1/2 right-6 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots */}
        {property.images.length > 1 && (
          <div className="absolute bottom-12 right-12 z-20 flex gap-2">
            {property.images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <ImageLightbox
        images={property.images}
        currentIndex={current}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setCurrent}
      />
    </>
  );
}
