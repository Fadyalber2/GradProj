// V2/frontend/src/components/dashboard/MyViewings.tsx
"use client";

import type { ElementType } from "react";
import Image from "next/image";
import { Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import type { DashboardViewingBrief } from "@/types";

interface MyViewingsProps {
  viewings: DashboardViewingBrief[];
}

const STATUS_CONFIG: Record<string, { icon: ElementType; color: string; label: string }> = {
  confirmed: { icon: CheckCircle, color: "text-green-400", label: "Confirmed" },
  pending:   { icon: Clock,       color: "text-yellow-400", label: "Pending" },
  cancelled: { icon: XCircle,     color: "text-red-400",    label: "Cancelled" },
};

export default function MyViewings({ viewings }: MyViewingsProps) {
  if (!viewings.length) return null;

  return (
    <section className="bg-card-dark rounded-3xl border border-white/5 overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-white">Upcoming Viewings</h2>
      </div>
      <div className="divide-y divide-white/5">
        {viewings.map((v) => {
          const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.pending;
          const Icon = cfg.icon;
          const date = new Date(v.scheduledAt);
          return (
            <div key={v.id} className="p-5 flex items-center gap-4">
              {v.listingImage ? (
                <Image
                  src={v.listingImage}
                  alt={v.listingTitle}
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{v.listingTitle}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {date.toLocaleDateString("en-EG", { weekday: "short", month: "short", day: "numeric" })}{" "}
                  at {date.toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                <Icon className="h-4 w-4" />
                {cfg.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
