"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import type { University } from "@/types";

interface UniversityCardProps {
  university: University;
  index: number;
}

export default function UniversityCard({
  university,
  index,
}: UniversityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="bg-card-dark rounded-2xl overflow-hidden border border-white/5 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/5 group"
    >
      {/* Campus image header */}
      <div className="h-32 bg-gray-800 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
        <Image
          src={university.image}
          alt={`${university.name} Campus`}
          fill
          className="object-cover mix-blend-overlay opacity-60"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-20">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg">
            <span className="font-bold text-black text-xs">
              {university.shortName}
            </span>
          </div>
          {university.availability === "available" ? (
            <div className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md border border-green-500/20">
              HOUSING AVAILABLE
            </div>
          ) : (
            <div className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md border border-yellow-500/20">
              LIMITED SPOTS
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">
          {university.name}
        </h3>
        <div className="flex items-center gap-1 text-gray-400 text-xs mb-4">
          <MapPin className="h-3.5 w-3.5" /> {university.location}
        </div>

        <div className="space-y-3 mb-6">
          {university.details.map((detail) => (
            <div key={detail.label} className="flex justify-between text-sm">
              <span className="text-gray-500">{detail.label}</span>
              <span className="text-white">{detail.value}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Avg. Price</span>
            <span className="text-primary font-semibold">
              {university.avgPrice}
            </span>
          </div>
        </div>

        <Link
          href={`/agencies/university/${university.shortName.toLowerCase()}`}
          className="block w-full py-2.5 border border-primary text-primary hover:bg-primary hover:text-white font-semibold rounded-lg transition-colors text-sm text-center"
        >
          View Student Housing
        </Link>
      </div>
    </motion.div>
  );
}
