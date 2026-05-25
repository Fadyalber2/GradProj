// V2/frontend/src/components/dashboard/DashboardStats.tsx
"use client";

import type { ElementType } from "react";
import { Activity, Clock, Eye, Heart, MessageSquare, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import type { AnalyticsStat } from "@/types";

interface DashboardStatsProps {
  stats: AnalyticsStat[];
}

const ICON_MAP: Record<string, ElementType> = {
  Eye,
  Activity,
  Clock,
  Heart,
  TrendingUp,
  MessageSquare,
};

export default function DashboardStats({ stats }: DashboardStatsProps) {
  if (!stats.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => {
        const Icon = ICON_MAP[stat.icon] ?? Eye;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
            className="bg-card-dark rounded-2xl border border-white/5 p-5 flex items-center gap-4 transition-transform active:scale-[0.99]"
          >
            <div className={`p-3 rounded-xl ${stat.iconBg}`}>
              <Icon className={`h-5 w-5 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
