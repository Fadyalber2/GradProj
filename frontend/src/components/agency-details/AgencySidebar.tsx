"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Trophy, MessageCircle, Globe, Share2, FileText } from "lucide-react";
import type { AgencyDetail } from "@/types";

interface AgencySidebarProps {
  agency: AgencyDetail;
}

export default function AgencySidebar({ agency }: AgencySidebarProps) {
  const rawScore = parseFloat(agency.trustScore);
  const displayScore = isNaN(rawScore)
    ? agency.trustScore
    : agency.trustScore.includes("/10")
    ? (rawScore * 10).toFixed(1)
    : rawScore.toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-6 sticky top-24"
    >
      {/* Main info card */}
      <div className="bg-card-dark rounded-2xl p-6 border border-white/10 shadow-xl">
        {/* Logo + name + badge */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center border border-white/10 shrink-0 shadow-lg">
            <span className="text-2xl font-bold text-white">{agency.logoText}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">{agency.name}</h2>
            <div className="inline-flex items-center gap-1 mt-1.5 bg-primary/15 border border-primary/30 rounded-md px-2 py-0.5">
              <BadgeCheck className="h-3 w-3 text-primary shrink-0" />
              <span className="text-primary text-[10px] font-bold uppercase tracking-wider">
                {agency.badge}
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-400 text-sm leading-relaxed mb-5">{agency.description}</p>

        {/* Stats: 2-col row + 1 wide row */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <div className="text-2xl font-bold text-white mb-0.5">{displayScore}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400">Trust Score</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <div className="text-2xl font-bold text-white mb-0.5">{agency.projectsForSale}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400">Projects for Sale</div>
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center mb-5">
          <div className="text-2xl font-bold text-white mb-0.5">{agency.developmentHistory}</div>
          <div className="text-[10px] uppercase tracking-wider text-gray-400">Development History</div>
        </div>

        {/* CTA buttons */}
        <button className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mb-3 cursor-pointer">
          <FileText className="h-4 w-4" />
          Request Sales Kit
        </button>
        <button className="w-full border border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mb-5 cursor-pointer">
          <Globe className="h-4 w-4" />
          Visit Official Website
        </button>

        {/* Social icons */}
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/5">
          <button className="w-9 h-9 bg-white/5 hover:bg-primary/15 hover:text-primary rounded-lg flex items-center justify-center text-gray-400 transition-all cursor-pointer">
            <Globe className="h-4 w-4" />
          </button>
          <button className="w-9 h-9 bg-white/5 hover:bg-primary/15 hover:text-primary rounded-lg flex items-center justify-center text-gray-400 transition-all cursor-pointer">
            <MessageCircle className="h-4 w-4" />
          </button>
          <button className="w-9 h-9 bg-white/5 hover:bg-primary/15 hover:text-primary rounded-lg flex items-center justify-center text-gray-400 transition-all cursor-pointer">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Awards & Recognition */}
      {agency.awards.length > 0 && (
        <div className="bg-card-dark rounded-2xl p-6 border border-white/10">
          <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
            Awards &amp; Recognition
          </h3>
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
