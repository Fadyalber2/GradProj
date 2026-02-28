"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck, Building2, LayoutList } from "lucide-react";
import type { AgencyBrief } from "@/types/api";

interface DeveloperCardProps {
  agency: AgencyBrief;
  index: number;
}

export default function DeveloperCard({ agency, index }: DeveloperCardProps) {
  const initials = agency.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="bg-card-dark rounded-2xl overflow-hidden border border-white/5 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/5 group"
    >
      {/* Banner header */}
      <div className="h-28 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent relative">
        <div className="absolute inset-0 bg-gradient-to-t from-card-dark/80 to-transparent z-10" />
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-20">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden shrink-0">
            {agency.logo_url ? (
              <Image
                src={agency.logo_url}
                alt={agency.name}
                width={48}
                height={48}
                className="object-contain"
              />
            ) : (
              <span className="text-sm font-black text-gray-800">{initials}</span>
            )}
          </div>
          {agency.verified && (
            <div className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md border border-primary/30 flex items-center gap-1">
              <BadgeCheck className="h-3 w-3" /> VERIFIED
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-0.5 group-hover:text-primary transition-colors leading-tight">
          {agency.name}
        </h3>
        {agency.subtitle && (
          <p className="text-gray-400 text-xs mb-4">{agency.subtitle}</p>
        )}

        <div className="flex gap-3 mb-5">
          <div className="flex-1 bg-black/30 rounded-xl p-3 text-center">
            <Building2 className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
            <p className="text-white font-bold text-base">{agency.active_projects}</p>
            <p className="text-gray-500 text-[10px] mt-0.5">Projects</p>
          </div>
          <div className="flex-1 bg-black/30 rounded-xl p-3 text-center">
            <LayoutList className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
            <p className="text-white font-bold text-base">{agency.listings_count}</p>
            <p className="text-gray-500 text-[10px] mt-0.5">Listings</p>
          </div>
        </div>

        <Link
          href={`/agencies/${agency.slug}`}
          className="block w-full py-2.5 border border-primary text-primary hover:bg-primary hover:text-white font-semibold rounded-xl transition-colors text-sm text-center"
        >
          View Agency
        </Link>
      </div>
    </motion.div>
  );
}
