// V2/frontend/src/components/dashboard/DashboardStats.tsx
"use client";

import type { ElementType } from "react";
import { Eye, TrendingUp, MessageSquare } from "lucide-react";
import type { AnalyticsStat } from "@/types";

interface DashboardStatsProps {
  stats: AnalyticsStat[];
}

const ICON_MAP: Record<string, ElementType> = {
  Eye,
  TrendingUp,
  MessageSquare,
};

export default function DashboardStats({ stats }: DashboardStatsProps) {
  if (!stats.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {stats.map((stat) => {
        const Icon = ICON_MAP[stat.icon] ?? Eye;
        return (
          <div
            key={stat.label}
            className="bg-card-dark rounded-2xl border border-white/5 p-5 flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl ${stat.iconBg}`}>
              <Icon className={`h-5 w-5 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className={`text-xs font-medium ${stat.trendUp ? "text-green-400" : "text-red-400"}`}>
                {stat.trendUp ? "+" : "-"}{stat.trendPercent}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
