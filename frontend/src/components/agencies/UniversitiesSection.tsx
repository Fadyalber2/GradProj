"use client";

import { GraduationCap, ArrowRight } from "lucide-react";
import { UNIVERSITIES } from "@/lib/constants";
import UniversityCard from "./UniversityCard";

export default function UniversitiesSection() {
  return (
    <section className="py-16 bg-[#161616] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" /> Partner
              Universities
            </h2>
            <p className="text-gray-400 text-sm">
              Discover verified student housing and campus-adjacent rentals.
            </p>
          </div>
          <button className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
            View All <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {UNIVERSITIES.map((university, i) => (
            <UniversityCard
              key={university.shortName}
              university={university}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
