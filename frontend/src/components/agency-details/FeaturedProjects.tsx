"use client";

import type { AgencyProject } from "@/types";
import ProjectCard from "./ProjectCard";

interface FeaturedProjectsProps {
  projects: AgencyProject[];
}

export default function FeaturedProjects({ projects }: FeaturedProjectsProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Featured Projects</h2>
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
