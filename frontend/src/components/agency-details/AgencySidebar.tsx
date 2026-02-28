"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Trophy, MessageCircle, Building2, MapPin, LayoutList } from "lucide-react";
import type { AgencyDetail } from "@/types";

interface AgencySidebarProps {
  agency: AgencyDetail;
}

export default function AgencySidebar({ agency }: AgencySidebarProps) {
  // Parse trust score (e.g. "9.2/10" or "9.2") to a 0–100 percentage
  const rawScore = parseFloat(agency.trustScore);
  const scoreOutOf = agency.trustScore.includes("/10") ? 10 : 100;
  const scorePct = isNaN(rawScore) ? 0 : Math.round((rawScore / scoreOutOf) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-6 sticky top-24"
    >
      {/* Main info card */}
      <div className="bg-card-dark rounded-2xl p-6 border border-white/10 shadow-xl">
        {/* Logo + name + verified */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center border border-white/5 shrink-0">
            <span className="text-2xl font-bold text-white">{agency.logoText}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">{agency.name}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span className="text-primary text-xs font-semibold">{agency.badge}</span>
            </div>
          </div>
        </div>

        <p className="text-gray-400 text-sm leading-relaxed mb-5">{agency.description}</p>

        {/* Trust score bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400 font-medium">Trust Score</span>
            <span className="text-sm font-bold text-white">{agency.trustScore}</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${scorePct}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-5 border-t border-white/5 pt-5">
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <LayoutList className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{agency.totalListings}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">Listings</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <Building2 className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{agency.projectsForSale}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">Projects</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <MapPin className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{agency.totalCities}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">Cities</div>
          </div>
        </div>

        {/* Message only CTA */}
        <button className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
          <MessageCircle className="h-5 w-5" /> Send Message
        </button>
      </div>

      {/* Awards card */}
      {agency.awards.length > 0 && (
        <div className="bg-card-dark rounded-2xl p-6 border border-white/10">
          <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Awards & Recognition</h3>
          <div className="space-y-4">
            {agency.awards.map((award) => (
              <div key={award.title} className="flex items-start gap-3">
                <Trophy
                  className={`h-5 w-5 mt-0.5 shrink-0 ${award.gold ? "text-yellow-500" : "text-gray-400"}`}
                />
                <div>
                  <div className="text-white text-sm font-semibold">{award.title}</div>
                  <div className="text-gray-400 text-xs">{award.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
