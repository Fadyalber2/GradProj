"use client";

import { CheckCircle, Clock, CalendarClock } from "lucide-react";
import type { ProjectDetail } from "@/types";

interface ResidencesGridProps {
  project: ProjectDetail;
}

export default function ResidencesGrid({ project }: ResidencesGridProps) {
  const status = project.status?.toLowerCase() ?? "";

  // in_progress — Unit Plans & Pricing
  if (status === "in_progress" || status === "under_construction") {
    return (
      <section>
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white mb-1">Unit Plans & Pricing</h3>
          <p className="text-sm text-gray-400">
            Units will be available once the project is completed.
          </p>
        </div>

        {/* Starting price + completion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card-dark rounded-2xl p-6 border border-white/5">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Starting Price</p>
            <p className="text-3xl font-bold text-primary">{project.startingPrice}</p>
          </div>
          <div className="bg-card-dark rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Completion</p>
              <p className="text-white font-bold">{project.completion}</p>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: project.completion }}
              />
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-gray-400 text-xs">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Expected Delivery: Est. 2027</span>
            </div>
          </div>
        </div>

        {/* Key features */}
        {project.keyFeatures.length > 0 && (
          <div className="bg-card-dark rounded-2xl p-6 border border-white/5">
            <h4 className="text-white font-bold mb-4">Included Features</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {project.keyFeatures.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }

  // upcoming — Coming Soon teaser
  if (status === "upcoming") {
    return (
      <section>
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white mb-1">Available Residences</h3>
        </div>
        <div className="bg-card-dark rounded-2xl border border-white/5 p-12 text-center">
          <Clock className="h-12 w-12 text-primary/40 mx-auto mb-4" />
          <h4 className="text-white font-bold text-xl mb-2">Coming Soon</h4>
          <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
            This project hasn&apos;t launched yet. Starting price from{" "}
            <span className="text-primary font-semibold">{project.startingPrice}</span>.
          </p>
          <button className="bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-3 rounded-xl transition-all">
            Register Interest
          </button>
        </div>
      </section>
    );
  }

  // completed (or any other status) — show key features and price
  return (
    <section>
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">Available Residences</h3>
          <p className="text-sm text-gray-400">
            Explore available units in this completed development.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-card-dark rounded-2xl p-6 border border-white/5">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Starting Price</p>
          <p className="text-3xl font-bold text-primary">{project.startingPrice}</p>
        </div>
        <div className="bg-card-dark rounded-2xl p-6 border border-white/5">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Total Units</p>
          <p className="text-3xl font-bold text-white">{project.unitsTotal}</p>
        </div>
      </div>

      {project.keyFeatures.length > 0 && (
        <div className="bg-card-dark rounded-2xl p-6 border border-white/5">
          <h4 className="text-white font-bold mb-4">Unit Features</h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {project.keyFeatures.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
