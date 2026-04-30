"use client";

import { useState } from "react";
import type { AgencyProject } from "@/types";
import ProjectCard from "./ProjectCard";

const FILTER_TABS = ["All Projects", "Luxury Condos", "Penthouses"];

interface FeaturedProjectsProps {
  projects: AgencyProject[];
}

export default function FeaturedProjects({ projects }: FeaturedProjectsProps) {
  const [activeTab, setActiveTab] = useState("All Projects");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Featured Projects</h2>
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5 self-start sm:self-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-500 text-sm">No projects listed.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} linkBase="/project" />
          ))}
        </div>
      )}
    </div>
  );
}
