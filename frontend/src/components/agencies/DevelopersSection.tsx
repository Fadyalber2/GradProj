"use client";

import { Building2, ArrowRight, Loader2 } from "lucide-react";
import DeveloperCard from "./DeveloperCard";
import type { AgencyBrief } from "@/types/api";

interface DevelopersSectionProps {
  agencies: AgencyBrief[];
  isLoading?: boolean;
}

export default function DevelopersSection({
  agencies,
  isLoading = false,
}: DevelopersSectionProps) {
  return (
    <section className="py-16 bg-background-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" /> Real Estate
              Developers
            </h2>
            <p className="text-gray-400 text-sm">
              Official partners offering premium properties and new
              developments.
            </p>
          </div>
          <button className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
            View All <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : agencies.length === 0 ? (
          <p className="text-gray-500 text-center py-16">
            No agencies found.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agencies.map((agency, i) => (
              <DeveloperCard key={agency.id} agency={agency} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
